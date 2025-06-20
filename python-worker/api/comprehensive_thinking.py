"""
Comprehensive thinking API endpoint that handles both file retrieval and AI reasoning.
This replaces the separate thinking-context and thinking endpoints for better performance.
Uses the same embedding and summarization services as the normal Q&A flow.
"""
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from services.file_service import FileRetrievalService
from services.smart_context_builder import SmartContextBuilder
from services.database_service import database_service
from services.deepseek_client import deepseek_client
from services.gemini_client import gemini_client
from utils.logger import get_logger
import json
import re

logger = get_logger(__name__)


class ComprehensiveThinkingService:
    """Service that handles complete thinking process: file retrieval + AI reasoning with embeddings and summarization."""
    
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
                # IMMEDIATE ATTACHMENT DEBUG - Log everything about attachments
                logger.info(f"🔥 URGENT DEBUG - Attachments parameter: {attachments}")
                logger.info(f"🔥 URGENT DEBUG - Attachments type: {type(attachments)}")
                logger.info(f"🔥 URGENT DEBUG - Attachments length: {len(attachments) if attachments else 'None'}")
                
                if attachments:
                    for i, attachment in enumerate(attachments):
                        logger.info(f"🔥 URGENT DEBUG - Attachment {i}: {attachment}")
                        logger.info(f"🔥 URGENT DEBUG - Attachment {i} keys: {attachment.keys() if isinstance(attachment, dict) else 'Not a dict'}")                # AGGRESSIVE ATTACHMENT-FIRST APPROACH: Just like normal Q&A test
                files_content = []
                repository_name = "Unknown Repository"
                attachment_files = []  # Initialize at proper scope
                relevant_files = []  # Initialize to prevent undefined variable errors
                repository_context = ""  # Initialize to prevent undefined variable errors
                  # Determine if question is asking about repository vs attachments
                is_repo_question = any(keyword in question.lower() for keyword in [
                    'repository', 'repo', 'codebase', 'project', 'code', 'implementation', 
                    'architecture', 'structure', 'files', 'how does', 'what is the'
                ])
                
                is_attachment_question = any(keyword in question.lower() for keyword in [
                    'attachment', 'file', 'document', 'data', 'statistics', 'results', 'performance'
                ])
                
                # Process attachments (if provided)
                if attachments:
                    logger.info("🔥 PROCESSING ATTACHMENTS - analyzing question intent")
                    attachment_files = await self._process_attachments(attachments)
                    if attachment_files:
                        logger.info(f"Generated {len(attachment_files)} attachment files for context")
                        
                        # Smart context determination based on question
                        if is_repo_question and not is_attachment_question:
                            logger.info("🔥 REPO-FOCUSED QUESTION: Will load both repo files AND attachments for context")
                            files_content.extend(attachment_files)  # Add attachments as context
                            # Continue to load repo files below
                        elif is_attachment_question or "relationship" in question.lower():
                            logger.info("🔥 ATTACHMENT-FOCUSED QUESTION: Including both attachments and repo for comparison")
                            files_content.extend(attachment_files)  # Add attachments
                            repository_name = "Repository and Attachment Analysis"
                            # Continue to load repo files for comparison
                        else:
                            logger.info("🔥 GENERAL QUESTION: Including both attachments and repo files")
                            files_content.extend(attachment_files)
                            # Continue to load repo files
                        
                        # Set appropriate repository context
                        repository_context = "Repository Information:\nAnalyzing repository with user-provided attachments for context"
                        
                        yield self._format_thinking_step({
                            "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                            "type": "analysis",
                            "content": f"� Processed {len(attachments)} user attachment(s) - will analyze with repository context",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.9
                        })
                        
                    else:
                        logger.warning("No attachment files generated despite having attachments")
                        # If attachments fail, we'll fall back to repository files
                        attachment_files = []                # Load repository files (unless it's a pure attachment question with no repo context needed)
                should_load_repo = not attachments or is_repo_question or "relationship" in question.lower()
                
                if should_load_repo:
                    logger.info("🔥 LOADING REPOSITORY FILES using intelligent context building (like normal Q&A)")
                    
                    # Use the same intelligent file retrieval as normal Q&A flow
                    try:
                        # Get repository status and file metadata from database
                        repo_status = await database_service.get_repository_status(repository_id)
                        if not repo_status:
                            if not attachments:
                                yield self._format_thinking_step({
                                    "id": f"error-{int(asyncio.get_event_loop().time() * 1000)}",
                                    "type": "error",
                                    "content": "❌ Repository not found in database and no attachments provided.",
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": 0.1
                                })
                                return
                            else:
                                logger.info("Repository not in database, but continuing with attachments")
                                repo_status = {"name": "Unknown Repository", "file_count": 0}
                        
                        # Get files with content from database (using smart retrieval)
                        files_with_content = await database_service.get_files_with_content(repository_id)
                        
                        if not files_with_content:
                            if not attachments:
                                yield self._format_thinking_step({
                                    "id": f"error-{int(asyncio.get_event_loop().time() * 1000)}",
                                    "type": "error",
                                    "content": "❌ No processed files found for this repository and no attachments provided.",
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": 0.1
                                })
                                return
                            else:
                                logger.info("No files found in database, but continuing with attachments")
                                files_with_content = []
                        
                        # Build repository context using the same method as normal Q&A
                        if not repository_context or repository_context == "":
                            repo_info = f"Repository: {repo_status.get('name')} (ID: {repository_id})"
                            if repo_status.get('file_count'):
                                repo_info += f"\nTotal files: {repo_status.get('file_count')}"
                            repository_context = repo_info
                        else:
                            # Enhance existing context with repo details
                            repo_info = f"Repository: {repo_status.get('name')} (ID: {repository_id})"
                            if repo_status.get('file_count'):
                                repo_info += f"\nTotal files: {repo_status.get('file_count')}"
                            repository_context = f"{repository_context}\n\n{repo_info}"
                          # Use smart context building just like normal Q&A flow
                        if files_with_content:
                            logger.info("🧠 Using smart context building for intelligent file selection")
                            
                            yield self._format_thinking_step({
                                "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                                "type": "analysis",
                                "content": f"🧠 Using intelligent context building to select most relevant files from {len(files_with_content)} repository files...",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": 0.9
                            })
                            
                            question_analysis = self.context_builder.analyze_question(question)
                            
                            # Build smart context using the same method as EmbeddingProcessor
                            smart_files_content, relevant_file_paths = self.context_builder.build_smart_context(
                                question_analysis, files_with_content, question
                            )                            # Add the intelligently selected files to our context
                            files_content.extend(smart_files_content)
                            relevant_files = [{"path": path} for path in relevant_file_paths]  # Track relevant files for database submission
                            
                            logger.info(f"🎯 Smart context builder selected {len(smart_files_content)} relevant files from {len(files_with_content)} total files")
                            logger.info(f"🔥 LOADED repository files using intelligent selection")
                            
                            yield self._format_thinking_step({
                                "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                                "type": "analysis",
                                "content": f"✅ Selected {len(smart_files_content)} most relevant files using embedding-based intelligence (same as normal Q&A)",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": 0.9
                            })
                        else:
                            logger.info("No files available for smart context building")
                            
                    except Exception as e:
                        logger.error(f"Failed to load repository files with intelligent context: {str(e)}")
                        # Fall back to basic file loading if smart context fails
                        logger.info("Falling back to basic file loading")
                        repository_files = await self.file_service.get_repository_files(repository_id)
                        if repository_files:
                            if not repository_context or repository_context == "":
                                repository_context = self._build_repository_context(repository_files)
                            
                            question_analysis = self.context_builder.analyze_question(question)
                            relevant_files = self._find_relevant_files(repository_files, question_analysis)
                              # Load repository file contents (basic fallback)
                            fallback_relevant_files = []
                            for file_info in relevant_files[:8]:
                                try:
                                    content = await self.file_service.get_file_content(repository_id, file_info['path'])
                                    if content:
                                        file_content = f"=== {file_info['path']} ===\n{content}\n"
                                        files_content.append(file_content)
                                        fallback_relevant_files.append(file_info)
                                except Exception as e:
                                    logger.warning(f"Failed to load content for {file_info['path']}: {str(e)}")
                                    continue
                            relevant_files = fallback_relevant_files  # Update relevant_files to only include successfully loaded files
                            logger.info(f"🔥 FALLBACK: Loaded {len(fallback_relevant_files)} repository files")
                else:
                    logger.info("🔥 ATTACHMENT-ONLY MODE: Completely skipping repository file loading")
                
                # Check if we have any content to analyze
                if not files_content:
                    yield self._format_thinking_step({
                        "id": f"error-{int(asyncio.get_event_loop().time() * 1000)}",
                        "type": "error",
                        "content": "❌ No content available for analysis.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.1
                    })
                    return                
                logger.info(f"🔥 FINAL FILES CONTENT: {len(files_content)} items total")
                attachment_count = sum(1 for content in files_content if "attachment/" in content)
                repo_file_count = len(files_content) - attachment_count
                logger.info(f"🔥 ATTACHMENT FILES INCLUDED: {attachment_count} attachments")
                logger.info(f"🔥 REPOSITORY FILES INCLUDED: {repo_file_count} repository files (via intelligent context building)")
                
                # Log content breakdown for debugging
                if is_repo_question:
                    logger.info("🎯 REPO QUESTION DETECTED: Repository files should be prioritized (using embeddings & smart context)")
                elif is_attachment_question:
                    logger.info("📎 ATTACHMENT QUESTION DETECTED: Attachment content should be prioritized")
                else:
                    logger.info("🤔 GENERAL QUESTION: Both repo and attachment content included (using smart context building)")
                  # Separate attachments and repository files for clear context
                attachment_content = []
                repository_content = []
                
                for content in files_content:
                    if "🔴 USER-PROVIDED File: attachment/" in content:
                        attachment_content.append(content)
                    else:
                        repository_content.append(content)
                
                # Build clearly separated context for AI
                separated_files_content = []
                
                # Add attachments section first (if any)
                if attachment_content:
                    separated_files_content.append("=" * 80)
                    separated_files_content.append("📎 USER-PROVIDED ATTACHMENTS")
                    separated_files_content.append("=" * 80)
                    separated_files_content.extend(attachment_content)
                    separated_files_content.append("")
                
                # Add repository files section (if any)
                if repository_content:
                    separated_files_content.append("=" * 80)
                    separated_files_content.append("📁 REPOSITORY FILES")
                    separated_files_content.append("=" * 80)
                    separated_files_content.extend(repository_content)
                
                # Update files_content with clearly separated content
                files_content = separated_files_content
                
                # Log what we're sending to AI - just like normal Q&A test
                enhanced_question = question
                logger.info(f"🔥 SENDING TO AI - Question: {enhanced_question}")
                logger.info(f"🔥 SENDING TO AI - Total content sections: {len(files_content)}")
                logger.info(f"🔥 SENDING TO AI - Attachments: {len(attachment_content)} | Repository files: {len(repository_content)}")
                
                # Step: Transition to AI thinking
                yield self._format_thinking_step({
                    "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                    "type": "thinking_start",
                    "content": f"🧠 Starting AI deep reasoning with {len(attachment_content)} attachments and {len(repository_content)} repository files...",
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "confidence": 0.9
                })
                thinking_step_count = 0
                current_full_content = ""
                deepseek_failed = False
                deepseek_completed = False
                
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
                    timeout_seconds = 60.0  # Increased to 60 seconds for better DeepSeek experience                    
                    step_count = 0
                    last_step_time = start_time
                      # CRITICAL: Log what we're sending to DeepSeek
                    logger.info(f"🔥 SENDING TO DEEPSEEK - Enhanced question length: {len(enhanced_question)}")
                    logger.info(f"🔥 SENDING TO DEEPSEEK - Files content count: {len(files_content)}")
                    if attachment_files:
                        logger.info(f"🔥 SENDING TO DEEPSEEK - WITH {len(attachment_files)} ATTACHMENTS")
                        logger.info(f"🔥 DEEPSEEK QUESTION PREVIEW: {enhanced_question[:500]}...")
                    else:
                        logger.warning("🚨 SENDING TO DEEPSEEK - NO ATTACHMENTS!")
                    
                    async for thinking_step in deepseek_client.think_and_analyze(                        
                        question=enhanced_question,
                        repository_context=repository_context,
                        files_content=files_content,
                        repository_name=repository_name,
                        stream=stream
                    ):# Check timeout - but be more intelligent about it
                        current_time = asyncio.get_event_loop().time()
                        if current_time - start_time > timeout_seconds:
                            # Only timeout if we haven't received any steps recently
                            if step_count == 0 or (current_time - last_step_time) > 15.0:
                                logger.warning(f"DeepSeek timed out after {timeout_seconds}s (no recent activity), switching to Gemini")
                                deepseek_failed = True
                                yield self._format_thinking_step({
                                    "id": f"timeout-{int(asyncio.get_event_loop().time() * 1000)}",
                                    "type": "thinking_chunk", 
                                    "content": "⏰ DeepSeek R1 is taking too long, switching to Gemini...",
                                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                    "confidence": 0.7
                                })
                                break
                            # If we're getting steps, extend the timeout a bit
                            elif step_count > 0:
                                timeout_seconds = min(timeout_seconds + 30, 120)  # Extend up to 2 minutes max
                                logger.info(f"DeepSeek is active, extending timeout to {timeout_seconds}s")
                          # Update step tracking
                        if thinking_step.get("type") not in ["error"]:
                            step_count += 1
                            last_step_time = current_time
                            
                        if thinking_step.get("type") == "error":
                            error_content = thinking_step.get("content", "")
                            retry_after = thinking_step.get("retry_after")
                            
                            # Check for rate limit
                            if any(indicator in error_content.lower() for indicator in [
                                "rate limit", "429", "quota", "exceeded", "rate_limit_exceeded",
                                "ratelimitreached", "too many requests"
                            ]) or "RATE_LIMIT_EXCEEDED" in error_content:
                                
                                # Smart fallback based on retry-after duration
                                if retry_after and retry_after > 30:
                                    logger.warning(f"DeepSeek R1 rate limited with long wait ({retry_after}s > 30s), immediate Gemini fallback")
                                    yield self._format_thinking_step({
                                        "id": f"fallback-{step_count + 1}",
                                        "type": "thinking_chunk",
                                        "content": f"🔄 DeepSeek requires {retry_after}s wait - switching to Gemini for faster response...",
                                    })
                                elif retry_after:
                                    logger.warning(f"DeepSeek R1 rate limited with short wait ({retry_after}s ≤ 30s), fallback to Gemini")
                                    yield self._format_thinking_step({
                                        "id": f"fallback-{step_count + 1}",
                                        "type": "thinking_chunk", 
                                        "content": f"🔄 DeepSeek rate limited ({retry_after}s wait) - switching to Gemini...",
                                    })
                                else:
                                    logger.warning("DeepSeek R1 rate limited (no retry-after info), falling back to Gemini")
                                    yield self._format_thinking_step({
                                        "id": f"fallback-{step_count + 1}",
                                        "type": "thinking_chunk",
                                        "content": "🔄 DeepSeek rate limited - switching to Gemini for backup reasoning...",
                                    })
                                
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
                            # DeepSeek R1 completed successfully - extract final answer and submit to database
                            final_reasoning = current_full_content
                            
                            logger.info(f"DeepSeek R1 completed successfully. Reasoning length: {len(final_reasoning) if final_reasoning else 0}")
                              # Generate comprehensive final answer using Gemini
                            final_answer = await self._generate_comprehensive_final_answer(
                                question=enhanced_question,
                                chain_of_thought=final_reasoning,
                                repository_context=repository_context,
                                files_content=files_content,
                                attachments=attachments
                            )
                            
                            logger.info(f"Generated comprehensive final answer. Length: {len(final_answer) if final_answer else 0}")
                            
                            # Submit answer to database if we have one
                            if final_answer:
                                try:
                                    # Extract relevant files from the analysis
                                    relevant_files_paths = [file_info.get('path', '') for file_info in relevant_files[:8] if file_info.get('path')]
                                    
                                    # Add attachment filenames to relevant files
                                    if attachments:
                                        for attachment in attachments:
                                            attachment_name = attachment.get('name', attachment.get('fileName', 'user_attachment'))
                                            if attachment_name != 'unknown' and attachment_name not in relevant_files_paths:
                                                relevant_files_paths.append(f"📎 {attachment_name}")
                                    
                                    await self._submit_thinking_answer(
                                        repository_id, 
                                        enhanced_question, 
                                        final_answer, 
                                        final_reasoning,
                                        relevant_files_paths
                                    )
                                    
                                    # Notify that answer was submitted
                                    yield self._format_thinking_step({
                                        "id": f"answer-submitted-{thinking_step_count + 1}",
                                        "type": "answer_submitted",
                                        "content": f"💾 DeepSeek R1 answer submitted to Q&A database",
                                        "final_answer": final_answer,
                                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                        "confidence": 1.0
                                    })
                                    
                                except Exception as submit_error:
                                    logger.error(f"Failed to submit DeepSeek thinking answer: {str(submit_error)}")
                                    yield self._format_thinking_step({
                                        "id": f"submit-error-{thinking_step_count + 1}",
                                        "type": "warning",
                                        "content": f"⚠️ DeepSeek answer generated but failed to save to database",
                                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                        "confidence": 0.7
                                    })
                            
                            # Final completion
                            yield self._format_thinking_step({
                                "id": f"step-{int(asyncio.get_event_loop().time() * 1000)}",
                                "type": "thinking_complete",
                                "content": "✅ DeepSeek R1 reasoning analysis complete!",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": 1.0
                            })
                            
                            deepseek_completed = True
                            return  # Successfully completed with DeepSeek - NO GEMINI NEEDED
                        
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
                                    "confidence": thinking_step.get("confidence", 0.9)                                })
                
                except Exception as e:
                    logger.warning(f"DeepSeek R1 failed with exception: {str(e)}, falling back to Gemini")
                    deepseek_failed = True                # FALLBACK TO GEMINI (only if DeepSeek failed AND didn't complete)
                if deepseek_failed and not deepseek_completed:
                    logger.info("DeepSeek failed, starting Gemini fallback - ensuring no duplicate answers")
                    logger.info(f"DeepSeek completion status: completed={deepseek_completed}, failed={deepseek_failed}")
                    try:
                        logger.info("Using Gemini as fallback for chain-of-thought reasoning")
                        
                        yield self._format_thinking_step({
                            "id": f"fallback-{int(asyncio.get_event_loop().time() * 1000)}",
                            "type": "thinking_start",
                            "content": "🔄 Switching to Gemini AI for step-by-step reasoning (DeepSeek R1 temporarily unavailable)",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.8                        })
                          # Use the new chain-of-thought method instead of regular answer_question
                        gemini_result = await gemini_client.generate_chain_of_thought(                            
                            question=enhanced_question,
                            context=repository_context,
                            files_content=files_content
                        )
                          # CRITICAL: Log what we're sending to Gemini
                        logger.info(f"🔥 SENDING TO GEMINI - Enhanced question length: {len(enhanced_question)}")
                        logger.info(f"🔥 SENDING TO GEMINI - Files content count: {len(files_content)}")
                        if attachment_files:
                            logger.info(f"🔥 SENDING TO GEMINI - WITH {len(attachment_files)} ATTACHMENTS")
                        else:
                            logger.warning("🚨 SENDING TO GEMINI - NO ATTACHMENTS!")
                        
                        if gemini_result and gemini_result.get("reasoning"):
                            reasoning = gemini_result["reasoning"]
                            confidence = gemini_result.get("confidence", 0.8)
                              # Generate comprehensive final answer using the reasoning as chain of thought
                            final_answer = await self._generate_comprehensive_final_answer(
                                question=enhanced_question,
                                chain_of_thought=reasoning,
                                repository_context=repository_context,
                                files_content=files_content,
                                attachments=attachments
                            )
                            
                            # Parse the step-by-step reasoning
                            steps = self._parse_gemini_reasoning_steps(reasoning)
                            
                            # Add a small delay before starting to stream steps
                            await asyncio.sleep(1.0)
                            
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
                                    # Increase delay for better step separation
                                    await asyncio.sleep(1.5)                            # Submit final answer to Q&A database if we have one
                            if final_answer:
                                try:
                                    # Extract relevant files from the analysis
                                    relevant_files_paths = [file_info.get('path', '') for file_info in relevant_files[:8] if file_info.get('path')]
                                      # Add attachment filenames to relevant files
                                    if attachments:
                                        for attachment in attachments:
                                            attachment_name = attachment.get('name', attachment.get('fileName', 'user_attachment'))
                                            if attachment_name != 'unknown' and attachment_name not in relevant_files_paths:
                                                relevant_files_paths.append(f"📎 {attachment_name}")
                                    
                                    logger.info(f"Gemini fallback submitting answer to Q&A database")
                                    await self._submit_thinking_answer(
                                        repository_id, 
                                        enhanced_question, 
                                        final_answer, 
                                        reasoning,
                                        relevant_files_paths
                                    )
                                    
                                    # Notify that answer was submitted
                                    yield self._format_thinking_step({
                                        "id": f"answer-submitted-{step_count}",
                                        "type": "answer_submitted",
                                        "content": f"💾 Gemini fallback answer submitted to Q&A database",
                                        "final_answer": final_answer,
                                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                        "confidence": confidence
                                    })
                                    step_count += 1
                                except Exception as submit_error:
                                    logger.error(f"Failed to submit thinking answer: {str(submit_error)}")
                                    yield self._format_thinking_step({
                                        "id": f"submit-error-{step_count}",
                                        "type": "warning",
                                        "content": f"⚠️ Answer generated but failed to save to database",
                                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                        "confidence": 0.7
                                    })
                            
                            # Add delay before completion message
                            await asyncio.sleep(0.5)
                            yield self._format_thinking_step({
                                "id": f"gemini-complete-{step_count}",
                                "type": "thinking_complete",
                                "content": "✅ Gemini step-by-step analysis and answer complete!",
                                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                                "confidence": confidence
                            })
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
                else:
                    # DeepSeek completed successfully or no fallback needed
                    if deepseek_completed:
                        logger.info("DeepSeek completed successfully - no Gemini fallback needed")
                    else:
                        logger.info("No AI fallback attempted - DeepSeek failed but completed successfully")
                
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
            ]):   important_files.append(f"  - {path}")
        
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
    
    async def _process_attachments(self, attachments: List[Dict[str, Any]]) -> List[str]:
        """Process user-provided attachments and format them exactly like the normal Q&A flow."""
        if not attachments:
            return []
        
        attachment_files = []
        
        for attachment in attachments:
            try:
                # Get attachment details with better fallback logic
                attachment_name = attachment.get('originalFileName') or attachment.get('name') or attachment.get('fileName') or 'user_attachment'
                
                # Try to get content from the attachment metadata first (fallback)
                attachment_content = attachment.get('content', '')
                
                # CRITICAL: ALWAYS try to download from B2 if we have a fileName (file key)
                # Don't rely on attachment.get('content') as it's usually just metadata
                b2_file_key = attachment.get('fileName') or attachment.get('backblazeFileId') or attachment.get('fileKey')
                if b2_file_key:
                    logger.info(f"🔥 ATTEMPTING B2 DOWNLOAD - File key: {b2_file_key}")
                    try:
                        # Use the B2 storage service to download the actual content
                        b2_storage = self.file_service.b2_storage
                        if b2_storage:
                            downloaded_content = await b2_storage.download_file_content(b2_file_key)
                            if downloaded_content:
                                attachment_content = downloaded_content
                                logger.info(f"🎉 SUCCESS! Downloaded attachment content from B2: {len(attachment_content)} characters")
                            else:
                                logger.warning(f"⚠️ B2 download returned empty content for {b2_file_key}")
                        else:
                            logger.error("❌ B2 storage service not available for attachment download")
                    except Exception as b2_error:
                        error_msg = str(b2_error)
                        if "File not present" in error_msg or "not found" in error_msg.lower():
                            logger.warning(f"📎 Attachment file not found in B2 storage ({b2_file_key}) - this may be a test file")
                        else:
                            logger.error(f"❌ Failed to download attachment from B2 ({b2_file_key}): {error_msg}")
                        # Continue with fallback content if available
                else:
                    logger.warning(f"⚠️ No B2 file key found for attachment {attachment_name}")
                
                logger.info(f"Processing attachment for thinking: {attachment_name} (content_length: {len(attachment_content)}, b2_key: {b2_file_key})")
                  # Format attachment content EXACTLY like the normal Q&A flow
                # Use the same "File: attachment/filename" format that Gemini client expects
                # BUT add the special marker for chain-of-thought recognition
                if attachment_content:
                    formatted_attachment = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n{attachment_content}"
                    attachment_files.append(formatted_attachment)
                    logger.info(f"🎉 Added attachment to context: attachment/{attachment_name} ({len(attachment_content)} chars)")
                else:
                    # Even without content, note that the file was provided
                    formatted_attachment = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n[File provided but content could not be downloaded from B2 storage - may be binary or inaccessible]"
                    attachment_files.append(formatted_attachment)
                    logger.info(f"📎 Added attachment to context without content: attachment/{attachment_name}")
                        
            except Exception as e:
                logger.warning(f"Failed to process attachment {attachment.get('name', 'unknown')} in thinking: {str(e)}")
                continue
        
        logger.info(f"� CRITICAL: Processed {len(attachment_files)} attachments using normal Q&A format")
        return attachment_files
    
    def _parse_gemini_reasoning_steps(self, reasoning: str) -> List[str]:
        """Parse Gemini's reasoning into individual thinking chunks."""
        import re
        
        # First, try to extract the thinking section
        thinking_match = re.search(r'<thinking>(.*?)</thinking>', reasoning, re.DOTALL)
        if thinking_match:
            thinking_content = thinking_match.group(1).strip()
            
            # Split the thinking content into natural paragraphs/chunks
            # Split by double newlines or major thought transitions
            chunks = re.split(r'\n\n+|(?:Actually|Wait|Hmm|Let me|So|Ok,)', thinking_content)
            
            # Clean and format chunks
            steps = []
            for i, chunk in enumerate(chunks):
                chunk = chunk.strip()
                if chunk and len(chunk) > 20:  # Filter out very short chunks
                    # Add back transition words if they were split off
                    if i > 0 and not chunk[0].isupper():
                        transition_words = ['Actually', 'Wait', 'Hmm', 'Let me', 'So', 'Ok']
                        for word in transition_words:
                            if f"{word} {chunk}" in thinking_content or f"{word}, {chunk}" in thinking_content:
                                chunk = f"{word} {chunk}"
                                break
                    steps.append(chunk)
            
            return steps[:8]  # Limit to 8 chunks max
          # Fallback: if no <thinking> tags, split by paragraphs
        paragraphs = reasoning.split('\n\n')
        filtered_paragraphs = [p.strip() for p in paragraphs if p.strip() and len(p.strip()) > 30]
        
        return filtered_paragraphs[:8]  # Limit to 8 chunks max
    
    def _extract_final_answer(self, reasoning: str) -> str:
        """Extract the final answer from Gemini's reasoning."""
        import re
          # Look for content after "Based on my thinking above" or similar patterns
        patterns = [
            r'Based on my thinking above[,:]?\s*(.*?)(?=\n\n|$)',
            r'</thinking>\s*(.*?)(?=\n\n|$)',
            r'(?:Final answer|Answer|Conclusion)[:\s]*(.*?)(?=\n\n|$)',
            r'(?:In summary|To summarize)[,:]?\s*(.*?)(?=\n\n|$)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, reasoning, re.DOTALL | re.IGNORECASE)
            if match:
                answer = match.group(1).strip()
                if answer and len(answer) > 50:  # Must be substantial
                    return answer
        
        # Fallback: try to get content after </thinking> tag (grab more content)
        thinking_end = reasoning.find('</thinking>')
        if thinking_end != -1:
            after_thinking = reasoning[thinking_end + len('</thinking>'):].strip()
            # Remove any leading "Based on" text but keep the rest
            after_thinking = re.sub(r'^Based on.*?[,:]?\s*', '', after_thinking, flags=re.IGNORECASE)
            if after_thinking and len(after_thinking) > 50:
                return after_thinking
        
        # Last resort: if no clear final answer section, return the last substantial paragraph
        paragraphs = reasoning.split('\n\n')
        for paragraph in reversed(paragraphs):
            clean_para = paragraph.strip()
            if len(clean_para) > 100 and not clean_para.startswith('<'):                return clean_para
        
        return ""
    
    async def _submit_thinking_answer(self, repository_id: str, question: str, answer: str, reasoning: str, relevant_files: List[str] = None):
        """Submit the thinking process result to the Q&A database."""
        try:
            from services.database_service import database_service
            
            if relevant_files is None:
                relevant_files = []
            
            # Create a new Q&A entry
            question_id = await database_service.create_question(
                repository_id=repository_id,
                user_id="1",  # Default user ID (string format as per schema)
                query=question,
                answer=answer,
                confidence_score=0.9,
                relevant_files=relevant_files,
                category="thinking_process"
            )
            
            logger.info(f"Successfully submitted thinking answer to database with ID: {question_id}")
            return question_id
            
        except Exception as e:
            error_msg = str(e)
            if "foreign key constraint" in error_msg and "repository_id" in error_msg:
                logger.warning(f"Repository {repository_id} not found in database - cannot submit thinking answer")                # Don't raise error, just log it - this is a non-critical failure                return None
            else:
                logger.error(f"Failed to submit thinking answer to database: {error_msg}")
                # For other errors, still don't raise to avoid breaking the thinking flow
                return None

    async def _generate_comprehensive_final_answer(
        self, 
        question: str, 
        chain_of_thought: str, 
        repository_context: str, 
        files_content: List[str],
        attachments: List[Dict[str, Any]] = None
    ) -> str:
        """Generate a comprehensive final answer using Gemini with the chain of thought as context."""
        try:
            logger.info("Generating comprehensive final answer using Gemini")
            
            # Separate attachments and repository files for clearer context
            attachment_files = []
            repository_files = []
            
            for content in files_content:
                if "File: attachment/" in content or "🔴 USER-PROVIDED" in content:
                    # Remove the 🔴 USER-PROVIDED marker for cleaner presentation
                    clean_content = content.replace("🔴 USER-PROVIDED ", "")
                    attachment_files.append(clean_content)
                else:
                    repository_files.append(content)
            
            # Build clearly separated context
            separated_context = []
            
            if attachment_files:
                separated_context.append("📎 USER-PROVIDED ATTACHMENTS:")
                separated_context.append("=" * 50)
                for i, attachment in enumerate(attachment_files, 1):
                    separated_context.append(f"[ATTACHMENT {i}]")
                    separated_context.append(attachment)
                    separated_context.append("-" * 30)
                separated_context.append("")
            
            if repository_files:
                separated_context.append("📁 REPOSITORY FILES:")
                separated_context.append("=" * 50)
                for i, repo_file in enumerate(repository_files, 1):
                    separated_context.append(f"[REPO FILE {i}]")
                    separated_context.append(repo_file)
                    separated_context.append("-" * 30)
                separated_context.append("")
            
            final_separated_context = "\n".join(separated_context)
            
            # Log the separation for debugging
            logger.info(f"🔥 SEPARATED CONTEXT - Attachments: {len(attachment_files)}, Repo files: {len(repository_files)}")
            logger.info(f"🔥 FINAL ANSWER - Question length: {len(question)}")
            logger.info(f"🔥 FINAL ANSWER - Total files content count: {len(files_content)}")
            
            if attachment_files:
                logger.info("🎉 FINAL ANSWER - ATTACHMENTS CLEARLY SEPARATED FOR GEMINI!")
                for i, attachment in enumerate(attachment_files):
                    logger.info(f"🔥 ATTACHMENT {i+1} PREVIEW: {attachment[:200]}...")
            else:
                logger.warning("🚨 FINAL ANSWER - NO ATTACHMENTS IN SEPARATED CONTEXT!")
            
            if repository_files:
                logger.info(f"� FINAL ANSWER - {len(repository_files)} REPOSITORY FILES SEPARATED!")
            
            # Create enhanced context for Gemini with clear separation
            enhanced_context = f"""{repository_context}

{final_separated_context}"""
            
            result = await gemini_client.answer_question(
                question=question,
                context=enhanced_context,
                files_content=[]  # Send empty files_content since we've embedded everything in context
            )
            
            if result and result.get('answer'):
                comprehensive_answer = result['answer']
                logger.info(f"Generated comprehensive answer: {len(comprehensive_answer)} characters")
                return comprehensive_answer
            else:
                logger.warning("Gemini failed to generate comprehensive answer, falling back to chain of thought")
                return self._extract_final_answer(chain_of_thought)
                
        except Exception as e:
            logger.error(f"Failed to generate comprehensive final answer: {str(e)}")
            # Fallback to extracting from chain of thought
            return self._extract_final_answer(chain_of_thought)


# Global instance
comprehensive_thinking_service = ComprehensiveThinkingService()
