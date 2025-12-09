"""
RATFV Meta-Controller - Orchestrator for Auto-Fix AI
====================================================

Coordinates all 7 phases of the RATFV architecture:
1. Deep Understanding (ReACT)
2. Precision Retrieval (RAG-Fusion)
3. Tree-of-Thought Generation
4. Multi-Layer Validation
5. Self-Refinement (3 iterations)
6. Final Verification
7. Confidence-Gated PR Creation

Target: 80-85% success rate with scalability and monitoring
"""

import asyncio
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from utils.logger import get_logger
from services.database_service import database_service
from services.redis_client import redis_client
from agents.deep_understanding_agent import DeepUnderstandingAgent, IssueUnderstanding
from agents.precision_retrieval_agent import PrecisionRetrievalAgent, RetrievedFile
from agents.complete_file_generator import CompleteFileGenerator
from agents.multi_layer_validator import MultiLayerValidator, ValidationResult
from agents.self_refinement_engine import SelfRefinementEngine, RefinementResult
from agents.confidence_gated_pr_creator import ConfidenceGatedPRCreator, PRMetadata
from services.function_extractor import function_extractor
from services.tech_stack_detector import tech_stack_detector

logger = get_logger(__name__)


@dataclass
class FixResult:
    """Result of the auto-fix process."""
    status: str  # success, failed, needs_review, needs_clarification
    issue_fix_id: str
    confidence: float
    operations: List[Dict[str, Any]]
    explanation: str
    metrics: Dict[str, Any]
    warnings: List[str]
    clarifying_questions: List[str]


