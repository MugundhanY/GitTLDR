"""
Multi-Step Retrieval System for iterative context gathering.
Allows LLM to request additional information when context is insufficient.
"""
import json
import re
from typing import Dict, Any, List, Optional, Tuple

from services.gemini_client import gemini_client
from services.database_service import database_service
from services.neo4j_client import neo4j_client
from services.smart_context_builder import smart_context_builder
from services.hybrid_retrieval import hybrid_retrieval
from utils.logger import get_logger

logger = get_logger(__name__)


class MultiStepRetrieval:
    """
    Implements iterative retrieval where LLM can request more context.
    
    Process:
    1. Initial retrieval based on question
    2. LLM attempts to answer
    3. If insufficient, LLM specifies what's needed
    4. System retrieves additional context
    5. Repeat until answer is complete or max iterations reached
    """
    
    def __init__(self):
        self.max_iterations = 3
        self.insufficient_context_patterns = [
            r"need more (information|context|details) about",
            r"don't have (enough )?information",
            r"can't find (.*?) in the (context|provided files)",
            r"would need to (see|know|check)",
            r"missing (information|context|details)",
            r"unclear (from|about|what)",
            r"INSUFFICIENT_CONTEXT:",
            r"NEED_MORE_FILES:",
            r"NEED_MORE_CONTEXT:",
        ]
    
    async def answer_with_multi_step_retrieval(
        self,
        repository_id: str,
        question: str,
        user_id: str,
        initial_context: Dict[str, Any],
        logger_instance
    ) -> Dict[str, Any]:
        """
        Main entry point for multi-step retrieval Q&A.
        
        Args:
            repository_id: Repository ID
            question: User's question
            user_id: User ID
            initial_context: Initial context (repo info, etc.)
            logger_instance: Logger instance
            
        Returns:
            Final answer with metadata about retrieval process
        """
        logger_instance.info("🔄 Starting multi-step retrieval process")
        
        # Track retrieval history
        retrieval_history = {
            'iterations': 0,
            'files_retrieved': set(),
            'additional_queries': [],
            'total_tokens_used': 0
        }
        
        # OPTIMIZATION: Load all files with content ONCE at the beginning
        logger_instance.info("📥 Loading all repository files with content (one-time operation)")
        all_files_with_content = await database_service.get_files_with_content(repository_id)
        
        # Add attachments to the files list if provided
        if initial_context.get('attachments'):
            logger_instance.info(f"📎 Adding {len(initial_context['attachments'])} user attachments to file list")
            # Convert attachment strings to dictionary format for consistency
            for attachment in initial_context['attachments']:
                if isinstance(attachment, str):
                    # ✅ FIX #5.1: Keep the FULL attachment string, including USER-PROVIDED marker
                    # Parse attachment string to extract path and content
                    # Format: "🔴 USER-PROVIDED File: attachment/filename\ncontent..."
                    lines = attachment.split('\n', 1)
                    file_path = "attachment/unknown"
                    file_name = "unknown"
                    content = attachment  # ✅ Keep full string by default
                    
                    if lines and "File: attachment/" in lines[0]:
                        # Extract file path and name
                        parts = lines[0].split("File: attachment/")
                        if len(parts) > 1:
                            file_name = parts[1].strip()
                            file_path = f"attachment/{file_name}"
                    
                    # ✅ CRITICAL: Do NOT strip the header - keep full attachment string
                    # The _format_file_content() method will detect and preserve it
                    # No longer doing: content = lines[1] (which strips the marker)
                    
                    # Create dictionary format
                    attachment_dict = {
                        'path': file_path,
                        'name': file_name,
                        'content': content,  # ✅ Now contains full "🔴 USER-PROVIDED..." string
                        'is_attachment': True
                    }
                    all_files_with_content.append(attachment_dict)
                elif isinstance(attachment, dict):
                    # Already in dictionary format
                    all_files_with_content.append(attachment)
                else:
                    logger_instance.warning(f"Unknown attachment type: {type(attachment)}")
        
        if not all_files_with_content:
            logger_instance.warning(f"No files found for repository {repository_id}")
            # Return error response
            return {
                'status': 'completed',
                'answer': 'No files found in the repository to answer your question.',
                'confidence': 0.1,
                'retrieval_metadata': {
                    'iterations': 0,
                    'files_retrieved': 0,
                    'additional_queries': 0,
                    'multi_step_used': False
                }
            }
        
        logger_instance.info(f"✅ Loaded {len(all_files_with_content)} files with content (including attachments)")
        
        # Step 1: Initial context retrieval (pass all_files_with_content)
        current_context = await self._initial_retrieval(
            repository_id,
            question,
            initial_context,
            retrieval_history,
            all_files_with_content  # Pass pre-loaded files
        )
        
        logger_instance.info(f"Initial retrieval: {len(current_context)} files")
        
        # Step 2: Iterative refinement
        for iteration in range(self.max_iterations):
            retrieval_history['iterations'] = iteration + 1
            
            logger_instance.info(f"🔄 Iteration {iteration + 1}/{self.max_iterations}")
            
            # Attempt to answer with current context
            answer_result = await self._attempt_answer(
                question,
                initial_context['repo_info'],
                current_context,
                iteration,
                logger_instance
            )
            
            # Check if answer is complete
            is_complete, missing_info = self._check_answer_completeness(
                answer_result['answer'],
                question
            )
            
            if is_complete:
                logger_instance.info(f"✅ Answer complete after {iteration + 1} iteration(s)")
                return self._format_final_answer(answer_result, retrieval_history)
            
            # Extract what additional information is needed
            if iteration < self.max_iterations - 1:
                logger_instance.info(f"⚠️ Answer incomplete, requesting more context: {missing_info}")
                
                additional_context = await self._retrieve_additional_context(
                    repository_id,
                    question,
                    missing_info,
                    current_context,
                    retrieval_history,
                    logger_instance,
                    all_files_with_content  # Pass pre-loaded files
                )
                
                if additional_context:
                    logger_instance.info(f"➕ Retrieved {len(additional_context)} additional files")
                    current_context.extend(additional_context)
                else:
                    logger_instance.warning("⚠️ No additional context found, stopping iteration")
                    break
            else:
                logger_instance.warning(f"⚠️ Reached max iterations ({self.max_iterations}), returning best effort")
        
        # Return best effort answer
        return self._format_final_answer(answer_result, retrieval_history)
    
    async def _initial_retrieval(
        self,
        repository_id: str,
        question: str,
        initial_context: Dict[str, Any],
        retrieval_history: Dict[str, Any],
        all_files_with_content: List[Dict[str, Any]]  # Pre-loaded files
    ) -> List[str]:
        """Perform initial context retrieval using HYBRID approach (embeddings + graph + summaries + smart context)."""
        # Use pre-loaded files instead of fetching again
        files_with_content = all_files_with_content
        
        if not files_with_content:
            logger.warning(f"No files found for repository {repository_id}")
            return []
        
        # Use HYBRID RETRIEVAL for optimal accuracy
        logger.info("🚀 Using HYBRID retrieval (embeddings + graph + summaries + smart context)")
        
        try:
            selected_files, retrieval_stats = await hybrid_retrieval.retrieve_context(
                repository_id=repository_id,
                question=question,
                all_files=files_with_content,
                max_files=15
            )
            
            # Log retrieval statistics
            logger.info(f"📊 Hybrid Retrieval Stats:")
            logger.info(f"   Methods used: {', '.join(retrieval_stats['methods_used'])}")
            logger.info(f"   Files per method: {retrieval_stats['files_per_method']}")
            logger.info(f"   Final files: {retrieval_stats['final_file_count']}")
            logger.info(f"   Avg confidence: {retrieval_stats['average_confidence']:.2f}")
            
            # Format selected files for context
            formatted_context = []
            for file_data in selected_files:
                file_info = file_data['file']
                file_path = file_info.get('path', '')
                retrieval_history['files_retrieved'].add(file_path)
                
                # ✅ DEBUG: Log if this is an attachment
                is_attachment_path = file_path.startswith('attachment/')
                is_attachment_flag = file_info.get('is_attachment', False)
                has_marker = '🔴 USER-PROVIDED' in file_info.get('content', '')
                has_content = bool(file_info.get('content'))
                content_len = len(file_info.get('content', ''))
                
                if is_attachment_path or is_attachment_flag or has_marker:
                    logger.info(f"🔍 DEBUG FORMATTING: {file_path}, has_content={has_content}, content_len={content_len}, is_attachment_flag={is_attachment_flag}, has_marker={has_marker}")
                
                # Safety check: ensure content exists
                if not file_info.get('content'):
                    logger.warning(f"⚠️ File has no content: {file_path}")
                    # Try to get content from original files_with_content
                    original_file = next((f for f in files_with_content if f.get('path') == file_path), None)
                    if original_file and original_file.get('content'):
                        file_info['content'] = original_file['content']
                        logger.info(f"✅ Recovered content for: {file_path}")
                
                # Format with confidence score
                if file_info.get('content'):
                    formatted = self._format_file_content(file_info)
                    formatted_context.append(formatted)
                else:
                    logger.error(f"❌ Could not load content for: {file_path}")
            
            logger.info(f"✅ Hybrid retrieval found {len(formatted_context)} relevant files with content")
            return formatted_context
            
        except Exception as e:
            logger.error(f"Hybrid retrieval failed: {str(e)}, falling back to graph+smart context")
            
            # FALLBACK: Use old approach if hybrid fails
            return await self._fallback_retrieval(
                repository_id,
                question,
                files_with_content,
                retrieval_history
            )
    
    async def _fallback_retrieval(
        self,
        repository_id: str,
        question: str,
        files_with_content: List[Dict[str, Any]],
        retrieval_history: Dict[str, Any]
    ) -> List[str]:
        """Fallback to graph + smart context if hybrid fails."""
        graph_context = []
        
        # Try graph-based retrieval
        if neo4j_client.is_connected():
            try:
                keywords = self._extract_keywords(question)
                graph_results = await neo4j_client.graph_based_context_retrieval(
                    repository_id=repository_id,
                    question_keywords=keywords,
                    max_depth=2,
                    max_nodes=15
                )
                
                if graph_results:
                    logger.info(f"📊 Graph retrieval found {len(graph_results)} relevant files")
                    for result in graph_results:
                        retrieval_history['files_retrieved'].add(result['path'])
                        graph_context.append(self._format_file_content(result))
            except Exception as e:
                logger.warning(f"Graph retrieval failed: {str(e)}")
        
        # Add smart context
        if len(graph_context) < 5:
            logger.info("Using smart context builder for additional files")
            question_analysis = smart_context_builder.analyze_question(question)
            
            smart_files, relevant_paths = smart_context_builder.build_smart_context(
                question_analysis,
                files_with_content,
                question
            )
            
            for file_content in smart_files:
                path_match = re.search(r'File: (.+?)\n', file_content)
                if path_match:
                    retrieval_history['files_retrieved'].add(path_match.group(1))
            
            for smart_file in smart_files:
                if smart_file not in graph_context:
                    graph_context.append(smart_file)
        
        return graph_context
    
    async def _attempt_answer(
        self,
        question: str,
        repo_info: str,
        context_files: List[str],
        iteration: int,
        logger_instance
    ) -> Dict[str, Any]:
        """Attempt to answer question with current context."""
        # Build special prompt for multi-step retrieval
        enhanced_prompt = self._build_multi_step_prompt(question, iteration)
        
        # Generate answer
        answer_result = await gemini_client.answer_question(
            question=enhanced_prompt,
            context=repo_info,
            files_content=context_files
        )
        
        logger_instance.debug(f"Generated answer: {len(answer_result['answer'])} chars")
        
        return answer_result
    
    def _build_multi_step_prompt(self, question: str, iteration: int) -> str:
        """Build prompt that encourages LLM to identify missing information."""
        if iteration == 0:
            return f"""
{question}

IMPORTANT: If you don't have sufficient information to answer this question completely:
1. Provide what you CAN answer based on the context
2. Then add a section starting with "INSUFFICIENT_CONTEXT:" followed by what additional information you need
3. Be specific about what files, functions, or details would help

Example format if context is insufficient:
[Your partial answer here]

INSUFFICIENT_CONTEXT: Need to see the implementation of the UserAuth class, specifically the validate_token method.
"""
        else:
            return f"""
{question}

This is iteration {iteration + 1}. Additional context has been provided.
Please answer as completely as possible with the new information.

If you still need more information:
- Indicate with "NEED_MORE_CONTEXT:" what's still missing
- Otherwise, provide your complete answer
"""
    
    def _check_answer_completeness(
        self,
        answer: str,
        question: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if the answer is complete or if more context is needed.
        
        Returns:
            (is_complete, missing_info)
        """
        answer_lower = answer.lower()
        
        # Check for explicit insufficient context markers
        for pattern in self.insufficient_context_patterns:
            match = re.search(pattern, answer_lower, re.IGNORECASE)
            if match:
                # Extract what's needed
                missing_info = self._extract_missing_info(answer)
                return False, missing_info
        
        # Check for hedging language that suggests uncertainty
        hedging_phrases = [
            "i'm not sure",
            "i don't know",
            "i cannot determine",
            "without more information",
            "it's unclear",
            "cannot be determined from",
            "would need to check",
            "not visible in the provided"
        ]
        
        for phrase in hedging_phrases:
            if phrase in answer_lower:
                missing_info = self._extract_context_from_hedging(answer, phrase)
                return False, missing_info
        
        # Answer appears complete
        return True, None
    
    def _extract_missing_info(self, answer: str) -> str:
        """Extract specific information needs from answer."""
        # Look for INSUFFICIENT_CONTEXT: marker
        insufficient_match = re.search(
            r'INSUFFICIENT_CONTEXT:\s*(.+?)(?:\n\n|\Z)',
            answer,
            re.IGNORECASE | re.DOTALL
        )
        if insufficient_match:
            return insufficient_match.group(1).strip()
        
        # Look for NEED_MORE_CONTEXT: marker
        need_more_match = re.search(
            r'NEED_MORE_(?:CONTEXT|FILES|INFO):\s*(.+?)(?:\n\n|\Z)',
            answer,
            re.IGNORECASE | re.DOTALL
        )
        if need_more_match:
            return need_more_match.group(1).strip()
        
        # Look for "would need" or "need to see" patterns
        need_pattern = re.search(
            r'(?:would need|need to see|require|missing)\s+(.{20,200}?)[\.\n]',
            answer,
            re.IGNORECASE
        )
        if need_pattern:
            return need_pattern.group(1).strip()
        
        return "Additional context about the question topic"
    
    def _extract_context_from_hedging(self, answer: str, hedging_phrase: str) -> str:
        """Extract what's needed from hedging language."""
        # Find sentence containing hedging phrase
        sentences = re.split(r'[.!?]\s+', answer)
        
        for sentence in sentences:
            if hedging_phrase in sentence.lower():
                # Extract key nouns/entities from this sentence
                words = sentence.split()
                relevant_words = [w for w in words if len(w) > 3 and w[0].isupper()]
                if relevant_words:
                    return f"Information about {', '.join(relevant_words[:3])}"
        
        return "More detailed information about the topic"
    
    async def _retrieve_additional_context(
        self,
        repository_id: str,
        original_question: str,
        missing_info: str,
        current_context: List[str],
        retrieval_history: Dict[str, Any],
        logger_instance,
        all_files_with_content: List[Dict[str, Any]]  # Pre-loaded files
    ) -> List[str]:
        """Retrieve additional context based on missing information."""
        # Use pre-loaded files instead of fetching again
        all_files = all_files_with_content
        
        # Parse missing info to identify what to search for
        search_targets = self._parse_missing_info(missing_info)
        
        logger_instance.info(f"🔍 Search targets: {search_targets}")
        
        additional_files = []
        
        # Try graph-based search first
        if neo4j_client.is_connected() and search_targets.get('keywords'):
            try:
                graph_results = await neo4j_client.graph_based_context_retrieval(
                    repository_id=repository_id,
                    question_keywords=search_targets['keywords'],
                    max_depth=3,
                    max_nodes=10
                )
                
                for result in graph_results:
                    # Skip if already retrieved
                    if result['path'] not in retrieval_history['files_retrieved']:
                        retrieval_history['files_retrieved'].add(result['path'])
                        additional_files.append(self._format_file_content(result))
                        
            except Exception as e:
                logger_instance.warning(f"Additional graph retrieval failed: {str(e)}")
        
        # Fallback to database search
        if len(additional_files) < 3:
            # Search by keywords in file paths and content
            for file_info in all_files:
                if file_info.get('path') in retrieval_history['files_retrieved']:
                    continue
                
                # Check if file might be relevant
                if self._is_file_relevant(file_info, search_targets):
                    retrieval_history['files_retrieved'].add(file_info['path'])
                    additional_files.append(self._format_file_content(file_info))
                    
                    if len(additional_files) >= 5:
                        break
        
        retrieval_history['additional_queries'].append({
            'missing_info': missing_info,
            'files_found': len(additional_files)
        })
        
        return additional_files
    
    def _parse_missing_info(self, missing_info: str) -> Dict[str, Any]:
        """Parse missing info string to extract search targets."""
        targets = {
            'keywords': [],
            'file_patterns': [],
            'entities': []
        }
        
        # Extract capitalized words (likely class/function names)
        entities = re.findall(r'\b[A-Z][a-zA-Z0-9_]+\b', missing_info)
        targets['entities'] = entities[:5]
        
        # Extract file patterns
        file_patterns = re.findall(r'[a-zA-Z0-9_]+\.(?:py|js|ts|tsx|jsx)', missing_info)
        targets['file_patterns'] = file_patterns
        
        # Extract keywords (important words > 3 chars)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', missing_info.lower())
        # Filter out common words
        stopwords = {'need', 'information', 'about', 'implementation', 'details', 'more', 'context', 'would', 'help'}
        targets['keywords'] = [w for w in words if w not in stopwords][:8]
        
        # Add entities to keywords
        targets['keywords'].extend([e.lower() for e in entities])
        
        return targets
    
    def _is_file_relevant(self, file_info: Dict[str, Any], search_targets: Dict[str, Any]) -> bool:
        """Check if file is relevant to search targets."""
        path = file_info.get('path', '').lower()
        name = file_info.get('name', '').lower()
        content = file_info.get('content', '').lower()
        
        # Check file patterns
        for pattern in search_targets.get('file_patterns', []):
            if pattern.lower() in path:
                return True
        
        # Check entities
        for entity in search_targets.get('entities', []):
            entity_lower = entity.lower()
            if entity_lower in name or entity_lower in content[:1000]:
                return True
        
        # Check keywords
        keyword_matches = 0
        for keyword in search_targets.get('keywords', [])[:5]:
            if keyword in path or keyword in content[:2000]:
                keyword_matches += 1
        
        return keyword_matches >= 2
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""
        # Remove common question words
        text = re.sub(r'\b(what|how|why|when|where|who|which|is|are|does|do|can|could|would|should)\b', '', text, flags=re.IGNORECASE)
        
        # Extract words > 3 characters
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        
        # Extract CamelCase and snake_case identifiers
        identifiers = re.findall(r'\b[a-zA-Z][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*\b|\b[a-z]+_[a-z_]+\b', text)
        
        return list(set(words[:10] + identifiers[:5]))
    
    def _format_file_content(self, file_info: Dict[str, Any]) -> str:
        """Format file information for LLM context."""
        path = file_info.get('path', 'unknown')
        name = file_info.get('name', 'unknown')
        content = file_info.get('content', '')
        
        # ✅ DEBUG: Log formatting of attachments
        is_attachment = path.startswith('attachment/') or file_info.get('is_attachment', False)
        has_marker = content.startswith("🔴 USER-PROVIDED")
        if is_attachment or has_marker:
            logger.info(f"🔍 DEBUG _format_file_content: {path}, is_attachment={is_attachment}, has_marker={has_marker}, content_len={len(content)}, content_preview={content[:100]}")
        
        # ✅ CRITICAL FIX: Preserve user attachment formatting
        # If content already has USER-PROVIDED marker, it's a pre-formatted attachment
        if content.startswith("🔴 USER-PROVIDED"):
            # Content is already formatted - return as is (but still truncate if needed)
            if len(content) > 5000:
                # Find end of header line
                header_end = content.find('\n')
                if header_end > 0:
                    header = content[:header_end]
                    body = content[header_end + 1:5000]
                    return f"{header}\n{body}\n... [truncated]"
            return content  # Return pre-formatted attachment as-is
        
        # Check if this is an attachment by path
        is_attachment = path.startswith('attachment/') or file_info.get('is_attachment', False)
        
        if is_attachment:
            # Format as USER-PROVIDED attachment
            # Truncate very long files
            if len(content) > 5000:
                content = content[:5000] + "\n... [truncated]"
            return f"🔴 USER-PROVIDED File: {path}\n{content}"
        else:
            # Regular repository file
            # Truncate very long files
            if len(content) > 5000:
                content = content[:5000] + "\n... [truncated]"
            return f"File: {path}\nName: {name}\n\n{content}"
    
    def _format_final_answer(
        self,
        answer_result: Dict[str, Any],
        retrieval_history: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format final answer with retrieval metadata."""
        # Convert set to sorted list for consistent output
        files_retrieved_list = sorted(list(retrieval_history['files_retrieved']))
        
        logger.info(f"📁 Multi-step retrieval complete: {len(files_retrieved_list)} relevant files")
        logger.info(f"📁 Relevant files: {files_retrieved_list[:10]}")  # Show first 10
        
        return {
            'status': 'completed',
            'answer': answer_result['answer'],
            'confidence': answer_result.get('confidence', 0.7),
            'relevant_files': files_retrieved_list,  # ✅ FIX: Add relevant files array
            'retrieval_metadata': {
                'iterations': retrieval_history['iterations'],
                'files_retrieved': len(retrieval_history['files_retrieved']),
                'files_retrieved_paths': files_retrieved_list,  # Also keep in metadata for debugging
                'additional_queries': len(retrieval_history['additional_queries']),
                'multi_step_used': retrieval_history['iterations'] > 1
            }
        }


# Global instance
multi_step_retrieval = MultiStepRetrieval()
