"""
GitHub Models API Client with DeepSeek R1 for GitTLDR Python Worker.
Handles AI reasoning and thinking with streaming support using GitHub Copilot's DeepSeek R1.
"""
import asyncio
import os
import re
from typing import Dict, Any, List, AsyncGenerator, Optional
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class GitHubDeepSeekClient:
    """Client for GitHub Models API with DeepSeek R1 reasoning capabilities."""
    
    def __init__(self):
        """Initialize GitHub DeepSeek client."""
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
        Perform thinking and analysis using DeepSeek R1 model through GitHub Models API.
        
        Args:
            question: The user's question
            repository_context: Basic repository information
            files_content: List of relevant file contents
            repository_name: Name of the repository
            stream: Whether to stream the response
            
        Yields:
            Thinking steps and analysis results
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
            # Build comprehensive prompt with file context
            prompt = self._build_thinking_prompt(
                question, repository_name, repository_context, files_content
            )
            
            client = self._get_client()
              # Create messages for the conversation
            messages = [
                SystemMessage(content="""You are an expert software engineer with deep reasoning capabilities using the DeepSeek R1 model. 

When analyzing code questions, I want you to show your actual thinking process step by step. Think out loud in complete thoughts and sentences as you:

1. **Break down the question**: What exactly is being asked?
2. **Analyze the codebase**: What patterns, frameworks, and structures do you see?
3. **Examine specific files**: Look at the implementation details
4. **Connect the dots**: How do different parts work together?
5. **Reason through the answer**: Build up your understanding piece by piece
6. **Provide the solution**: Give a comprehensive, well-reasoned answer

Structure your thinking in clear, complete sentences. Use phrases like:
- "Let me start by understanding..."
- "Looking at this code, I can see..."
- "This suggests that..."
- "Now I need to examine..."
- "Based on what I've found..."
- "The key insight here is..."

Show your reasoning process naturally - don't just give the final answer, but walk through how you arrived at it. Reference specific code when relevant."""),
                UserMessage(content=prompt)            ]
            
            logger.info(f"Starting GitHub DeepSeek R1 analysis for question: {question[:100]}...")
            
            if stream:# Stream the response for real-time thinking steps with timeout
                try:
                    # Set a 30-second timeout for the initial request
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            client.complete,
                            stream=True,
                            messages=messages,
                            model=self.model_name,
                            max_tokens=4000,
                            temperature=0.7,
                            model_extras={'stream_options': {'include_usage': True}}
                        ),
                        timeout=30.0  # 30-second timeout
                    )
                except asyncio.TimeoutError:
                    # Handle timeout - this means DeepSeek is taking too long (likely rate limited)
                    logger.warning("DeepSeek API timeout after 30 seconds, likely rate limited")
                    yield {
                        "type": "error",
                        "content": "RATE_LIMIT_EXCEEDED: DeepSeek API timeout (likely rate limited)",
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    return
                except Exception as api_error:
                    # Handle API errors immediately (like rate limits)
                    error_msg = str(api_error)
                    logger.error(f"DeepSeek API error: {error_msg}")
                    
                    # Check if this is a rate limit error (including Azure/GitHub specific error codes)
                    if any(indicator in error_msg.lower() for indicator in [
                        "rate limit", "429", "quota", "exceeded", "ratelimitreached", 
                        "rate_limit_exceeded", "too many requests", "rateLimitReached"
                    ]) or "Response status: 429" in error_msg:
                        logger.warning("DeepSeek rate limit detected immediately - yielding error for fallback")
                        yield {
                            "type": "error",
                            "content": "RATE_LIMIT_EXCEEDED: DeepSeek API rate limit reached",
                            "timestamp": asyncio.get_event_loop().time()
                        }
                        return
                    else:
                        yield {
                            "type": "error", 
                            "content": f"DeepSeek API failed: {error_msg}",
                            "timestamp": asyncio.get_event_loop().time()                        }
                        return
                
                current_content = ""
                thought_buffer = ""
                step_counter = 1
                last_send_time = asyncio.get_event_loop().time()
                
                # Track sentence boundaries and thought segments
                sentence_buffer = ""
                thinking_segment = ""
                
                try:
                    # Add timeout for streaming iteration as well
                    async def stream_with_timeout():
                        last_update_time = asyncio.get_event_loop().time()
                        for update in response:
                            current_time = asyncio.get_event_loop().time()
                            
                            # Check if we haven't received updates for too long (30 seconds)
                            if current_time - last_update_time > 30.0:
                                raise asyncio.TimeoutError("No updates received for 30 seconds")
                            
                            if update.choices and update.choices[0].delta:
                                content_chunk = update.choices[0].delta.content or ""
                                if content_chunk:
                                    last_update_time = current_time  # Reset timeout when we get content
                                    yield update
                                else:
                                    yield update
                            else:
                                yield update
                    
                    async for update in stream_with_timeout():
                        if update.choices and update.choices[0].delta:
                            content_chunk = update.choices[0].delta.content or ""
                            if content_chunk:
                                current_content += content_chunk
                                thought_buffer += content_chunk
                                sentence_buffer += content_chunk
                                
                                current_time = asyncio.get_event_loop().time()
                                
                                # DeepSeek-style streaming: Stream complete thoughts, not broken sentences
                                should_send = False
                                send_content = ""
                                
                                # 1. Detect thinking block boundaries (like DeepSeek's <thinking> blocks)
                                if self._is_thinking_block_boundary(thought_buffer):
                                    should_send = True
                                    send_content = thought_buffer.strip()
                                    thought_buffer = ""
                                    
                                # 2. Send complete logical thoughts (multiple sentences about one idea)
                                elif self._is_complete_thought(sentence_buffer):
                                    should_send = True
                                    send_content = sentence_buffer.strip()
                                    sentence_buffer = ""
                                    
                                # 3. Send on natural paragraph breaks (double newlines)
                                elif '\n\n' in thought_buffer and len(thought_buffer.strip()) > 40:
                                    # Find the paragraph break and send up to that point
                                    parts = thought_buffer.split('\n\n', 1)
                                    send_content = parts[0].strip()
                                    if send_content:
                                        should_send = True
                                        thought_buffer = '\n\n' + parts[1] if len(parts) > 1 else ""
                                        sentence_buffer = ""
                                        
                                # 4. Emergency flush for very long content (prevent UI blocking)
                                elif len(thought_buffer) > 500:
                                    # Find a good break point (sentence end or phrase boundary)
                                    break_point = self._find_natural_break_point(thought_buffer)
                                    if break_point > 0:
                                        send_content = thought_buffer[:break_point].strip()
                                        thought_buffer = thought_buffer[break_point:].strip()
                                        sentence_buffer = ""
                                        should_send = True
                                
                                if should_send and send_content:
                                    step_type = self._determine_thinking_type(send_content, current_content)
                                    
                                    yield {
                                        "type": step_type,
                                        "content": send_content,
                                        "full_content": current_content,
                                        "step_number": step_counter,
                                        "timestamp": current_time,
                                        "confidence": 0.9
                                    }
                                    
                                    step_counter += 1
                                    last_send_time = current_time
                except asyncio.TimeoutError:
                    # Handle streaming timeout - DeepSeek stopped responding
                    logger.warning("DeepSeek streaming timeout - no updates for 30 seconds")
                    yield {
                        "type": "error",
                        "content": "RATE_LIMIT_EXCEEDED: DeepSeek streaming timeout",
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    return
                except Exception as streaming_error:
                    # Handle errors that occur during streaming iteration
                    streaming_error_msg = str(streaming_error)
                    logger.error(f"Error during streaming iteration: {streaming_error_msg}")
                    
                    # Check if this is a rate limit error during streaming
                    if any(indicator in streaming_error_msg.lower() for indicator in [
                        "rate limit", "429", "quota", "exceeded", "ratelimitreached", 
                        "rate_limit_exceeded", "too many requests"
                    ]):
                        logger.warning("Rate limit detected during streaming, yielding error for fallback")
                        yield {
                            "type": "error",
                            "content": "RATE_LIMIT_EXCEEDED: DeepSeek API rate limit reached during streaming",
                            "timestamp": asyncio.get_event_loop().time()                        }
                        return
                    else:
                        # Other streaming errors
                        yield {
                            "type": "error",
                            "content": f"Streaming error: {streaming_error_msg}",
                            "timestamp": asyncio.get_event_loop().time()
                        }
                        return
                
                # Send any remaining content in buffer
                if thought_buffer.strip():
                    yield {
                        "type": "thinking",
                        "content": thought_buffer.strip(),
                        "full_content": current_content,
                        "step_number": step_counter,
                        "timestamp": asyncio.get_event_loop().time(),
                        "confidence": 0.9
                    }
                
                # Final completion step
                yield {
                    "type": "complete",
                    "content": "Analysis complete",
                    "full_content": current_content,
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
                        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in GitHub DeepSeek thinking process: {error_msg}")
            
            # Check if this is a rate limit error
            if any(indicator in error_msg.lower() for indicator in [
                "rate limit", "429", "quota", "exceeded", "ratelimitreached", 
                "rate_limit_exceeded", "too many requests"            ]):
                yield {
                    "type": "error",
                    "content": "RATE_LIMIT_EXCEEDED: DeepSeek API rate limit reached",
                    "timestamp": asyncio.get_event_loop().time()
                }
            else:
                yield {
                    "type": "error", 
                    "content": f"AI thinking process failed: {error_msg}",
                    "timestamp": asyncio.get_event_loop().time()
                }
    
    def _determine_thinking_type(self, content_chunk: str, full_content: str) -> str:
        """
        Determine the type of thinking step based on content.
        
        Args:
            content_chunk: Current chunk of content
            full_content: Full content so far
            
        Returns:
            Type of thinking step
        """
        content_lower = content_chunk.lower()
        
        # Patterns that indicate different thinking phases
        if any(phrase in content_lower for phrase in [
            "let me break down", "first, let me", "to understand", "looking at this question"
        ]):
            return "analysis"
        elif any(phrase in content_lower for phrase in [
            "examining", "looking at the", "in this file", "the code shows"
        ]):
            return "search"
        elif any(phrase in content_lower for phrase in [
            "connecting", "putting together", "combining", "overall"
        ]):
            return "synthesis"
        elif any(phrase in content_lower for phrase in [
            "thinking", "reasoning", "considering", "hmm", "actually"
        ]):
            return "thinking"
        else:
            return "thinking"  # Default to thinking
    
    def _build_thinking_prompt(
        self, 
        question: str, 
        repository_name: str, 
        repository_context: str, 
        files_content: List[str]
    ) -> str:
        """Build a comprehensive prompt for the thinking model."""
        
        prompt_parts = [
            f"I need help understanding the codebase '{repository_name}' to answer this question:",
            "",
            f"**QUESTION**: {question}",
            "",
            "**REPOSITORY CONTEXT**:",
            repository_context,
            ""
        ]
        
        if files_content:
            prompt_parts.extend([
                "**RELEVANT FILES CONTENT**:",
                "=" * 60
            ])
            
            for i, file_content in enumerate(files_content[:8]):  # Limit to 8 files for token efficiency
                prompt_parts.extend([
                    f"**FILE {i+1}**:",
                    file_content,
                    "-" * 40,
                    ""
                ])
        
        prompt_parts.extend([
            "**INSTRUCTIONS**:",
            "Please analyze this codebase step by step and show your thinking process as you work through the question.",
            "",
            "I want to see your reasoning process as you:",
            "• Break down what the question is asking",
            "• Examine the code structure and patterns", 
            "• Look at specific implementations and logic",
            "• Connect different parts of the codebase",
            "• Build up to a comprehensive answer",
            "",
            "Think out loud and reference specific code when relevant. Show your work!"
        ])
        
        return "\n".join(prompt_parts)
    
    def _should_send_thinking_chunk(self, buffer: str, full_content: str, last_chunk_time: float) -> tuple[bool, str]:
        """
        Determine if we should send the current buffer as a thinking step.
        Returns (should_send, reason) for better control and debugging.
        """
        buffer_stripped = buffer.strip()
        current_time = asyncio.get_event_loop().time()
        
        # Don't send empty or very short chunks
        if len(buffer_stripped) < 15:
            return False, "too_short"
        
        # Send when we have complete sentences or clear thought boundaries
        sentence_endings = ['. ', '! ', '? ', ':\n', '.\n', '!\n', '?\n']
        if any(buffer_stripped.endswith(ending.strip()) for ending in sentence_endings):
            return True, "sentence_complete"
        
        # Send when we detect paragraph breaks or thinking transitions
        paragraph_breaks = ['\n\n', '\n\n\n']
        if any(break_pattern in buffer for break_pattern in paragraph_breaks):
            return True, "paragraph_break"
            
        # Send when we detect thinking transition phrases
        thinking_transitions = [
            'let me think about', 'now let me', 'first, i need to', 'looking at this',
            'examining the', 'i can see that', 'this tells me', 'what i notice',
            'based on this', 'moving on to', 'next, let me', 'so far i',
            'from what i can tell', 'it appears that', 'this suggests',
            'the key thing here', 'importantly,', 'however,', 'therefore,'
        ]
        
        buffer_lower = buffer_stripped.lower()
        for transition in thinking_transitions:
            if transition in buffer_lower and len(buffer_stripped) > 40:
                return True, f"thinking_transition:{transition}"
        
        # Send when buffer gets reasonably long (complete thoughts)
        if len(buffer_stripped) > 150:
            # Look for a good breaking point within the last 50 characters
            break_points = ['. ', ', ', ' and ', ' but ', ' so ', ' because ']
            for i, char in enumerate(buffer_stripped[-50:]):
                for break_point in break_points:
                    if buffer_stripped[-(50-i):].startswith(break_point):
                        return True, "natural_break"
            return True, "length_limit"
        
        # Time-based sending (if too much time has passed, send what we have)
        if current_time - last_chunk_time > 2.0 and len(buffer_stripped) > 25:
            return True, "time_based"
        
        return False, "accumulating"

    def _should_send_chunk(self, buffer: str, full_content: str) -> bool:
        """
        Determine if we should send the current buffer as a thinking step.
        
        Args:
            buffer: Current accumulated content buffer
            full_content: Full content accumulated so far
            
        Returns:
            True if we should send this chunk as a thinking step
        """
        # Send chunk if buffer has meaningful content
        buffer_stripped = buffer.strip()
        
        # Don't send empty or very short chunks
        if len(buffer_stripped) < 10:
            return False
        
        # Send when we have complete sentences or thoughts
        sentence_endings = ['.', '!', '?', ':', '\n\n']
        if any(buffer_stripped.endswith(ending) for ending in sentence_endings):
            return True
            
        # Send when buffer gets reasonably long (a complete thought)
        if len(buffer_stripped) > 100:
            return True
            
        # Send when we detect thinking patterns
        thinking_patterns = [
            'let me think', 'i need to', 'looking at', 'examining', 
            'this shows', 'i can see', 'it appears', 'this means',
            'so far', 'next', 'now', 'however', 'therefore', 'because'
        ]
        buffer_lower = buffer_stripped.lower()
        if any(pattern in buffer_lower for pattern in thinking_patterns):
            # Check if we have enough content after the pattern
            if len(buffer_stripped) > 30:
                return True
        
        return False

    def _has_thinking_transition(self, buffer: str) -> bool:
        """Check if buffer contains thinking transition phrases."""
        thinking_transitions = [
            'let me think about', 'now let me', 'first, i need to', 'looking at this',
            'examining the', 'i can see that', 'this tells me', 'what i notice',
            'based on this', 'moving on to', 'next, let me', 'so far i',
            'from what i can tell', 'it appears that', 'this suggests',
            'the key thing here', 'importantly,', 'however,', 'therefore,'
        ]
        
        buffer_lower = buffer.lower()
        return any(transition in buffer_lower for transition in thinking_transitions)

    def _is_thinking_block_boundary(self, content: str) -> bool:
        """Detect if we're at a natural thinking block boundary."""
        # Look for patterns that indicate end of a thinking block
        thinking_boundaries = [
            "</thinking>", 
            "<thinking>",
            "---",
            "###",
            "**Conclusion:**",
            "**Analysis:**",
            "**Summary:**"
        ]
        
        for boundary in thinking_boundaries:
            if boundary in content:
                return True
        return False
    
    def _is_complete_thought(self, content: str) -> bool:
        """Determine if the content represents a complete logical thought."""
        content = content.strip()
        
        # Must have reasonable length
        if len(content) < 30:
            return False
            
        # Check for complete thought indicators
        complete_thought_patterns = [
            # Ends with conclusion
            r'\.\s*(?:This suggests?|This means?|Therefore|So|Thus|Hence)',
            # Explanation followed by conclusion
            r'\.\s*(?:In other words|Essentially|Basically)',
            # Question followed by answer
            r'\?\s*[A-Z][^.]*\.',
            # Complete reasoning chain
            r'because\s+[^.]*\.\s*(?:This|That|It)',
        ]
        
        for pattern in complete_thought_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True
                
        # Check for natural sentence completion with sufficient context
        if (content.endswith(('.', '!', '?')) and 
            len(content.split('.')) >= 2 and  # At least 2 sentences
            any(word in content.lower() for word in [
                'because', 'since', 'therefore', 'thus', 'so', 'this means',
                'which shows', 'indicating', 'suggesting', 'revealing'
            ])):
            return True
            
        return False
    
    def _find_natural_break_point(self, content: str) -> int:
        """Find a natural place to break long content."""
        # Preferred break points in order of preference
        break_patterns = [
            r'\.\s+(?=[A-Z])',  # Sentence boundary followed by capital letter
            r'\?\s+(?=[A-Z])',  # Question boundary
            r'!\s+(?=[A-Z])',   # Exclamation boundary
            r':\s+(?=[A-Z])',   # Colon followed by capital letter
            r';\s+(?=[A-Z])',   # Semicolon
            r',\s+(?=(?:however|therefore|thus|so|but|and|yet|or))',  # Comma before conjunctions
            r'\s+(?=(?:However|Therefore|Thus|So|But|And|Yet|Or))',   # Space before conjunctions
        ]
        
        for pattern in break_patterns:
            matches = list(re.finditer(pattern, content))
            if matches:
                # Take the match closest to middle of content
                target_pos = len(content) // 2
                best_match = min(matches, key=lambda m: abs(m.end() - target_pos))
                return best_match.end()
        
        # Fallback: break at last space before halfway point
        halfway = len(content) // 2
        last_space = content.rfind(' ', 0, halfway)
        return last_space if last_space > 0 else halfway

    def close(self):
        """Close the client connection."""
        if self.client:
            self.client.close()
            self.client = None


# Global instance
deepseek_client = GitHubDeepSeekClient()
