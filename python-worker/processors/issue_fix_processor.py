"""
Issue Fix Processor - Multi-Agent System for Auto-Fixing GitHub Issues
"""
import asyncio
from typing import Dict, Any, List, Optional
from utils.logger import get_logger
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from services.database_service import database_service

# CRITICAL UPGRADE: Import new validation and generation to match MetaController quality
from agents.tree_of_thought_generator import TreeOfThoughtGenerator
from agents.multi_layer_validator import MultiLayerValidator

logger = get_logger(__name__)


class IssueFixProcessor:
    """
    Multi-agent system for analyzing and fixing GitHub issues.
    
    UPGRADED: Now uses same TreeOfThoughtGenerator and MultiLayerValidator
    as MetaController to ensure consistent quality when used as fallback.
    
    Agent Pipeline:
    1. Understanding Agent - Analyze issue and extract requirements
    2. Retrieval Agent - Find relevant code using hybrid search
    3. Fix Generation Agent - Generate code fix (NOW: with enhanced prompts + Layer 10)
    4. Validation Agent - Validate the fix (NOW: includes production readiness checks)
    5. Explanation Agent - Format for human review
    """
    
    def __init__(self):
        self.gemini_client = gemini_client  # Use global wrapper with multi-tier fallback
        
        # CRITICAL UPGRADE: Use same agents as MetaController for consistent quality
        self.thought_generator = TreeOfThoughtGenerator()
        self.validator = MultiLayerValidator()
        
        logger.info("✨ IssueFixProcessor upgraded with TreeOfThoughtGenerator + Layer 10 validation")
        
    async def process_issue_fix(
        self,
        task_data: Dict[str, Any],
        logger
    ) -> Dict[str, Any]:
        """Main entry point for issue fix processing."""
        
        # Handle both camelCase (from frontend) and snake_case
        issue_fix_id = task_data.get("issueFixId") or task_data.get("issue_fix_id")
        repository_id = task_data.get("repositoryId") or task_data.get("repository_id")
        user_id = task_data.get("userId") or task_data.get("user_id")
        issue_number = task_data.get("issueNumber") or task_data.get("issue_number")
        issue_title = task_data.get("issueTitle") or task_data.get("issue_title", "")
        issue_body = task_data.get("issueBody") or task_data.get("issue_body", "")
        
        logger.info(f"Processing issue fix for issue #{issue_number}")
        
        try:
            # Update status: ANALYZING
            await self._update_status(issue_fix_id, "ANALYZING")
            
            # Agent 1: Understanding
            analysis = await self._analyze_issue(
                issue_title,
                issue_body,
                repository_id,
                logger
            )
            
            # Save analysis
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                analysis=analysis
            )
            
            # Update status: RETRIEVING_CODE
            await self._update_status(issue_fix_id, "RETRIEVING_CODE")
            
            # Agent 2: Retrieval
            relevant_files = await self._retrieve_relevant_code(
                analysis=analysis,
                repository_id=repository_id,
                logger=logger
            )
            
            # Save relevant files
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                relevant_files=relevant_files
            )
            
            # Update status: GENERATING_FIX
            await self._update_status(issue_fix_id, "GENERATING_FIX")
            
            # Agent 3: Fix Generation
            proposed_fix = await self._generate_fix(
                analysis=analysis,
                relevant_files=relevant_files,
                issue_title=issue_title,
                issue_body=issue_body,
                repository_id=repository_id,
                logger=logger
            )
            
            # Update status: VALIDATING
            await self._update_status(issue_fix_id, "VALIDATING")
            
            # Agent 4: Validation
            validation = await self._validate_fix(
                proposed_fix=proposed_fix,
                analysis=analysis,
                issue_title=issue_title,
                issue_body=issue_body,
                logger=logger
            )
            
            if not validation["valid"]:
                # Fix failed validation - build comprehensive error message
                error_parts = []
                
                # Add completeness score if available
                if validation.get("completeness_score") is not None:
                    error_parts.append(f"Completeness: {validation['completeness_score']:.1%}")
                
                # Add critical issues first
                if validation.get("issues"):
                    critical = [i for i in validation["issues"] if "Critical" in i or "critical" in i]
                    if critical:
                        error_parts.append("Critical: " + "; ".join(critical[:2]))
                    else:
                        error_parts.append("Issues: " + "; ".join(validation["issues"][:3]))
                
                # Add missing items
                if validation.get("missing"):
                    error_parts.append("Missing: " + "; ".join(validation["missing"][:3]))
                
                # Add recommendations if validation is close
                if validation.get("confidence", 0) > 0.5 and validation.get("recommendations"):
                    error_parts.append("Needs: " + "; ".join(validation["recommendations"][:2]))
                
                error_message = " | ".join(error_parts) if error_parts else "Validation failed"
                
                await database_service.update_issue_fix(
                    issue_fix_id=issue_fix_id,
                    status="FAILED",
                    error_message=error_message
                )
                return {
                    "status": "failed",
                    "error": error_message
                }
            
            # Agent 5: Generate Explanation
            explanation = await self._generate_explanation(
                analysis=analysis,
                proposed_fix=proposed_fix,
                issue_number=issue_number,
                logger=logger
            )
            
            # Update status: READY_FOR_REVIEW
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                status="READY_FOR_REVIEW",
                proposed_fix=proposed_fix,
                explanation=explanation,
                confidence=validation["confidence"]
            )
            
            logger.info(f"✅ Issue fix ready for review: {issue_fix_id}")
            
            return {
                "status": "completed",
                "issue_fix_id": issue_fix_id,
                "confidence": validation["confidence"]
            }
            
        except Exception as e:
            logger.error(f"Issue fix processing failed: {str(e)}", exc_info=True)
            
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                status="FAILED",
                error_message=str(e)
            )
            
            raise
    
    async def _analyze_issue(
        self,
        issue_title: str,
        issue_body: str,
        repository_id: str,
        logger
    ) -> Dict[str, Any]:
        """Agent 1: Understand the issue and extract requirements."""
        
        prompt = f"""
You are an expert software engineer analyzing a GitHub issue.

Issue Title: {issue_title}

Issue Description:
{issue_body or "No description provided"}

Analyze this issue and provide:
1. Root cause analysis (what's the problem?)
2. Requirements for the fix (what needs to change?)
3. Affected components (which parts of the codebase?)
4. Fix strategy (how to approach the solution?)
5. Risk assessment (potential side effects?)

Respond in JSON format:
{{
    "root_cause": "description of the problem",
    "requirements": ["requirement 1", "requirement 2"],
    "affected_components": ["component 1", "component 2"],
    "fix_strategy": "high-level approach",
    "risk_level": "LOW|MEDIUM|HIGH",
    "potential_side_effects": ["side effect 1"]
}}
"""
        
        response = await self.gemini_client.generate_content_async(
            prompt,
            max_tokens=3000,  # Increased from 1000 to avoid truncation
            temperature=0.3
        )
        
        import json
        # Response is already a string, not an object with .text
        try:
            analysis = json.loads(response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response. Response: {response[:500]}")
            # Try extracting JSON from markdown code blocks
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                if json_end == -1:  # Truncated - no closing backticks
                    logger.error("Response truncated - attempting to repair JSON")
                    json_str = response[json_start:].strip()
                    # Try to close unclosed brackets
                    open_braces = json_str.count('{') - json_str.count('}')
                    open_brackets = json_str.count('[') - json_str.count(']')
                    if open_braces > 0:
                        json_str += '}' * open_braces
                    if open_brackets > 0:
                        json_str += ']' * open_brackets
                    try:
                        analysis = json.loads(json_str)
                        logger.warning("Successfully repaired truncated JSON")
                    except json.JSONDecodeError:
                        logger.error("Could not repair JSON, using defaults")
                        raise ValueError(f"Truncated response could not be parsed: {str(e)}")
                else:
                    json_str = response[json_start:json_end].strip()
                    analysis = json.loads(json_str)
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                if json_end == -1:
                    raise ValueError(f"Truncated markdown code block: {str(e)}")
                json_str = response[json_start:json_end].strip()
                analysis = json.loads(json_str)
            else:
                raise ValueError(f"Could not parse response as JSON: {str(e)}")
        
        logger.info(f"Issue analysis complete. Risk level: {analysis['risk_level']}")
        
        return analysis
    
    def _format_operations_for_validation(self, operations: List[Dict[str, Any]]) -> str:
        """Format operations for validation prompt."""
        formatted = []
        for i, op in enumerate(operations[:10], 1):  # Limit to first 10 operations
            op_type = op.get('type', 'unknown')
            path = op.get('path', 'unknown')
            reason = op.get('reason', 'No reason provided')
            
            if op_type == 'edit':
                # For edit operations, show the edits
                edits = op.get('edits', [])
                edit_details = []
                for j, edit in enumerate(edits, 1):
                    search = edit.get('search', '')[:500]  # Show first 500 chars
                    replace = edit.get('replace', '')[:500]
                    description = edit.get('description', 'No description')
                    edit_details.append(f"   Edit {j}: {description}\n   Search: {search}\n   Replace: {replace}")
                
                formatted.append(f"{i}. {op_type.upper()} {path}\n   Reason: {reason}\n{'   '.join(edit_details)}\n")
            else:
                # For create/delete/modify operations, show content
                content = op.get('content', '')
                
                # Show more content for validation (up to 2000 chars per file)
                # This allows validator to see complete implementations
                if len(content) > 2000:
                    content_preview = content[:2000] + '\n... (truncated for brevity, but full content was generated)'
                else:
                    content_preview = content
                
                formatted.append(f"{i}. {op_type.upper()} {path}\n   Reason: {reason}\n   Content:\n{content_preview}\n")
        
        return '\n'.join(formatted)
    
    async def _retrieve_relevant_code(
        self,
        analysis: Dict[str, Any],
        repository_id: str,
        logger
    ) -> List[Dict[str, Any]]:
        """Agent 2: Find relevant code files using vector search."""
        
        # Build search query from analysis
        search_query = f"""
{' '.join(analysis['affected_components'])}
{analysis['fix_strategy']}
"""
        
        try:
            # Generate embedding for the search query using Gemini
            query_embedding = await self.gemini_client.generate_embedding(search_query)
            
            # Vector search in Qdrant using the repository-specific search
            vector_results = await qdrant_client.search_similar_in_repo(
                query_embedding=query_embedding,
                repo_id=repository_id,
                limit=10,
                score_threshold=0.3
            )
            
            # Format results - already formatted by search_similar_in_repo
            relevant_files = []
            for result in vector_results:
                metadata = result.get('metadata', {})
                file_path = metadata.get('file_path')
                file_content = metadata.get('text', '')
                
                if file_path and file_content:
                    relevant_files.append({
                        "path": file_path,
                        "content": file_content[:5000],  # Limit content size
                        "language": self._detect_language(file_path),
                        "score": result.get('score', 0.0)
                    })
            
            logger.info(f"Retrieved {len(relevant_files)} relevant files")
            
            return relevant_files
            
        except Exception as e:
            logger.warning(f"Vector search failed: {str(e)}, using empty results")
            return []
    
    async def _generate_fix(
        self,
        analysis: Dict[str, Any],
        relevant_files: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        repository_id: str,
        logger
    ) -> Dict[str, Any]:
        """
        Agent 3: Generate code fix using NEW TreeOfThoughtGenerator.
        
        UPGRADED: Now uses TreeOfThoughtGenerator with enhanced prompts
        that include mandatory requirements for production-ready code.
        """
        
        # Convert analysis dict to IssueUnderstanding format for TreeOfThoughtGenerator
        from agents.deep_understanding_agent import IssueUnderstanding
        
        # Build understanding object from analysis
        understanding = IssueUnderstanding(
            root_cause=analysis.get("root_cause", "Unknown cause"),
            requirements=analysis.get("requirements", []),
            affected_components=analysis.get("affected_components", []),
            fix_strategy=analysis.get("fix_strategy", "Unknown strategy"),
            risk_level=analysis.get("risk_level", "MEDIUM"),
            potential_side_effects=analysis.get("potential_side_effects", []),
            confidence=0.8,  # Default confidence
            complexity="moderate",  # Default complexity
            estimated_files=2,
            estimated_time_minutes=30,
            ambiguities=[],
            clarifying_questions=[],
            file_mentions=[],
            function_mentions=[],
            variable_mentions=[],
            error_messages=[]
        )
        
        # Convert relevant_files to RetrievedFile format
        from agents.precision_retrieval_agent import RetrievedFile
        retrieved_files = []
        for file_dict in relevant_files:
            retrieved_files.append(RetrievedFile(
                path=file_dict.get("path", "unknown"),
                content=file_dict.get("content", ""),
                language=file_dict.get("language", "unknown"),
                retrieval_score=file_dict.get("relevance_score", 0.5),
                retrieval_method="legacy_vector_search",
                relevance_explanation="Retrieved via legacy vector search"
            ))
        
        # Use TreeOfThoughtGenerator with enhanced prompts
        logger.info("🌳 Using TreeOfThoughtGenerator with Layer 10 validation prompts")
        candidates = await self.thought_generator.generate_candidates(
            understanding=understanding,
            relevant_files=retrieved_files,
            issue_title=issue_title,
            issue_body=issue_body,
            repository_id=repository_id
        )
        
        if not candidates:
            raise Exception("TreeOfThoughtGenerator produced no candidates")
        
        # Return the best candidate in legacy format
        best_candidate = candidates[0]
        return {
            "operations": best_candidate.operations,
            "summary": best_candidate.rationale,  # Fixed: FixCandidate has 'rationale' not 'reasoning'
            "confidence": best_candidate.confidence
        }
    
    async def _create_fix_plan(
        self,
        analysis: Dict[str, Any],
        issue_title: str,
        issue_body: str,
        logger
    ) -> Dict[str, Any]:
        """Create a plan for fixing the issue, determining complexity and phases."""
        
        requirements_count = len(analysis.get("requirements", []))
        
        prompt = f"""
You are a senior software architect planning how to fix a GitHub issue.

Issue: {issue_title}
Description: {issue_body}

Requirements Analysis:
{chr(10).join(f"- {req}" for req in analysis.get("requirements", []))}

Determine the complexity and create a fix plan:

COMPLEXITY LEVELS:
- **simple**: 1-2 requirements, single file or simple change (e.g., bug fix, small feature)
- **moderate**: 3-4 requirements, 2-4 files, config changes (e.g., add endpoint + docs)
- **complex**: 5-6 requirements, 5+ files, multiple subsystems (e.g., new feature with integration)
- **very_complex**: 7+ requirements, major feature, multiple integrations (e.g., real-time system)

For COMPLEX or VERY_COMPLEX issues, break into phases:

PHASE BREAKDOWN STRATEGY:
Phase 1: Core Implementation (the main code files that implement the feature)
Phase 2: Integration & Configuration (config files, dependencies, integrations)
Phase 3: Documentation & Examples (README, docs, usage examples)
Phase 4: Testing & Utilities (test files, helper utilities if needed)

Respond in JSON:
{{
    "complexity": "simple|moderate|complex|very_complex",
    "estimated_files": 5,
    "phases": [
        {{
            "phase_number": 1,
            "name": "Core Implementation",
            "description": "Create main feature files",
            "file_types": ["python", "typescript"],
            "operations": ["create src/feature.py", "create src/handler.py"]
        }},
        {{
            "phase_number": 2,
            "name": "Configuration",
            "description": "Update dependencies and configs",
            "file_types": ["text", "json"],
            "operations": ["modify requirements.txt", "modify package.json"]
        }}
    ],
    "reasoning": "Why this breakdown makes sense"
}}

For simple/moderate issues, return phases: [] (empty array).
"""
        
        response = await self.gemini_client.generate_content_async(
            prompt,
            max_tokens=2000,  # Increased from 1000 to avoid truncation
            temperature=0.3
        )
        
        import json
        try:
            plan = json.loads(response)
            
            # Auto-adjust if requirements suggest higher complexity
            if requirements_count >= 7 and plan.get("complexity") not in ["complex", "very_complex"]:
                plan["complexity"] = "very_complex"
                logger.warning(f"Auto-adjusted complexity to very_complex based on {requirements_count} requirements")
            elif requirements_count >= 5 and plan.get("complexity") == "simple":
                plan["complexity"] = "complex"
                logger.warning(f"Auto-adjusted complexity to complex based on {requirements_count} requirements")
                
            return plan
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse fix plan, using simple approach: {str(e)}")
            return {"complexity": "simple", "phases": [], "estimated_files": 3}
    
    async def _generate_fix_multi_phase(
        self,
        analysis: Dict[str, Any],
        relevant_files: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        fix_plan: Dict[str, Any],
        repository_id: str,
        logger
    ) -> Dict[str, Any]:
        """Generate fix in multiple phases to avoid truncation."""
        
        # Fetch dependency files to prevent overwriting existing dependencies
        if repository_id:
            dependency_files = await self._fetch_dependency_files(repository_id, logger)
            # Add dependency files to relevant_files at the beginning
            relevant_files = dependency_files + relevant_files
        
        all_operations = []
        files_modified = set()
        files_created = set()
        phase_summaries = []
        
        phases = fix_plan.get("phases", [])
        logger.info(f"Starting multi-phase generation: {len(phases)} phases")
        
        for phase in phases:
            phase_num = phase.get("phase_number", 0)
            phase_name = phase.get("name", f"Phase {phase_num}")
            
            logger.info(f"Generating {phase_name}...")
            
            phase_result = await self._generate_phase(
                phase=phase,
                analysis=analysis,
                relevant_files=relevant_files,
                issue_title=issue_title,
                issue_body=issue_body,
                previous_operations=all_operations,
                logger=logger
            )
            
            # Accumulate results
            phase_ops = phase_result.get("operations", [])
            all_operations.extend(phase_ops)
            
            for op in phase_ops:
                op_type = op.get("type")
                if op_type == "modify" or op_type == "edit":
                    files_modified.add(op.get("path"))
                elif op_type == "create":
                    files_created.add(op.get("path"))
            
            phase_summaries.append(f"{phase_name}: {phase_result.get('summary', 'completed')}")
            
            logger.info(f"✅ {phase_name} complete: {len(phase_ops)} operations")
        
        # Build comprehensive overview
        changes_overview = f"""Multi-phase fix completed:

{chr(10).join(f'• {summary}' for summary in phase_summaries)}

Total changes: {len(files_modified)} files modified, {len(files_created)} files created
"""
        
        return {
            "operations": all_operations,
            "changes_overview": changes_overview.strip(),
            "files_modified": list(files_modified),
            "files_created": list(files_created),
            "multi_phase": True,
            "phases_completed": len(phases)
        }
    
    async def _generate_phase(
        self,
        phase: Dict[str, Any],
        analysis: Dict[str, Any],
        relevant_files: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        previous_operations: List[Dict[str, Any]],
        logger
    ) -> Dict[str, Any]:
        """Generate operations for a single phase."""
        
        phase_name = phase.get("name", "Phase")
        phase_desc = phase.get("description", "")
        operations_list = phase.get("operations", [])
        
        # Build context about what's already been done
        previous_context = ""
        if previous_operations:
            prev_files = [op.get("path") for op in previous_operations]
            previous_context = f"""
ALREADY COMPLETED IN PREVIOUS PHASES:
{chr(10).join(f"- {path}" for path in prev_files[:10])}

Build upon these existing changes. Reference them if needed.
"""
        
        prompt = f"""
You are implementing a specific phase of a multi-phase fix for a GitHub issue.

ISSUE: {issue_title}
DESCRIPTION: {issue_body}

CURRENT PHASE: {phase_name}
PHASE GOAL: {phase_desc}
OPERATIONS TO PERFORM:
{chr(10).join(f"- {op}" for op in operations_list)}

{previous_context}

REQUIREMENTS FOR THIS PHASE ONLY:
{chr(10).join(f"- {req}" for req in analysis.get("requirements", []) if self._is_relevant_to_phase(req, phase))}

Generate ONLY the operations for THIS phase. Keep focused on the phase goals.

Respond in JSON:
{{
    "operations": [
        {{
            "type": "create|modify",
            "path": "file/path",
            "content": "Complete file content - this is a focused phase, provide full implementation",
            "language": "python|typescript|etc",
            "reason": "Why this file is needed for this phase"
        }}
    ],
    "summary": "Brief summary of what this phase accomplished"
}}

CRITICAL: Provide COMPLETE implementations, not placeholders. This is a focused phase.
CRITICAL: Respond with valid JSON only, no markdown code blocks.
"""
        
        response = await self.gemini_client.generate_content_async(
            prompt,
            max_tokens=4000,  # Smaller per phase but complete
            temperature=0.2
        )
        
        import json
        return await self._parse_json_response(response, logger, context=f"phase {phase_name}")
    
    async def _parse_json_response(
        self,
        response: str,
        logger,
        context: str = "response"
    ) -> Dict[str, Any]:
        """Parse JSON response with smart recovery for truncated responses."""
        import json
        
        # Strip markdown code blocks FIRST
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        elif cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]  # Remove ```
        
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]  # Remove trailing ```
        
        cleaned_response = cleaned_response.strip()
        
        # Try direct parse first
        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON {context}. Error: {str(e)}, Response length: {len(cleaned_response)}")
            logger.error(f"Response preview: {cleaned_response[:500]}...")
            logger.error(f"Response end: ...{cleaned_response[-500:]}")
            
            # Try smart recovery
            return await self._recover_truncated_json(cleaned_response, logger, context)
    
    async def _recover_truncated_json(
        self,
        json_str: str,
        logger,
        context: str
    ) -> Dict[str, Any]:
        """Smart recovery for truncated JSON responses."""
        import json
        
        logger.error(f"Attempting to repair truncated JSON ({context})...")
        
        try:
            # Find the operations array
            ops_start = json_str.find('"operations"')
            if ops_start == -1:
                raise ValueError("Could not find operations array")
            
            array_start = json_str.find('[', ops_start)
            if array_start == -1:
                raise ValueError("Could not find operations array start")
            
            # Extract complete operation objects
            operations = []
            current_pos = array_start + 1
            
            while True:
                next_op = json_str.find('{', current_pos)
                if next_op == -1:
                    break
                
                # Find matching closing brace
                brace_count = 0
                in_string = False
                escape = False
                op_end = next_op
                
                for i in range(next_op, len(json_str)):
                    char = json_str[i]
                    
                    if char == '\\' and not escape:
                        escape = True
                        continue
                        
                    if char == '"' and not escape:
                        in_string = not in_string
                        
                    if not in_string:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                op_end = i + 1
                                break
                                
                    escape = False
                
                # If we found a complete operation
                if brace_count == 0 and op_end > next_op:
                    try:
                        op_str = json_str[next_op:op_end]
                        operation = json.loads(op_str)
                        if 'type' in operation and 'path' in operation:
                            operations.append(operation)
                            logger.info(f"Recovered operation: {operation['type']} {operation['path']}")
                            current_pos = op_end
                        else:
                            break
                    except json.JSONDecodeError:
                        break
                else:
                    break
            
            # If we recovered operations, create valid response
            if operations:
                result = {
                    "operations": operations,
                    "changes_overview": f"Recovered {len(operations)} operations from truncated response",
                    "summary": f"Recovered {len(operations)} operations from truncated response"
                }
                logger.warning(f"✅ Successfully recovered {len(operations)} complete operations from truncated JSON ({context})")
                return result
            else:
                raise ValueError("No complete operations found")
                
        except Exception as recovery_err:
            logger.error(f"❌ Smart recovery failed ({context}): {str(recovery_err)}")
            # Return minimal valid response
            return {
                "operations": [],
                "changes_overview": f"Recovery failed for {context}: {str(recovery_err)}",
                "summary": f"Recovery failed for {context}: {str(recovery_err)}"
            }
    
    def _is_relevant_to_phase(self, requirement: str, phase: Dict[str, Any]) -> bool:
        """Check if a requirement is relevant to the current phase."""
        phase_name = phase.get("name", "").lower()
        req_lower = requirement.lower()
        
        # Phase 1: Core Implementation
        if "core" in phase_name or "implementation" in phase_name:
            return any(word in req_lower for word in ["implement", "create", "add endpoint", "add feature", "build"])
        
        # Phase 2: Configuration
        if "config" in phase_name or "integration" in phase_name:
            return any(word in req_lower for word in ["dependency", "install", "configure", "integrate", "setup"])
        
        # Phase 3: Documentation
        if "doc" in phase_name or "example" in phase_name:
            return any(word in req_lower for word in ["document", "readme", "guide", "example", "demo"])
        
        # Phase 4: Testing
        if "test" in phase_name or "utility" in phase_name:
            return any(word in req_lower for word in ["test", "verify", "validate", "helper"])
        
        # If unsure, include it
        return True
    
    async def _generate_fix_single_phase(
        self,
        analysis: Dict[str, Any],
        relevant_files: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        repository_id: str,
        logger
    ) -> Dict[str, Any]:
        """Agent 3: Generate code fix with smart file operations (original single-phase approach)."""
        
        # Fetch dependency files to prevent overwriting existing dependencies
        if repository_id:
            dependency_files = await self._fetch_dependency_files(repository_id, logger)
        else:
            dependency_files = []
        
        # Build context for Gemini
        context = ""
        
        # First, add dependency files (CRITICAL to include these)
        if dependency_files:
            context += "⚠️ EXISTING DEPENDENCY FILES (MUST PRESERVE ALL CONTENT) ⚠️\n\n"
            for file in dependency_files:
                context += f"File: {file['path']}\n"
                context += f"```{file['language']}\n{file['content']}\n```\n\n"
        
        # Then add other relevant files
        context += "Other Existing Files:\n\n"
        for file in relevant_files[:5]:  # Limit to top 5 files
            # Skip if already included in dependency_files
            if any(dep['path'] == file['path'] for dep in dependency_files):
                continue
            context += f"File: {file['path']}\n"
            context += f"```{file['language']}\n{file['content']}\n```\n\n"
        
        prompt = f"""
You are an expert software engineer fixing a GitHub issue. Analyze what needs to be changed and provide detailed file operations.

Issue: {issue_title}
Description: {issue_body}

Analysis:
- Root Cause: {analysis['root_cause']}
- Requirements: {', '.join(analysis['requirements'])}
- Strategy: {analysis['fix_strategy']}

{context}

Generate a comprehensive fix. You can:
1. **MODIFY** existing files (provide full updated content)
2. **CREATE** new files (provide complete content)
3. **UPDATE** configuration files (requirements.txt, package.json, etc.)
4. **ADD** documentation (README updates, new docs)
5. **CREATE** example/test files if requested
6. **ADD** Docker/containerization support (Dockerfile, docker-compose.yml, .dockerignore)
7. **CREATE** test files (unit tests, integration tests, test examples)

⚠️ MANDATORY ADDITIONS FOR TESTING (NOT FOR PR):
**IMPORTANT**: Docker, test, and example files should be generated but kept SEPARATE from source code.
Users will download these separately for local testing.

**Files to generate:**
1. **Source code changes** (will go in PR):
   - Implementation files (*.py, *.js, *.ts, etc.)
   - Configuration updates (requirements.txt, package.json)
   - Documentation updates (README.md changes)

2. **Test package files** (separate download, NOT in PR):
   - Dockerfile (for local testing)
   - docker-compose.yml (if multi-service)
   - .dockerignore
   - test_*.py or *.test.js (test files)
   - example_*.* (example/demo files)
   - client examples (HTML/JS demos)

**Generate BOTH categories** - users can test locally before creating PR.

- If the issue mentions "WebSocket", "streaming", "real-time" → Include example client in test package
- If the issue mentions "API", "endpoint", "server" → Include Dockerfile + test files in test package
- If adding new functionality → Include test demonstrating feature in test package

⚠️ CRITICAL FOR AUDIO/STREAMING/WEBSOCKET ISSUES:
- NEVER use `librosa.load()` with byte streams - it expects file paths!
- For audio chunks: Convert bytes → numpy array using `np.frombuffer()` or save to temp file first
- For real-time transcription: Process chunks as they arrive, don't buffer everything
- Include proper error handling for network disconnections
- Example pattern:
  ```python
  import io
  import numpy as np
  import soundfile as sf
  
  # Convert byte stream to audio array
  audio_bytes = io.BytesIO(chunk_data)
  audio_array, sample_rate = sf.read(audio_bytes)
  # OR
  audio_array = np.frombuffer(chunk_data, dtype=np.float32)
  ```

CRITICAL INSTRUCTIONS FOR COMPREHENSIVE FIXES:

1. **Include ALL necessary changes** to fully solve the issue:
   - Code files (implementation)
   - Configuration files (requirements.txt, package.json, etc.)
   - Documentation (README updates, API docs, usage guides)
   - Examples (if requested or helpful)
   - Tests (if mentioned in issue)

SPECIAL HANDLING FOR DEPENDENCY FILES:
- **requirements.txt / package.json**: When modifying these files, you MUST include ALL existing dependencies PLUS any new ones
- NEVER rewrite these files with only the new packages - this will break the entire project
- If you need to add a dependency, preserve all existing lines and append the new ones
- Example: If requirements.txt has 20 packages and you need to add 1, the output should have 21 packages total

2. **Every file MUST be complete and functional**:
   - NO placeholders like "# ... rest of implementation"
   - NO incomplete class definitions - implement ALL methods
   - NO incomplete functions - provide full working code
   - Each file should run without errors if executed
   - If __init__ is defined, it must have a complete body
   - If a function is defined, it must have a complete implementation
   
3. **Keep implementations simple and focused** (40-80 lines per file):
   - Break complex features into multiple small files
   - Use simple, straightforward implementations
   - Avoid deeply nested code structures
   - Focus on core functionality that solves the issue

4. **Prioritize operations by importance**:
   - Start with core implementation files (main logic)
   - Then configuration changes (dependencies)
   - Then documentation (usage guides)
   - Then examples (demo code)

⚠️ CRITICAL WARNING FOR DEPENDENCY FILES ⚠️
When modifying requirements.txt or package.json:
- You MUST include ALL existing dependencies in your output
- Look at the provided context for the current file content
- Copy ALL existing packages/dependencies
- Then add your new ones at the end
- NEVER output only the new dependencies - this will delete all existing ones and break the project!

Example - If requirements.txt currently has:
  django==4.2.0
  requests==2.28.0
  
And you need to add pandas, your output should be:
  django==4.2.0
  requests==2.28.0
  pandas==2.0.0
  
NOT just: pandas==2.0.0

🎯 OPERATION TYPES - Choose the Right One:

1. **"edit"** (⭐ PREFERRED for modifying existing files):
   - Use search/replace patterns to make targeted changes
   - Only touch the specific lines that need changing
   - Preserves all other content in the file automatically
   - GitHub Copilot style editing
   - ALWAYS use "edit" for files that already exist in the context
   - Examples: Adding a function, fixing a bug, updating a dependency list
   
2. **"create"** (for new files only):
   - Use ONLY when creating a brand new file that doesn't exist
   - Provide complete file content
   - Examples: New utility file, new documentation file
   
3. **"delete"** (rarely used):
   - Use only when removing an entire file
   - Examples: Removing deprecated files

🔍 HOW TO USE "edit" OPERATIONS:

For each edit:
1. **"search"**: Copy EXACT code from the file (include 2-3 lines before/after for context)
   - Match indentation EXACTLY
   - Match whitespace EXACTLY
   - DO NOT simplify or summarize the code
   - DO NOT add extra parameters or details that aren't in the original
   - If the file says `app = FastAPI()`, write `app = FastAPI()` not `app = FastAPI(title="My App")`
2. **"replace"**: Provide the new version of that code block
3. **"description"**: Explain what changed

⚠️ CRITICAL: The "search" pattern must match the file EXACTLY character-for-character
If it doesn't match, the edit will be skipped and your fix won't be applied!

Example - Adding a dependency to requirements.txt:
{{
    "type": "edit",
    "path": "requirements.txt",
    "edits": [
        {{
            "search": "django==4.2.0\\nrequests==2.28.0",
            "replace": "django==4.2.0\\nrequests==2.28.0\\nwebsockets==12.0",
            "description": "Add websockets dependency"
        }}
    ],
    "language": "text",
    "reason": "Added WebSocket support"
}}

Example - Fixing a function (COPY EXACT CODE):
{{
    "type": "edit",
    "path": "src/auth.py",
    "edits": [
        {{
            "search": "def validate(token):\\n    return True",
            "replace": "def validate(token):\\n    if not token:\\n        return False\\n    return verify_jwt(token)",
            "description": "Add proper token validation"
        }}
    ],
    "language": "python",
    "reason": "Fixed authentication vulnerability"
}}

Respond in JSON format:
{{
    "operations": [
        {{
            "type": "edit",
            "path": "relative/path/to/file.py",
            "edits": [
                {{
                    "search": "exact code to find (with context lines)",
                    "replace": "new code to replace it with",
                    "description": "what this edit does"
                }}
            ],
            "language": "python",
            "reason": "Clear explanation"
        }},
        {{
            "type": "create",
            "path": "relative/path/to/newfile.py",
            "content": "Complete file content",
            "language": "python",
            "reason": "Clear explanation"
        }},
        {{
            "type": "delete",
            "path": "relative/path/to/oldfile.py",
            "reason": "Clear explanation"
        }}
    ],
    "changes_overview": "Comprehensive description of what was changed and why",
    "files_modified": ["list of modified files"],
    "files_created": ["list of new files"],
    "files_deleted": ["list of deleted files"]
}}

CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no extra text.
Use simple string escaping. Avoid complex nested quotes.
Keep each operation's content focused and under 80 lines.

START YOUR RESPONSE WITH: {{
END YOUR RESPONSE WITH: }}

Do NOT wrap your response in ```json or any markdown formatting.
Output ONLY the raw JSON object.

CRITICAL: Every class method and function MUST have complete implementation.
BAD: "def __init__(self):\\n        # Initialize model"
GOOD: "def __init__(self):\\n        self.model = Model()\\n        self.connections = set()"

BAD: "async def handle_client(self, ws):\\n        # Handle connection"
GOOD: "async def handle_client(self, ws):\\n        try:\\n            async for data in ws:\\n                result = self.process(data)\\n                await ws.send(result)\\n        except Exception as e:\\n            print(f'Error: {{e}}')"

📝 EXAMPLE 1: Using "edit" operation (PREFERRED for existing files):
{{
    "operations": [
        {{
            "type": "edit",
            "path": "src/auth/validator.py",
            "edits": [
                {{
                    "search": "def validate_token(token: str) -> bool:\\n    if not token:\\n        return False\\n    return True",
                    "replace": "def validate_token(token: str) -> bool:\\n    if not token:\\n        return False\\n    # Check token expiration\\n    if is_expired(token):\\n        return False\\n    return verify_signature(token)",
                    "description": "Add token expiration and signature validation"
                }}
            ],
            "language": "python",
            "reason": "Fixed authentication bug by adding proper token validation"
        }},
        {{
            "type": "edit",
            "path": "requirements.txt",
            "edits": [
                {{
                    "search": "fastapi==0.104.1\\nuvicorn==0.24.0\\npydantic==2.5.0",
                    "replace": "fastapi==0.104.1\\nuvicorn==0.24.0\\npydantic==2.5.0\\nPyJWT==2.8.0\\ncryptography==41.0.0",
                    "description": "Add JWT and cryptography for token validation"
                }}
            ],
            "language": "text",
            "reason": "Added dependencies for JWT token handling"
        }}
    ],
    "changes_overview": "Fixed authentication vulnerability by adding token expiration and signature validation",
    "files_modified": ["src/auth/validator.py", "requirements.txt"]
}}

📝 EXAMPLE 2: Using "create" operation (for new files):
{{
    "operations": [
        {{
            "type": "create",
            "path": "src/utils/token_helper.py",
            "content": "import jwt\\nfrom datetime import datetime, timedelta\\n\\ndef is_expired(token: str) -> bool:\\n    try:\\n        payload = jwt.decode(token, options={{'verify_signature': False}})\\n        exp = payload.get('exp')\\n        if not exp:\\n            return True\\n        return datetime.utcnow() > datetime.fromtimestamp(exp)\\n    except:\\n        return True\\n\\ndef verify_signature(token: str) -> bool:\\n    try:\\n        jwt.decode(token, 'secret_key', algorithms=['HS256'])\\n        return True\\n    except:\\n        return False",
            "language": "python",
            "reason": "Helper functions for token validation"
        }}
    ],
    "changes_overview": "Created token validation utilities",
    "files_created": ["src/utils/token_helper.py"]
}}

NOW GENERATE YOUR FIX:
"""
        
        response = await self.gemini_client.generate_content_async(
            prompt,
            max_tokens=8000,  # Increased for comprehensive fixes
            temperature=0.2
        )
        
        proposed_fix = await self._parse_json_response(response, logger, context="single-phase fix generation")
        logger.info(f"Generated fix with {len(proposed_fix.get('operations', []))} file operations")
        
        return proposed_fix
    
    async def _validate_fix(
        self,
        proposed_fix: Dict[str, Any],
        analysis: Dict[str, Any],
        issue_title: str,
        issue_body: str,
        logger
    ) -> Dict[str, Any]:
        """
        Agent 4: Comprehensive validation using NEW MultiLayerValidator.
        
        UPGRADED: Now uses MultiLayerValidator with Layer 10 production readiness checks
        to catch wrong data types, hardcoded paths, missing error handling, etc.
        """
        
        # Convert proposed_fix to FixCandidate format for MultiLayerValidator
        from agents.tree_of_thought_generator import FixCandidate
        from agents.deep_understanding_agent import IssueUnderstanding
        
        # Build understanding object from analysis
        understanding = IssueUnderstanding(
            root_cause=analysis.get("root_cause", "Unknown cause"),
            requirements=analysis.get("requirements", []),
            affected_components=analysis.get("affected_components", []),
            fix_strategy=analysis.get("fix_strategy", "Unknown strategy"),
            risk_level=analysis.get("risk_level", "MEDIUM"),
            potential_side_effects=analysis.get("potential_side_effects", []),
            confidence=0.8,
            complexity="moderate",
            estimated_files=2,
            estimated_time_minutes=30,
            ambiguities=[],
            clarifying_questions=[],
            file_mentions=[],
            function_mentions=[],
            variable_mentions=[],
            error_messages=[]
        )
        
        # Build candidate object
        candidate = FixCandidate(
            operations=proposed_fix.get('operations', []),
            rationale=proposed_fix.get('changes_overview', 'Generated fix'),  # Fixed: use 'rationale' not 'reasoning'
            confidence=0.8,  # Initial confidence
            approach="direct_implementation",
            estimated_impact="medium",
            risk_assessment="Moderate",
            test_strategy="Standard validation"
        )
        
        # Use MultiLayerValidator with ALL 10 layers including production readiness
        logger.info("🔍 Using MultiLayerValidator with Layer 10 production checks")
        validation_result = await self.validator.validate_candidate(
            candidate=candidate,
            understanding=understanding,
            repository_id=analysis.get("repository_id", "unknown")
        )
        
        # Convert ValidationResult to legacy format
        return {
            "valid": validation_result.valid,
            "confidence": validation_result.confidence,
            "completeness_score": validation_result.confidence,  # Use confidence as completeness
            "issues": [issue.message for issue in validation_result.issues if issue.severity in ["critical", "high"]],
            "missing": [issue.message for issue in validation_result.issues if "missing" in issue.message.lower()],
            "recommendations": [issue.suggestion for issue in validation_result.issues if issue.suggestion],
            "strengths": ["Passed MultiLayerValidator with Layer 10 production checks"] if validation_result.valid else []
        }
    
    async def _generate_explanation(
        self,
        analysis: Dict[str, Any],
        proposed_fix: Dict[str, Any],
        issue_number: int,
        logger
    ) -> str:
        """Agent 5: Generate professional PR description following open source best practices."""
        
        operations = proposed_fix.get('operations', [])
        files_modified = proposed_fix.get('files_modified', [])
        files_created = proposed_fix.get('files_created', [])
        changes_overview = proposed_fix.get('changes_overview', 'Generated fix for the issue')
        
        prompt = f"""
You are a professional software engineer writing a pull request description.
Write naturally as a human developer would - avoid overly formal or template-like language.

CONTEXT:
- Root Cause: {analysis['root_cause']}
- Solution Approach: {analysis['fix_strategy']}
- What Changed: {changes_overview}
- Files Modified: {', '.join(files_modified[:5]) if files_modified else 'None'}
- New Files: {', '.join(files_created[:3]) if files_created else 'None'}

WRITE A PROFESSIONAL PR DESCRIPTION:

Start with a brief summary paragraph (2-3 sentences) explaining what problem this fixes and how.

Then add a "Changes" section with specific bullet points:
- Focus on the actual changes made
- Be specific but concise
- Use active voice ("Added X", "Updated Y", "Fixed Z")

End with a short "Testing" section explaining what was tested or what reviewers should test.

STYLE GUIDELINES:
- Write conversationally but professionally (like a senior engineer)
- Use concrete details, not vague statements
- Avoid phrases like "This PR implements..." - just say "Implements..."
- Don't say "comprehensive", "robust", "significant" - be specific instead
- Use present tense for changes ("Adds", "Updates", not "Added", "Updated")
- Keep total length under 200 words
- NO emojis, NO "Related Issue" section, NO issue numbers

EXAMPLE OF GOOD STYLE:
"Fixes the authentication bug where expired tokens were accepted. The validator now checks token expiration timestamps before verification. Also added signature validation for better security."

NOT:
"This pull request implements a comprehensive solution to address the authentication vulnerability by adding robust token validation mechanisms including expiration checking and cryptographic signature verification."

Output ONLY the PR description text:
"""
        
        response = await self.gemini_client.generate_content_async(
            prompt,
            max_tokens=600,  # Reduced for more concise descriptions
            temperature=0.7  # Increased for more natural, less robotic language
        )
        
        # Response is already a string, not an object with .text
        explanation = response.strip()
        
        # Post-process to remove AI-like patterns
        explanation = self._humanize_pr_description(explanation)
        
        # Append real issue number programmatically (Gemini instructed NOT to add this)
        if issue_number:
            explanation += f"\n\n## Related Issue\nCloses #{issue_number}"
        
        # Add GitTLDR attribution at the bottom
        explanation += "\n\n---\n*Generated with [GitTLDR](https://gittldr.vercel.app)*"
        
        logger.info("Generated professional PR description with issue #%s", issue_number)
        
        return explanation
    
    def _humanize_pr_description(self, text: str) -> str:
        """Remove overly formal or AI-like patterns from PR description."""
        # Remove common AI-generated phrases
        ai_patterns = [
            "This pull request ",
            "This PR ",
            "comprehensive ",
            "robust ",
            "significant ",
            "enhanced ",
            "improved ",
            " enhancement",
            " improvement",
            "successfully ",
            " successfully",
        ]
        
        for pattern in ai_patterns:
            # Only remove at start of sentences or standalone
            if text.startswith(pattern):
                text = text[len(pattern):]
            # Remove mid-sentence occurrences
            text = text.replace(f" {pattern.strip()} ", " ")
            text = text.replace(f" {pattern.strip()},", ",")
        
        # Capitalize first letter if needed
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
        
        return text
    
    async def _update_status(self, issue_fix_id: str, status: str):
        """Update IssueFix status in database."""
        await database_service.update_issue_fix(
            issue_fix_id=issue_fix_id,
            status=status
        )
    
    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.jsx': 'javascript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.cs': 'csharp',
            '.swift': 'swift',
            '.kt': 'kotlin'
        }
        
        for ext, lang in extensions.items():
            if file_path.endswith(ext):
                return lang
        
        return 'text'

    async def _fetch_dependency_files(self, repository_id: str, logger) -> List[Dict[str, Any]]:
        """
        Fetch dependency files (requirements.txt, package.json) from the repository.
        These files are critical to include in context to prevent overwriting existing dependencies.
        """
        dependency_files = []
        dependency_patterns = [
            'requirements.txt',
            'package.json',
            'Pipfile',
            'poetry.lock',
            'Cargo.toml',
            'go.mod',
            'pom.xml',
            'build.gradle'
        ]
        
        try:
            # Import file service to get file content
            from services.file_service import FileRetrievalService
            file_service = FileRetrievalService()
            
            # Try to fetch each dependency file
            for pattern in dependency_patterns:
                try:
                    content = await file_service.get_file_content(repository_id, pattern)
                    if content:
                        dependency_files.append({
                            "path": pattern,
                            "content": content,
                            "language": "text",
                            "score": 1.0  # High score for dependency files
                        })
                        logger.info(f"✅ Found dependency file: {pattern} ({len(content)} chars)")
                except Exception as e:
                    logger.debug(f"Dependency file {pattern} not found: {str(e)}")
                    continue
        except Exception as e:
            logger.warning(f"Error fetching dependency files: {str(e)}")
        
        return dependency_files
