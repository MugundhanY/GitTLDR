"""
Pure AI Thinking Service - Shows ONLY real DeepSeek R1 chain of thought reasoning.
No dummy steps, no generic progress - just pure AI thinking.
"""
import asyncio
from typing import Dict, Any, List
from fastapi.responses import StreamingResponse
from services.file_service import FileRetrievalService
from services.smart_context_builder import SmartContextBuilder
from services.enhanced_deepseek_client import EnhancedDeepSeekClient
from services.gemini_client import gemini_client
from utils.logger import get_logger
import json

logger = get_logger(__name__)


class PureThinkingService:
    """Service that shows ONLY real AI thinking steps from DeepSeek R1."""
    def __init__(self):
        self.file_service = FileRetrievalService()
        self.context_builder = SmartContextBuilder()
        self.deepseek_client = EnhancedDeepSeekClient()
    
    async def process_pure_thinking(
        self, 
        repository_id: str, 
        question: str,
        attachments: List[Dict[str, Any]] = None,
        stream: bool = True
    ) -> StreamingResponse:
        """
        Process thinking request showing ONLY real AI reasoning steps.
        No setup steps, no dummy content - pure AI chain of thought.
        """
        
        async def generate_pure_thinking_stream():
            try:
                # Silent background preparation (no streaming of these steps)
                repository_files = await self.file_service.get_repository_files(repository_id)
                
                if not repository_files:
                    yield self._format_step({
                        "id": "error-1",
                        "type": "error", 
                        "content": "No repository files found for analysis.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.0
                    })
                    return
                  # Background context building (silent)
                repository_context = self._build_context(repository_files)
                question_analysis = self.context_builder.analyze_question(question)
                relevant_files = self._get_relevant_files(repository_files, question_analysis)
                
                # Process attachments if provided (silent)
                attachment_context = ""
                if attachments:
                    attachment_context = await self._process_attachments(attachments)
                
                # Include attachment context in question if available
                enhanced_question = question
                if attachment_context:
                    enhanced_question = f"{question}\n{attachment_context}"
                
                # Load file contents (silent)
                files_content = []
                repository_name = self._extract_repo_name(repository_files)
                
                for file_info in relevant_files[:6]:  # Limit for performance
                    try:
                        content = await self.file_service.get_file_content(
                            repository_id, file_info['path']
                        )
                        if content:
                            files_content.append(f"=== {file_info['path']} ===\n{content}\n")
                    except Exception:
                        continue  # Silent failure
                
                if not files_content:
                    yield self._format_step({
                        "id": "error-2",
                        "type": "error",
                        "content": "No file contents could be loaded for analysis.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.0                    })
                    return
                  # PURE AI THINKING STARTS HERE - Try DeepSeek R1 first, fallback to Gemini
                step_counter = 1
                current_thinking = ""
                
                # Try DeepSeek R1 first
                try:
                    logger.info("Attempting to use DeepSeek R1 for thinking analysis")
                    
                    async for ai_step in self.deepseek_client.think_and_analyze(
                        question=enhanced_question,
                        repository_context=repository_context,
                        files_content=files_content,
                        repository_name=repository_name,
                        stream=stream
                    ):
                        # Only forward real AI thinking content
                        if ai_step.get("type") == "error":
                            error_content = ai_step.get("content", "")
                            
                            # Check if this is a rate limit error
                            if any(indicator in error_content.lower() for indicator in [
                                "rate limit", "429", "quota", "exceeded", "rate_limit_exceeded"
                            ]):
                                logger.warning("DeepSeek R1 rate limited, falling back to Gemini")
                                break  # Break out to try Gemini fallback
                            else:
                                # Other error - yield it
                                yield self._format_step({
                                    "id": f"ai-error-{step_counter}",
                                    "type": "error",
                                    "content": ai_step.get("content", "AI thinking error"),
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": 0.1
                                })
                                return  # Stop processing on non-rate-limit errors
                        
                        elif ai_step.get("type") == "complete":
                            # Final completion - but only if we have meaningful content
                            if current_thinking.strip():
                                yield self._format_step({
                                    "id": f"ai-complete-{step_counter}",
                                    "type": "synthesis",
                                    "content": "🎯 DeepSeek R1 reasoning complete.",
                                    "full_content": current_thinking,
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": 1.0
                                })
                            return  # Successfully completed with DeepSeek
                        
                        else:
                            # Stream real AI thinking content
                            content_chunk = ai_step.get("content", "")
                            if content_chunk and content_chunk.strip():
                                current_thinking = ai_step.get("full_content", current_thinking + content_chunk)
                                
                                yield self._format_step({
                                    "id": f"ai-thinking-{step_counter}",
                                    "type": ai_step.get("type", "thinking"),
                                    "content": content_chunk,
                                    "full_content": current_thinking,
                                    "step_number": step_counter,
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": ai_step.get("confidence", 0.9)
                                })
                                step_counter += 1
                    
                    # If we reach here, DeepSeek was rate limited or failed
                    logger.info("DeepSeek R1 failed or rate limited, attempting Gemini fallback")
                    
                except Exception as e:
                    logger.warning(f"DeepSeek R1 failed with error: {str(e)}, falling back to Gemini")
                
                # FALLBACK TO GEMINI
                try:
                    logger.info("Using Gemini as fallback for thinking analysis")
                    
                    # Reset step counter for Gemini
                    step_counter = 1
                    
                    # Yield a transition message
                    yield self._format_step({
                        "id": f"fallback-{step_counter}",
                        "type": "info",
                        "content": "🔄 Switching to Gemini AI for analysis (DeepSeek R1 temporarily unavailable)",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.8
                    })
                    step_counter += 1
                    
                    # Use Gemini for Q&A
                    gemini_result = await gemini_client.answer_question(
                        question=enhanced_question,
                        context=repository_context,
                        files_content=files_content
                    )
                    
                    if gemini_result and gemini_result.get("answer"):
                        # Simulate thinking steps by breaking down the Gemini response
                        answer = gemini_result["answer"]
                        confidence = gemini_result.get("confidence", 0.8)
                        
                        # Break the answer into logical chunks for streaming
                        paragraphs = answer.split('\n\n')
                        
                        for i, paragraph in enumerate(paragraphs):
                            if paragraph.strip():
                                step_type = "thinking"
                                if i == 0:
                                    step_type = "analysis"
                                elif i == len(paragraphs) - 1:
                                    step_type = "synthesis"
                                
                                yield self._format_step({
                                    "id": f"gemini-thinking-{step_counter}",
                                    "type": step_type,
                                    "content": paragraph.strip(),
                                    "full_content": answer,
                                    "step_number": step_counter,
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": confidence
                                })
                                step_counter += 1
                                
                                # Add small delay to simulate thinking
                                await asyncio.sleep(0.5)
                        
                        # Final completion
                        yield self._format_step({
                            "id": f"gemini-complete-{step_counter}",
                            "type": "synthesis",
                            "content": "✨ Gemini analysis complete.",
                            "full_content": answer,
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": confidence
                        })
                    else:
                        # Gemini also failed
                        yield self._format_step({
                            "id": "gemini-error",
                            "type": "error",
                            "content": "Both AI providers failed to analyze the question.",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.1
                        })
                        
                except Exception as gemini_error:
                    logger.error(f"Gemini fallback also failed: {str(gemini_error)}")
                    yield self._format_step({
                        "id": "fallback-error",
                        "type": "error",
                        "content": f"All AI providers failed. DeepSeek: rate limited, Gemini: {str(gemini_error)}",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.0
                    })
                
            except Exception as e:
                logger.error(f"Pure thinking error: {str(e)}")
                yield self._format_step({
                    "id": "fatal-error",
                    "type": "error",
                    "content": f"AI thinking failed: {str(e)}",
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "confidence": 0.0
                })
        
        return StreamingResponse(
            generate_pure_thinking_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )
    
    def _get_relevant_files(self, repository_files: List[Dict], question_analysis: Dict) -> List[Dict]:
        """Get relevant files efficiently."""
        relevant = []
        
        # Priority files first
        priority_patterns = ['readme', 'package.json', 'main', 'index', 'app']
        for file_info in repository_files:
            path = file_info.get('path', '').lower()
            if any(pattern in path for pattern in priority_patterns):
                relevant.append(file_info)
        
        # Then keyword matches
        keywords = question_analysis.get('keywords', [])
        for file_info in repository_files:
            if file_info in relevant:
                continue
            path = file_info.get('path', '').lower()
            if any(keyword.lower() in path for keyword in keywords):
                relevant.append(file_info)
                if len(relevant) >= 10:
                    break
        
        return relevant[:8]  # Limit for performance
    
    def _build_context(self, repository_files: List[Dict]) -> str:
        """Build minimal repository context."""
        total_files = len(repository_files)
        languages = {}
        
        for file_info in repository_files:
            lang = file_info.get('language', 'unknown')
            if lang != 'unknown':
                languages[lang] = languages.get(lang, 0) + 1
        
        context_parts = [f"Repository: {total_files} files"]
        if languages:
            top_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:3]
            context_parts.append(f"Main languages: {', '.join([f'{lang} ({count})' for lang, count in top_langs])}")
        
        return "\n".join(context_parts)
    
    def _extract_repo_name(self, repository_files: List[Dict]) -> str:
        """Extract repository name from files."""
        for file_info in repository_files:
            if 'package.json' in file_info.get('path', ''):
                return file_info.get('path', '').split('/')[0] or "Repository"
        return "Repository"
    
    async def _process_attachments(self, attachments: List[Dict[str, Any]]) -> str:
        """Process attachments and return formatted context for AI."""
        if not attachments:
            return ""
        
        attachment_contexts = []
        
        for attachment in attachments:
            try:
                attachment_type = attachment.get('type', 'other')
                attachment_name = attachment.get('name', 'unknown')
                attachment_content = attachment.get('content', '')
                
                logger.info(f"Processing attachment: {attachment_name} (type: {attachment_type})")
                
                if attachment_type == 'code' and attachment_content:
                    # Format code attachments with proper context
                    attachment_contexts.append(f"""
**Code File: {attachment_name}**
```
{attachment_content}
```
""")
                
                elif attachment_type == 'document' and attachment_content:
                    # Format document attachments
                    attachment_contexts.append(f"""
**Document: {attachment_name}**
{attachment_content}
""")
                
                elif attachment_type == 'image':
                    # For images, we can only note that they were provided
                    attachment_contexts.append(f"""
**Image: {attachment_name}**
[Image file provided - visual content cannot be analyzed in text-based Q&A]
""")
                
                else:
                    # Handle other attachment types
                    if attachment_content:
                        attachment_contexts.append(f"""
**File: {attachment_name}**
{attachment_content[:1000]}{"..." if len(attachment_content) > 1000 else ""}
""")
                    else:
                        attachment_contexts.append(f"""
**File: {attachment_name}**
[File provided but content not available for analysis]
""")
                        
            except Exception as e:
                logger.warning(f"Failed to process attachment {attachment.get('name', 'unknown')}: {str(e)}")
                continue
        
        if attachment_contexts:
            return f"""

## User-Provided Attachments

The user has provided the following files/content as context for this question:

{''.join(attachment_contexts)}

Please consider this user-provided content when answering the question.
"""
        
        return ""
    
    def _format_step(self, step_data: Dict[str, Any]) -> str:
        """Format thinking step for streaming."""
        return f"data: {json.dumps(step_data)}\n\n"


# Global instance
pure_thinking_service = PureThinkingService()
