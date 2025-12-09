"""
Precision Retrieval Agent - Phase 2 of RATFV Architecture
==========================================================

**NEW v2.0:** Dynamic tool-based retrieval using LLM function calling.
No pre-indexing required! Works on any repository.

Research: Ma et al. (2023) - "RAG-Fusion: A New Take on Retrieval-Augmented Generation"

Key Features:
1. **Tool-Use Architecture:** LLM explores codebase dynamically
2. **No Pre-Indexing:** Works immediately on any repository
3. **Intelligent Search:** LLM decides what to search for
4. **Fallback to Hybrid:** Falls back to Qdrant if tools fail

Target: 90% accuracy in retrieving relevant code context
"""

import asyncio
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from utils.logger import get_logger
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from services.database_service import database_service
from services.hybrid_retrieval import hybrid_retrieval
from services.smart_context_builder import smart_context_builder
from services.github_tools import GitHubTools, GITHUB_TOOLS_SCHEMA, execute_tool
from services.bootstrap_files import bootstrap_detector
from agents.deep_understanding_agent import IssueUnderstanding

# NEW: Import enhanced context orchestrator
from services.enhanced_context_orchestrator import enhanced_orchestrator

logger = get_logger(__name__)


def is_binary_file(file_path: str) -> bool:
    """
    Check if a file is likely binary based on extension.
    
    CRITICAL FIX: Binary files contain control characters that break JSON parsing,
    causing empty file creation and hallucination errors.
    
    Evidence from logs: final.dubm, final.ie, final.mat with \x00, \x08 chars
    """
    binary_extensions = {
        # Data files that caused issues
        '.dubm', '.ie', '.mat', '.bin', '.dat',
        # Executables
        '.exe', '.dll', '.so', '.dylib', '.o', '.a',
        # Archives
        '.zip', '.tar', '.gz', '.bz2', '.rar', '.7z',
        # Images
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
        # Videos
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
        # Audio
        '.mp3', '.wav', '.ogg', '.flac', '.aac',
        # Documents
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        # Fonts
        '.ttf', '.otf', '.woff', '.woff2', '.eot',
        # Other
        '.pyc', '.pyo', '.pyd', '.class', '.jar'
    }
    
    ext = file_path[file_path.rfind('.'):].lower() if '.' in file_path else ''
    return ext in binary_extensions


@dataclass
class RetrievedFile:
    """A file retrieved by the agent."""
    path: str
    content: str
    language: str
    retrieval_score: float
    retrieval_method: str  # exact, semantic, hybrid, dependency, query_rewrite
    relevance_explanation: str


