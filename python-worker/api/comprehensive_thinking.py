"""
Comprehensive thinking API endpoint that handles both file retrieval and AI reasoning.
This replaces the separate thinking-context and thinking endpoints for better performance.
"""
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from services.file_service import FileRetrievalService
from services.smart_context_builder import SmartContextBuilder
from services.deepseek_client import deepseek_client
from services.gemini_client import gemini_client
from utils.logger import get_logger
import json
import re

logger = get_logger(__name__)


class ComprehensiveThinkingService:
    """Service that handles complete thinking process: file retrieval + AI reasoning."""
    
    def __init__(self):
        self.file_service = FileRetrievalService()
        self.context_builder = SmartContextBuilder()
    
    async def process_thinking_request(
        self, 
        repository_id: str, 
        question: str,
        attachments: List[Dict[str, Any]] = None,
        stream: bool = True
    ) -> StreamingResponse:
        """
        Process a complete thinking request with file context and AI reasoning.
        
        Args:
            repository_id: ID of the repository to analyze
            question: The user's question
            attachments: List of user-provided attachments
            stream: Whether to stream the response
            
        Returns:
            StreamingResponse with thinking steps and analysis
        """
        
        async def generate_thinking_stream():
            try:
                # MINIMAL SETUP - Get data quickly without streaming generic steps
                repository_files = await self.file_service.get_repository_files(repository_id)
                
                if not repository_files:
                    yield self._format_thinking_step({
                        "id": f"error-{int(asyncio.get_event_loop().time() * 1000)}",
                        "type": "error",
                        "content": "❌ No files found for this repository. Repository may not be processed yet.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.1
                    })
                    return
                
                # Quick context building (no streaming of these steps)
                repository_context = self._build_repository_context(repository_files)
                question_analysis = self.context_builder.analyze_question(question)
                logger.info(f"Question analysis: {question_analysis}")
                
                # Find relevant files efficiently 
                relevant_files = self._find_relevant_files(repository_files, question_analysis)
                
                # Load file contents quickly
                files_content = []
                repository_name = "Unknown Repository"
                
                for file_info in relevant_files[:8]:  # Limit to 8 files for faster processing
                    try:
                        content = await self.file_service.get_file_content(
                            repository_id, file_info['path']
                        )
                        if content:
                            file_content = f"=== {file_info['path']} ===\n{content}\n"
                            files_content.append(file_content)
                            
                            # Try to extract repository name
                            if repository_name == "Unknown Repository" and 'package.json' in file_info['path']:
                                try:
                                    import json as json_lib
                                    package_data = json_lib.loads(content)
                                    if 'name' in package_data:
                                        repository_name = package_data['name']
                                except:
                                    pass
                    except Exception as e:
                        logger.warning(f"Failed to load content for {file_info['path']}: {str(e)}")
                        continue
                
                if not files_content:
                    yield self._format_thinking_step({
                        "id": f"error-{int(asyncio.get_event_loop().time() * 1000)}",
                        "type": "error",
                        "content": "❌ No file contents could be loaded for analysis.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.1
                    })
                    return

                # Process attachments if provided
                attachment_context = ""
                if attachments:
                    attachment_context = await self._process_attachments(attachments)
                    if attachment_context:
                        yield self._format_thinking_step({
                            "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                            "type": "analysis",
                            "content": f"📎 Processed {len(attachments)} user attachment(s) for additional context",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.9
                        })

                # Combine repository files content with attachment context
                enhanced_files_content = files_content.copy()
                if attachment_context:
                    enhanced_files_content.append(attachment_context)

                # Enhanced question with attachment context
                enhanced_question = question
                if attachment_context:
                    enhanced_question = f"{question}\n{attachment_context}"                # Step: Transition to AI thinking
                yield self._format_thinking_step({
                    "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                    "type": "thinking_start",
                    "content": f"🧠 Starting AI deep reasoning with {len(files_content)} files...",
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "confidence": 0.9
                })                # Try DeepSeek R1 first, fallback to Gemini
                thinking_step_count = 0
                current_full_content = ""
                deepseek_failed = False
                
                # ATTEMPT DEEPSEEK R1
                logger.info("Attempting DeepSeek R1 for comprehensive thinking")
                
                # Add a status update to let user know we're trying DeepSeek
                yield self._format_thinking_step({
                    "id": f"deepseek-attempt-{int(asyncio.get_event_loop().time() * 1000)}",
                    "type": "thinking_chunk",
                    "content": "🤔 Connecting to DeepSeek R1 for advanced reasoning...",
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "confidence": 0.8
                })

                try:
                    start_time = asyncio.get_event_loop().time()
                    timeout_seconds = 30.0
                    
                    async for thinking_step in deepseek_client.think_and_analyze(
                        question=enhanced_question,
                        repository_context=repository_context,
                        files_content=enhanced_files_content,
                        repository_name=repository_name,
                        stream=stream
                    ):
                        # Check timeout
                        if asyncio.get_event_loop().time() - start_time > timeout_seconds:
                            logger.warning("DeepSeek timed out, switching to Gemini")
                            deepseek_failed = True
                            yield self._format_thinking_step({
                                "id": f"timeout-{int(asyncio.get_event_loop().time() * 1000)}",
                                "type": "thinking_chunk", 
                                "content": "⏰ DeepSeek R1 is taking too long, switching to Gemini...",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": 0.7
                            })
                            break
                            
                        if thinking_step.get("type") == "error":
                            error_content = thinking_step.get("content", "")
                            # Check for rate limit
                            if any(indicator in error_content.lower() for indicator in [
                                "rate limit", "429", "quota", "exceeded", "rate_limit_exceeded",
                                "ratelimitreached", "too many requests"
                            ]) or "RATE_LIMIT_EXCEEDED" in error_content:
                                logger.warning("DeepSeek R1 rate limited, falling back to Gemini")
                                deepseek_failed = True
                                break
                            else:
                                yield self._format_thinking_step({
                                    "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                                    "type": "error",
                                    "content": f"❌ AI Analysis Error: {thinking_step.get('content', 'Unknown error')}",
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": 0.1
                                })
                                return  # Stop on non-rate-limit errors
                        
                        elif thinking_step.get("type") == "complete":
                            # Final completion
                            yield self._format_thinking_step({
                                "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                                "type": "thinking_complete",
                                "content": "✅ DeepSeek R1 reasoning analysis complete!",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": 1.0
                            })
                            return  # Successfully completed with DeepSeek
                        
                        else:
                            # Stream actual AI thinking content
                            content_chunk = thinking_step.get("content", "")
                            if content_chunk:
                                current_full_content = thinking_step.get("full_content", current_full_content + content_chunk)
                                thinking_step_count += 1
                                
                                # Emit real AI thinking step
                                yield self._format_thinking_step({
                                    "id": f"thinking-{thinking_step_count}",
                                    "type": thinking_step.get("type", "thinking_chunk"),
                                    "content": content_chunk,
                                    "full_content": current_full_content,
                                    "step_number": thinking_step_count,
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": thinking_step.get("confidence", 0.9)
                                })
                
                except Exception as e:
                    logger.warning(f"DeepSeek R1 failed: {str(e)}, falling back to Gemini")
                    deepseek_failed = True# FALLBACK TO GEMINI (only if DeepSeek failed)
                if deepseek_failed:
                    try:
                        logger.info("Using Gemini as fallback for chain-of-thought reasoning")
                        
                        yield self._format_thinking_step({
                            "id": f"fallback-{int(asyncio.get_event_loop().time() * 1000)}",
                            "type": "thinking_start",
                            "content": "🔄 Switching to Gemini AI for step-by-step reasoning (DeepSeek R1 temporarily unavailable)",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.8
                        })
                        
                        # Use the new chain-of-thought method instead of regular answer_question
                        gemini_result = await gemini_client.generate_chain_of_thought(
                            question=enhanced_question,
                            context=repository_context,
                            files_content=enhanced_files_content
                        )
                        
                        if gemini_result and gemini_result.get("reasoning"):
                            reasoning = gemini_result["reasoning"]
                            confidence = gemini_result.get("confidence", 0.8)
                            
                            # Parse the step-by-step reasoning
                            steps = self._parse_gemini_reasoning_steps(reasoning)
                            
                            step_count = 1
                            for step in steps:
                                if step.strip():
                                    yield self._format_thinking_step({
                                        "id": f"gemini-thinking-{step_count}",
                                        "type": "thinking_chunk",
                                        "content": step.strip(),
                                        "step_number": step_count,
                                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                        "confidence": confidence
                                    })
                                    step_count += 1
                                    await asyncio.sleep(0.8)  # Slower for better UX
                            yield self._format_thinking_step({
                                "id": f"gemini-complete-{step_count}",
                                "type": "thinking_complete",
                                "content": "✅ Gemini step-by-step analysis complete!",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": confidence                            })
                            return  # Successfully completed with Gemini
                        else:
                            yield self._format_thinking_step({
                                "id": "gemini-error",
                                "type": "error",
                                "content": "Gemini failed to generate reasoning steps.",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": 0.1
                            })
                            return  # Stop processing on Gemini failure
                            
                    except Exception as gemini_error:
                        logger.error(f"Gemini fallback failed: {str(gemini_error)}")
                        yield self._format_thinking_step({
                            "id": "fallback-error",
                            "type": "error",
                            "content": f"All AI providers failed. Please try again later.",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.0
                        })
                        return  # Stop processing on Gemini exception
                
                # Ensure we exit the main logic after attempting both providers
                return
                
            except Exception as e:
                logger.error(f"Error in comprehensive thinking process: {str(e)}")
                yield self._format_thinking_step({
                    "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                    "type": "error",
                    "content": f"❌ Thinking process failed: {str(e)}",
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "confidence": 0.0
                })
                return
        
        return StreamingResponse(
            generate_thinking_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )
    
    def _find_relevant_files(self, repository_files: List[Dict[str, Any]], question_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find relevant files based on question analysis."""
        relevant_files = []
        
        # For now, use a simple relevance filtering based on question analysis
        if question_analysis['type'] == 'file_specific':
            # Look for specifically mentioned files
            mentioned_files = question_analysis.get('specific_files', [])
            for file_info in repository_files:
                file_path = file_info.get('path', '')
                file_name = file_info.get('name', '')
                for mentioned_file in mentioned_files:
                    if mentioned_file.lower() in file_path.lower() or mentioned_file.lower() in file_name.lower():
                        relevant_files.append(file_info)
                        break
        elif question_analysis['type'] == 'folder_specific':
            # Look for files in mentioned folders
            mentioned_folders = question_analysis.get('specific_folders', [])
            for file_info in repository_files:
                file_path = file_info.get('path', '')
                for mentioned_folder in mentioned_folders:
                    if mentioned_folder.lower() in file_path.lower():
                        relevant_files.append(file_info)
                        break
        else:
            # For architectural/general questions, prioritize key files
            priority_patterns = ['readme', 'package.json', 'requirements.txt', 'dockerfile', 'main', 'index', 'app', 'server']
            
            # First, add high-priority files
            for file_info in repository_files:
                file_path = file_info.get('path', '').lower()
                file_name = file_info.get('name', '').lower()
                
                for pattern in priority_patterns:
                    if pattern in file_path or pattern in file_name:
                        relevant_files.append(file_info)
                        break
            
            # Then add files that match keywords
            keywords = question_analysis.get('keywords', [])
            for file_info in repository_files:
                if file_info in relevant_files:
                    continue
                    
                file_path = file_info.get('path', '').lower()
                file_name = file_info.get('name', '').lower()
                
                for keyword in keywords:
                    if keyword.lower() in file_path or keyword.lower() in file_name:
                        relevant_files.append(file_info)
                        break
            
            # If we still don't have many files, add some common important files
            if len(relevant_files) < 5:
                for file_info in repository_files:
                    if file_info in relevant_files:
                        continue
                    
                    file_path = file_info.get('path', '').lower()
                    if any(ext in file_path for ext in ['.py', '.js', '.ts', '.java', '.cpp', '.go', '.rs']):
                        relevant_files.append(file_info)
                        if len(relevant_files) >= 10:
                            break
        
        return relevant_files[:15]  # Limit to 15 files for performance
    
    def _build_repository_context(self, repository_files: List[Dict[str, Any]]) -> str:
        """Build basic repository context from file metadata."""
        
        total_files = len(repository_files)
        languages = {}
        total_size = 0
        
        for file_info in repository_files:
            language = file_info.get('language', 'unknown')
            if language and language != 'unknown':
                languages[language] = languages.get(language, 0) + 1
            
            size = file_info.get('size', 0)
            if isinstance(size, (int, float)):
                total_size += size
        
        context = [
            f"REPOSITORY OVERVIEW:",
            f"Total Files: {total_files}",
            f"Total Size: {self._format_size(total_size)}",
            ""
        ]
        
        if languages:
            context.append("Programming Languages:")
            for lang, count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
                context.append(f"  - {lang}: {count} files")
            context.append("")
        
        # Add file structure sample
        context.append("Key Files and Directories:")
        important_files = []
        for file_info in repository_files[:20]:  # Show top 20 files
            path = file_info.get('path', '')
            if any(keyword in path.lower() for keyword in [
                'readme', 'package.json', 'requirements.txt', 'dockerfile', 
                'main.', 'index.', 'app.', '__init__', 'config'
            ]):
                important_files.append(f"  - {path}")
        
        context.extend(important_files[:10])  # Limit to 10 important files
        
        return "\n".join(context)
    
    def _format_size(self, size_bytes: float) -> str:
        """Format file size in human readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def _format_thinking_step(self, step_data: Dict[str, Any]) -> str:
        """Format a thinking step for SSE streaming."""
        return f"data: {json.dumps(step_data)}\n\n"
    
    async def _process_attachments(self, attachments: List[Dict[str, Any]]) -> str:
        """Process user-provided attachments and format them for AI context."""
        if not attachments:
            return ""
        
        attachment_contexts = []
        
        for attachment in attachments:
            try:
                attachment_type = attachment.get('type', 'other')
                attachment_name = attachment.get('name', 'unknown')
                attachment_content = attachment.get('content', '')
                
                logger.info(f"Processing attachment for thinking: {attachment_name} (type: {attachment_type})")
                
                if attachment_type == 'code' and attachment_content:
                    # Format code attachments with proper context
                    attachment_contexts.append(f"""
**User-Provided Code File: {attachment_name}**
```
{attachment_content}
```
""")
                
                elif attachment_type == 'document' and attachment_content:
                    # Format document attachments
                    attachment_contexts.append(f"""
**User-Provided Document: {attachment_name}**
{attachment_content}
""")
                
                elif attachment_type == 'image':
                    # For images, note that they were provided
                    attachment_contexts.append(f"""
**User-Provided Image: {attachment_name}**
[Image file provided - visual content analysis not available in this thinking mode]
""")
                
                else:
                    # Handle other attachment types
                    if attachment_content:
                        attachment_contexts.append(f"""
**User-Provided File: {attachment_name}**
{attachment_content[:1000]}{"..." if len(attachment_content) > 1000 else ""}
""")
                        
            except Exception as e:
                logger.warning(f"Failed to process attachment {attachment.get('name', 'unknown')} in thinking: {str(e)}")
                continue
        
        if attachment_contexts:
            return f"""

## User-Provided Context

The user has provided the following files/content as additional context for this deep analysis:

{''.join(attachment_contexts)}

**Important**: Please consider this user-provided content when performing your deep analysis and reasoning.
"""
        
        return ""

    def _parse_gemini_reasoning_steps(self, reasoning: str) -> List[str]:
        """Parse Gemini's reasoning into individual steps."""
        # Split by step headers (## Step X:)
        steps = re.split(r'##\s+Step\s+\d+:', reasoning)
        
        # Remove empty first element if reasoning starts with step header
        if steps and not steps[0].strip():
            steps = steps[1:]
        
        # If no step headers found, split by double newlines as fallback
        if len(steps) <= 1:
            steps = reasoning.split('\n\n')
        
        # Clean up steps and add step numbers back
        cleaned_steps = []
        for i, step in enumerate(steps):
            step_content = step.strip()
            if step_content:
                # Add step number if not already present
                if not step_content.startswith(('Step', '##')):
                    step_content = f"**Step {i + 1}:** {step_content}"
                cleaned_steps.append(step_content)
        
        return cleaned_steps


# Global instance
comprehensive_thinking_service = ComprehensiveThinkingService()
