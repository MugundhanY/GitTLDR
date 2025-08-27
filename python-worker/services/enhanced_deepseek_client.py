"""
Enhanced DeepSeek-style streaming for better UX with proper rate limit handling.
Shows complete thoughts instead of word fragments.
"""
import asyncio
import re
from typing import Dict, Any, List, AsyncGenerator
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class EnhancedDeepSeekClient:
    """Enhanced GitHub DeepSeek client with better streaming UX and rate limit handling."""
    
    def __init__(self):
        """Initialize enhanced DeepSeek client."""
        self.settings = get_settings()
        self.endpoint = "https://models.github.ai/inference"
        self.model_name = "deepseek/DeepSeek-R1"
        self.github_token = self.settings.github_token
        self.client = None
        
    def _get_client(self) -> ChatCompletionsClient:
        """Get or create Azure AI Inference client."""
        if self.client is None:
            if not self.github_token:
                raise ValueError("GitHub token not configured")
                
            self.client = ChatCompletionsClient(
                endpoint=self.endpoint,
                credential=AzureKeyCredential(self.github_token),
            )
        return self.client
    
    async def think_and_analyze(
        self, 
        question: str, 
        repository_context: str, 
        files_content: List[str],
        repository_name: str,
        stream: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Enhanced thinking with better streaming UX - shows complete thoughts.
        """
        if not self.github_token:
            logger.error("GitHub token not configured")
            yield {
                "type": "error",
                "content": "GitHub token not configured. Please set GITHUB_TOKEN environment variable.",
                "timestamp": asyncio.get_event_loop().time()
            }
            return
            
        try:
            # Build comprehensive prompt
            prompt = self._build_enhanced_prompt(
                question, repository_name, repository_context, files_content
            )
            
            client = self._get_client()
            
            # Enhanced system message for better thinking structure
            messages = [
                SystemMessage(content="""You are an expert software engineer with deep reasoning capabilities. 

I want to see your step-by-step thinking process as you analyze code. Think in complete, well-formed sentences and paragraphs. Structure your analysis clearly:

**Step 1: Understanding the Question**
Start by breaking down what's being asked. Be explicit about your understanding.

**Step 2: Code Analysis** 
Examine the code structure, patterns, and key files. Reference specific code when relevant.

**Step 3: Making Connections**
Connect different parts of the codebase. Show how components interact.

**Step 4: Drawing Conclusions**
Synthesize your findings into a comprehensive answer.

Write naturally as if explaining your thought process to a colleague. Use complete sentences and clear paragraphs."""),
                UserMessage(content=prompt)
            ]
            
            logger.info(f"Starting enhanced DeepSeek analysis for: {question[:100]}...")
            
            if stream:
                # Enhanced streaming logic with timeout and rate limit handling
                try:
                    # Add timeout to prevent long waits on rate limits
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            lambda: client.complete(
                                stream=True,
                                messages=messages,
                                model=self.model_name,
                                max_tokens=4000,
                                temperature=0.7,
                                model_extras={'stream_options': {'include_usage': True}}
                            )
                        ),
                        timeout=30.0  # 30 second timeout
                    )
                except asyncio.TimeoutError:
                    logger.warning("DeepSeek API request timed out (30s), likely rate limited")
                    yield {
                        "type": "error",
                        "content": "rate limit exceeded - API request timed out",
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    return
                
                # Enhanced buffering strategy
                full_content = ""
                paragraph_buffer = ""
                step_counter = 1
                last_send_time = asyncio.get_event_loop().time()
                
                for update in response:
                    if update.choices and update.choices[0].delta:
                        content_chunk = update.choices[0].delta.content or ""
                        if content_chunk:
                            # Fix f-string backslash issue
                            clean_content = content_chunk[:120].replace('\n', ' ')
                            logger.info(f"[DeepSeek STREAM] Reasoning step: {clean_content} ...")
                            full_content += content_chunk
                            paragraph_buffer += content_chunk
                            
                            # Send on paragraph breaks (double newlines)
                            if '\n\n' in paragraph_buffer and len(paragraph_buffer.strip()) > 50:
                                paragraph_text = paragraph_buffer.split('\n\n')[0].strip()
                                if paragraph_text:
                                    step_type = self._determine_step_type(paragraph_text)
                                    
                                    yield {
                                        "type": step_type,
                                        "content": paragraph_text,
                                        "full_content": full_content,
                                        "step_number": step_counter,
                                        "timestamp": asyncio.get_event_loop().time(),
                                        "confidence": 0.9
                                    }
                                    
                                    step_counter += 1
                                    # Keep remaining content after paragraph break
                                    remaining = '\n\n'.join(paragraph_buffer.split('\n\n')[1:])
                                    paragraph_buffer = remaining
                                    last_send_time = asyncio.get_event_loop().time()
                            
                            # Send on complete sentences with substantial content
                            elif (paragraph_buffer.count('.') >= 2 and 
                                  len(paragraph_buffer.strip()) > 100 and
                                  paragraph_buffer.strip().endswith(('.', '!', '?'))):
                                
                                step_type = self._determine_step_type(paragraph_buffer)
                                
                                yield {
                                    "type": step_type,
                                    "content": paragraph_buffer.strip(),
                                    "full_content": full_content,
                                    "step_number": step_counter,
                                    "timestamp": asyncio.get_event_loop().time(),
                                    "confidence": 0.9
                                }
                                
                                step_counter += 1
                                paragraph_buffer = ""
                                last_send_time = asyncio.get_event_loop().time()
                            
                            # Time-based sending for very long thoughts
                            elif (asyncio.get_event_loop().time() - last_send_time > 3.0 and 
                                  len(paragraph_buffer.strip()) > 80):
                                
                                # Find a good breaking point
                                sentences = re.split(r'[.!?]+', paragraph_buffer)
                                if len(sentences) > 1:
                                    # Send complete sentences, keep the last incomplete one
                                    complete_text = '. '.join(sentences[:-1]) + '.'
                                    step_type = self._determine_step_type(complete_text)
                                    
                                    yield {
                                        "type": step_type,
                                        "content": complete_text.strip(),
                                        "full_content": full_content,
                                        "step_number": step_counter,
                                        "timestamp": asyncio.get_event_loop().time(),
                                        "confidence": 0.9
                                    }
                                    
                                    step_counter += 1
                                    paragraph_buffer = sentences[-1]  # Keep incomplete sentence
                                    last_send_time = asyncio.get_event_loop().time()
                
                # Send any remaining content
                if paragraph_buffer.strip():
                    yield {
                        "type": "thinking",
                        "content": paragraph_buffer.strip(),
                        "full_content": full_content,
                        "step_number": step_counter,
                        "timestamp": asyncio.get_event_loop().time(),
                        "confidence": 0.9
                    }
                
                # Final completion
                yield {
                    "type": "complete",
                    "content": "✅ Analysis complete",
                    "full_content": full_content,
                    "timestamp": asyncio.get_event_loop().time(),
                    "confidence": 1.0
                }
                
            else:
                # Non-streaming response
                response = client.complete(
                    messages=messages,
                    model=self.model_name,
                    max_tokens=4000,
                    temperature=0.7
                )
                
                content = response.choices[0].message.content
                yield {
                    "type": "thinking",
                    "content": content,
                    "timestamp": asyncio.get_event_loop().time(),
                    "confidence": 0.9
                }
                        
        except HttpResponseError as e:
            # Handle specific HTTP errors, especially rate limiting
            error_msg = str(e)
            logger.error(f"Enhanced DeepSeek HTTP error: {error_msg}")
            
            # Check if this is a rate limit error (429)
            if e.status_code == 429 or "rate limit" in error_msg.lower() or "RateLimitReached" in error_msg:
                yield {
                    "type": "error",
                    "content": f"rate limit exceeded: {error_msg}",
                    "timestamp": asyncio.get_event_loop().time()
                }
            else:
                yield {
                    "type": "error",
                    "content": f"AI API error: {error_msg}",
                    "timestamp": asyncio.get_event_loop().time()
                }
        except Exception as e:
            logger.error(f"Enhanced DeepSeek error: {str(e)}")
            yield {
                "type": "error",
                "content": f"AI thinking failed: {str(e)}",
                "timestamp": asyncio.get_event_loop().time()
            }
    
    def _determine_step_type(self, content: str) -> str:
        """Determine thinking step type based on content."""
        content_lower = content.lower()
        
        # Step patterns
        if any(phrase in content_lower for phrase in [
            "step 1", "understanding", "break down", "first, let me", "looking at this question"
        ]):
            return "analysis"
        elif any(phrase in content_lower for phrase in [
            "step 2", "examining", "looking at", "in this file", "the code shows", "structure"
        ]):
            return "search"
        elif any(phrase in content_lower for phrase in [
            "step 3", "connecting", "putting together", "interact", "how components"
        ]):
            return "synthesis"
        elif any(phrase in content_lower for phrase in [
            "step 4", "conclusion", "therefore", "in summary", "overall"
        ]):
            return "synthesis"
        else:
            return "thinking"
    
    def _build_enhanced_prompt(
        self,
        question: str,
        repository_name: str,
        repository_context: str,
        files_content: List[str]
    ) -> str:
        """Build an enhanced prompt for better AI thinking."""
        
        # Limit context to prevent overwhelming the model
        max_context_length = 8000
        truncated_context = repository_context[:max_context_length]
        if len(repository_context) > max_context_length:
            truncated_context += "\n... (context truncated for clarity)"
        
        # Format file contents nicely
        formatted_files = ""
        for i, file_content in enumerate(files_content[:5]):  # Limit to 5 files
            if file_content.strip():
                formatted_files += f"\n--- File {i+1} ---\n{file_content[:2000]}\n"
                if len(file_content) > 2000:
                    formatted_files += "... (file content truncated)\n"
        
        prompt = f"""
REPOSITORY: {repository_name}

QUESTION TO ANALYZE:
{question}

REPOSITORY CONTEXT:
{truncated_context}

RELEVANT FILES:
{formatted_files}

Please think through this step by step, showing your complete reasoning process. Structure your analysis clearly and reference specific code when relevant.
"""
        
        return prompt


# Create singleton instance for easy importing
deepseek_client = EnhancedDeepSeekClient()
