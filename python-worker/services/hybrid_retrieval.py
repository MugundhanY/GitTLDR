"""
Hybrid Retrieval System for Q&A

Combines multiple retrieval strategies for optimal accuracy and performance:
1. Summary-based filtering (fast pre-filtering)
2. Semantic search via embeddings (conceptual matching)
3. Graph-based traversal (code relationships)
4. Smart context builder (keyword fallback)

Uses weighted scoring to merge results intelligently.
"""
import re
from typing import List, Dict, Any, Optional, Tuple, Set
from collections import defaultdict
from utils.logger import get_logger

logger = get_logger(__name__)


class HybridRetrieval:
    """
    Hybrid retrieval system that combines multiple strategies.
    """
    
    def __init__(self):
        # Weights for different retrieval methods
        self.weights = {
            'semantic': 0.35,      # Embeddings - highest for conceptual matching
            'graph': 0.30,         # Code relationships
            'smart_context': 0.20, # Keyword matching
            'summary': 0.15        # Summary hints
        }
        
        # Confidence thresholds
        self.min_confidence = 0.3
        self.high_confidence = 0.7
        
    async def retrieve_context(
        self,
        repository_id: str,
        question: str,
        all_files: List[Dict[str, Any]],
        max_files: int = 15
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Retrieve optimal context using hybrid approach.
        
        Args:
            repository_id: Repository ID
            question: User question
            all_files: All available files with metadata (and summaries)
            max_files: Maximum number of files to return
            
        Returns:
            (selected_files, retrieval_metadata)
        """
        logger.info(f"🔄 Starting hybrid retrieval for question: {question[:100]}...")
        
        # Filter all_files to only include dictionaries (defensive programming)
        original_count = len(all_files)
        all_files = [f for f in all_files if isinstance(f, dict)]
        if len(all_files) != original_count:
            logger.warning(f"Filtered out {original_count - len(all_files)} non-dict items from all_files")
        
        # ✅ DEBUG: Log attachment count at entry
        attachment_count_initial = sum(1 for f in all_files if isinstance(f, dict) and (
            f.get('path', '').startswith('attachment/') or 
            f.get('is_attachment', False) or
            '🔴 USER-PROVIDED' in f.get('content', '')
        ))
        logger.info(f"🔍 DEBUG HYBRID ENTRY: Received {len(all_files)} files, {attachment_count_initial} are attachments")
        for f in all_files:
            if isinstance(f, dict):
                file_path = f.get('path', '')
                if file_path.startswith('attachment/'):
                    content_preview = f.get('content', '')[:100] if f.get('content') else ''
                    logger.info(f"🔍 DEBUG HYBRID ENTRY: Attachment {file_path}, is_attachment={f.get('is_attachment')}, content preview={content_preview[:50]}")
        
        retrieval_stats = {
            'total_files': len(all_files),
            'methods_used': [],
            'files_per_method': {},
            'merge_strategy': 'weighted_confidence'
        }
        
        # Import services
        from services.qdrant_client import qdrant_client
        from services.neo4j_client import neo4j_client
        from services.smart_context_builder import smart_context_builder
        from services.gemini_client import gemini_client
        
        # Extract keywords for various methods
        keywords = self._extract_keywords(question)
        
        # LAYER 1: Summary-based pre-filtering (fast, in-memory)
        logger.info("📋 Layer 1: Summary-based filtering")
        summary_candidates = self._filter_by_summaries(all_files, question, keywords)
        retrieval_stats['methods_used'].append('summary')
        retrieval_stats['files_per_method']['summary'] = len(summary_candidates)
        logger.info(f"  → Found {len(summary_candidates)} candidates from summaries")
        
        # LAYER 2: Semantic search via embeddings
        semantic_matches = []
        try:
            if await qdrant_client.check_connection():
                logger.info("🔍 Layer 2: Semantic embedding search")
                semantic_matches = await self._semantic_search(
                    qdrant_client,
                    repository_id,
                    question,
                    limit=20
                )
                retrieval_stats['methods_used'].append('semantic')
                retrieval_stats['files_per_method']['semantic'] = len(semantic_matches)
                logger.info(f"  → Found {len(semantic_matches)} semantic matches")
        except Exception as e:
            logger.warning(f"Semantic search failed: {str(e)}")
        
        # LAYER 3: Graph-based traversal
        graph_matches = []
        try:
            if neo4j_client.is_connected():
                logger.info("🕸️ Layer 3: Graph-based retrieval")
                graph_matches = await neo4j_client.graph_based_context_retrieval(
                    repository_id=repository_id,
                    question_keywords=keywords,
                    max_depth=2,
                    max_nodes=15
                )
                retrieval_stats['methods_used'].append('graph')
                retrieval_stats['files_per_method']['graph'] = len(graph_matches)
                logger.info(f"  → Found {len(graph_matches)} graph matches")
        except Exception as e:
            logger.warning(f"Graph retrieval failed: {str(e)}")
        
        # LAYER 4: Smart context builder (keyword-based)
        logger.info("🎯 Layer 4: Smart context builder")
        question_analysis = smart_context_builder.analyze_question(question)
        smart_files, smart_paths = smart_context_builder.build_smart_context(
            question_analysis,
            all_files,
            question
        )
        
        # Convert smart_files to structured format
        smart_matches = self._parse_smart_context(smart_files, all_files)
        retrieval_stats['methods_used'].append('smart_context')
        retrieval_stats['files_per_method']['smart_context'] = len(smart_matches)
        logger.info(f"  → Found {len(smart_matches)} smart context matches")
        
        # MERGE: Combine all results with confidence scoring
        logger.info("🔀 Merging results with weighted confidence scoring")
        merged_results = self._merge_with_confidence(
            summary_scores=summary_candidates,
            semantic_matches=semantic_matches,
            graph_matches=graph_matches,
            smart_matches=smart_matches,
            all_files=all_files
        )
        
        # ✅ CRITICAL FIX #5.4: Ensure attachments are ALWAYS included before slicing
        # Separate attachments from regular files
        attachments = []
        non_attachments = []
        
        for result in merged_results:
            file_path = result.get('path', '')
            is_attachment = (
                file_path.startswith('attachment/') or
                result.get('file', {}).get('is_attachment', False) or
                '🔴 USER-PROVIDED' in result.get('file', {}).get('content', '')
            )
            if is_attachment:
                attachments.append(result)
                logger.info(f"🎯 PRIORITY: Attachment {file_path} will be included regardless of max_files limit")
            else:
                non_attachments.append(result)
        
        # Select top files: ALL attachments + fill remaining slots with non-attachments
        remaining_slots = max(0, max_files - len(attachments))
        final_files = attachments + non_attachments[:remaining_slots]
        
        logger.info(f"✅ Final selection: {len(attachments)} attachments + {len(final_files) - len(attachments)} repo files = {len(final_files)} total")
        
        retrieval_stats['final_file_count'] = len(final_files)
        retrieval_stats['average_confidence'] = sum(f['confidence'] for f in final_files) / len(final_files) if final_files else 0
        retrieval_stats['high_confidence_count'] = sum(1 for f in final_files if f['confidence'] >= self.high_confidence)
        
        logger.info(f"✅ Hybrid retrieval complete: {len(final_files)} files selected")
        logger.info(f"   Average confidence: {retrieval_stats['average_confidence']:.2f}")
        logger.info(f"   High confidence files: {retrieval_stats['high_confidence_count']}")
        
        return final_files, retrieval_stats
    
    def _filter_by_summaries(
        self,
        files: List[Dict[str, Any]],
        question: str,
        keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Fast pre-filtering using file summaries.
        Returns files with summary-based relevance scores.
        """
        scored_files = []
        question_lower = question.lower()
        
        for file_info in files:
            file_path = file_info.get('path', '')
            summary = file_info.get('summary', '')
            
            # CRITICAL: User attachments should always be included with high score
            is_attachment = (
                file_path.startswith('attachment/') or 
                file_info.get('is_attachment', False) or
                '🔴 USER-PROVIDED' in file_info.get('content', '')
            )
            
            if is_attachment:
                logger.info(f"🎯 ATTACHMENT in summary filter: {file_path} - giving maximum priority")
                scored_files.append({
                    'file': file_info,
                    'score': 1.0,  # Maximum score for attachments
                    'method': 'summary'
                })
                continue
            
            if not summary:
                # No summary, use low default score
                scored_files.append({
                    'file': file_info,
                    'score': 0.1,
                    'method': 'summary'
                })
                continue
            
            summary_lower = summary.lower()
            score = 0.0
            
            # Keyword matching in summary
            keyword_matches = sum(1 for kw in keywords if kw in summary_lower)
            score += keyword_matches * 0.15
            
            # Question overlap in summary
            question_words = set(question_lower.split())
            summary_words = set(summary_lower.split())
            overlap = len(question_words & summary_words)
            score += overlap * 0.05
            
            # Boost if summary is informative (not too short)
            if len(summary) > 50:
                score += 0.1
            
            if score > 0:
                scored_files.append({
                    'file': file_info,
                    'score': min(score, 1.0),  # Cap at 1.0
                    'method': 'summary'
                })
        
        # Sort by score
        scored_files.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top candidates (more than final, for further filtering)
        return scored_files[:50]
    
    async def _semantic_search(
        self,
        qdrant_client,
        repository_id: str,
        question: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search using embeddings.
        """
        try:
            # Import gemini_client locally
            from services.gemini_client import gemini_client
            
            # Generate embedding for question using configured embedder (Gemini or local)
            question_embedding = await gemini_client.generate_embedding(question)
            
            # Search in Qdrant
            results = await qdrant_client.search_similar_in_repo(
                query_embedding=question_embedding,
                repo_id=repository_id,
                limit=limit,
                score_threshold=0.1  # Lower threshold to get more results
            )
            
            # Format results
            semantic_matches = []
            for result in results:
                semantic_matches.append({
                    'file_path': result['metadata'].get('file_path'),
                    'score': result['score'],
                    'method': 'semantic'
                })
            
            return semantic_matches
            
        except Exception as e:
            logger.error(f"Semantic search error: {str(e)}")
            return []
    
    def _parse_smart_context(
        self,
        smart_files: List[str],
        all_files: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Parse smart context builder results into structured format.
        """
        smart_matches = []
        
        for smart_file_content in smart_files:
            # Extract file path from content
            path_match = re.search(r'File: (.+?)\n', smart_file_content)
            if path_match:
                file_path = path_match.group(1)
                
                # Find matching file in all_files
                file_info = next((f for f in all_files if f.get('path') == file_path), None)
                
                if file_info:
                    smart_matches.append({
                        'file_path': file_path,
                        'score': 0.7,  # Smart context has decent confidence
                        'method': 'smart_context',
                        'file': file_info
                    })
        
        return smart_matches
    
    def _merge_with_confidence(
        self,
        summary_scores: List[Dict[str, Any]],
        semantic_matches: List[Dict[str, Any]],
        graph_matches: List[Dict[str, Any]],
        smart_matches: List[Dict[str, Any]],
        all_files: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Merge results from all methods using weighted confidence scoring.
        """
        # Aggregate scores by file path
        file_scores = defaultdict(lambda: {
            'scores': {},
            'file': None,
            'methods': []
        })
        
        # Add summary scores
        for item in summary_scores:
            if not isinstance(item, dict):
                logger.warning(f"Skipping non-dict item in summary_scores: {type(item)}")
                continue
            file_path = item['file'].get('path')
            if file_path:
                file_scores[file_path]['scores']['summary'] = item['score']
                file_scores[file_path]['file'] = item['file']
                file_scores[file_path]['methods'].append('summary')
        
        # Add semantic scores
        for item in semantic_matches:
            if not isinstance(item, dict):
                logger.warning(f"Skipping non-dict item in semantic_matches: {type(item)}")
                continue
            file_path = item.get('file_path')
            if file_path:
                file_scores[file_path]['scores']['semantic'] = item['score']
                file_scores[file_path]['methods'].append('semantic')
                # Find file info if not already set
                if not file_scores[file_path]['file']:
                    file_info = next((f for f in all_files if isinstance(f, dict) and f.get('path') == file_path), None)
                    if file_info:
                        file_scores[file_path]['file'] = file_info
        
        # Add graph scores
        for item in graph_matches:
            if not isinstance(item, dict):
                logger.warning(f"Skipping non-dict item in graph_matches: {type(item)}")
                continue
            file_path = item.get('path')
            if file_path:
                # Graph items already have relevance_score
                score = item.get('relevance_score', 0.5)
                file_scores[file_path]['scores']['graph'] = score
                file_scores[file_path]['methods'].append('graph')
                # IMPORTANT: Get file info with content from all_files, not from graph result
                # Graph results don't include file content
                if not file_scores[file_path]['file']:
                    file_info = next((f for f in all_files if isinstance(f, dict) and f.get('path') == file_path), None)
                    if file_info:
                        file_scores[file_path]['file'] = file_info
                    else:
                        # Fallback: use graph result but it may lack content
                        file_scores[file_path]['file'] = item
        
        # Add smart context scores
        for item in smart_matches:
            if not isinstance(item, dict):
                logger.warning(f"Skipping non-dict item in smart_matches: {type(item)}")
                continue
            file_path = item.get('file_path')
            if file_path:
                file_scores[file_path]['scores']['smart_context'] = item['score']
                file_scores[file_path]['methods'].append('smart_context')
                if not file_scores[file_path]['file'] and 'file' in item:
                    file_scores[file_path]['file'] = item['file']
        
        # Calculate weighted confidence for each file
        merged_results = []
        
        for file_path, data in file_scores.items():
            if not data['file']:
                continue
            
            # Calculate weighted confidence
            confidence = 0.0
            method_count = 0
            
            for method, weight in self.weights.items():
                if method in data['scores']:
                    confidence += data['scores'][method] * weight
                    method_count += 1
            
            # Boost confidence if multiple methods agree
            if method_count >= 2:
                confidence *= 1.2  # 20% boost for multi-method agreement
            if method_count >= 3:
                confidence *= 1.3  # Additional 30% boost for 3+ methods
            
            # Special case: if only one method found the file but it has a high score,
            # ensure it can still be included by boosting confidence
            if method_count == 1:
                max_method_score = max(data['scores'].values())
                if max_method_score >= 0.8:  # High score from single method
                    confidence = max(confidence, 0.35)  # Ensure it passes threshold
                elif max_method_score >= 0.6:  # Decent score from single method
                    confidence = max(confidence, 0.25)  # Lower but reasonable confidence
            
            # Cap confidence at 1.0
            confidence = min(confidence, 1.0)
            
            # Only include files above minimum confidence OR if we have very few results
            # This ensures we don't return empty results when only one method finds files
            if confidence >= self.min_confidence or (confidence >= 0.15 and len(merged_results) < 3):
                merged_results.append({
                    'file': data['file'],
                    'path': file_path,
                    'confidence': confidence,
                    'methods': data['methods'],
                    'method_count': method_count,
                    'scores_breakdown': data['scores']
                })
        
        # Sort by confidence (highest first)
        merged_results.sort(key=lambda x: (x['confidence'], x['method_count']), reverse=True)
        
        # CRITICAL FIX: Ensure all user attachments are included regardless of confidence
        # This is essential because attachments are explicitly provided by users
        attachment_paths_in_results = {r['path'] for r in merged_results if r['path'].startswith('attachment/')}
        
        # ✅ DEBUG: Log all files being checked
        attachment_count_in_all_files = sum(1 for f in all_files if isinstance(f, dict) and (
            f.get('path', '').startswith('attachment/') or 
            f.get('is_attachment', False) or
            '🔴 USER-PROVIDED' in f.get('content', '')
        ))
        logger.info(f"🔍 DEBUG: Checking {len(all_files)} files for missing attachments, found {attachment_count_in_all_files} attachments in all_files")
        logger.info(f"🔍 DEBUG: attachment_paths_in_results = {attachment_paths_in_results}")
        
        for file_info in all_files:
            if not isinstance(file_info, dict):
                continue
            file_path = file_info.get('path', '')
            content_preview = file_info.get('content', '')[:100] if file_info.get('content') else ''
            is_attachment = (
                file_path.startswith('attachment/') or 
                file_info.get('is_attachment', False) or
                '🔴 USER-PROVIDED' in file_info.get('content', '')
            )
            
            # ✅ DEBUG: Log each attachment check
            if is_attachment:
                logger.info(f"🔍 DEBUG: Found attachment {file_path}, is_attachment flag={file_info.get('is_attachment')}, content preview={content_preview[:50]}")
            
            # Add missing attachments with maximum confidence
            if is_attachment and file_path not in attachment_paths_in_results:
                logger.warning(f"🚨 FORCING INCLUSION of missing attachment: {file_path}")
                merged_results.insert(0, {  # Insert at beginning for high priority
                    'file': file_info,
                    'path': file_path,
                    'confidence': 1.0,  # Maximum confidence
                    'methods': ['forced_attachment'],
                    'method_count': 1,
                    'scores_breakdown': {'forced': 1.0}
                })
        
        return merged_results
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""
        # Remove common question words
        text = re.sub(
            r'\b(what|how|why|when|where|who|which|is|are|does|do|can|could|would|should|the|a|an)\b',
            '',
            text,
            flags=re.IGNORECASE
        )
        
        # Extract words > 3 characters
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        
        # Extract CamelCase and snake_case identifiers
        identifiers = re.findall(
            r'\b[a-zA-Z][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*\b|\b[a-z]+_[a-z_]+\b',
            text
        )
        
        # Combine and deduplicate
        keywords = list(set(words[:10] + [i.lower() for i in identifiers[:5]]))
        
        return keywords


# Global instance
hybrid_retrieval = HybridRetrieval()
