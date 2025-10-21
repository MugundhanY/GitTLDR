"""
Improved Embedding processor for GitTLDR Python Worker.
Handles embedding generation and Q&A functionality with database-based file retrieval.
Now includes multi-step retrieval, hybrid retrieval (embeddings + graph + summaries), and graph-based context gathering.
"""
import json
import re
from typing import Dict, Any, List
from config.settings import get_settings
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from services.redis_client import redis_client
from services.database_service import database_service
from services.smart_context_builder import smart_context_builder
from services.multi_step_retrieval import multi_step_retrieval
from services.hybrid_retrieval import hybrid_retrieval
from processors.document_processor import document_processor
from utils.logger import get_logger

logger = get_logger(__name__)


class EmbeddingProcessor:
    """Handles embedding processing tasks with database-based file retrieval."""
    
    def __init__(self):
        self.settings = get_settings()
    
    async def process_repository(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Process repository embeddings."""
        logger.info("Processing repository embeddings")
        
        # This would typically be handled by FileProcessor.process_full_repository
        # For now, return a placeholder
        return {
            "status": "completed",
            "message": "Repository embedding processing not implemented separately"
        }
    
    async def process_file(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Process single file embedding."""
        logger.info("Processing single file embedding")
        
        file_path = task_data.get("filePath")
        content = task_data.get("content")
        
        if not content:
            raise ValueError("File content is required")
        
        try:
            # Generate embedding using the configured embedder (Gemini or local based on settings)
            embedding = await gemini_client.generate_embedding(content)
            
            # Store in Qdrant
            metadata = {
                "file_path": file_path,
                "content_type": "file",
                "processed_at": "2025-06-08T00:00:00Z"
            }
            
            point_id = await qdrant_client.store_embedding_with_metadata(
                embedding=embedding,
                metadata=metadata
            )
            
            return {
                "status": "completed",
                "point_id": point_id,
                "embedding_dimension": len(embedding)
            }
            
        except Exception as e:
            logger.error(f"Failed to process file embedding: {str(e)}")
            raise

    async def answer_question(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Answer a question about repository content using database, B2 storage, and advanced retrieval."""
        try:
            question_id = task_data.get("questionId")
            repository_id = task_data.get("repositoryId")
            user_id = task_data.get("userId")
            question = task_data.get("question")
            attachments = task_data.get("attachments", [])
            
            logger.info(f"Processing Q&A for question: {question_id}, repo: {repository_id}")
            if attachments:
                logger.info(f"Question includes {len(attachments)} attachments")
            
            # Check feature flags
            use_multi_step = self.settings.enable_multi_step_retrieval
            use_hybrid = self.settings.enable_hybrid_retrieval
            
            if use_multi_step:
                logger.info("🔄 Multi-step retrieval ENABLED")
            if use_hybrid:
                logger.info("🚀 Hybrid retrieval ENABLED (embeddings + graph + summaries + smart context)")
            if not use_multi_step and not use_hybrid:
                logger.info("📋 Using standard smart context retrieval")
            
            # First, check if repository processing is complete
            repo_status = await database_service.get_repository_status(repository_id)
            if not repo_status:
                logger.error(f"Repository {repository_id} not found in database")
                
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "Repository not found. Please ensure the repository has been added and processed.",
                    "confidence": 0.1,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Check if repository processing is complete
            if repo_status.get('embedding_status') != 'COMPLETED':
                logger.warning(f"Repository {repository_id} not fully processed. Status: {repo_status.get('embedding_status')}")
                
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": f"The repository '{repo_status.get('name', 'Unknown')}' is still being processed. Current status: {repo_status.get('embedding_status')}. Please wait for processing to complete and try again.",
                    "confidence": 0.1,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Get files from database
            files_metadata = await database_service.get_repository_files(repository_id)
            logger.info(f"Found {len(files_metadata)} files in database for repository {repository_id}")
            
            if not files_metadata:
                logger.warning(f"No files found in database for repository {repository_id}")
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "No files found for this repository. The repository may not have been processed correctly or may be empty.",
                    "confidence": 0.1,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Check for commit-related questions
            from services.commit_analysis_service import commit_analysis_service
            is_commit_question, commit_params = await commit_analysis_service.analyze_question(question)
            commit_content = []
            commit_analysis_attempted = False

            if is_commit_question and commit_params:
                commit_analysis_attempted = True
                logger.info(f"Detected {commit_params.question_type} commit question (GitHub API only)")
                try:
                    # --- Always use GitHub API for commit Q&A, never DB ---
                    # Get user GitHub token from DB
                    user_info = await database_service.get_user_info(user_id)
                    github_token = user_info.get('github_token') if user_info else None
                    # Use commit_analysis_service to fetch commits from GitHub API only
                    commits = await commit_analysis_service.get_commits_for_question_github_api(
                        repository_id, commit_params, github_token
                    )
                    if commits:
                        summarized_commits = []
                        for commit in commits:
                            summary_lines = []
                            summary_lines.append(f"Commit SHA: {commit.get('sha')}")
                            summary_lines.append(f"Message: {commit.get('message')}")
                            author = commit.get('author') or {}
                            author_name = commit.get('author_name') or author.get('name')
                            author_email = commit.get('author_email') or author.get('email')
                            summary_lines.append(f"Author: {author_name} {author_email}")
                            summary_lines.append(f"Date: {commit.get('created_at') or commit.get('timestamp')}")
                            files = commit.get('files')
                            if files and isinstance(files, list) and len(files) > 0:
                                summary_lines.append(f"Files Changed ({len(files)}):")
                                for f in files:
                                    if isinstance(f, dict):
                                        fname = f.get('filename') or f.get('name')
                                        status = f.get('status')
                                        additions = f.get('additions')
                                        deletions = f.get('deletions')
                                        file_summary = f"  - {fname}"
                                        if status:
                                            file_summary += f" [{status}]"
                                        if additions is not None or deletions is not None:
                                            file_summary += f" (+{additions or 0}/-{deletions or 0})"
                                        summary_lines.append(file_summary)
                                        patch = f.get('patch')
                                        # --- Advanced Q&A features for requirements.txt and code changes ---
                                        if fname and fname.lower() == 'requirements.txt' and patch:
                                            # Extract added/removed packages
                                            added = []
                                            removed = []
                                            for line in patch.splitlines():
                                                if line.startswith('+') and not line.startswith('+++'):
                                                    added.append(line[1:].strip())
                                                elif line.startswith('-') and not line.startswith('---'):
                                                    removed.append(line[1:].strip())
                                            if added:
                                                summary_lines.append(f"    Packages added to requirements.txt:")
                                                for pkg in added:
                                                    summary_lines.append(f"      + {pkg}")
                                            if removed:
                                                summary_lines.append(f"    Packages removed from requirements.txt:")
                                                for pkg in removed:
                                                    summary_lines.append(f"      - {pkg}")
                                            # Semantic summary using LLM (if available)
                                            try:
                                                semantic_summary = await gemini_client.summarize_diff(patch, file_name='requirements.txt')
                                                if semantic_summary:
                                                    summary_lines.append(f"    Semantic summary: {semantic_summary}")
                                            except Exception as e:
                                                summary_lines.append(f"    (Semantic summary unavailable: {str(e)})")
                                            # Impact analysis: which files import removed packages?
                                            try:
                                                if removed and files_with_content:
                                                    impacted_files = []
                                                    for fileinfo in files_with_content:
                                                        if fileinfo.get('name', '').endswith('.py') and fileinfo.get('content'):
                                                            for pkg in removed:
                                                                pkg_base = pkg.split('==')[0].replace('_', '-')
                                                                if pkg_base in fileinfo['content']:
                                                                    impacted_files.append(fileinfo['path'])
                                                    if impacted_files:
                                                        summary_lines.append(f"    Impact: The following files may import or use removed packages:")
                                                        for path in set(impacted_files):
                                                            summary_lines.append(f"      - {path}")
                                            except Exception as e:
                                                summary_lines.append(f"    (Impact analysis unavailable: {str(e)})")
                                            # Changelog entry
                                            summary_lines.append(f"    Changelog: requirements.txt updated. {'Added: ' + ', '.join(added) if added else ''}{' Removed: ' + ', '.join(removed) if removed else ''}")
                                        # Show patch/diff summary for all files
                                        if patch:
                                            patch_lines = patch.splitlines()
                                            summary_lines.append("    Patch changes:")
                                            shown = 0
                                            for line in patch_lines:
                                                if line.startswith('+') and not line.startswith('+++'):
                                                    summary_lines.append(f"      {line}")
                                                    shown += 1
                                                elif line.startswith('-') and not line.startswith('---'):
                                                    summary_lines.append(f"      {line}")
                                                    shown += 1
                                                if shown > 20:
                                                    summary_lines.append("      ... [patch truncated]")
                                                    break
                                        else:
                                            summary_lines.append("    (No patch/diff available from GitHub API)")
                                    else:
                                        summary_lines.append(f"  - {str(f)}")
                            else:
                                summary_lines.append("Files Changed: No file change information is available in the provided context.")
                            summarized_commits.append("\n".join(summary_lines))
                        commit_content = summarized_commits
                        logger.info(f"✅ [GitHub API] Found {len(commits)} relevant commits for Q&A context")
                        logger.info(f"📊 [GitHub API] Sample commit data: {commits[0] if commits else 'None'}")
                    else:
                        logger.warning(f"❌ [GitHub API] No commits found for {commit_params.question_type} commit question")
                        commit_content = [
                            "=" * 60,
                            "🔄 COMMIT ANALYSIS ATTEMPTED (GitHub API)",
                            "=" * 60,
                            f"Analyzed question as {commit_params.question_type} commit query.",
                            "No matching commits found in the repository via GitHub API.",
                            "This could be because:",
                            "- The repository is new or has limited commit data",
                            "- The GitHub API is not accessible (token issues)",
                            "- The search criteria were too specific",
                            "- The repository may be private or not found",
                            "",
                            "RECOMMENDATION: Please check if the repository exists and is accessible,",
                            "or try asking about the repository's code files instead.",
                            "=" * 60
                        ]
                        commit_content = ["\n".join(commit_content)]
                except Exception as e:
                    logger.error(f"[GitHub API] Error during commit analysis: {str(e)}")
                    commit_content = [
                        "=" * 60,
                        "🔄 COMMIT ANALYSIS ERROR (GitHub API)",
                        "=" * 60,
                        f"Attempted to analyze {commit_params.question_type} commit question.",
                        f"Error occurred: {str(e)}",
                        "Falling back to regular file-based analysis.",
                        "=" * 60
                    ]
                    commit_content = ["\n".join(commit_content)]
            
            # Get files with content from database (using smart retrieval)
            files_with_content = await database_service.get_files_with_content(repository_id)
            logger.info(f"Retrieved {len(files_with_content)} files from database")
            
            # Process attachments if present
            attachment_content = []
            if attachments:
                logger.info(f"Processing {len(attachments)} attachments using document processor")
                try:
                    # DEDUPLICATE attachments based on filename to prevent duplicates
                    seen_files = set()
                    deduplicated_attachments = []

                    for attachment in attachments:
                        attachment_name = attachment.get('originalFileName') or attachment.get('name') or attachment.get('fileName') or 'user_attachment'
                        if attachment_name not in seen_files:
                            seen_files.add(attachment_name)
                            deduplicated_attachments.append(attachment)
                            logger.info(f"✅ ACCEPTED ATTACHMENT: {attachment_name}")
                        else:
                            logger.info(f"🚫 SKIPPED DUPLICATE ATTACHMENT: {attachment_name}")

                    logger.info(f"Deduplicated attachments from {len(attachments)} to {len(deduplicated_attachments)} unique files")

                    for attachment in deduplicated_attachments:
                        try:
                            # Get attachment details
                            attachment_name = attachment.get('originalFileName') or attachment.get('name') or attachment.get('fileName') or 'user_attachment'
                            file_type = attachment.get('fileType', attachment.get('type', ''))
                            b2_file_key = attachment.get('fileName') or attachment.get('backblazeFileId') or attachment.get('fileKey')

                            logger.info(f"🔍 Processing attachment: {attachment_name} (type: {file_type})")

                            content_bytes = None

                            # Try to get content from attachment metadata first
                            attachment_content_str = attachment.get('content', '')
                            if attachment_content_str and attachment_content_str.strip():
                                logger.info(f"✅ Using pre-provided content for {attachment_name} ({len(attachment_content_str)} chars)")

                                # Convert string content to bytes for document processor
                                if isinstance(attachment_content_str, str):
                                    # Check if it's base64 encoded
                                    try:
                                        import base64
                                        content_bytes = base64.b64decode(attachment_content_str)
                                        logger.info(f"Successfully decoded base64 content: {len(content_bytes)} bytes")
                                    except Exception:
                                        # If not base64, encode as UTF-8
                                        content_bytes = attachment_content_str.encode('utf-8')
                                        logger.info(f"Encoded text content as UTF-8: {len(content_bytes)} bytes")
                                else:
                                    content_bytes = attachment_content_str
                            else:
                                # No content provided, try to download from B2 as fallback
                                logger.warning(f"No content provided for {attachment_name}, attempting B2 download as fallback")

                                if b2_file_key:
                                    logger.info(f"🔥 ATTEMPTING B2 DOWNLOAD - File key: {b2_file_key}")
                                    try:
                                        # Use the B2 storage service to download the actual content
                                        from services.b2_storage_sdk_fixed import B2StorageService
                                        b2_storage = B2StorageService()
                                        if b2_storage:
                                            # Download as bytes for document processor
                                            content_bytes = await b2_storage.download_file_bytes(b2_file_key)
                                            if content_bytes:
                                                logger.info(f"🎉 SUCCESS! Downloaded attachment from B2: {len(content_bytes)} bytes")
                                            else:
                                                logger.warning(f"⚠️ B2 download returned empty bytes for {b2_file_key}")
                                    except Exception as b2_error:
                                        error_msg = str(b2_error)
                                        if "File not present" in error_msg or "not found" in error_msg.lower():
                                            logger.warning(f"📎 Attachment file not found in B2 storage ({b2_file_key}) - this may be a test file")
                                        else:
                                            logger.error(f"❌ Failed to download attachment from B2 ({b2_file_key}): {error_msg}")

                            if content_bytes:
                                # Use document processor to handle the file
                                result = await document_processor.process_document(
                                    content=content_bytes,
                                    filename=attachment_name,
                                    mime_type=file_type
                                )

                                if result.get('success'):
                                    processed_content = result['content']
                                    logger.info(f"✅ Document processor succeeded for {attachment_name}: {len(processed_content)} chars")
                                else:
                                    error_msg = result.get('error', 'Unknown error')
                                    # Check if document processor provided fallback content even though success=False
                                    fallback_content = result.get('content')
                                    if fallback_content and len(fallback_content.strip()) > 0:
                                        # Use the fallback content (e.g., raw text extraction)
                                        processed_content = fallback_content
                                        logger.warning(f"⚠️ Document processor used fallback for {attachment_name}: {error_msg}")
                                    else:
                                        # No fallback available, show error message
                                        processed_content = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n\n[PROCESSING FAILED]\n{error_msg}\n\n[END FAILED CONTENT]"
                                        logger.warning(f"⚠️ Document processor failed for {attachment_name}: {error_msg}")

                                # Format exactly like the normal Q&A flow
                                formatted_attachment = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n{processed_content}"
                                attachment_content.append(formatted_attachment)
                                logger.info(f"🎉 Added processed attachment to context: attachment/{attachment_name}")
                            else:
                                # No content available
                                formatted_attachment = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n[File provided but content could not be downloaded from storage - may be inaccessible]"
                                attachment_content.append(formatted_attachment)
                                logger.info(f"📎 Added attachment placeholder to context: attachment/{attachment_name}")

                        except Exception as e:
                            logger.warning(f"Failed to process attachment {attachment.get('name', 'unknown')} in Q&A: {str(e)}")
                            # Add error placeholder
                            attachment_name = attachment.get('originalFileName') or attachment.get('name') or attachment.get('fileName') or 'user_attachment'
                            formatted_attachment = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n[Error processing attachment: {str(e)}]"
                            attachment_content.append(formatted_attachment)
                            continue

                    logger.info(f"🎯 CRITICAL: Processed {len(attachment_content)} attachments using document processor")

                except Exception as att_proc_error:
                    logger.warning(f"Failed to process attachments: {str(att_proc_error)}")
                    # Include basic attachment info even if processing fails
                    for attachment in attachments:
                        attachment_name = attachment.get('originalFileName') or attachment.get('name') or attachment.get('fileName') or 'user_attachment'
                        formatted_attachment = f"🔴 USER-PROVIDED File: attachment/{attachment_name}\n[Attachment processing failed: {str(att_proc_error)}]"
                        attachment_content.append(formatted_attachment)

            # If attachments are present, modify the question to explicitly mention them
            if attachment_content:
                attachment_names = [att.get('originalFileName') or att.get('name') or att.get('fileName') or 'user_attachment' for att in attachments]
                attachment_types = list(set(att.get('type', 'unknown') for att in attachments))
                
                # Create a more detailed attachment description
                attachment_description = f"You have access to {len(attachment_content)} attached file(s): {', '.join(attachment_names)}"
                if len(attachment_types) == 1:
                    attachment_description += f" (all {attachment_types[0]} files)"
                else:
                    attachment_description += f" (file types: {', '.join(attachment_types)})"
                
                attachment_description += ". Please analyze and consider the content of these attached files when answering the user's question. For binary files like PDFs or documents, use the provided metadata and context clues to understand their relevance."
                
                question = f"{question}\n\n{attachment_description}"
            
            if not files_with_content:
                logger.warning(f"No file content could be loaded for repository {repository_id}")
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "I couldn't load the content of the relevant files to answer your question. This might be due to storage issues or the files being too large. Please try again later or contact support.",
                    "confidence": 0.2,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Analyze the question to understand what context is needed
            question_analysis = smart_context_builder.analyze_question(question)
            logger.info(f"Question analysis: {question_analysis}")
            
            # Use Multi-Step Retrieval if enabled
            if use_multi_step and not is_commit_question:
                logger.info("🔄🔄🔄 Using MULTI-STEP RETRIEVAL")
                
                # Prepare initial context for multi-step retrieval
                repo_info = f"Repository: {repo_status.get('name')} (ID: {repository_id})"
                if repo_status.get('file_count'):
                    repo_info += f"\nTotal files: {repo_status.get('file_count')}"
                if repo_status.get('total_size'):
                    repo_info += f"\nTotal size: {repo_status.get('total_size')} bytes"
                if repo_status.get('url'):
                    repo_info += f"\nGitHub URL: {repo_status.get('url')}"
                if repo_status.get('description'):
                    repo_info += f"\nDescription: {repo_status.get('description')}"
                if repo_status.get('language'):
                    repo_info += f"\nPrimary Language: {repo_status.get('language')}"
                
                if attachment_content:
                    repo_info += f"\n\nAttachments provided: {len(attachment_content)} files"
                    for att in attachments:
                        att_name = att.get('originalFileName') or att.get('name') or att.get('fileName') or 'user_attachment'
                        att_type = att.get('type', 'unknown')
                        repo_info += f"\n  - {att_name} ({att_type})"
                
                initial_context = {
                    'repo_info': repo_info,
                    'attachments': attachment_content,
                    'files_with_content': files_with_content
                }
                
                # Use multi-step retrieval
                multi_step_result = await multi_step_retrieval.answer_with_multi_step_retrieval(
                    repository_id=repository_id,
                    question=question,
                    user_id=user_id,
                    initial_context=initial_context,
                    logger_instance=logger
                )
                
                # Automatically categorize the question using AI
                logger.info("Categorizing question using AI...")
                categorization_result = await gemini_client.categorize_question(
                    question=question,
                    repository_context=repo_info
                )
                
                logger.info(f"Question categorized as: {categorization_result.get('category')} "
                          f"with tags: {categorization_result.get('tags')}")
                
                # Extract relevant files from multi-step result
                relevant_files_from_multi_step = multi_step_result.get("relevant_files", [])
                logger.info(f"📁 Multi-step retrieval returned {len(relevant_files_from_multi_step)} relevant files")
                
                # Store result in Redis for Node.js worker to process
                if self.settings.store_qna_results:
                    result_data = {
                        "question_id": question_id,
                        "question": question,
                        "answer": multi_step_result["answer"],
                        "confidence": multi_step_result["confidence"],
                        "relevant_files": relevant_files_from_multi_step,  # ✅ FIX: Use file paths array
                        "user_id": user_id,
                        "repository_id": repository_id,
                        "context_files_used": multi_step_result.get("retrieval_metadata", {}).get("files_retrieved", 0),
                        "category": categorization_result.get("category", "general"),
                        "tags": categorization_result.get("tags", ["question"]),
                        "categorization_confidence": categorization_result.get("confidence", 0.5),
                        "multi_step_metadata": multi_step_result.get("retrieval_metadata", {})
                    }
                    
                    await redis_client.lpush("qna_results", json.dumps(result_data))
                    logger.info(f"Multi-step Q&A result queued for storage: {question_id}")
                
                # ✅ FIX: Add relevant_files to return value
                multi_step_result["relevant_files"] = relevant_files_from_multi_step
                multi_step_result["category"] = categorization_result.get("category", "general")
                multi_step_result["tags"] = categorization_result.get("tags", ["question"])
                
                return multi_step_result
            
            # Standard retrieval path (for commit questions or when multi-step is disabled)
            # Use HYBRID RETRIEVAL for better accuracy (if enabled)
                if is_commit_question:
                    logger.info("💡 Hybrid retrieval enabled for COMMIT question")
                logger.info("🚀 Using HYBRID retrieval (embeddings + graph + summaries + smart context)")
                
                try:
                    # Use hybrid retrieval system
                    selected_files, retrieval_stats = await hybrid_retrieval.retrieve_context(
                        repository_id=repository_id,
                        question=question,
                        all_files=files_with_content,
                        max_files=15
                    )
                    
                    # Log retrieval statistics
                    logger.info(f"📊 Hybrid Retrieval Stats:")
                    logger.info(f"   Methods used: {', '.join(retrieval_stats['methods_used'])}")
                    logger.info(f"   Final files: {retrieval_stats['final_file_count']}")
                    logger.info(f"   Avg confidence: {retrieval_stats['average_confidence']:.2f}")
                    
                    # Format files content
                    files_content = []
                    relevant_file_paths = []
                    
                    for file_data in selected_files:
                        file_info = file_data['file']
                        file_path = file_info.get('path', '')
                        content = file_info.get('content', '')
                        
                        # Safety check: warn if content is missing
                        if not content:
                            logger.warning(f"⚠️ File has no content: {file_path}")
                            # Try to get content from original files_with_content
                            original_file = next((f for f in files_with_content if f.get('path') == file_path), None)
                            if original_file and original_file.get('content'):
                                content = original_file['content']
                                logger.info(f"✅ Recovered content for: {file_path}")
                        
                        if content:
                            files_content.append(f"File: {file_path}\n{content}")
                            relevant_file_paths.append(file_path)
                        else:
                            logger.error(f"❌ Could not load content for: {file_path}")
                    
                    logger.info(f"✅ Hybrid retrieval selected {len(files_content)} files with content")
                    
                except Exception as e:
                    logger.warning(f"Hybrid retrieval failed: {str(e)}, falling back to smart context")
                    # Fallback to smart context builder
                    files_content, relevant_file_paths = smart_context_builder.build_smart_context(
                        question_analysis, files_with_content, question
                    )
            else:
                # When hybrid is disabled, use smart context builder
                logger.info("📋 Using smart context builder")
                files_content, relevant_file_paths = smart_context_builder.build_smart_context(
                    question_analysis, files_with_content, question
                )
            
            # CRITICAL DEBUG: Log relevant files after retrieval
            logger.info(f"🔍 DEBUG - Retrieved {len(relevant_file_paths)} relevant files from context builder")
            if relevant_file_paths:
                logger.info(f"🔍 DEBUG - Relevant files list: {relevant_file_paths[:5]}...")  # Show first 5
            else:
                logger.warning(f"⚠️ DEBUG - NO RELEVANT FILES RETURNED from context builder!")
            
            # Add commit content to the context if available
            if commit_content:
                logger.info(f"Adding {len(commit_content)} commits to Q&A context")
                
                # Smart context optimization for commit data
                total_commit_chars = sum(len(content) for content in commit_content)
                total_file_chars = sum(len(content) for content in files_content)
                
                logger.info(f"Context size analysis:")
                logger.info(f"  - Commit content: {total_commit_chars} characters")
                logger.info(f"  - File content: {total_file_chars} characters")
                logger.info(f"  - Total: {total_commit_chars + total_file_chars} characters")
                
                # For commit questions, be VERY aggressive about minimizing file content
                if commit_analysis_attempted:
                    # For commit questions, severely limit file content to prevent truncation
                    MAX_COMMIT_CONTEXT_SIZE = 3000  # Much smaller limit for commit questions
                    MAX_FILE_CONTENT_FOR_COMMITS = 1000  # Very small budget for files when commits are present
                    
                    logger.info(f"🔄 COMMIT QUESTION OPTIMIZATION: Limiting context to {MAX_COMMIT_CONTEXT_SIZE} chars")
                    
                    # Always prioritize commit data, severely limit file content
                    if total_commit_chars + total_file_chars > MAX_COMMIT_CONTEXT_SIZE:
                        logger.warning(f"Commit question context optimization: reducing from {total_commit_chars + total_file_chars} to ~{MAX_COMMIT_CONTEXT_SIZE} chars")
                        
                        # Strategy: Keep ALL commit data, minimize file content to absolute minimum
                        if total_commit_chars <= MAX_COMMIT_CONTEXT_SIZE * 0.8:  # If commits fit in 80% of budget
                            # Keep commits, severely reduce file content
                            remaining_budget = min(MAX_FILE_CONTENT_FOR_COMMITS, MAX_COMMIT_CONTEXT_SIZE - total_commit_chars)
                            
                            if remaining_budget > 200:  # Only include files if there's meaningful space
                                # Keep only essential file snippets (README, package.json, etc.)
                                optimized_files_content = []
                                current_size = 0
                                
                                # Prioritize documentation files for minimal context
                                priority_files = ['readme', 'package.json', 'requirements.txt', '.md']
                                priority_content = []
                                other_content = []
                                
                                for content in files_content:
                                    content_lower = content.lower()
                                    if any(pf in content_lower for pf in priority_files):
                                        priority_content.append(content)
                                    else:
                                        other_content.append(content)
                                
                                # Add priority files first, heavily truncated
                                for content in priority_content:
                                    if current_size >= remaining_budget:
                                        break
                                    
                                    remaining_space = remaining_budget - current_size
                                    if remaining_space > 100:  # Need at least 100 chars to be useful
                                        if len(content) <= remaining_space:
                                            optimized_files_content.append(content)
                                            current_size += len(content)
                                        else:
                                            # Heavily truncate to fit
                                            truncated = content[:remaining_space-30] + "\n... [truncated for commit focus]"
                                            optimized_files_content.append(truncated)
                                            current_size += len(truncated)
                                            break
                                
                                files_content = optimized_files_content
                                logger.info(f"🔄 COMMIT OPTIMIZATION: Reduced file content to {sum(len(c) for c in files_content)} chars (kept {len(files_content)} priority files)")
                            else:
                                # Not enough space for files, remove all file content
                                files_content = []
                                logger.info(f"🔄 COMMIT OPTIMIZATION: Removed all file content to prioritize commit data")
                        else:
                            # Even commit data is too large, truncate commits but keep them
                            logger.warning("🔄 COMMIT OPTIMIZATION: Even commit data is large, truncating commits")
                            optimized_commits = []
                            current_size = 0
                            for commit_text in commit_content:
                                if current_size + len(commit_text) <= MAX_COMMIT_CONTEXT_SIZE * 0.9:  # 90% for commits
                                    optimized_commits.append(commit_text)
                                    current_size += len(commit_text)
                                else:
                                    break
                            commit_content = optimized_commits
                            files_content = []  # Remove all file content
                            logger.info(f"🔄 COMMIT OPTIMIZATION: Kept {len(commit_content)} commits, removed all file content")
                    else:
                        logger.info(f"🔄 COMMIT OPTIMIZATION: Context size acceptable ({total_commit_chars + total_file_chars} chars)")
                else:
                    # Regular optimization for non-commit questions
                    MAX_CONTEXT_SIZE = 25000  # Conservative limit to prevent truncation
                    if total_commit_chars + total_file_chars > MAX_CONTEXT_SIZE:
                        logger.warning(f"Large context detected ({total_commit_chars + total_file_chars} chars), optimizing...")
                        
                        # Keep all commit content but reduce file content
                        remaining_budget = MAX_CONTEXT_SIZE - total_commit_chars
                        if remaining_budget > 0:
                            # Keep only the most relevant files within budget
                            optimized_files_content = []
                            current_size = 0
                            for content in files_content:
                                if current_size + len(content) <= remaining_budget:
                                    optimized_files_content.append(content)
                                    current_size += len(content)
                                else:
                                    # Truncate this file to fit in remaining budget
                                    remaining_space = remaining_budget - current_size
                                    if remaining_space > 500:  # Only include if meaningful space left
                                        truncated_content = content[:remaining_space-50] + "\n... [truncated]"
                                        optimized_files_content.append(truncated_content)
                                    break
                            
                            files_content = optimized_files_content
                            logger.info(f"Optimized file content: kept {len(files_content)} files, "
                                      f"total size now: {sum(len(c) for c in files_content)} chars")
                        else:
                            # Commit data alone is too large, truncate commits
                            logger.warning("Commit data alone exceeds limit, truncating...")
                            optimized_commits = []
                            current_size = 0
                            for commit_text in commit_content:
                                if current_size + len(commit_text) <= MAX_CONTEXT_SIZE * 0.8:  # 80% for commits
                                    optimized_commits.append(commit_text)
                                    current_size += len(commit_text)
                                else:
                                    break
                            commit_content = optimized_commits
                
                # Add commits as separate context sections
                for commit_text in commit_content:
                    files_content.append(commit_text)
                
                # Final context size check
                final_size = sum(len(content) for content in files_content)
                logger.info(f"Final optimized context size: {final_size} characters")
            
            # Add attachments to the beginning of context for maximum visibility
            if attachment_content:
                logger.info(f"🔥🔥🔥 Adding {len(attachment_content)} attachments to the beginning of context")
                attachment_context = []
                for i, att_content in enumerate(attachment_content):
                    # Get metadata from original attachments list
                    att_meta = attachments[i] if i < len(attachments) else {}
                    att_name = att_meta.get('originalFileName') or att_meta.get('name') or att_meta.get('fileName') or f'attachment_{i+1}'
                    att_type = att_meta.get('type', 'unknown')
                    
                    logger.info(f"   📎 Attachment: {att_name}")
                    logger.info(f"      - Type: {att_type}")
                    logger.info(f"      - Content length: {len(att_content)}")
                    logger.info(f"      - Content starts with: {att_content[:150]}")
                    attachment_context.append(att_content)
                # Prepend attachments to files_content
                files_content = attachment_context + files_content
                logger.info(f"✅ Files content now has {len(files_content)} items (attachments + repo files)")
            
            if not files_content:
                logger.warning(f"No relevant content found for question: {question}")
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "I couldn't find relevant content to answer your question. The repository may have limited text-based files, or your question may require specific files that weren't found.",
                    "confidence": 0.2,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Generate answer using Gemini - Enhanced repository context
            repo_info = f"Repository: {repo_status.get('name')} (ID: {repository_id})"
            if repo_status.get('file_count'):
                repo_info += f"\nTotal files: {repo_status.get('file_count')}"
            if repo_status.get('total_size'):
                repo_info += f"\nTotal size: {repo_status.get('total_size')} bytes"
            if repo_status.get('url'):
                repo_info += f"\nGitHub URL: {repo_status.get('url')}"
            if repo_status.get('description'):
                repo_info += f"\nDescription: {repo_status.get('description')}"
            if repo_status.get('language'):
                repo_info += f"\nPrimary Language: {repo_status.get('language')}"
                
            # Enhanced commit context information
            if commit_content:
                repo_info += f"\n\n🔄 COMMIT ANALYSIS RESULTS:"
                repo_info += f"\n- Found {len(commit_content)} relevant commits"
                if commit_params and commit_params.question_type:
                    repo_info += f"\n- Query type: {commit_params.question_type}"
                    if commit_params.question_type == 'recent':
                        repo_info += f"\n- Showing latest commits from the repository"
                    elif commit_params.question_type == 'date_range':
                        repo_info += f"\n- Date range: {commit_params.start_date} to {commit_params.end_date}"
                    elif commit_params.question_type == 'author':
                        repo_info += f"\n- Author pattern: {commit_params.author_pattern}"
                repo_info += f"\n- Use the commit data below to answer the user's question"
            elif commit_analysis_attempted:
                repo_info += f"\n\n⚠️ COMMIT ANALYSIS: No matching commits found for this query"
                
            if attachment_content:
                repo_info += f"\n\n🔴 USER-PROVIDED ATTACHMENTS ({len(attachment_content)} files):"
                for att in attachments:
                    att_name = att.get('originalFileName') or att.get('name') or att.get('fileName') or 'user_attachment'
                    att_type = att.get('type', 'unknown')
                    att_size = att.get('fileSize', 0)
                    repo_info += f"\n  - {att_name} ({att_type}, {att_size} bytes)"
                repo_info += f"\n  IMPORTANT: These are files uploaded by the user for analysis. Please consider their content when answering."
            
            # Log what we're about to send to the AI
            logger.info(f"📤 Sending to Gemini AI:")
            logger.info(f"   - Question: {question}")
            logger.info(f"   - Files in context: {len(files_content)}")
            logger.info(f"   - Has attachments: {bool(attachment_content)}")
            if files_content:
                for i, content in enumerate(files_content[:3]):  # Log first 3 items
                    content_preview = content[:200] if len(content) > 200 else content
                    logger.info(f"   - File {i+1} preview: {content_preview}")
                    logger.info(f"   - File {i+1} contains USER-PROVIDED: {'🔴 USER-PROVIDED' in content}")
            
            answer_result = await gemini_client.answer_question(
                question=question,
                context=repo_info,
                files_content=files_content
            )
            
            # Automatically categorize the question using AI
            logger.info("Categorizing question using AI...")
            categorization_result = await gemini_client.categorize_question(
                question=question,
                repository_context=repo_info
            )
            
            logger.info(f"Question categorized as: {categorization_result.get('category')} "
                      f"with tags: {categorization_result.get('tags')}")
            
            # Store result in Redis for Node.js worker to process (if enabled)
            if self.settings.store_qna_results:
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": answer_result["answer"],
                    "confidence": answer_result["confidence"],
                    "relevant_files": relevant_file_paths,
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": len(files_content),
                    # Add AI-generated categorization
                    "category": categorization_result.get("category", "general"),
                    "tags": categorization_result.get("tags", ["question"]),
                    "categorization_confidence": categorization_result.get("confidence", 0.5)
                }
                
                # CRITICAL DEBUG: Log what we're sending to Redis
                logger.info(f"📤 DEBUG - Sending to Redis: relevant_files count = {len(relevant_file_paths)}")
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                logger.info(f"Q&A result queued for storage: {question_id}")
            else:
                logger.debug(f"Q&A result storage disabled, skipping Redis write for: {question_id}")
            
            # CRITICAL DEBUG: Log final return value
            logger.info(f"✅ DEBUG - Returning relevant_files count = {len(relevant_file_paths)}")
            
            return {
                "status": "completed",
                "answer": answer_result["answer"],
                "confidence": answer_result["confidence"],
                "relevant_files": relevant_file_paths,
                "category": categorization_result.get("category", "general"),
                "tags": categorization_result.get("tags", ["question"])
            }
            
        except Exception as e:
            logger.error(f"Failed to answer question: {str(e)}")
            
            # Store error result
            try:
                error_result = {
                    "question_id": task_data.get("questionId"),
                    "question": task_data.get("question"),
                    "answer": f"An error occurred while processing your question: {str(e)}. Please try again later.",
                    "confidence": 0.0,
                    "relevant_files": [],
                    "user_id": task_data.get("userId"),
                    "repository_id": task_data.get("repositoryId"),
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(error_result))
            except Exception as storage_error:
                logger.error(f"Failed to store error result: {str(storage_error)}")
            
            raise