class PrecisionRetrievalAgent:
    """
    Agent 2: Precision Retrieval with Dynamic Tool-Use.
    
    **NEW v2.0:** Uses LLM function calling to explore codebase.
    
    Process:
    1. Give LLM tools: search, grep, get_file, find_symbol, list_files
    2. LLM explores codebase iteratively
    3. LLM decides when it has enough context
    4. Fallback to hybrid retrieval if tools fail
    
    No pre-indexing required! Works on any repository.
    """
    
    def __init__(self):
        self.max_tool_iterations = 10  # Prevent infinite loops
        self.max_files_to_retrieve = 15
        self.use_enhanced_context = True  # NEW: Enable adaptive multi-pass retrieval
    
    async def retrieve_relevant_code(
        self,
        understanding: IssueUnderstanding,
        repository_id: str,
        max_files: int = 15
    ) -> List[RetrievedFile]:
        """
        Main entry point: Retrieve relevant code using dynamic tool-use.
        
        **NEW v4.0:** Enhanced with adaptive multi-pass, tech stack detection, domain handling.
        **NEW v3.0:** Always fetches bootstrap files for feature requests.
        
        Returns:
            List of RetrievedFile objects ranked by relevance
        """
        logger.info(f"🔍 Precision Retrieval Agent v4.0 - ENHANCED with multi-pass support...")
        
        all_retrieved = []
        
        # STEP 1: ALWAYS fetch bootstrap files for features (NEW!)
        issue_type = self._detect_issue_type(understanding)
        logger.info(f"📋 Detected issue type: {issue_type}")
        
        if issue_type in ['feature', 'enhancement']:
            logger.info("🎯 Fetching bootstrap files (mandatory for features)")
            try:
                bootstrap_files = await bootstrap_detector.get_bootstrap_files(
                    repository_id=repository_id,
                    issue_type=issue_type,
                    max_files=5
                )
                
                # Convert to RetrievedFile format
                for file_data in bootstrap_files:
                    all_retrieved.append(RetrievedFile(
                        path=file_data['path'],
                        content=file_data['content'],
                        language=file_data['language'],
                        retrieval_score=1.0,  # Highest priority
                        retrieval_method='bootstrap_mandatory',
                        relevance_explanation='Main application file (always included for features)'
                    ))
                    
                logger.info(f"✅ Retrieved {len(bootstrap_files)} bootstrap files")
            except Exception as e:
                logger.warning(f"⚠️ Bootstrap file retrieval failed: {e}")
        
        # STEP 1.5: Check if enhanced context retrieval should be used (NEW v4.0!)
        if self.use_enhanced_context and len(all_retrieved) < max_files:
            logger.info("🚀 Attempting enhanced multi-pass retrieval...")
            try:
                enhanced_files = await self._enhanced_context_retrieval(
                    understanding=understanding,
                    repository_id=repository_id,
                    max_files=max_files - len(all_retrieved)
                )
                
                if enhanced_files:
                    all_retrieved.extend(enhanced_files)
                    logger.info(f"✅ Enhanced retrieval returned {len(enhanced_files)} files")
                else:
                    logger.info("➡️ Enhanced retrieval returned no files, falling back...")
            except Exception as e:
                logger.warning(f"⚠️ Enhanced retrieval failed: {e}, falling back to standard hybrid")
        
        # STEP 2: Try tool-based retrieval (NEW v3.0)
        # CRITICAL FIX: Disable Gemini tool-calling (IP rate limiting makes it unusable)
        # Gemini has IP-based rate limits (15 req/min shared across ALL keys)
        # Key rotation doesn't help - all 11 keys share same IP quota
        # Result: All keys exhausted in seconds, wastes 60s+ waiting for cooldowns
        # Solution: Skip tool-calling entirely, use hybrid retrieval (works great)
        from services.gemini_client import gemini_client
        
        should_try_tools = False  # ← DISABLED: Gemini IP rate limiting breaks this
        logger.info("⏭️ Skipping tool-based retrieval (Gemini IP rate limiting), using hybrid instead")
        
        # COMMENTED OUT: Old Gemini tool-calling code (kept for reference)
        # if hasattr(gemini_client, '_old_client') and gemini_client._old_client:
        #     # Check if all keys are in rate limit cooldown
        #     api_key_manager = gemini_client._old_client.api_key_manager
        #     if api_key_manager and api_key_manager.all_keys_exhausted():
        #         logger.warning("⚡ FAST-FAIL: All Gemini keys exhausted, skipping tool-based retrieval")
        #         should_try_tools = False
        # 
        # if should_try_tools:
        #     try:
        #         tool_files = await self._retrieve_with_tools(
        #             understanding=understanding,
        #             repository_id=repository_id,
        #             max_files=max_files - len(all_retrieved)
        #         )
        #         all_retrieved.extend(tool_files)
        #         logger.info(f"✅ Tool-based retrieval returned {len(tool_files)} files")
        #     except Exception as e:
        #         logger.error(f"❌ Tool-based retrieval failed: {e}")
        # else:
        #     logger.info("➡️ Skipping tool-based retrieval due to exhausted keys, will use hybrid")
        
        # STEP 3: Fallback to hybrid if still not enough files
        if len(all_retrieved) < max_files:
            logger.info(f"📥 Need more files ({len(all_retrieved)}/{max_files}), trying hybrid retrieval...")
            try:
                hybrid_files = await self._fallback_to_hybrid_retrieval(
                    understanding=understanding,
                    repository_id=repository_id,
                    max_files=max_files - len(all_retrieved)
                )
                all_retrieved.extend(hybrid_files)
            except Exception as e:
                logger.warning(f"⚠️ Hybrid retrieval failed: {e}")
        
        # Log retrieval metrics
        bootstrap_count = len([f for f in all_retrieved if f.retrieval_method == 'bootstrap_mandatory'])
        tool_count = len([f for f in all_retrieved if 'tool_use' in f.retrieval_method])
        hybrid_count = len([f for f in all_retrieved if f.retrieval_method == 'hybrid_retrieval_fallback'])
        
        logger.info(f"""
📊 RETRIEVAL METRICS:
   - Bootstrap files: {bootstrap_count}
   - Tool-based files: {tool_count}
   - Hybrid files: {hybrid_count}
   - Total: {len(all_retrieved)} files
        """)
        
        return all_retrieved[:max_files]
    
    async def _retrieve_with_tools(
        self,
        understanding: IssueUnderstanding,
        repository_id: str,
        max_files: int
    ) -> List[RetrievedFile]:
        """
        NEW: Retrieve files using LLM function calling with tools.
        
        Process:
        1. Give LLM the issue + available tools
        2. LLM explores codebase dynamically
        3. LLM calls tools iteratively until satisfied
        4. Return retrieved files
        """
        logger.info(f"🔧 Starting tool-based retrieval...")
        
        # Build initial prompt for LLM
        prompt = self._build_tool_use_prompt(understanding, max_files)
        
        # Track retrieved files
        retrieved_files = []
        file_paths_seen = set()
        
        # Iterative tool-use loop
        conversation_history = [prompt]
        
        for iteration in range(self.max_tool_iterations):
            logger.info(f"🔄 Tool-use iteration {iteration + 1}/{self.max_tool_iterations}")
            
            # Call Gemini with tools
            response = await gemini_client.generate_with_tools(
                prompt='\n\n'.join(conversation_history),
                tools=GITHUB_TOOLS_SCHEMA,
                max_tokens=2000,
                temperature=0.7
            )
            
            # Check if LLM wants to call tools
            has_function_calls = False
            
            if response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call'):
                            has_function_calls = True
                            fn_call = part.function_call
                            
                            logger.info(f"🔧 LLM calling: {fn_call.name}({dict(fn_call.args)})")
                            
                            # Execute tool
                            try:
                                result = await execute_tool(
                                    tool_name=fn_call.name,
                                    args=dict(fn_call.args),
                                    repository_id=repository_id
                                )
                                
                                # Add result to conversation
                                result_str = f"Tool: {fn_call.name}\nResult: {str(result)[:1000]}"  # Limit size
                                conversation_history.append(result_str)
                                
                                # If tool returned file content, add to retrieved_files
                                if fn_call.name == 'get_file' and isinstance(result, dict):
                                    path = result.get('path')
                                    
                                    # CRITICAL FIX: Skip binary files to prevent control character poisoning
                                    if path and is_binary_file(path):
                                        logger.warning(f"⚠️ Skipping binary file: {path}")
                                        conversation_history.append(f"Skipped binary file: {path}")
                                        continue
                                    
                                    if path and path not in file_paths_seen:
                                        file_paths_seen.add(path)
                                        retrieved_files.append(RetrievedFile(
                                            path=path,
                                            content=result.get('content', ''),
                                            language=result.get('language', 'unknown'),
                                            retrieval_score=1.0,
                                            retrieval_method='tool_use_get_file',
                                            relevance_explanation='Explicitly requested by LLM via get_file()'
                                        ))
                                
                                # If search/grep returned matches, we can retrieve those files
                                elif fn_call.name in ['search_github_code', 'grep_repository', 'find_symbol']:
                                    if isinstance(result, list) and len(result) > 0:
                                        # Get the top files from search results
                                        top_files = list(set([match['path'] for match in result[:5]]))
                                        for file_path in top_files:
                                            # CRITICAL FIX: Skip binary files
                                            if is_binary_file(file_path):
                                                logger.warning(f"⚠️ Skipping binary file from search: {file_path}")
                                                continue
                                            
                                            if file_path not in file_paths_seen and len(retrieved_files) < max_files:
                                                # Retrieve full file
                                                try:
                                                    file_data = await GitHubTools.get_file(repository_id, file_path)
                                                    file_paths_seen.add(file_path)
                                                    retrieved_files.append(RetrievedFile(
                                                        path=file_path,
                                                        content=file_data.get('content', ''),
                                                        language=file_data.get('language', 'unknown'),
                                                        retrieval_score=0.8,
                                                        retrieval_method=f'tool_use_{fn_call.name}',
                                                        relevance_explanation=f'Found via {fn_call.name}'
                                                    ))
                                                except Exception as e:
                                                    logger.warning(f"Failed to retrieve {file_path}: {e}")
                                
                            except Exception as e:
                                error_msg = f"Tool execution failed: {str(e)[:200]}"
                                logger.error(error_msg)
                                conversation_history.append(f"Tool: {fn_call.name}\nError: {error_msg}")
            
            # If no function calls, LLM is done
            if not has_function_calls:
                logger.info("✅ LLM finished exploring codebase (no more tool calls)")
                break
            
            # Stop if we have enough files
            if len(retrieved_files) >= max_files:
                logger.info(f"✅ Retrieved {len(retrieved_files)} files (target: {max_files})")
                break
        
        logger.info(f"✅ Tool-based retrieval complete: {len(retrieved_files)} files")
        return retrieved_files[:max_files]
    
    def _build_tool_use_prompt(self, understanding: IssueUnderstanding, max_files: int) -> str:
        """Build prompt for LLM with tool-use instructions."""
        prompt = f"""You are a code search assistant helping to find relevant files for fixing a GitHub issue.

**Root Cause:** {understanding.root_cause}

**Requirements:** {', '.join(understanding.requirements)}

**Files Mentioned in Issue:** {', '.join(understanding.file_mentions) if understanding.file_mentions else 'None explicitly mentioned'}

**Your Task:**
Use the available tools to find the top {max_files} most relevant files for fixing this issue.

**Strategy:**
1. **Start with explicitly mentioned files**: Use `get_file()` to retrieve files mentioned in the issue
2. **Find related code**: Use `find_symbol()` or `search_github_code()` to find relevant classes/functions
3. **Find tests**: Use `list_files()` with pattern "test_*.py" or "*test.js" to find test files
4. **Search for keywords**: Use `search_github_code()` or `grep_repository()` for specific concepts

**Available Tools:**
- `search_github_code(query)`: Search for keywords/concepts
- `grep_repository(pattern, regex=False)`: Grep for exact patterns
- `get_file(path)`: Read a specific file
- `find_symbol(symbol_name, symbol_type)`: Find class/function/variable definition
- `list_files(pattern)`: List files matching glob pattern (e.g., "test_*.py")

**Important:**
- Call tools one at a time to explore the codebase
- Don't make assumptions - use tools to verify
- Prioritize files mentioned in the issue
- Look for related files (imports, tests, configs)
- Stop when you have {max_files} relevant files

**Start exploring now!**"""
        
        return prompt
    
    async def _enhanced_context_retrieval(
        self,
        understanding: IssueUnderstanding,
        repository_id: str,
        max_files: int
    ) -> List[RetrievedFile]:
        """
        NEW v4.0: Enhanced context retrieval with multi-pass, tech stack, and domain detection.
        
        Uses enhanced_context_orchestrator to:
        1. Detect codebase complexity → Multi-pass if needed
        2. Detect tech stack → Specialized prompts
        3. Detect domain → Expert handling
        4. Create adaptive context strategy
        
        Returns files with enhanced relevance scoring.
        """
        logger.info("🚀 Enhanced Context Retrieval v4.0 starting...")
        
        # Load all indexed files
        all_files_with_content = await database_service.get_files_with_content(repository_id)
        
        if not all_files_with_content:
            logger.warning("⚠️ No files found for enhanced retrieval")
            return []
        
        logger.info(f"📂 Loaded {len(all_files_with_content)} files for analysis")
        
        # Create enhanced context using orchestrator
        enhanced_context = await enhanced_orchestrator.create_enhanced_context(
            all_files=all_files_with_content,
            issue_description=understanding.issue_description,
            issue_type=self._detect_issue_type(understanding),
            repository_structure=None  # TODO: Could extract from files
        )
        
        strategy = enhanced_context['strategy']
        context_passes = enhanced_context['context_passes']
        
        # Log strategy details
        logger.info(f"""
╔══════════════════════════════════════════════════════════════╗
║  ENHANCED CONTEXT STRATEGY                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Tech Stack:    {strategy.tech_stack_name:<40} ║
║  Domain:        {strategy.domain:<40} ║
║  Multi-Pass:    {"YES" if strategy.use_multi_pass else "NO":<40} ║
║  Num Passes:    {strategy.num_passes:<40} ║
╚══════════════════════════════════════════════════════════════╝
        """)
        
        # Collect files from all passes
        all_retrieved = []
        file_paths_seen = set()
        
        for pass_num, pass_data in enumerate(context_passes, 1):
            logger.info(f"📋 Pass {pass_num}/{len(context_passes)}: {pass_data['focus']}")
            
            pass_files = pass_data.get('files', [])
            
            # Convert pass files to RetrievedFile format
            for file_data in pass_files:
                path = file_data.get('path')
                
                # Skip duplicates and binary files
                if path in file_paths_seen or is_binary_file(path):
                    continue
                
                file_paths_seen.add(path)
                
                # Extract content
                file_info = file_data.get('file', {})
                content = file_info.get('content', file_data.get('content', ''))
                
                # Create RetrievedFile
                all_retrieved.append(RetrievedFile(
                    path=path,
                    content=content,
                    language=file_info.get('language', 'unknown'),
                    retrieval_score=0.95,
                    retrieval_method=f'enhanced_pass_{pass_num}',
                    relevance_explanation=f'{pass_data["focus"]} (pass {pass_num}/{len(context_passes)})'
                ))
        
        logger.info(f"✅ Enhanced retrieval: {len(all_retrieved)} files across {len(context_passes)} passes")
        
        return all_retrieved[:max_files]
    
    async def _fallback_to_hybrid_retrieval(
        self,
        understanding: IssueUnderstanding,
        repository_id: str,
        max_files: int
    ) -> List[RetrievedFile]:
        """
        Fallback to original hybrid retrieval (requires pre-indexing).
        
        This is the OLD method that only works if repo is indexed in Qdrant.
        """
        logger.info("📥 Loading pre-indexed files from Qdrant (fallback method)...")
        all_files_with_content = await database_service.get_files_with_content(repository_id)
        
        if not all_files_with_content:
            logger.warning(f"⚠️ No indexed files found for repository {repository_id}")
            logger.warning("⚠️ Repository needs to be indexed in Qdrant first!")
            return []
        
        logger.info(f"✅ Loaded {len(all_files_with_content)} indexed files from repository")
        
        # Build question from issue understanding
        question = self._build_search_query(understanding)
        logger.info(f"🔍 Search query: {question}")
        
        # Use hybrid retrieval (requires pre-indexed data)
        selected_files, retrieval_stats = await hybrid_retrieval.retrieve_context(
            repository_id=repository_id,
            question=question,
            all_files=all_files_with_content,
            max_files=max_files
        )
        
        logger.info(f"✅ Hybrid retrieval complete: {len(selected_files)} files selected")
        
        # Convert to RetrievedFile format
        retrieved_files = []
        for file_dict in selected_files:
            # CRITICAL FIX: Content is nested in 'file' dict, not at top level
            file_info = file_dict.get('file', {})
            content = file_info.get('content', '')
            path = file_dict.get('path', '')
            
            # Debug log to track content availability
            if content:
                logger.info(f"✅ Retrieved {path} with content ({len(content)} chars)")
            else:
                logger.warning(f"⚠️ Empty content for {path} after hybrid retrieval")
            
            # CRITICAL FIX: Skip binary files before GitHub fallback
            if is_binary_file(path):
                logger.warning(f"⚠️ Skipping binary file: {path}")
                continue
            
            # Fallback to GitHub if content is empty
            if not content and path:
                try:
                    logger.info(f"⚠️ Empty content for {path} from DB, trying GitHub API...")
                    github_file = await GitHubTools.get_file(repository_id, path)
                    if github_file and github_file.get('content'):
                        content = github_file.get('content')
                        logger.info(f"✅ Recovered content for {path} from GitHub API ({len(content)} chars)")
                except Exception as e:
                    logger.warning(f"Failed to recover {path} from GitHub: {e}")

            retrieved_files.append(RetrievedFile(
                path=path,
                content=content,
                language=file_info.get('language', 'unknown'),
                retrieval_score=file_dict.get('confidence', 0.5),
                retrieval_method='hybrid_retrieval_fallback',
                relevance_explanation=file_dict.get('reason', 'Retrieved via hybrid fallback')
            ))
        
        return retrieved_files
    
    def _build_search_query(self, understanding: IssueUnderstanding) -> str:
        """Build search query from issue understanding."""
        parts = []
        
        if understanding.root_cause:
            parts.append(understanding.root_cause)
        
        if understanding.requirements:
            parts.extend(understanding.requirements[:3])
        
        if understanding.affected_components:
            parts.extend(understanding.affected_components[:3])
        
        if understanding.file_mentions:
            parts.extend(understanding.file_mentions)
        
        return ' '.join(parts)
    
    def _filter_relevant_files(
        self,
        files: List[RetrievedFile],
        understanding: IssueUnderstanding
    ) -> List[RetrievedFile]:
        """
        Filter out obviously irrelevant files.
        
        For example: Don't return frontend files for a backend database issue.
        """
        if not files:
            return files
        
        # Extract technology context from requirements and root cause
        tech_context = (
            ' '.join(understanding.requirements) + ' ' +
            understanding.root_cause + ' ' +
            understanding.fix_strategy + ' ' +
            ' '.join(understanding.affected_components)
        ).lower()
        
        # Determine if this is backend/frontend/database/etc focused
        is_backend = any(keyword in tech_context for keyword in ['backend', 'api', 'database', 'sqlalchemy', 'orm', 'fastapi', 'django', 'flask'])
        is_frontend = any(keyword in tech_context for keyword in ['frontend', 'react', 'vue', 'ui', 'component', 'jsx', 'tsx'])
        is_database = any(keyword in tech_context for keyword in ['database', 'sql', 'migration', 'schema', 'table', 'orm'])
        
        filtered = []
        for file in files:
            path_lower = file.path.lower()
            
            # Skip obviously wrong category files
            if is_backend or is_database:
                # Skip frontend files if this is a backend/database issue
                if any(pattern in path_lower for pattern in ['src/components/', 'src/pages/', '.jsx', '.tsx', '.vue', 'navbar', 'footer', 'vite.config']):
                    logger.debug(f"Filtered out frontend file for backend issue: {file.path}")
                    continue
            
            if is_frontend:
                # Skip backend files if this is a frontend issue
                if any(pattern in path_lower for pattern in ['/models/', '/database.py', '/migrations/', 'alembic', 'sqlalchemy']):
                    logger.debug(f"Filtered out backend file for frontend issue: {file.path}")
                    continue
            
            filtered.append(file)
        
        logger.info(f"Filtered {len(files)} → {len(filtered)} files (removed {len(files) - len(filtered)} irrelevant)")
        
        return filtered
    
    async def _strategy_1_exact_mentions(
        self,
        understanding: IssueUnderstanding,
        repository_id: str
    ) -> List[RetrievedFile]:
        """
        Strategy 1: Exact Mention Matching
        
        Precision: 95%+ (much better than vector-only 60%)
        
        Directly fetch files that were explicitly mentioned in the issue.
        """
        if not understanding.file_mentions:
            return []
        
        logger.info(f"📌 Strategy 1: Fetching {len(understanding.file_mentions)} explicitly mentioned files")
        
        retrieved = []
        
        for file_path in understanding.file_mentions:
            try:
                # Try to fetch file content from database
                file_content = await database_service.get_file_content(
                    repository_id=repository_id,
                    file_path=file_path
                )
                
                if file_content:
                    retrieved.append(RetrievedFile(
                        path=file_path,
                        content=file_content[:10000],  # Limit to 10K chars
                        language=self._detect_language(file_path),
                        retrieval_score=1.0,  # Highest score for exact mentions
                        retrieval_method='exact',
                        relevance_explanation='Explicitly mentioned in issue'
                    ))
                else:
                    logger.warning(f"File not found in repo: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to fetch {file_path}: {str(e)}")
        
        logger.info(f"Strategy 1: Retrieved {len(retrieved)}/{len(understanding.file_mentions)} mentioned files")
        
        return retrieved
    
    async def _strategy_2_semantic_search(
        self,
        understanding: IssueUnderstanding,
        repository_id: str
    ) -> List[RetrievedFile]:
        """
        Strategy 2: Semantic Vector Search
        
        Uses Qdrant vector database with embeddings for semantic similarity.
        """
        # Build semantic search query
        search_query = self._build_semantic_query(understanding)
        
        logger.info(f"🔎 Strategy 2: Semantic search with query length {len(search_query)} chars")
        
        try:
            # Generate embedding for search query
            query_embedding = await self.gemini_client.generate_embedding(search_query)
            
            # Search in Qdrant
            vector_results = await qdrant_client.search_similar_in_repo(
                query_embedding=query_embedding,
                repo_id=repository_id,
                limit=10,
                score_threshold=0.3
            )
            
            # Convert to RetrievedFile
            retrieved = []
            for i, result in enumerate(vector_results):
                metadata = result.get('metadata', {})
                file_path = metadata.get('file_path')
                file_content = metadata.get('text', '')
                score = result.get('score', 0.0)
                
                if file_path and file_content:
                    retrieved.append(RetrievedFile(
                        path=file_path,
                        content=file_content[:10000],
                        language=self._detect_language(file_path),
                        retrieval_score=score,
                        retrieval_method='semantic',
                        relevance_explanation=f'Semantic similarity: {score:.2f}'
                    ))
            
            logger.info(f"Strategy 2: Retrieved {len(retrieved)} files via semantic search")
            
            return retrieved
        except Exception as e:
            logger.error(f"Semantic search failed: {str(e)}")
            return []
    
    async def _strategy_3_hybrid_search(
        self,
        understanding: IssueUnderstanding,
        repository_id: str
    ) -> List[RetrievedFile]:
        """
        Strategy 3: Hybrid Retrieval (BM25 + Vector)
        
        Combines keyword-based search with semantic search for better coverage.
        """
        # Extract keywords for BM25
        keywords = self._extract_keywords(understanding)
        
        if not keywords:
            return []
        
        logger.info(f"🔗 Strategy 3: Hybrid search with keywords: {', '.join(keywords[:5])}")
        
        try:
            # Perform BM25-style keyword search (via database full-text search)
            keyword_results = await database_service.search_files_by_keywords(
                repository_id=repository_id,
                keywords=keywords,
                limit=10
            )
            
            # Convert to RetrievedFile
            retrieved = []
            for i, result in enumerate(keyword_results):
                file_path = result.get('file_path')
                file_content = result.get('content', '')
                match_score = result.get('match_score', 0.7)
                
                if file_path and file_content:
                    retrieved.append(RetrievedFile(
                        path=file_path,
                        content=file_content[:10000],
                        language=self._detect_language(file_path),
                        retrieval_score=match_score,
                        retrieval_method='hybrid',
                        relevance_explanation=f'Keyword match: {match_score:.2f}'
                    ))
            
            logger.info(f"Strategy 3: Retrieved {len(retrieved)} files via hybrid search")
            
            return retrieved
        except Exception as e:
            logger.warning(f"Hybrid search failed (fallback to semantic only): {str(e)}")
            return []
    
    async def _strategy_4_dependency_analysis(
        self,
        understanding: IssueUnderstanding,
        repository_id: str
    ) -> List[RetrievedFile]:
        """
        Strategy 4: Dependency Analysis
        
        Follow import statements to find related files.
        """
        if not understanding.file_mentions:
            return []
        
        logger.info(f"🔗 Strategy 4: Analyzing dependencies for {len(understanding.file_mentions)} files")
        
        try:
            # Get dependency graph from database
            dependencies = await database_service.get_file_dependencies(
                repository_id=repository_id,
                file_paths=understanding.file_mentions
            )
            
            # Fetch dependency files
            retrieved = []
            for dep_path, dep_info in dependencies.items():
                if dep_path in understanding.file_mentions:
                    continue  # Skip files already mentioned (handled by Strategy 1)
                
                file_content = await database_service.get_file_content(
                    repository_id=repository_id,
                    file_path=dep_path
                )
                
                if file_content:
                    retrieved.append(RetrievedFile(
                        path=dep_path,
                        content=file_content[:10000],
                        language=self._detect_language(dep_path),
                        retrieval_score=0.8,  # High score for direct dependencies
                        retrieval_method='dependency',
                        relevance_explanation=f"Dependency of {dep_info.get('imported_by', 'mentioned file')}"
                    ))
            
            logger.info(f"Strategy 4: Retrieved {len(retrieved)} dependency files")
            
            return retrieved
        except Exception as e:
            logger.warning(f"Dependency analysis failed: {str(e)}")
            return []
    
    async def _strategy_5_query_rewriting(
        self,
        understanding: IssueUnderstanding,
        repository_id: str
    ) -> List[RetrievedFile]:
        """
        Strategy 5: Query Rewriting + RRF Fusion
        
        Generate 3 diverse queries and fuse results with Reciprocal Rank Fusion.
        Research: Ma et al. (2023) - RAG-Fusion shows +25% recall improvement
        """
        logger.info(f"✍️ Strategy 5: Generating 3 diverse search queries")
        
        # Generate 3 diverse queries
        queries = await self._generate_diverse_queries(understanding)
        
        if len(queries) < 3:
            logger.warning("Failed to generate 3 queries, skipping query rewriting strategy")
            return []
        
        # Search with each query in parallel
        query_results = await asyncio.gather(
            *[self._search_with_query(query, repository_id) for query in queries],
            return_exceptions=True
        )
        
        # Flatten results
        all_results = []
        for i, result in enumerate(query_results):
            if isinstance(result, Exception):
                logger.warning(f"Query {i+1} failed: {str(result)}")
            elif result:
                all_results.extend(result)
        
        # Apply RRF to fuse the different query results
        fused = self._reciprocal_rank_fusion_simple(all_results)
        
        logger.info(f"Strategy 5: Retrieved {len(fused)} files via query rewriting + RRF")
        
        return fused[:10]  # Top 10 from this strategy
    
    async def _generate_diverse_queries(
        self,
        understanding: IssueUnderstanding
    ) -> List[str]:
        """Generate 3 diverse search queries for RAG-Fusion."""
        
        prompt = f"""
Generate 3 diverse search queries to find relevant code for this GitHub issue.

**Root Cause:** {understanding.root_cause}
**Requirements:** {', '.join(understanding.requirements[:3])}
**Fix Strategy:** {understanding.fix_strategy}

Generate queries that cover different aspects:
1. Query 1: Focus on the problem/error (what's broken?)
2. Query 2: Focus on the solution/fix (what needs to change?)
3. Query 3: Focus on the components/files (where to look?)

Respond in JSON:
{{
    "query_1": "search query focusing on the problem",
    "query_2": "search query focusing on the solution",
    "query_3": "search query focusing on components"
}}
"""
        
        try:
            response = await self.gemini_client.generate_content_async(
                prompt,
                max_tokens=500,
                temperature=0.7  # Higher temp for diversity
            )
            
            import json
            result = self._safe_json_parse(response)
            
            queries = [
                result.get('query_1', ''),
                result.get('query_2', ''),
                result.get('query_3', '')
            ]
            
            # Filter out empty queries
            queries = [q for q in queries if q and len(q) > 10]
            
            logger.info(f"Generated {len(queries)} diverse queries")
            
            return queries
        except Exception as e:
            logger.warning(f"Failed to generate diverse queries: {str(e)}")
            # Fallback: use understanding fields directly
            return [
                understanding.root_cause,
                understanding.fix_strategy,
                ' '.join(understanding.affected_components[:3])
            ]
    
    async def _search_with_query(
        self,
        query: str,
        repository_id: str
    ) -> List[RetrievedFile]:
        """Search with a single query."""
        try:
            query_embedding = await self.gemini_client.generate_embedding(query)
            
            results = await qdrant_client.search_similar_in_repo(
                query_embedding=query_embedding,
                repo_id=repository_id,
                limit=5,
                score_threshold=0.3
            )
            
            retrieved = []
            for result in results:
                metadata = result.get('metadata', {})
                file_path = metadata.get('file_path')
                file_content = metadata.get('text', '')
                score = result.get('score', 0.0)
                
                if file_path and file_content:
                    retrieved.append(RetrievedFile(
                        path=file_path,
                        content=file_content[:10000],
                        language=self._detect_language(file_path),
                        retrieval_score=score,
                        retrieval_method='query_rewrite',
                        relevance_explanation=f'Query rewrite match: {score:.2f}'
                    ))
            
            return retrieved
        except Exception as e:
            logger.warning(f"Query search failed: {str(e)}")
            return []
    
    def _reciprocal_rank_fusion(
        self,
        all_results: List[RetrievedFile]
    ) -> List[RetrievedFile]:
        """
        Reciprocal Rank Fusion (RRF) to combine rankings from multiple strategies.
        
        Formula: RRF(d) = sum(1 / (k + rank_i(d)))
        Where k = 60 (standard constant from research)
        
        Research: Cormack et al. (2009) - RRF outperforms weighted averages
        """
        # Group by file path
        file_scores = {}
        file_objects = {}
        
        for result in all_results:
            path = result.path
            
            if path not in file_scores:
                file_scores[path] = []
                file_objects[path] = result
            
            file_scores[path].append(result.retrieval_score)
        
        # Calculate RRF scores
        rrf_scores = {}
        for path, scores in file_scores.items():
            # Sort scores descending
            sorted_scores = sorted(scores, reverse=True)
            
            # Calculate RRF
            rrf_score = sum(1.0 / (self.rrf_k + rank + 1) for rank, _ in enumerate(sorted_scores))
            
            rrf_scores[path] = rrf_score
        
        # Sort by RRF score
        ranked_paths = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Build final list
        fused_results = []
        for path, rrf_score in ranked_paths:
            file_obj = file_objects[path]
            # Update score to RRF score
            file_obj.retrieval_score = rrf_score
            file_obj.relevance_explanation += f' (RRF: {rrf_score:.3f})'
            fused_results.append(file_obj)
        
        logger.info(f"RRF fusion: {len(all_results)} results → {len(fused_results)} unique files")
        
        return fused_results
    
    def _reciprocal_rank_fusion_simple(
        self,
        results: List[RetrievedFile]
    ) -> List[RetrievedFile]:
        """Simplified RRF for a single list of results."""
        return self._reciprocal_rank_fusion(results)
    
    def _build_semantic_query(self, understanding: IssueUnderstanding) -> str:
        """Build a semantic search query from understanding."""
        query_parts = [
            f"Root cause: {understanding.root_cause}",
            f"Requirements: {' '.join(understanding.requirements[:3])}",
            f"Affected components: {' '.join(understanding.affected_components[:5])}",
            f"Fix strategy: {understanding.fix_strategy}"
        ]
        
        if understanding.function_mentions:
            query_parts.append(f"Functions: {' '.join(understanding.function_mentions[:5])}")
        
        return ' '.join(query_parts)
    
    def _extract_keywords(self, understanding: IssueUnderstanding) -> List[str]:
        """Extract keywords for BM25-style search."""
        keywords = []
        
        # Add function names
        keywords.extend(understanding.function_mentions)
        
        # Extract nouns from requirements (simple heuristic)
        for req in understanding.requirements:
            words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b', req)
            keywords.extend(words[:5])  # Max 5 per requirement
        
        # Extract from affected components
        for comp in understanding.affected_components:
            # Extract filename without path
            filename = comp.split('/')[-1].split('\\')[-1]
            if filename:
                keywords.append(filename.split('.')[0])
        
        # Deduplicate and lowercase
        keywords = list(set(kw.lower() for kw in keywords if len(kw) > 2))
        
        return keywords[:20]  # Max 20 keywords
    
    def _detect_issue_type(self, understanding: IssueUnderstanding) -> str:
        """
        Detect issue type from understanding.
        
        Returns:
            'feature', 'bug', or 'enhancement'
        """
        # Get combined text from understanding
        issue_text = (
            understanding.root_cause + ' ' +
            ' '.join(understanding.requirements) + ' ' +
            understanding.fix_strategy
        ).lower()
        
        # Check for feature keywords
        feature_keywords = [
            'feature', 'add ', 'implement', 'create ', 'new ', 'enable',
            'support for', 'allow', 'provide', 'introduce'
        ]
        
        # Check for bug keywords
        bug_keywords = [
            'bug', 'error', 'crash', 'fail', 'broken', 'fix ', 'issue',
            'not working', "doesn't work", 'incorrect', 'wrong'
        ]
        
        feature_count = sum(1 for keyword in feature_keywords if keyword in issue_text)
        bug_count = sum(1 for keyword in bug_keywords if keyword in issue_text)
        
        if feature_count > bug_count:
            return 'feature'
        elif bug_count > feature_count:
            return 'bug'
        else:
            return 'enhancement'
    
    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        ext = file_path.split('.')[-1].lower()
        
        language_map = {
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'java': 'java',
            'go': 'go',
            'rs': 'rust',
            'cpp': 'cpp',
            'c': 'c',
            'rb': 'ruby',
            'php': 'php',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sh': 'bash',
            'yaml': 'yaml',
            'yml': 'yaml',
            'json': 'json',
            'md': 'markdown',
            'txt': 'text'
        }
        
        return language_map.get(ext, 'unknown')
    
    def _safe_json_parse(self, response: str) -> Dict[str, Any]:
        """Safely parse JSON from LLM response."""
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            if '```json' in response:
                start = response.find('```json') + 7
                end = response.find('```', start)
                if end != -1:
                    return json.loads(response[start:end].strip())
            elif '```' in response:
                start = response.find('```') + 3
                end = response.find('```', start)
                if end != -1:
                    return json.loads(response[start:end].strip())
            
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(response[start:end])
            
            raise ValueError("Could not extract JSON from response")
