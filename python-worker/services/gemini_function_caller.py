"""
Gemini function calling orchestrator.
Handles multi-turn conversations with tool execution for GitHub integration.
"""

import google.generativeai as genai
from typing import Dict, List, Optional, Any
import asyncio
from .tools.tool_registry import ToolRegistry
from .tools.base_tool import ToolResponse
from .github_api_client import GitHubClient
from .gemini_client import GeminiClient
from utils.logger import get_logger

logger = get_logger(__name__)


class GeminiFunctionCaller:
    """
    Orchestrates Gemini AI with function calling capabilities.
    
    Implements:
    - Multi-turn conversations
    - Tool execution and response handling
    - Context management
    - Error recovery
    
    Flow:
    1. User asks question
    2. Gemini analyzes and decides which tools to call
    3. Execute tools and return results to Gemini
    4. Gemini synthesizes final answer with tool data
    5. Repeat until Gemini has complete answer
    """
    
    def __init__(
        self,
        gemini_client: GeminiClient,
        tool_registry: ToolRegistry,
        github_client: GitHubClient
    ):
        """
        Initialize function caller.
        
        Args:
            gemini_client: Gemini API client
            tool_registry: Registry of available tools
            github_client: GitHub API client for tool execution
        """
        self.gemini_client = gemini_client
        self.tool_registry = tool_registry
        self.github_client = github_client
        self.max_turns = 5  # Prevent infinite loops
        self.model_name = "gemini-2.5-flash-lite"  # Updated to 2.5 flash lite (10 RPM)
    
    async def process_question(
        self,
        question: str,
        repository_context: Dict,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Process question with Gemini function calling.
        
        Args:
            question: User's question
            repository_context: Repository metadata (owner, name, description, etc.)
            conversation_history: Optional previous conversation messages
            
        Returns:
            Dict containing:
            - answer: str - Final synthesized answer
            - tool_executions: List[Dict] - All tool calls made
            - conversation_turns: int - Number of turns taken
            - success: bool - Whether processing succeeded
        """
        try:
            # Build system instruction with repository context
            system_instruction = self._build_system_instruction(repository_context)
            
            # Initialize conversation messages
            messages = conversation_history or []
            
            turn_count = 0
            tool_executions = []
            
            # Get tool declarations for Gemini
            tool_declarations = self.tool_registry.get_tool_declarations()
            
            logger.info(f"Starting function calling with {len(tool_declarations)} tools available", extra={
                "question": question[:100],
                "repository": repository_context.get('full_name', 'unknown'),
                "available_tools": [t['name'] for t in tool_declarations]
            })
            
            # Convert to Gemini FunctionDeclaration objects
            from google.generativeai.types import FunctionDeclaration, Tool
            
            gemini_tools = [
                FunctionDeclaration(
                    name=decl['name'],
                    description=decl['description'],
                    parameters=decl.get('parameters', {})
                )
                for decl in tool_declarations
            ]
            
            # Wrap in Tool object
            tools = [Tool(function_declarations=gemini_tools)]
            
            # Configure Gemini API key before creating model
            # Use the gemini_client to ensure API key is configured
            self.gemini_client._ensure_configured()
            
            # Get the active API key from gemini_client's key manager
            api_key = self.gemini_client.api_key_manager.get_active_key()
            if not api_key:
                raise Exception("No active Gemini API key available for function calling")
            
            # Configure genai module with the API key
            genai.configure(api_key=api_key)
            
            # Configure Gemini model with tools
            model = genai.GenerativeModel(
                model_name=self.model_name,
                tools=tools,
                system_instruction=system_instruction
            )
            
            # Start chat
            chat = model.start_chat(history=messages)
            
            # Send initial question
            current_message = question
            
            while turn_count < self.max_turns:
                turn_count += 1
                logger.info(f"Function calling turn {turn_count}/{self.max_turns}")
                
                # Send message to Gemini
                response = await asyncio.to_thread(
                    chat.send_message,
                    current_message
                )
                
                # Extract function calls from response
                function_calls = self._extract_function_calls(response)
                
                if not function_calls:
                    # No more tool calls - Gemini has final answer
                    final_answer = self._extract_text_response(response)
                    
                    if not final_answer:
                        # Response has no text and no function calls - error state
                        logger.warning("Gemini returned empty response")
                        return {
                            "answer": "I apologize, but I couldn't generate a response. Please try rephrasing your question.",
                            "tool_executions": tool_executions,
                            "conversation_turns": turn_count,
                            "success": False,
                            "error": "empty_response"
                        }
                    
                    logger.info(f"Function calling complete in {turn_count} turns", extra={
                        "total_tools_used": len(tool_executions),
                        "unique_tools": len(set(t['tool'] for t in tool_executions))
                    })
                    
                    return {
                        "answer": final_answer,
                        "tool_executions": tool_executions,
                        "conversation_turns": turn_count,
                        "success": True
                    }
                
                # Execute requested tools
                logger.info(f"Turn {turn_count}: Executing {len(function_calls)} tool(s)", extra={
                    "tools": [fc['name'] for fc in function_calls]
                })
                
                # Execute all tools (can be done in parallel)
                function_responses = []
                for func_call in function_calls:
                    tool_result = await self._execute_tool(func_call)
                    
                    # Log tool execution
                    tool_executions.append({
                        "tool": func_call['name'],
                        "params": func_call.get('args', {}),
                        "result": {
                            "success": tool_result.success,
                            "data": tool_result.data,
                            "error": tool_result.error,
                            "metadata": tool_result.metadata
                        }
                    })
                    
                    # Format response for Gemini
                    function_responses.append({
                        "name": func_call['name'],
                        "response": {
                            "success": tool_result.success,
                            "data": tool_result.data,
                            "error": tool_result.error
                        }
                    })
                
                # Build function response message
                # Format: list of function response parts
                current_message = self._build_function_response_message(function_responses)
            
            # Max turns reached without completion
            logger.warning(f"Max turns ({self.max_turns}) reached without completion", extra={
                "tools_executed": len(tool_executions)
            })
            
            # Try to get partial answer from last response
            partial_answer = self._extract_text_response(response) or \
                "I need more iterations to complete this analysis."
            
            return {
                "answer": f"{partial_answer}\n\n*Note: Analysis incomplete due to complexity. Please try breaking your question into smaller parts.*",
                "tool_executions": tool_executions,
                "conversation_turns": turn_count,
                "success": False,
                "error": "max_turns_exceeded"
            }
            
        except Exception as e:
            logger.error(f"Function calling error: {str(e)}", exc_info=True, extra={
                "question": question[:100],
                "repository": repository_context.get('full_name', 'unknown')
            })
            
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "tool_executions": tool_executions if 'tool_executions' in locals() else [],
                "conversation_turns": turn_count if 'turn_count' in locals() else 0,
                "success": False,
                "error": str(e)
            }
    
    def _build_system_instruction(self, repo_context: Dict) -> str:
        """
        Build comprehensive system instruction with repository context.
        
        Args:
            repo_context: Repository metadata
            
        Returns:
            System instruction string
        """
        # Extract owner and name from full_name (format: "owner/name")
        full_name = repo_context.get('full_name', 'Unknown/Unknown')
        parts = full_name.split('/')
        repo_owner = parts[0] if len(parts) > 0 else repo_context.get('owner', 'Unknown')
        repo_name = parts[1] if len(parts) > 1 else repo_context.get('name', 'Unknown')
        
        return f"""You are an expert code analyst and assistant for the GitHub repository: {repo_context.get('name', 'Unknown')}

Repository Information:
- Full Name: {full_name}
- Owner: {repo_owner}
- Repository Name: {repo_name}
- Description: {repo_context.get('description', 'No description available')}
- Primary Language: {repo_context.get('language', 'Multiple languages')}
- Stars: {repo_context.get('stars', 0)}

🔴 CRITICAL - WHEN USING GITHUB TOOLS:
All GitHub tools require the following parameters:
- repo_owner: "{repo_owner}"
- repo_name: "{repo_name}"

You MUST use these EXACT values when calling ANY GitHub tool. Do NOT ask the user for repository information.
These values are provided in the context and must be used automatically.

Example tool call for getting commits:
{{
  "repo_owner": "{repo_owner}",
  "repo_name": "{repo_name}",
  "author": "username",
  "limit": 50
}}

You have access to powerful tools that can fetch real-time data from GitHub:

**Commit Tools:**
- get_commits_by_author: Fetch commits by a specific author with date filters
- get_commit_details: Get detailed information about a specific commit including full diff

**Pull Request Tools:**
- get_pull_requests: List pull requests with state filters (open/closed/all)
- get_pull_request_details: Get comprehensive details about a specific PR

**Issue Tools:**
- get_issues: Search issues with filters (state, labels, assignees)
- get_issue_details: Get full details about a specific issue

**Code Analysis Tools:**
- get_commit_diff: Get detailed diff showing what changed in a commit
- compare_commits: Compare two commits or branches to see differences

**Guidelines for Using Tools:**

1. **Always use tools to get accurate data** - Don't make assumptions about commit history, PRs, or issues
2. **Be specific with parameters** - Use exact author names, date ranges, and filters
3. **Call multiple tools if needed** - Gather comprehensive information before answering
4. **Cite your sources** - Include commit SHAs, PR numbers, issue IDs, and GitHub links
5. **Provide context** - Explain what the data means and why it matters
6. **Be concise but thorough** - Give complete answers without unnecessary verbosity

**Response Format:**

For commit-related questions:
- List relevant commits with SHAs (short form: abc1234)
- Include author, date, and message
- Mention files changed and statistics
- Provide GitHub links

For PR-related questions:
- List PRs with numbers (#123)
- Include author, state (open/closed/merged), and dates
- Mention review status and comments
- Provide GitHub links

For issue-related questions:
- List issues with numbers (#456)
- Include labels, assignees, and state
- Mention comments and reactions
- Provide GitHub links

For code change questions:
- Show what files changed
- Include additions/deletions statistics
- Explain the impact of changes
- Reference specific code sections if relevant

**Important:**
- Always verify information using tools before stating facts
- If a tool returns no results, say so clearly
- If you need more information, explain what additional details would help
- Never fabricate commit SHAs, PR numbers, or issue numbers

Now, analyze the user's question and use the appropriate tools to provide an accurate, well-sourced answer."""
    
    def _build_function_response_message(self, function_responses: List[Dict]) -> str:
        """
        Build message containing function responses.
        This is sent back to Gemini after executing tools.
        
        Args:
            function_responses: List of function execution results
            
        Returns:
            Formatted message string
        """
        # Gemini expects function responses in a specific format
        # We'll format them as structured text that Gemini can parse
        messages = []
        
        for fr in function_responses:
            if fr['response']['success']:
                messages.append(
                    f"Tool '{fr['name']}' executed successfully. "
                    f"Results: {fr['response']['data']}"
                )
            else:
                messages.append(
                    f"Tool '{fr['name']}' failed with error: {fr['response']['error']}"
                )
        
        return "\n\n".join(messages)
    
    async def _execute_tool(self, function_call: Dict) -> ToolResponse:
        """
        Execute a tool based on Gemini's function call request.
        
        Args:
            function_call: Dict with 'name' and 'args' keys
            
        Returns:
            ToolResponse from tool execution
        """
        tool_name = function_call['name']
        tool_args = function_call.get('args', {})
        
        logger.debug(f"Executing tool: {tool_name}", extra={
            "tool": tool_name,
            "args": tool_args
        })
        
        # Get tool from registry
        tool = self.tool_registry.get_tool(tool_name)
        if not tool:
            logger.error(f"Tool not found in registry: {tool_name}")
            return ToolResponse(
                success=False,
                data=None,
                error=f"Tool '{tool_name}' not found in registry"
            )
        
        # Execute tool with validation
        try:
            result = await tool.execute_with_validation(**tool_args)
            
            logger.info(f"Tool execution complete: {tool_name}", extra={
                "tool": tool_name,
                "success": result.success,
                "has_data": result.data is not None
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Tool execution exception: {tool_name}", exc_info=True, extra={
                "tool": tool_name,
                "error": str(e)
            })
            
            return ToolResponse(
                success=False,
                data=None,
                error=f"Tool execution failed: {str(e)}"
            )
    
    def _extract_function_calls(self, response) -> List[Dict]:
        """
        Extract function calls from Gemini's response.
        
        Args:
            response: Gemini API response object
            
        Returns:
            List of function call dicts with 'name' and 'args'
        """
        function_calls = []
        
        try:
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if hasattr(part, 'function_call'):
                        fc = part.function_call
                        function_calls.append({
                            'name': fc.name,
                            'args': dict(fc.args) if hasattr(fc, 'args') else {}
                        })
        except Exception as e:
            logger.error(f"Error extracting function calls: {str(e)}", exc_info=True)
        
        return function_calls
    
    def _extract_text_response(self, response) -> str:
        """
        Extract text content from Gemini's response.
        
        Args:
            response: Gemini API response object
            
        Returns:
            Text content or empty string
        """
        try:
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if hasattr(part, 'text'):
                        return part.text
        except Exception as e:
            logger.error(f"Error extracting text response: {str(e)}", exc_info=True)
        
        return ""
    
    def get_available_tools(self) -> List[str]:
        """
        Get list of available tool names.
        
        Returns:
            List of tool names
        """
        return self.tool_registry.list_tool_names()
    
    def get_tool_count(self) -> int:
        """
        Get total number of registered tools.
        
        Returns:
            Tool count
        """
        return self.tool_registry.get_tool_count()