class MetaController:
    """
    Meta-Controller: Orchestrates the entire RATFV pipeline.
    
    Responsibilities:
    - Phase orchestration with timeout management
    - Feedback loops between phases
    - Metrics tracking (latency, success rate, confidence)
    - Error handling and graceful degradation
    - Rate limiting and resource management
    """
    
    # Timeouts (in seconds) - Increased for rate limiting with capped retry delays
    # With capped 60s max retry delay: multiple retries possible within timeout
    PHASE_TIMEOUTS = {
        'understanding': 600,   # 10 minutes - handles multiple retries with 60s cap
        'retrieval': 900,       # 15 minutes - tool-use may need many retries (10+ iterations)
        'generation': 900,      # 15 minutes - generating 3 candidates + validation
        'validation': 600,      # 10 minutes - 10 validation layers with potential AI calls
        'refinement': 900,      # 15 minutes - 3 iterations with potential retries
        'verification': 600,    # 10 minutes - final validation may call AI
        'pr_creation': 600      # 10 minutes - GitHub API + validation
    }
    
    # Thresholds
    MIN_CONFIDENCE_FOR_PR = 6.0  # Out of 10
    MIN_CONFIDENCE_FOR_AUTO_MERGE = 9.0
    MAX_REFINEMENT_ITERATIONS = 3
    
    def __init__(self):
        # Initialize all agents
        self.understanding_agent = DeepUnderstandingAgent()
        self.retrieval_agent = PrecisionRetrievalAgent()
        self.file_generator = None  # Will be initialized with AI client
        self.validator = MultiLayerValidator()
        self.refinement_engine = SelfRefinementEngine()
        self.pr_creator = ConfidenceGatedPRCreator()
        
        # Metrics
        self.metrics = {
            'total_requests': 0,
            'successful_fixes': 0,
            'failed_fixes': 0,
            'phase_latencies': {},
            'confidence_scores': []
        }
    
    async def process_auto_fix(
        self,
        issue_fix_id: str,
        repository_id: str,
        user_id: str,
        issue_number: int,
        issue_title: str,
        issue_body: str,
        task_id: Optional[str] = None
    ) -> FixResult:
        """
        Main entry point: Process auto-fix end-to-end.
        
        Returns:
            FixResult with status, confidence, and operations
        """
        start_time = time.time()
        self.metrics['total_requests'] += 1
        
        # Store task_id for Redis updates (use provided or generate)
        self.task_id = task_id or f"issue_fix_{issue_fix_id}_{int(time.time() * 1000)}"
        
        # Set quota_user for Gemini API attribution (key-isolated quota tracking)
        from services.gemini_client import gemini_client
        gemini_client.unified_client.current_quota_user = issue_fix_id
        logger.info(f"🔑 Set quotaUser={issue_fix_id} for Gemini API quota isolation")
        
        logger.info(f"🚀 MetaController processing auto-fix for issue #{issue_number}")
        
        try:
            # === PHASE 0: Get Repository Context (for placeholder elimination) ===
            repository_context = await self._get_repository_context(repository_id)
            if repository_context:
                logger.info(f"📦 Repository context: {repository_context['full_name']}")
            else:
                logger.warning(f"⚠️ Repository context not available for {repository_id}")
            
            # Update status: ANALYZING
            await self._update_status(issue_fix_id, "ANALYZING")
            
            # === PHASE 1: Deep Understanding ===
            phase_start = time.time()
            understanding = await asyncio.wait_for(
                self.understanding_agent.analyze_issue(
                    issue_title=issue_title,
                    issue_body=issue_body,
                    repository_id=repository_id
                ),
                timeout=self.PHASE_TIMEOUTS['understanding']
            )
            self._record_phase_latency('understanding', time.time() - phase_start)
            
            logger.info(f"📊 Understanding Results: confidence={understanding.confidence:.1%}, complexity={understanding.complexity}, ambiguities={len(understanding.ambiguities)}")
            
            # Save analysis
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                analysis=asdict(understanding)
            )
            
            # Check if user already provided clarification (skip gate if clarification provided)
            issue_fix = await database_service.get_issue_fix(issue_fix_id)
            clarification_provided = issue_fix.get('analysis', {}).get('clarification_provided', False) if issue_fix else False
            
            # Check if we need clarification (relaxed thresholds for production)
            # Only stop for VERY low confidence (<40%) or critical ambiguities (>5)
            # BUT: Skip if user already provided clarification - trust their answers
            if not clarification_provided and (understanding.confidence < 0.40 or len(understanding.ambiguities) > 5):
                logger.warning(f"⚠️ Issue needs clarification (confidence: {understanding.confidence:.1%})")
                
                # Format clarifying questions for display
                questions_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(understanding.clarifying_questions)])
                error_msg = f"""This issue needs clarification before I can generate a fix.

Confidence: {understanding.confidence:.1%}
Ambiguities: {len(understanding.ambiguities)}

Please answer these questions:
{questions_text}

Click 'Answer Questions' below to provide clarification."""
                
                # Update status in database with clarifying questions
                await database_service.update_issue_fix(
                    issue_fix_id=issue_fix_id,
                    status="NEEDS_CLARIFICATION",
                    error_message=error_msg,
                    analysis={**asdict(understanding), 'clarifying_questions': understanding.clarifying_questions}
                )
                
                return FixResult(
                    status='needs_clarification',
                    issue_fix_id=issue_fix_id,
                    confidence=understanding.confidence,
                    operations=[],
                    explanation=f'Issue requires clarification (confidence: {understanding.confidence:.1%}, ambiguities: {len(understanding.ambiguities)})',
                    metrics={'total_time': time.time() - start_time},
                    warnings=understanding.ambiguities,
                    clarifying_questions=understanding.clarifying_questions
                )
            
            # === PHASE 2: Precision Retrieval ===
            await self._update_status(issue_fix_id, "RETRIEVING_CODE")
            phase_start = time.time()
            
            relevant_files = await asyncio.wait_for(
                self.retrieval_agent.retrieve_relevant_code(
                    understanding=understanding,
                    repository_id=repository_id,
                    max_files=15
                ),
                timeout=self.PHASE_TIMEOUTS['retrieval']
            )
            self._record_phase_latency('retrieval', time.time() - phase_start)
            
            logger.info(f"📚 Retrieved {len(relevant_files)} relevant files")
            
            # Save retrieved files
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                relevant_files=[asdict(f) for f in relevant_files]
            )
            
            # === PHASE 3: Complete File Generation (NEW & SIMPLE) ===
            await self._update_status(issue_fix_id, "GENERATING_FIX")
            phase_start = time.time()
            
            # Initialize generator with AI client if not already done
            if self.file_generator is None:
                from services.gemini_client import gemini_client
                self.file_generator = CompleteFileGenerator(gemini_client)
            
            # Generate complete modified files, then compute diff
            unified_diff, modifications = await asyncio.wait_for(
                self.file_generator.generate_fix(
                    understanding=understanding,
                    relevant_files=relevant_files,
                    issue_title=issue_title,
                    issue_body=issue_body,
                    repository_id=repository_id,
                    repository_context=repository_context  # Pass repo context for placeholder elimination
                ),
                timeout=self.PHASE_TIMEOUTS['generation']
            )
            
            self._record_phase_latency('generation', time.time() - phase_start)
            logger.info(f"✅ Generated fix: {len(modifications)} files modified")
            
            # Convert modifications to operations format for compatibility with validation
            operations = []
            for mod in modifications:
                if mod.change_type == 'create':
                    operations.append({
                        'type': 'create',
                        'path': mod.path,
                        'content': mod.modified_content,
                        'explanation': mod.explanation
                    })
                elif mod.change_type == 'modify':
                    operations.append({
                        'type': 'edit',
                        'path': mod.path,
                        'explanation': mod.explanation,
                        'edits': [{
                            'old_code': mod.original_content,
                            'new_code': mod.modified_content,
                            'explanation': mod.explanation
                        }]
                    })
                elif mod.change_type == 'delete':
                    operations.append({
                        'type': 'delete',
                        'path': mod.path,
                        'explanation': mod.explanation
                    })
            
            # Build proposed_fix format
            proposed_fix = {
                'operations': operations,
                'diff': unified_diff,  # PRIMARY: Clean unified diff from difflib
                'approach': 'Complete File Generation',
                'confidence': 0.85,  # Will be validated in next phase
                'selection_metadata': {
                    'selected_approach': 'whole_file',
                    'files_modified': len(modifications),
                    'selection_score': 1.0
                }
            }
            
            # === PHASE 4: Multi-Layer Validation ===
            await self._update_status(issue_fix_id, "VALIDATING")
            phase_start = time.time()
            
            # NEW: Extract metadata for validation (function inventory & tech stack)
            logger.info("🔍 Extracting metadata for validation...")
            func_inventory = function_extractor.extract_inventory(relevant_files)
            
            tech_stack = tech_stack_detector.detect_stack([
                {'path': f.path if hasattr(f, 'path') else f.metadata.get('path', ''),
                 'content': f.content if hasattr(f, 'content') else f.page_content,
                 'language': f.language if hasattr(f, 'language') else 'unknown'}
                for f in relevant_files
            ])
            
            validation_metadata = {
                'function_inventory': func_inventory,
                'tech_stack': tech_stack
            }
            
            # === PHASE 5: Validation & Auto-Fix Feedback Loop ===
            logger.info("🔍 Validating generated fix with auto-retry on failure")
            await self._update_status(issue_fix_id, "VALIDATING")
            phase_start = time.time()
            
            # Retry with validation feedback up to MAX_VALIDATION_RETRIES times
            # EXTENDED RETRIES for blocking bugs: These are critical production issues
            MAX_VALIDATION_RETRIES = 3  # For general validation issues (syntax errors, etc)
            MAX_BLOCKING_BUG_RETRIES = 10  # Extended for AI-detected blocking bugs (infinite loops, race conditions)
            MAX_DEFINITION_ORDER_RETRIES = 8  # For definition order bugs (easily fixable with surgical changes)
            validation_feedback = None
            has_blocking_bugs = False
            has_definition_order_bugs = False
            blocking_bug_attempts = 0
            
            # Use highest retry limit based on issue type
            max_attempts = MAX_BLOCKING_BUG_RETRIES
            
            for attempt in range(max_attempts):  # Use highest limit
                validation_result = await asyncio.wait_for(
                    self.validator.validate_fix(
                        proposed_fix=proposed_fix,
                        understanding=understanding,
                        relevant_files=relevant_files,
                        issue_title=issue_title,
                        issue_body=issue_body,
                        metadata=validation_metadata
                    ),
                    timeout=self.PHASE_TIMEOUTS['validation']
                )
                
                self._record_phase_latency('validation', time.time() - phase_start)
                
                # Check if this validation has blocking bugs (Layer 11)
                has_blocking_bugs = any(
                    issue.layer == 'ai_logic_bugs' and 
                    issue.severity in ['critical', 'high'] and 
                    not str(issue.severity).startswith('advisory_')
                    for issue in validation_result.issues
                )
                
                # Check for definition order bugs (easily fixable)
                has_definition_order_bugs = any(
                    'used' in issue.message.lower() and 'before' in issue.message.lower() and 'definition' in issue.message.lower()
                    for issue in validation_result.issues
                    if issue.severity == 'critical'
                )
                
                # Determine retry type and log appropriately
                if has_blocking_bugs:
                    blocking_bug_attempts += 1
                    logger.info(f"🚨 Validation attempt {attempt + 1}/{MAX_BLOCKING_BUG_RETRIES} (BLOCKING BUG): {validation_result.summary}")
                elif has_definition_order_bugs:
                    logger.info(f"🔧 Validation attempt {attempt + 1}/{MAX_DEFINITION_ORDER_RETRIES} (DEFINITION ORDER): {validation_result.summary}")
                else:
                    logger.info(f"🔍 Validation attempt {attempt + 1}/{MAX_VALIDATION_RETRIES}: {validation_result.summary}")
                
                # If validation passed or no specific feedback, break
                # Don't break early - run at least 2 attempts to catch non-deterministic AI blocking bug detection
                if validation_result.valid and validation_result.confidence >= 0.75:
                    if attempt >= 1:  # Run at least 2 validation attempts
                        logger.info(f"✅ Validation passed on attempt {attempt + 1} (verified with multiple passes)")
                        break
                    else:
                        logger.info(f"✅ Validation passed on attempt {attempt + 1}, running one more pass to verify (AI detection is non-deterministic)")
                
                # Determine max retries based on issue type (most generous limit wins)
                if has_blocking_bugs:
                    effective_max_retries = MAX_BLOCKING_BUG_RETRIES
                    retry_type = "BLOCKING BUG"
                elif has_definition_order_bugs:
                    effective_max_retries = MAX_DEFINITION_ORDER_RETRIES
                    retry_type = "DEFINITION ORDER FIX"
                else:
                    effective_max_retries = MAX_VALIDATION_RETRIES
                    retry_type = "validation feedback"
                
                # If this is the last attempt for this issue type, don't regenerate
                if attempt >= effective_max_retries - 1:
                    if has_blocking_bugs:
                        logger.error(f"❌ Max BLOCKING BUG retries ({MAX_BLOCKING_BUG_RETRIES}) reached - critical issues remain")
                    elif has_definition_order_bugs:
                        logger.error(f"❌ Max DEFINITION ORDER retries ({MAX_DEFINITION_ORDER_RETRIES}) reached - fix failed")
                    else:
                        logger.warning(f"⚠️ Max validation retries reached, proceeding with current code")
                    break
                
                # Get AI feedback and regenerate
                if validation_result.ai_feedback:
                    logger.info(f"🔧 Regenerating with {retry_type} (attempt {attempt + 2}/{effective_max_retries})")
                    logger.info(f"📋 AI Feedback:\n{validation_result.ai_feedback}")
                    validation_feedback = validation_result.ai_feedback
                    
                    # Regenerate with feedback
                    unified_diff, modifications = await asyncio.wait_for(
                        self.file_generator.generate_fix(
                            understanding=understanding,
                            relevant_files=relevant_files,
                            issue_title=issue_title,
                            issue_body=issue_body,
                            repository_id=repository_id,
                            validation_feedback=validation_feedback,
                            repository_context=repository_context  # Pass repo context for placeholder elimination
                        ),
                        timeout=self.PHASE_TIMEOUTS['generation']
                    )
                    logger.info(f"🔄 Regenerated code with validation feedback")
                    
                    # Rebuild proposed_fix dictionary (same as initial generation)
                    operations = []
                    for mod in modifications:
                        if mod.change_type == 'create':
                            operations.append({
                                'type': 'create',
                                'path': mod.path,
                                'content': mod.modified_content,
                                'explanation': mod.explanation
                            })
                        elif mod.change_type == 'modify':
                            operations.append({
                                'type': 'edit',
                                'path': mod.path,
                                'explanation': mod.explanation,
                                'edits': [{
                                    'old_code': mod.original_content,
                                    'new_code': mod.modified_content,
                                    'explanation': mod.explanation
                                }]
                            })
                        elif mod.change_type == 'delete':
                            operations.append({
                                'type': 'delete',
                                'path': mod.path,
                                'explanation': mod.explanation
                            })
                    
                    proposed_fix = {
                        'operations': operations,
                        'diff': unified_diff,
                        'approach': 'Complete File Generation',
                        'confidence': 0.85,
                        'selection_metadata': {
                            'selected_approach': 'whole_file',
                            'files_modified': len(modifications),
                            'selection_score': 1.0
                        }
                    }
                    
                    phase_start = time.time()  # Reset timer for next validation
                else:
                    logger.warning("⚠️ No AI feedback generated, cannot retry")
                    break
            
            # === PHASE 5.5: Self-Refinement (if still needed after retries) ===
            refinement_result = None
            TARGET_CONFIDENCE = 0.90
            
            if not validation_result.valid or validation_result.confidence < TARGET_CONFIDENCE:
                logger.info(f"🔧 Starting self-refinement (confidence: {validation_result.confidence:.1%}, target: {TARGET_CONFIDENCE:.1%})")
                await self._update_status(issue_fix_id, "VALIDATING")  # Use VALIDATING instead of REFINING
                phase_start = time.time()
                
                refinement_result = await asyncio.wait_for(
                    self.refinement_engine.refine_fix(
                        initial_fix=proposed_fix,
                        validation_result=validation_result,
                        understanding=understanding,
                        relevant_files=relevant_files,
                        issue_title=issue_title,
                        issue_body=issue_body,
                        validator=self.validator
                    ),
                    timeout=self.PHASE_TIMEOUTS['refinement']
                )
                
                self._record_phase_latency('refinement', time.time() - phase_start)
                
                # Use refined fix
                proposed_fix = refinement_result.refined_fix
                final_confidence = refinement_result.final_confidence
                
                logger.info(f"🔧 Refinement complete: {refinement_result.termination_reason} (final: {final_confidence:.1%})")
            else:
                final_confidence = validation_result.confidence
                logger.info(f"✅ Validation passed, skipping refinement (confidence: {final_confidence:.1%})")
            
            # === CRITICAL: Apply generation failure penalty ===
            # If candidates failed during generation, penalize final confidence
            if hasattr(proposed_fix, 'metadata') and 'generation_success_rate' in proposed_fix.metadata:
                gen_success_rate = proposed_fix.metadata['generation_success_rate']
                failed_count = proposed_fix.metadata.get('failed_candidates', 0)
                
                if gen_success_rate < 1.0:
                    # Penalty: Each failed candidate reduces confidence by 15%
                    penalty = failed_count * 0.15
                    original_confidence = final_confidence
                    final_confidence = final_confidence * (1.0 - penalty)
                    
                    logger.warning(
                        f"🚨 Generation failure penalty applied: "
                        f"{failed_count} candidates failed ({gen_success_rate:.0%} success rate) → "
                        f"confidence reduced from {original_confidence:.1%} to {final_confidence:.1%}"
                    )
            
            # === PHASE 6: Final Verification ===
            # Re-validate if refinement was performed
            if refinement_result:
                logger.info("🔍 Final verification after refinement")
                phase_start = time.time()
                
                validation_result = await asyncio.wait_for(
                    self.validator.validate_fix(
                        proposed_fix=proposed_fix,
                        understanding=understanding,
                        relevant_files=relevant_files,
                        issue_title=issue_title,
                        issue_body=issue_body
                    ),
                    timeout=self.PHASE_TIMEOUTS['verification']
                )
                
                self._record_phase_latency('verification', time.time() - phase_start)
                final_confidence = validation_result.confidence
            
            # === CONFIDENCE THRESHOLDS - Guide quality assessment ===
            CONFIDENCE_THRESHOLDS = {
                'NEEDS_REFINEMENT': 0.50,     # < 50% = needs significant improvement  
                'AUTO_APPROVE': 0.85          # >= 85% = high quality, low risk
            }
            
            # Collect bugs for warning section (no longer blocking)
            has_blocking_bugs = any(issue.severity in ['critical', 'high'] for issue in validation_result.issues)
            bug_warnings = []
            
            if has_blocking_bugs:
                logger.warning(f"⚠️ DETECTED BLOCKING BUGS (confidence: {final_confidence:.1%}) - Will create PR with bug warning section")
                logger.warning(f"   User can test in Docker and fix manually if needed")
                
                # Group bugs by severity
                critical_bugs = [issue for issue in validation_result.issues if issue.severity == 'critical']
                high_bugs = [issue for issue in validation_result.issues if issue.severity == 'high']
                medium_bugs = [issue for issue in validation_result.issues if issue.severity == 'medium']
                
                if critical_bugs:
                    bug_warnings.append("### 🚨 Critical Issues Detected\n")
                    for bug in critical_bugs[:3]:
                        bug_warnings.append(f"- **{bug.message}**")
                        if bug.fix_instruction:
                            bug_warnings.append(f"  - Fix: {bug.fix_instruction}")
                
                if high_bugs:
                    bug_warnings.append("\n### ⚠️ High Priority Issues\n")
                    for bug in high_bugs[:3]:
                        bug_warnings.append(f"- {bug.message}")
                        if bug.fix_instruction:
                            bug_warnings.append(f"  - Fix: {bug.fix_instruction}")
                
                if medium_bugs and len(bug_warnings) < 10:  # Only show medium if not too many already
                    bug_warnings.append("\n### ℹ️ Medium Priority Issues\n")
                    for bug in medium_bugs[:2]:
                        bug_warnings.append(f"- {bug.message}")
            
            # Log confidence level (informational only)
            if final_confidence < CONFIDENCE_THRESHOLDS['NEEDS_REFINEMENT']:
                logger.warning(f"⚠️ LOW confidence ({final_confidence:.1%}) - code needs review before merging")
            elif final_confidence < CONFIDENCE_THRESHOLDS['AUTO_APPROVE']:
                logger.info(f"✅ Moderate confidence ({final_confidence:.1%}) - manual review recommended")
            else:
                logger.info(f"🎯 HIGH confidence ({final_confidence:.1%}) - code meets quality standards")
            
            # === PHASE 7: Confidence-Gated PR Creation ===
            # Continue to PR creation even with detected bugs
            # The PR will include a bug warning section for user review
            logger.info(f"📝 Creating PR metadata (confidence: {final_confidence:.1%}, has_bugs: {has_blocking_bugs})")
            phase_start = time.time()
            
            pr_metadata = await asyncio.wait_for(
                self.pr_creator.create_pr_metadata(
                    fix_result=proposed_fix,
                    understanding=understanding,
                    validation_result=validation_result,
                    refinement_result=refinement_result,
                    issue_number=issue_number,
                    issue_title=issue_title,
                    issue_body=issue_body,
                    final_confidence=final_confidence,
                    bug_warnings=bug_warnings if has_blocking_bugs else None
                ),
                timeout=self.PHASE_TIMEOUTS['pr_creation']
            )
            
            self._record_phase_latency('pr_creation', time.time() - phase_start)
            
            # Record confidence
            self.metrics['confidence_scores'].append(final_confidence)
            
            # Record confidence
            self.metrics['confidence_scores'].append(final_confidence)
            
            # === LOG API USAGE STATISTICS ===
            from services.unified_ai_client import unified_client
            unified_client.log_api_stats()
            
            # Determine status based on confidence and PR metadata
            if pr_metadata.auto_merge_eligible:
                status = 'AUTO_MERGE_CANDIDATE'
            elif pr_metadata.is_draft:
                status = 'NEEDS_REVIEW'
            else:
                status = 'READY_FOR_REVIEW'
            
            # Generate explanation from PR body (first section)
            explanation = pr_metadata.body
            
            # IMPORTANT: Normalize and keep operations separate for different purposes:
            # 1. Normalize operations to consistent format (handle old and new formats)
            # 2. `operations` - Normalized operations for GitHub API (create/modify/delete files)
            # 3. `ui_operations` - Pretty diffs for PR description display
            raw_operations = proposed_fix.get('operations', [])
            
            # CRITICAL: Filter out hallucinated operations (files not in context)
            filtered_operations = self._filter_hallucinated_operations(raw_operations, relevant_files)
            
            # CRITICAL: Run final quality check on operations
            quality_issues = self._check_operation_quality(filtered_operations, relevant_files)
            if quality_issues:
                logger.warning(f"⚠️ Found {len(quality_issues)} quality issues in operations:")
                for issue in quality_issues[:5]:  # Log first 5
                    logger.warning(f"  - {issue}")
            
            normalized_operations = self._normalize_operations(filtered_operations)
            ui_operations = self._convert_operations_for_ui(normalized_operations)
            
            # Extract diff from proposed_fix
            diff_str = proposed_fix.get('diff', None)
            
            # Save to database with BOTH formats
            proposed_fix_for_db = {
                **proposed_fix,
                'operations': normalized_operations,  # Normalized operations for applying changes
                'ui_operations': ui_operations  # Separate field for display
            }
            
            # CRITICAL FIX: Save diff and proposed_fix FIRST in separate transaction
            # This prevents timing issues where test package is requested before diff is committed
            # Save EVERYTHING in a SINGLE atomic transaction to prevent race conditions
            logger.info(f"💾 Saving all data (status, diff, proposed_fix, confidence) in single transaction...")
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                status=status,  # Include status in the SAME transaction
                proposed_fix=proposed_fix_for_db,
                diff=diff_str,  # Save diff (PRIMARY format)
                explanation=explanation,
                confidence=final_confidence
            )
            logger.info(f"✅ Database update complete with confidence={final_confidence}")
            
            # Publish final Redis update with full result
            job_status_mapping = {
                'AUTO_MERGE_CANDIDATE': 'ready_for_review',
                'NEEDS_REVIEW': 'ready_for_review',
                'READY_FOR_REVIEW': 'ready_for_review',
                'COMPLETED': 'completed',
                'FAILED': 'failed'
            }
            
            await redis_client.update_task_status(
                task_id=self.task_id,
                status=job_status_mapping.get(status, 'ready_for_review'),
                result={
                    'operations': normalized_operations,
                    'explanation': explanation,
                    'confidence': final_confidence,
                    'status': status
                }
            )
            
            self.metrics['successful_fixes'] += 1
            
            total_time = time.time() - start_time
            logger.info(f"✅ Auto-fix completed in {total_time:.1f}s with {final_confidence:.1%} confidence")
            
            return FixResult(
                status='success',
                issue_fix_id=issue_fix_id,
                confidence=final_confidence,
                operations=normalized_operations,  # Return normalized operations
                explanation=explanation,
                metrics={
                    'total_time': total_time,
                    'phase_latencies': self.metrics['phase_latencies'],
                    'files_retrieved': len(relevant_files),
                    'complexity': understanding.complexity,
                    'refinement_iterations': len(refinement_result.iterations) if refinement_result else 0,
                    'validation_layers': validation_result.layer_scores
                },
                warnings=[issue.message for issue in validation_result.issues if issue.severity in ['high', 'critical']],
                clarifying_questions=[]
            )
            
        except asyncio.TimeoutError as e:
            # Log which phase timed out
            phase_info = "Unknown phase"
            for phase, latencies in self.metrics['phase_latencies'].items():
                if latencies:  # If this phase has recorded times
                    phase_info = f"Last completed: {phase}, may have timed out on next phase"
            
            logger.error(f"⏱️ Auto-fix timed out: {str(e)} | {phase_info}")
            await self._handle_timeout(issue_fix_id, f"{str(e)} | {phase_info}")
            raise
        except Exception as e:
            logger.error(f"❌ Auto-fix failed: {str(e)}", exc_info=True)
            await self._handle_error(issue_fix_id, str(e))
            raise
    
    async def _update_status(self, issue_fix_id: str, status: str):
        """Update issue fix status in database and publish to Redis."""
        try:
            await database_service.update_issue_fix(
                issue_fix_id=issue_fix_id,
                status=status
            )
            
            # Publish Redis job update for node-worker using the original task_id
            # Map status to job update format
            job_status_mapping = {
                'PENDING': 'pending',
                'ANALYZING': 'analyzing',
                'RETRIEVING_CODE': 'retrieving',
                'GENERATING_FIX': 'generating',
                'VALIDATING': 'validating',
                'READY_FOR_REVIEW': 'ready_for_review',
                'NEEDS_CLARIFICATION': 'needs_clarification',
                'CREATING_PR': 'creating_pr',
                'COMPLETED': 'completed',
                'FAILED': 'failed',
                'CANCELLED': 'cancelled'
            }
            
            job_status = job_status_mapping.get(status, status.lower())
            
            await redis_client.update_task_status(
                task_id=self.task_id,
                status=job_status,
                result=None
            )
            
            logger.info(f"Status updated: {status} (published to Redis as {job_status})")
        except Exception as e:
            logger.warning(f"Failed to update status: {str(e)}")
    
    def _record_phase_latency(self, phase: str, latency: float):
        """Record latency for a phase."""
        if phase not in self.metrics['phase_latencies']:
            self.metrics['phase_latencies'][phase] = []
        
        self.metrics['phase_latencies'][phase].append(latency)
        logger.debug(f"Phase {phase}: {latency:.2f}s")
    
    def _build_error_message(self, validation: Dict[str, Any]) -> str:
        """Build comprehensive error message from validation result."""
        error_parts = []
        
        if validation.get("completeness_score") is not None:
            error_parts.append(f"Completeness: {validation['completeness_score']:.1%}")
        
        if validation.get("issues"):
            critical = [i for i in validation["issues"] if "Critical" in i or "critical" in i]
            if critical:
                error_parts.append("Critical: " + "; ".join(critical[:2]))
            else:
                error_parts.append("Issues: " + "; ".join(validation["issues"][:3]))
        
        if validation.get("missing"):
            error_parts.append("Missing: " + "; ".join(validation["missing"][:3]))
        
        if validation.get("confidence", 0) > 0.5 and validation.get("recommendations"):
            error_parts.append("Needs: " + "; ".join(validation["recommendations"][:2]))
        
        return " | ".join(error_parts) if error_parts else "Validation failed"
    
    async def _handle_timeout(self, issue_fix_id: str, error: str):
        """Handle timeout error."""
        await database_service.update_issue_fix(
            issue_fix_id=issue_fix_id,
            status="FAILED",
            error_message=f"Timeout: {error}"
        )
        self.metrics['failed_fixes'] += 1
    
    async def _handle_error(self, issue_fix_id: str, error: str):
        """Handle general error."""
        await database_service.update_issue_fix(
            issue_fix_id=issue_fix_id,
            status="FAILED",
            error_message=str(error)
        )
        self.metrics['failed_fixes'] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get system metrics."""
        total_requests = self.metrics['total_requests']
        successful_fixes = self.metrics['successful_fixes']
        failed_fixes = self.metrics['failed_fixes']
        
        success_rate = successful_fixes / total_requests if total_requests > 0 else 0.0
        
        # Calculate average latencies
        avg_latencies = {}
        for phase, latencies in self.metrics['phase_latencies'].items():
            if latencies:
                avg_latencies[phase] = sum(latencies) / len(latencies)
        
        # Calculate average confidence
        avg_confidence = (
            sum(self.metrics['confidence_scores']) / len(self.metrics['confidence_scores'])
            if self.metrics['confidence_scores']
            else 0.0
        )
        
        return {
            'total_requests': total_requests,
            'successful_fixes': successful_fixes,
            'failed_fixes': failed_fixes,
            'success_rate': success_rate,
            'average_confidence': avg_confidence,
            'average_latencies': avg_latencies,
            'timestamp': time.time()
        }
    
    # Documentation files that should NEVER contain executable code modifications
    DOCUMENTATION_FILES = {
        'readme.md', 'readme', 'readme.txt', 'readme.rst',
        'contributing.md', 'changelog.md', 'history.md',
        'license', 'license.md', 'license.txt',
        'authors.md', 'code_of_conduct.md',
        'pull_request_template.md', 'issue_template.md'
    }
    
    def _is_documentation_file(self, path: str) -> bool:
        """Check if file is documentation that shouldn't contain code modifications."""
        basename = path.split('/')[-1].lower()
        # Check exact match with known doc files
        if basename in self.DOCUMENTATION_FILES:
            return True
        # Check if in docs directory
        path_lower = path.lower()
        if path_lower.startswith('docs/') or '/docs/' in path_lower:
            return True
        # Check .github templates
        if '.github/' in path_lower and path_lower.endswith('.md'):
            return True
        return False
    
    def _filter_hallucinated_operations(
        self, 
        operations: List[Dict[str, Any]], 
        relevant_files: List[Any]
    ) -> List[Dict[str, Any]]:
        """
        Filter out operations that reference files not in the provided context.
        This prevents hallucinations where LLM tries to edit files it never saw.
        
        Also filters out operations targeting documentation files (README, etc.)
        to prevent AI from incorrectly placing code in documentation.
        
        Args:
            operations: List of operations from LLM
            relevant_files: List of files that were provided to LLM
        
        Returns:
            Filtered list of operations (only valid ones)
        """
        # Build set of file paths that were actually provided to LLM
        provided_paths = {f.path for f in relevant_files}
        logger.info(f"🔍 Filtering operations: {len(provided_paths)} files were in context")
        
        filtered = []
        removed_count = 0
        
        for op in operations:
            op_type = op.get('type')
            op_path = op.get('path', '')
            
            # REMOVED: Documentation filtering (was causing inconsistency between UI and diff)
            # Previously filtered README.md from operations but not from diff
            # Now allowing AI to update documentation as part of comprehensive fixes
            
            # CREATE operations - check for duplicates
            if op_type == 'create':
                # Check if creating a file that already exists
                op_basename = op_path.split('/')[-1]
                
                is_duplicate = False
                for existing_path in provided_paths:
                    existing_basename = existing_path.split('/')[-1]
                    
                    # Exact match (case-insensitive)
                    if op_basename.lower() == existing_basename.lower():
                        is_duplicate = True
                        logger.warning(f"🚫 FILTERED DUPLICATE: Creating {op_path} but {existing_path} already exists!")
                        logger.warning(f"   → Should use type: 'edit' instead of 'create'")
                        removed_count += 1
                        break
                
                if not is_duplicate:
                    filtered.append(op)
                continue
            
            # DELETE operations - allow if file exists
            if op_type == 'delete':
                if op_path in provided_paths:
                    filtered.append(op)
                else:
                    logger.warning(f"🚫 FILTERED: Cannot delete {op_path} - not in context")
                    removed_count += 1
                continue
            
            # EDIT/MODIFY operations - MUST reference files in context
            if op_type in ['edit', 'modify']:
                if op_path in provided_paths:
                    # File is in context - check if edits have content
                    edits = op.get('edits', [])
                    has_empty = False
                    
                    for edit in edits:
                        old_code = edit.get('old_code', '').strip()
                        new_code = edit.get('new_code', '').strip()
                        start_line = edit.get('start_line', 0)
                        end_line = edit.get('end_line', 0)
                        
                        # new_code must ALWAYS have content
                        if not new_code:
                            has_empty = True
                            logger.warning(f"🚫 FILTERED: {op_path} has empty new_code field")
                            break
                        
                        # For inserts (adding new code), old_code CAN be empty
                        # Inserts typically have:
                        # - start_line == end_line (insertion point)
                        # - OR start_line == 0, end_line == 0 (insert at end)
                        # - OR old_code is empty string
                        is_insert = (start_line == end_line) or (start_line == 0 and end_line == 0)
                        
                        # For replace operations, old_code should exist
                        # BUT: Be lenient if it looks like an append to end of file
                        if not is_insert and not old_code:
                            # This looks like a replace but old_code is empty
                            # Only filter if we have explicit line numbers indicating a replace
                            if start_line > 0 and end_line > 0 and start_line != end_line:
                                has_empty = True
                                logger.warning(f"🚫 FILTERED: {op_path} has line numbers ({start_line}-{end_line}) but empty old_code")
                                break
                            else:
                                # No line numbers or same line - treat as append/insert
                                logger.info(f"✓ ALLOWING: {op_path} appears to be an append/insert operation")
                    
                    if not has_empty:
                        filtered.append(op)
                    else:
                        removed_count += 1
                else:
                    logger.warning(f"🚫 FILTERED HALLUCINATION: Cannot {op_type} {op_path} - not in context!")
                    logger.warning(f"   Available files: {', '.join(sorted(provided_paths)[:5])}...")
                    removed_count += 1
        
        if removed_count > 0:
            logger.warning(f"⚠️ Filtered out {removed_count} hallucinated/invalid operations")
            logger.info(f"✅ Kept {len(filtered)} valid operations")
        else:
            logger.info(f"✅ All {len(filtered)} operations are valid")
        
        return filtered
    
    def _check_operation_quality(
        self,
        operations: List[Dict[str, Any]],
        relevant_files: List[Any]
    ) -> List[str]:
        """
        Check operations for common quality issues that validators might miss.
        
        Returns list of quality issue descriptions (empty if no issues).
        """
        import ast
        import re
        
        issues = []
        
        # Build file content map for analysis
        file_content_map = {}
        for f in relevant_files:
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            content = f.content if hasattr(f, 'content') else f.page_content
            file_content_map[path] = content
        
        for op in operations:
            op_type = op.get('type')
            op_path = op.get('path', '')
            
            if op_type not in ['edit', 'modify', 'create']:
                continue
            
            # Get all code being added
            new_codes = []
            if op_type == 'create':
                new_codes.append(op.get('content', ''))
            else:
                for edit in op.get('edits', []):
                    new_code = edit.get('new_code', '')
                    if new_code:
                        new_codes.append(new_code)
            
            # Check each code block
            for new_code in new_codes:
                if not new_code.strip():
                    continue
                
                # Check 1: Duplicate imports
                if op_path in file_content_map:
                    existing_content = file_content_map[op_path]
                    existing_imports = re.findall(r'^(?:from\\s+\\S+\\s+)?import\\s+.+$', existing_content, re.MULTILINE)
                    new_imports = re.findall(r'^(?:from\\s+\\S+\\s+)?import\\s+.+$', new_code, re.MULTILINE)
                    
                    for new_imp in new_imports:
                        # Normalize whitespace
                        new_imp_normalized = ' '.join(new_imp.split())
                        for exist_imp in existing_imports:
                            exist_imp_normalized = ' '.join(exist_imp.split())
                            if new_imp_normalized == exist_imp_normalized:
                                issues.append(f"Duplicate import in {op_path}: '{new_imp}' already exists in file")
                                break
                
                # Check 2: Variable/function definition order (basic)
                try:
                    tree = ast.parse(new_code)
                    
                    # Track definitions and usages with approximate line numbers
                    definitions = {}
                    usages = []
                    
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Assign):
                            for target in node.targets:
                                if isinstance(target, ast.Name):
                                    if target.id not in definitions:
                                        definitions[target.id] = node.lineno
                        
                        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            if node.name not in definitions:
                                definitions[node.name] = node.lineno
                        
                        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                            usages.append((node.id, node.lineno))
                    
                    # Check for usage before definition
                    builtins = {'print', 'len', 'str', 'int', 'float', 'dict', 'list', 'True', 'False', 'None'}
                    for name, usage_line in usages:
                        if name in builtins:
                            continue
                        
                        if name in definitions:
                            def_line = definitions[name]
                            if usage_line < def_line:
                                issues.append(f"Variable '{name}' used at line {usage_line} before definition at line {def_line} in {op_path}")
                
                except SyntaxError:
                    pass  # Will be caught by AST validation layer
                except Exception:
                    pass  # Don't fail quality check if analysis fails
        
        return issues
    
    def _normalize_operations(self, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize operations to consistent format that frontend expects.
        
        Frontend expects:
        - type="create": New file with full content
        - type="modify": File modification with edits (search/replace) → Convert to "edit"
        - type="delete": File deletion
        
        This converts LLM output to what frontend's create-pr route expects.
        """
        normalized = []
        
        for op in operations:
            op_type = op.get('type', 'modify')
            
            # Pass through create and delete as-is
            if op_type in ['create', 'delete']:
                normalized.append(op)
                continue
            
            # Handle modify operations - convert to "edit" type for frontend
            if op_type == 'modify':
                # Check if already in new format (has 'edits')
                if 'edits' in op:
                    # Edits can be in two formats:
                    # 1. Line-based: {start_line, end_line, old_code, new_code}
                    # 2. Search/replace: {search, replace}
                    # Both are valid - pass through as "edit" type
                    normalized.append({
                        'type': 'edit',  # Frontend expects "edit" for edits
                        'path': op.get('path', ''),
                        'edits': op.get('edits', []),
                        'explanation': op.get('explanation', '')
                    })
                # Check if in old format (has 'changes')
                elif 'changes' in op:
                    # Convert old format to new "edit" format
                    edits = []
                    for change in op.get('changes', []):
                        # Old format can have:
                        # - Line-based: {line_start, line_end, old_code, new_code}
                        # - Search only: {old_code, new_code}
                        
                        if 'line_start' in change and 'line_end' in change:
                            # Line-based format
                            edits.append({
                                'start_line': change.get('line_start'),
                                'end_line': change.get('line_end'),
                                'old_code': change.get('old_code', ''),
                                'new_code': change.get('new_code', ''),
                                'explanation': change.get('explanation', '')
                            })
                        else:
                            # Search/replace format
                            old_code = change.get('old_code', '')
                            new_code = change.get('new_code', '')
                            
                            if old_code or new_code:  # Skip empty changes
                                edits.append({
                                    'search': old_code,
                                    'replace': new_code,
                                    'explanation': change.get('explanation', '')
                                })
                    
                    # Create normalized operation with "edit" type
                    normalized.append({
                        'type': 'edit',  # Frontend expects "edit"
                        'path': op.get('path', ''),
                        'edits': edits,
                        'explanation': op.get('explanation', '')
                    })
                # Check if it has full 'content' (legacy full file replacement)
                elif 'content' in op:
                    # Check if file exists - if so, make it "edit", otherwise "create"
                    # For now, treat as "modify" (legacy path)
                    normalized.append({
                        'type': 'modify',  # Legacy: full file replacement
                        'path': op.get('path', ''),
                        'content': op.get('content', ''),
                        'explanation': op.get('explanation', '')
                    })
                else:
                    # No changes, edits, or content - keep as-is (might fail validation)
                    normalized.append(op)
            else:
                # Unknown type - keep as-is
                normalized.append(op)
        
        return normalized
    
    def _convert_operations_for_ui(self, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert operations to UI-friendly format for PR DESCRIPTION DISPLAY ONLY.
        
        ⚠️ IMPORTANT: This creates pretty BEFORE/AFTER text diffs for humans to read.
        This should NOT be used for actually applying file changes!
        
        The raw operations (create/modify) should be used by GitHub API to apply changes.
        This UI version is just for showing diffs in the PR description.
        
        UI expects:
        - type="create": Show file.content in code block
        - type="modify": Show BEFORE/AFTER text diff for PR description
        """
        ui_operations = []
        
        for op in operations:
            op_type = op.get('type', 'modify')
            
            if op_type == 'create':
                # Create operations - ensure content is present
                content = op.get('content', '')
                if not content:
                    content = '# File will be created\n# Content generation in progress...'
                
                ui_operations.append({
                    'type': 'create',
                    'path': op.get('path', ''),
                    'content': content,  # Full file content
                    'explanation': op.get('explanation', ''),
                    'reason': op.get('explanation', '')  # UI shows this as description
                })
            
            elif op_type in ['edit', 'modify']:
                # Handle both edit (new unified format) and modify (legacy)
                # Both use the same display logic for edits/changes
                edits = op.get('edits', [])
                changes = op.get('changes', [])
                
                diff_parts = []
                
                # Process new format (edits with search/replace or line-based)
                if edits:
                    for edit_idx, edit in enumerate(edits, 1):
                        # Check if line-based format {start_line, end_line, old_code, new_code}
                        if 'start_line' in edit and 'end_line' in edit:
                            # Line-based format
                            start_line = edit.get('start_line', 0)
                            end_line = edit.get('end_line', start_line)
                            old_code = edit.get('old_code', '').strip()
                            new_code = edit.get('new_code', '').strip()
                            explanation = edit.get('explanation', '')
                            
                            # Skip if identical
                            if old_code == new_code:
                                continue
                            
                            # Add header with line numbers
                            if explanation:
                                if start_line == end_line:
                                    diff_parts.append(f"Line {start_line}: {explanation}")
                                else:
                                    diff_parts.append(f"Lines {start_line}-{end_line}: {explanation}")
                            else:
                                if start_line == end_line:
                                    diff_parts.append(f"Line {start_line}:")
                                else:
                                    diff_parts.append(f"Lines {start_line}-{end_line}:")
                            diff_parts.append("")
                            
                            # Add the diff
                            if old_code:
                                diff_parts.append("BEFORE:")
                                for line in old_code.split('\n'):
                                    diff_parts.append(f"  {line}")
                                diff_parts.append("")
                            
                            if new_code:
                                diff_parts.append("AFTER:")
                                for line in new_code.split('\n'):
                                    diff_parts.append(f"  {line}")
                            else:
                                diff_parts.append("DELETE THESE LINES")
                            
                            diff_parts.append("")
                            diff_parts.append("---")
                            diff_parts.append("")
                        else:
                            # Search/replace format (legacy)
                            search = edit.get('search', '').strip()
                            replace = edit.get('replace', '').strip()
                            explanation = edit.get('explanation', '')
                            
                            # Skip if identical
                            if search == replace:
                                continue
                            
                            # Add header
                            if explanation:
                                diff_parts.append(f"Edit {edit_idx}: {explanation}")
                            else:
                                diff_parts.append(f"Edit {edit_idx}:")
                            diff_parts.append("")
                            
                            # Add the diff
                            if search:
                                diff_parts.append("SEARCH FOR:")
                                for line in search.split('\n'):
                                    diff_parts.append(f"  {line}")
                                diff_parts.append("")
                            
                            if replace:
                                diff_parts.append("REPLACE WITH:")
                                for line in replace.split('\n'):
                                    diff_parts.append(f"  {line}")
                            else:
                                diff_parts.append("DELETE THIS CODE")
                            
                            diff_parts.append("")
                            diff_parts.append("---")
                            diff_parts.append("")
                
                # Process old format (changes with line numbers) - for backward compatibility
                elif changes:
                    for change in changes:
                        action = change.get('action', 'replace')
                        line_start = change.get('line_start', 0)
                        line_end = change.get('line_end', line_start)
                        old_code = change.get('old_code', '').strip()
                        new_code = change.get('new_code', '').strip()
                        explanation = change.get('explanation', '')
                        
                        # Only show this change if there's actual modification
                        if old_code == new_code:
                            # Skip if old and new are identical
                            continue
                        
                        # Add context header
                        if line_start == line_end:
                            diff_parts.append(f"Line {line_start}: {explanation}")
                        else:
                            diff_parts.append(f"Lines {line_start}-{line_end}: {explanation}")
                        diff_parts.append("")  # Empty line for readability
                        
                        # Add the diff
                        if action == 'replace':
                            if old_code:
                                diff_parts.append("BEFORE:")
                                for line in old_code.split('\n'):
                                    diff_parts.append(f"  {line}")
                                diff_parts.append("")
                            if new_code:
                                diff_parts.append("AFTER:")
                                for line in new_code.split('\n'):
                                    diff_parts.append(f"  {line}")
                        elif action == 'insert':
                            diff_parts.append("ADDED:")
                            if new_code:
                                for line in new_code.split('\n'):
                                    diff_parts.append(f"  {line}")
                        elif action == 'delete':
                            diff_parts.append("REMOVED:")
                            if old_code:
                                for line in old_code.split('\n'):
                                    diff_parts.append(f"  {line}")
                        
                        diff_parts.append("")  # Empty line between changes
                        diff_parts.append("---")  # Separator
                        diff_parts.append("")
                    
                    if not diff_parts:
                        # All changes were skipped (no actual modifications)
                        content = "# No actual changes detected\n# File may have been reformatted or had whitespace changes"
                    else:
                        content = '\n'.join(diff_parts)
                    
                    ui_operations.append({
                        'type': 'modify',
                        'path': op.get('path', ''),
                        'content': content,
                        'modified': content,  # Fallback field
                        'explanation': op.get('explanation', ''),
                        'reason': op.get('explanation', '')
                    })
                else:
                    # No changes available - show placeholder
                    ui_operations.append({
                        'type': 'modify',
                        'path': op.get('path', ''),
                        'content': '# File will be modified\n# Specific changes not available',
                        'modified': '# File will be modified\n# Specific changes not available',
                        'explanation': op.get('explanation', ''),
                        'reason': op.get('explanation', '')
                    })
            
            elif op_type == 'delete':
                # Delete operations
                ui_operations.append({
                    'type': 'delete',
                    'path': op.get('path', ''),
                    'explanation': op.get('explanation', ''),
                    'reason': op.get('explanation', '')
                })
            
            else:
                # Unknown type - pass through as-is
                ui_operations.append(op)
        
        return ui_operations
    
    async def _get_repository_context(self, repository_id: str) -> Optional[Dict[str, Any]]:
        """Get repository metadata from database for context injection."""
        try:
            repo = await database_service.get_repository_status(repository_id)
            if repo:
                return {
                    "owner": repo.get("owner"),
                    "name": repo.get("name"),
                    "full_name": f"{repo.get('owner')}/{repo.get('name')}"
                }
            return None
        except Exception as e:
            logger.warning(f"Failed to get repository context for {repository_id}: {e}")
            return None


# Global instance
meta_controller = MetaController()
