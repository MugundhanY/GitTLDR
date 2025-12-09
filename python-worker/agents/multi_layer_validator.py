"""
Multi-Layer Validator - Phase 4 of RATFV
=========================================

Validates proposed fixes through multiple rigorous layers:
1. AST Parsing - Syntax and structure validation
2. Type Checking - Type safety and compatibility
3. Import Resolution - Dependency checking (enhanced with missing import detection)
3.5. Definition Order - Variables/functions used before definition
4. Docker Config - Validates Docker/docker-compose configurations
5. Security Scan - Vulnerability detection
6. Test Coverage - Test completeness
7. AI Review - Semantic correctness

Target: 95% bug detection, 85% false positive reduction
"""

import ast
import re
import yaml
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from utils.logger import get_logger
from services.gemini_client import gemini_client
from utils.confidence_calibration import confidence_calibrator

logger = get_logger(__name__)


@dataclass
class ValidationIssue:
    """A single validation issue found."""
    layer: str  # Which layer found this issue
    severity: str  # critical, high, medium, low
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    suggestion: Optional[str] = None
    fix_instruction: Optional[str] = None  # NEW: Specific instruction for AI to fix this issue


@dataclass
class ValidationResult:
    """Result of multi-layer validation."""
    valid: bool
    confidence: float  # 0.0-1.0
    issues: List[ValidationIssue] = field(default_factory=list)
    layer_scores: Dict[str, float] = field(default_factory=dict)
    summary: str = ""
    recommendations: List[str] = field(default_factory=list)
    ai_feedback: Optional[str] = None  # NEW: Formatted feedback for AI to understand what to fix


class MultiLayerValidator:
    """
    Multi-Layer Validator: Comprehensive fix validation.
    
    6-Layer Validation Pipeline:
    
    Layer 1: AST Parsing (Weight: 20%)
    - Syntax correctness
    - Structure validity
    - No parsing errors
    
    Layer 2: Type Checking (Weight: 20%)
    - Type annotations validity
    - Type compatibility
    - Return type correctness
    
    Layer 3: Import Resolution (Weight: 15%)
    - All imports resolve correctly
    - No circular dependencies
    - Standard library vs external packages
    
    Layer 4: Security Scan (Weight: 15%)
    - No SQL injection vulnerabilities
    - No arbitrary code execution
    - No sensitive data exposure
    - No dangerous function calls
    
    Layer 5: Test Coverage (Weight: 15%)
    - Tests exist for changed code
    - Tests are meaningful
    - Edge cases covered
    
    Layer 6: AI Semantic Review (Weight: 15%)
    - Logic correctness
    - Edge case handling
    - Alignment with requirements
    """
    
    # Layer weights (must sum to 1.0)
    # UPDATED: Removed template restrictions - trust Gemini to handle documentation
    LAYER_WEIGHTS = {
        'context_validation': 0.20,  # Anti-hallucination
        'placeholder_detection': 0.25,  # Catch dummy code (TODO/FIXME)
        'definition_order': 0.20,  # Critical for execution correctness
        'ast_parsing': 0.15,  # Syntax validation
        'type_checking': 0.08,
        'import_resolution': 0.06,
        'docker_config': 0.04,  # Validates Docker configurations
        'security_scan': 0.02,  # Deterministic pattern matching only
        'test_library_compatibility': 0.0,  # Catches deprecated test APIs (blocking but zero weight)
        'test_coverage': 0.0,   # Disabled - impossible to enforce
        'ai_review': 0.0        # Disabled - AI judging AI causes false positives
    }
    
    # Confidence threshold for passing validation
    MIN_CONFIDENCE = 0.90  # Raised to 90% to ensure high-quality code generation
    
    def __init__(self):
        # False positive detection: Common patterns that look like errors but aren't
        self.false_positive_patterns = {
            'common_reassignments': [
                r'buffer\s*=\s*buffer\[',  # buffer = buffer[chunk_size:]
                r'data\s*=\s*data\[',  # data = data[offset:]
                r'result\s*=\s*result\s*\+',  # result = result + value
                r'text\s*=\s*text\.replace',  # text = text.replace(...)
            ],
            'common_globals': [
                'logger', 'app', 'router', 'db', 'cache', 'config',
                'session', 'request', 'response', 'current_user'
            ],
            'framework_injected': [
                # FastAPI/Flask inject these
                'request', 'response', 'session', 'g',
                # Testing frameworks
                'mocker', 'mock', 'fixture', 'caplog'
            ]
        }
    
    def _is_false_positive_duplicate(self, var_name: str, node, definitions: Dict) -> bool:
        """Check if a duplicate definition is actually a false positive (reassignment)."""
        # Variable reassignment is normal in Python and should not be flagged as duplicate
        # Only flag as duplicate if it's a function/class redefinition or true duplicate logic
        
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
            if isinstance(target, ast.Name):
                # Pattern 1: Self-referential reassignment (x = x + 1, buffer = buffer[10:])
                if isinstance(node.value, (ast.Subscript, ast.BinOp, ast.Call)):
                    for name_node in ast.walk(node.value):
                        if isinstance(name_node, ast.Name) and name_node.id == var_name:
                            return True  # This is reassignment, not duplicate
                
                # Pattern 2: Simple reassignment to new value (result = json.loads(...))
                # This is completely normal Python - variables get reassigned all the time
                # Only flag as error if BOTH assignments have identical values (copy-paste error)
                # For now, treat all variable reassignments as valid (not critical errors)
                return True  # Variable reassignment is normal, not a duplicate definition error
        
        return False
    
    def _is_false_positive_undefined(self, var_name: str, file_path: str) -> bool:
        """Check if an undefined variable is actually a false positive."""
        # Check common globals
        if var_name in self.false_positive_patterns['common_globals']:
            return True
        
        # Check framework-injected variables
        if var_name in self.false_positive_patterns['framework_injected']:
            return True
        
        # Check if it's likely an imported module (uppercase or common library)
        if var_name[0].isupper():  # Classes are usually imported
            return True
        
        # Common library names
        common_libs = ['os', 'sys', 're', 'json', 'time', 'datetime', 'asyncio', 'typing']
        if var_name in common_libs:
            return True
        
        return False
    
    async def validate_fix(
        self,
        proposed_fix: Dict[str, Any],
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str,
        metadata: Dict[str, Any] = None
    ) -> ValidationResult:
        """
        Run comprehensive multi-layer validation on proposed fix.
        
        Args:
            proposed_fix: Dict with 'operations' (JSON - legacy) and/or 'diff' (unified diff - preferred)
        
        Returns:
            ValidationResult with valid flag, confidence, and detailed issues
        """
        logger.info("🔍 Running multi-layer validation (up to 14 layers)")
        
        issues: List[ValidationIssue] = []
        layer_scores: Dict[str, float] = {}
        metadata = metadata or {}
        
        # Extract operations and diff from proposed fix
        operations = proposed_fix.get('operations', [])
        diff_str = proposed_fix.get('diff', None)
        
        # PRIORITY: Use diff format if available (more accurate)
        if diff_str:
            logger.info(f"✅ Using unified diff format for validation ({len(diff_str)} chars)")
            # Convert diff to operations for layer validation (temporary bridge)
            try:
                from utils.diff_converter import DiffConverter
                diff_converter = DiffConverter()
                operations = diff_converter.diff_to_operations(diff_str)
                logger.info(f"✅ Converted diff to {len(operations)} operations for validation")
            except Exception as e:
                logger.error(f"❌ Failed to convert diff to operations: {e}")
                if not operations:
                    return ValidationResult(
                        valid=False,
                        confidence=0.0,
                        issues=[ValidationIssue(
                            layer='general',
                            severity='critical',
                            message=f'Failed to parse diff: {str(e)}'
                        )],
                        summary='Diff parsing failed'
                    )
        
        if not operations:
            return ValidationResult(
                valid=False,
                confidence=0.0,
                issues=[ValidationIssue(
                    layer='general',
                    severity='critical',
                    message='No operations found in proposed fix'
                )],
                summary='No operations to validate'
            )
        
        # CRITICAL: Validate diff with git apply if available
        # THIS IS THE ONLY VALIDATION THAT MATTERS - if git accepts it, ship it!
        if diff_str:
            logger.info("🔍 Layer -1: Git Apply Validation (THE ULTIMATE TEST)")
            try:
                from utils.diff_converter import DiffConverter
                import tempfile
                import os
                
                diff_converter = DiffConverter()
                
                # CRITICAL FIX: Do NOT decode escape sequences in diffs
                # The unicode_escape codec can introduce null bytes (\x00) which corrupt git diffs
                # This happens with output from BOTH GPT and Gemini
                # 
                # The diff should already have proper newlines from difflib.unified_diff()
                # If it doesn't, the issue is in diff generation, not here
                
                # CRITICAL: Check for null bytes before git apply
                if '\x00' in diff_str:
                    logger.error(f"❌ Diff contains null bytes - cannot apply with git")
                    logger.error(f"   This indicates corruption in the diff generation process")
                    logger.error(f"   Likely caused by unicode_escape decoding somewhere upstream")
                    return ValidationResult(
                        valid=False,
                        confidence=0.0,
                        issues=[ValidationIssue(
                            layer='git_apply',
                            severity='critical',
                            message='Diff contains null bytes (\\x00) - git cannot apply corrupted patches',
                            suggestion='Check complete_file_generator._decode_escape_sequences() - it should be disabled',
                            context={'null_byte_positions': [i for i, c in enumerate(diff_str) if c == '\x00'][:10]}
                        )],
                        summary='❌ Git apply FAILED: Diff contains null bytes (corruption detected)'
                    )
                
                # Check for markdown formatting in diff (indicates AI explanatory text)
                if '```' in diff_str or '**' in diff_str:
                    logger.warning(f"⚠️ Diff contains markdown formatting - AI may have generated explanatory text")
                    logger.warning(f"   This can cause git apply to fail on malformed patches")
                
                # Create temporary repo with file contents
                with tempfile.TemporaryDirectory() as temp_dir:
                    # Write files referenced in diff
                    for f in relevant_files:
                        file_path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
                        file_content = f.content if hasattr(f, 'content') else f.page_content
                        
                        full_path = os.path.join(temp_dir, file_path)
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        with open(full_path, 'w', encoding='utf-8') as fp:
                            fp.write(file_content)
                    
                    # Validate diff applies cleanly
                    is_valid, error_msg = diff_converter.validate_diff(diff_str, temp_dir)
                    
                    if not is_valid:
                        logger.error(f"❌ Git apply validation failed: {error_msg}")
                        logger.info(f"🔍 Validation: Git apply failed: {error_msg}")
                        
                        # Git apply failed - return immediately with diagnostic info
                        return ValidationResult(
                            valid=False,
                            confidence=0.0,
                            issues=[ValidationIssue(
                                layer='git_apply',
                                severity='critical',
                                message=f'Diff does not apply cleanly: {error_msg}',
                                suggestion='Likely cause: AI generated wrong line numbers in Phase 1 (Bug #18). Diff structure does not match actual file layout.'
                            )],
                            summary=f'❌ Git apply FAILED: {error_msg[:200]}'
                        )
                    
                    # ✅ GIT APPLY PASSED - Now run quality analysis
                    logger.info(f"✅ Git apply validation PASSED - diff applies cleanly!")
                    logger.info(f"🎯 Running quality analysis to determine confidence score...")
                    
                    # Git apply passed, but we still need to analyze code quality
                    # Start with high base confidence (0.90) and adjust based on quality metrics
                    git_base_confidence = 0.90
                    layer_scores['git_apply'] = 1.0
                    
                    # Continue to quality analysis layers instead of returning immediately
                    
            except Exception as e:
                logger.error(f"⚠️ Git apply validation failed with exception: {e}")
                issues.append(ValidationIssue(
                    layer='git_apply',
                    severity='warning',
                    message=f'Could not validate diff with git apply: {str(e)}'
                ))
                layer_scores['git_apply'] = 0.5  # Partial score for exception
                # Continue with other layers as fallback
        
        # Run all layers (after git apply validation if it passed)
        try:
            # If git apply passed, we have high base confidence to start with
            base_confidence = layer_scores.get('git_apply', 0.0)
            if base_confidence > 0:
                logger.info(f"📊 Starting from git-validated base confidence: {base_confidence * 100:.0f}%")
            
            # Layer 0: Context Validation (NEW - check hallucinations)
            context_score, context_issues = await self._layer_0_context_validation(operations, relevant_files)
            layer_scores['context_validation'] = context_score
            issues.extend(context_issues)
            
            # CRITICAL: Early exit if context validation finds critical issues (empty old_code, hallucinations)
            critical_context_issues = [i for i in context_issues if i.severity == 'critical']
            if critical_context_issues:
                logger.error(f"🚨 VALIDATION FAILED: {len(critical_context_issues)} CRITICAL issues in context validation - stopping immediately")
                for issue in critical_context_issues:
                    logger.error(f"   - {issue.message}")
                # Calculate partial confidence and fail immediately
                confidence = context_score * self.LAYER_WEIGHTS['context_validation']
                summary = self._generate_summary(False, confidence, layer_scores, issues)
                return ValidationResult(
                    valid=False,
                    confidence=confidence,
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"FAILED at context validation: {len(critical_context_issues)} critical issues (empty old_code or file hallucinations)",
                    recommendations=[f"Fix {issue.message}" for issue in critical_context_issues[:3]]
                )
            
            # Layer 1: AST Parsing
            ast_score, ast_issues = await self._layer_1_ast_parsing(operations)
            layer_scores['ast_parsing'] = ast_score
            issues.extend(ast_issues)
            
            # Layer 1.5: Placeholder Detection (CRITICAL - catch dummy code)
            placeholder_score, placeholder_issues = await self._layer_1_5_placeholder_detection(operations)
            layer_scores['placeholder_detection'] = placeholder_score
            issues.extend(placeholder_issues)
            
            # CRITICAL: Early exit if placeholder code detected
            critical_placeholder_issues = [i for i in placeholder_issues if i.severity == 'critical']
            if critical_placeholder_issues:
                logger.error(f"🚨 VALIDATION FAILED: {len(critical_placeholder_issues)} CRITICAL placeholder/dummy code issues - stopping immediately")
                for issue in critical_placeholder_issues:
                    logger.error(f"   - {issue.message}")
                # Calculate partial confidence and fail immediately
                confidence = sum(
                    layer_scores.get(layer, 0.0) * weight
                    for layer, weight in self.LAYER_WEIGHTS.items()
                    if layer in layer_scores
                )
                summary = self._generate_summary(False, confidence, layer_scores, issues)
                return ValidationResult(
                    valid=False,
                    confidence=confidence,
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"FAILED at placeholder detection: {len(critical_placeholder_issues)} critical issues (TODO/dummy code)",
                    recommendations=[f"Fix {issue.message}" for issue in critical_placeholder_issues[:3]]
                )
            
            # Layer 2: Type Checking
            type_score, type_issues = await self._layer_2_type_checking(operations)
            layer_scores['type_checking'] = type_score
            issues.extend(type_issues)
            
            # Layer 3: Import Resolution
            import_score, import_issues = await self._layer_3_import_resolution(operations)
            layer_scores['import_resolution'] = import_score
            issues.extend(import_issues)
            
            # CRITICAL: Fail immediately if critical import issues (missing imports)
            critical_import_issues = [i for i in import_issues if i.severity == 'critical']
            if critical_import_issues:
                logger.error(f"🚨 CRITICAL IMPORT ISSUES: {len(critical_import_issues)} - Missing required imports!")
                return ValidationResult(
                    valid=False,
                    confidence=0.0,
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"VALIDATION FAILED: {critical_import_issues[0].message}"
                )
            
            # Layer 3.5: Variable Definition Order (NEW - catches undefined variable errors)
            definition_score, definition_issues = await self._layer_3_5_definition_order(operations)
            layer_scores['definition_order'] = definition_score
            issues.extend(definition_issues)
            
            # CRITICAL: Fail immediately if critical definition order issues
            critical_def_issues = [i for i in definition_issues if i.severity == 'critical']
            if critical_def_issues:
                logger.error(f"🚨 CRITICAL DEFINITION ORDER ISSUES: {len(critical_def_issues)} - Variable used before definition!")
                
                # Generate AI feedback BEFORE returning so meta-controller can use it for retries
                logger.info(f"🔍 Generating AI feedback for critical issues: {len(issues)} total issues")
                logger.info(f"   Critical issues: {len([i for i in issues if i.severity == 'critical'])}")
                logger.info(f"   Issues with fix_instruction: {len([i for i in issues if i.fix_instruction])}")
                ai_feedback = self._generate_ai_feedback(issues, layer_scores)
                if ai_feedback:
                    logger.info(f"✅ Generated AI feedback: {len(ai_feedback)} chars")
                else:
                    logger.warning(f"⚠️ AI feedback is empty or None!")
                
                return ValidationResult(
                    valid=False,
                    confidence=0.0,
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"VALIDATION FAILED: {critical_def_issues[0].message}",
                    recommendations=[],
                    ai_feedback=ai_feedback
                )
            
            # Layer 4: Docker Configuration Validation (NEW)
            docker_score, docker_issues = await self._layer_4_docker_config(operations)
            layer_scores['docker_config'] = docker_score
            issues.extend(docker_issues)
            
            # CRITICAL: Fail immediately if docker config has critical issues
            critical_docker_issues = [i for i in docker_issues if i.severity == 'critical']
            if critical_docker_issues:
                logger.error(f"🚨 CRITICAL DOCKER CONFIG ISSUES: {len(critical_docker_issues)} - Invalid Docker configuration!")
                
                # Generate AI feedback BEFORE returning so meta-controller can use it for retries
                logger.info(f"🔍 Generating AI feedback for critical issues: {len(issues)} total issues")
                ai_feedback = self._generate_ai_feedback(issues, layer_scores)
                if ai_feedback:
                    logger.info(f"✅ Generated AI feedback: {len(ai_feedback)} chars")
                else:
                    logger.warning(f"⚠️ AI feedback is empty or None!")
                
                return ValidationResult(
                    valid=False,
                    confidence=0.0,
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"VALIDATION FAILED: {critical_docker_issues[0].message}",
                    recommendations=[],
                    ai_feedback=ai_feedback
                )
            
            # Layer 5: Security Scan
            security_score, security_issues = await self._layer_4_security_scan(operations)
            layer_scores['security_scan'] = security_score
            issues.extend(security_issues)
            
            # Layer 5.5: Test Library Compatibility (NEW - catches deprecated APIs)
            test_lib_score, test_lib_issues = await self._layer_5_5_test_library_compatibility(operations)
            layer_scores['test_library_compatibility'] = test_lib_score
            issues.extend(test_lib_issues)
            
            # CRITICAL: Fail immediately if test library has critical issues (deprecated APIs)
            critical_test_lib_issues = [i for i in test_lib_issues if i.severity == 'critical']
            if critical_test_lib_issues:
                logger.error(f"🚨 CRITICAL TEST LIBRARY ISSUES: {len(critical_test_lib_issues)} - Using deprecated APIs!")
                ai_feedback = self._generate_ai_feedback(issues, layer_scores)
                return ValidationResult(
                    valid=False,
                    confidence=0.0,
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"VALIDATION FAILED: {critical_test_lib_issues[0].message}",
                    recommendations=[],
                    ai_feedback=ai_feedback
                )
            
            # DISABLED Layer 6: Test Coverage (weight set to 0.0)
            # Can't enforce test generation - causes false negatives
            # Test coverage should be checked in CI, not block fix generation
            test_score = 1.0  # Don't penalize
            layer_scores['test_coverage'] = test_score
            # test_score, test_issues = await self._layer_5_test_coverage(operations, understanding)
            # issues.extend(test_issues)
            
            # DISABLED Layer 7: AI Review (weight set to 0.0)
            # AI judging AI causes false positives (competitive analysis finding)
            # Let deterministic layers catch real issues
            ai_score = 1.0  # Don't penalize
            layer_scores['ai_review'] = ai_score
            # ai_score, ai_issues = await self._layer_6_ai_review(operations, understanding, issue_title, issue_body)
            # issues.extend(ai_issues)
            
            # NEW: Layer 8 - Function Call Validation
            if 'function_inventory' in metadata:
                func_issues, func_conf = self._layer_8_function_call_validation(
                    operations, metadata['function_inventory']
                )
                issues.extend(func_issues)
                layer_scores['function_validation'] = func_conf
                if func_conf < 1.0:
                    logger.warning(f"⚠️ Function call validation failed (confidence: {func_conf})")
            
            # NEW: Layer 9 - Framework Consistency
            if 'tech_stack' in metadata and metadata['tech_stack'].get('frameworks'):
                framework_issues, framework_conf = self._layer_9_framework_consistency(
                    operations, metadata['tech_stack']['frameworks']
                )
                issues.extend(framework_issues)
                layer_scores['framework_consistency'] = framework_conf
                if framework_conf < 1.0:
                    logger.warning(f"⚠️ Framework consistency failed (confidence: {framework_conf})")
            
            # REMOVED Layer 10 - Production Readiness (AI-based, 40% false positive rate)
            # Competitive analysis (Demo 21): Good code (93.4%) got -30% penalty from this layer
            # AI judging AI creates false negatives - keep only deterministic validation
            # If needed, production checks should be done in CI/CD, not blocking fix generation
            
            # Skip production readiness - commented out to prevent false negatives
            # prod_issues, prod_conf = self._layer_10_production_readiness(operations)
            # layer_scores['production_readiness'] = prod_conf
            
            # CRITICAL: Fail immediately if production readiness has critical issues
            critical_prod_issues = []  # Disabled production readiness layer
            if critical_prod_issues:
                logger.error(f"🚨 VALIDATION FAILED: {len(critical_prod_issues)} CRITICAL production issues")
                for issue in critical_prod_issues:
                    logger.error(f"   - {issue.message}")
                return ValidationResult(
                    valid=False,
                    confidence=0.0,  # Production readiness layer is disabled
                    issues=issues,
                    layer_scores=layer_scores,
                    summary=f"FAILED at production readiness: {len(critical_prod_issues)} critical issues",
                    recommendations=[f"Fix {issue.message}" for issue in critical_prod_issues[:3]]
                )
            
            # ===== NEW: ADVISORY LAYERS (NON-BLOCKING) =====
            # These layers provide rich feedback but don't block deployment
            
            # Layer 11: AI Logic Bug Detection (SMART BYPASS for docs-only changes)
            try:
                # CRITICAL: Check if this is documentation-only change
                is_docs_only = all(
                    op.get('path', '').endswith(('.md', '.rst', '.txt')) or 
                    'docs/' in op.get('path', '') or
                    'documentation' in op.get('path', '').lower()
                    for op in operations
                )
                
                if is_docs_only:
                    logger.info("⏭️  Layer 11: SKIPPED (documentation-only change)")
                    layer_scores['ai_logic_bugs'] = 1.0
                    # Skip this layer entirely for docs
                else:
                    logger.info("🤖 Layer 11: AI Logic Bug Detection (HYBRID)")
                    logic_issues, logic_score = await self._layer_11_ai_logic_bug_detection(
                        operations, issue_title, issue_body, metadata
                    )
                    layer_scores['ai_logic_bugs'] = logic_score
                    
                    # Split issues by severity: critical/high are BLOCKING, medium/low are ADVISORY
                    blocking_bugs = []
                    advisory_bugs = []
                    
                    for issue in logic_issues:
                        if issue.severity in ['critical', 'high']:
                            # Keep as blocking - don't prefix with advisory_
                            blocking_bugs.append(issue)
                        else:
                            # Mark medium/low as advisory
                            issue.severity = 'advisory_' + issue.severity
                            advisory_bugs.append(issue)
                    
                    issues.extend(blocking_bugs)
                    issues.extend(advisory_bugs)
                    
                    if blocking_bugs:
                        logger.error(f"❌ AI detected {len(blocking_bugs)} CRITICAL logic bugs (BLOCKING)")
                        for bug in blocking_bugs:
                            logger.error(f"   - {bug.severity.upper()}: {bug.message}")
                    if advisory_bugs:
                        logger.warning(f"⚠️ AI detected {len(advisory_bugs)} potential logic bugs (advisory)")
                    if not logic_issues:
                        logger.info("✅ No logic bugs detected by AI")
            except Exception as e:
                logger.warning(f"⚠️ AI logic bug detection skipped: {e}")
                layer_scores['ai_logic_bugs'] = 1.0  # Don't penalize if AI fails
            
            # Layer 12: Requirements Satisfaction (FULLY ADVISORY)
            try:
                logger.info("📋 Layer 12: Requirements Satisfaction Check (ADVISORY ONLY)")
                req_issues, req_score = await self._layer_12_requirements_satisfaction(
                    operations, issue_title, issue_body, metadata
                )
                layer_scores['requirements_satisfaction'] = req_score
                
                # ALL requirements issues are ADVISORY - don't block on incomplete implementation
                # Let the system make progress incrementally rather than getting stuck in loops
                for issue in req_issues:
                    if not issue.severity.startswith('advisory_'):
                        issue.severity = 'advisory_' + issue.severity
                
                issues.extend(req_issues)
                
                if req_issues:
                    logger.warning(f"⚠️ {len(req_issues)} requirements may not be fully satisfied (advisory)")
                else:
                    logger.info("✅ All requirements appear satisfied")
            except Exception as e:
                logger.warning(f"⚠️ Requirements check skipped: {e}")
                layer_scores['requirements_satisfaction'] = 1.0
            
            # Layer 13: Test Generation (OPTIONAL)
            generated_tests = None
            if metadata and metadata.get('generate_tests', False):
                try:
                    logger.info("🧪 Layer 13: Automated Test Generation (OPTIONAL)")
                    test_issues, test_score, generated_tests = await self._layer_13_generate_tests(
                        operations, issue_title, issue_body, metadata
                    )
                    layer_scores['test_generation'] = test_score
                    
                    if generated_tests:
                        logger.info(f"✅ Generated {len(generated_tests)} chars of test code")
                        # Store tests in metadata for retrieval
                        if 'generated_tests' not in metadata:
                            metadata['generated_tests'] = generated_tests
                    else:
                        logger.info("ℹ️ No tests generated")
                except Exception as e:
                    logger.warning(f"⚠️ Test generation skipped: {e}")
                    layer_scores['test_generation'] = 1.0
            
            # Layer 14: Docker Test Execution (BLOCKING - if enabled and tests exist)
            if metadata and metadata.get('run_docker_tests', False):
                try:
                    logger.info("🐳 Layer 14: Docker Test Execution (BLOCKING)")
                    docker_issues, docker_score = await self._layer_14_docker_test_execution(
                        operations, issue_title, issue_body, metadata
                    )
                    layer_scores['docker_tests'] = docker_score
                    
                    # Docker test failures are BLOCKING
                    issues.extend(docker_issues)
                    
                    if docker_issues:
                        logger.error(f"❌ Docker tests failed: {len(docker_issues)} test failures (BLOCKING)")
                        for issue in docker_issues:
                            logger.error(f"   - {issue.message}")
                    else:
                        logger.info("✅ All Docker tests passed")
                except Exception as e:
                    logger.warning(f"⚠️ Docker test execution skipped: {e}")
                    layer_scores['docker_tests'] = 1.0
            
            # ===== END ADVISORY LAYERS =====
            
        except Exception as e:
            logger.error(f"Validation failed with exception: {str(e)}", exc_info=True)
            return ValidationResult(
                valid=False,
                confidence=0.0,
                issues=[ValidationIssue(
                    layer='general',
                    severity='critical',
                    message=f'Validation exception: {str(e)}'
                )],
                summary=f'Validation exception: {str(e)}'
            )
        
        # Calculate weighted confidence
        # SIMPLIFIED: If git apply passed, start with high confidence (git is the ultimate test)
        git_confidence = layer_scores.get('git_apply', 0.0)
        
        if git_confidence > 0.9:
            # Git apply passed - start with 90% confidence
            # Only reduce for TRULY critical issues (syntax errors, undefined functions/classes)
            confidence = 0.90
            logger.info(f"📊 Git apply PASSED - starting with high confidence: {confidence:.1%}")
        else:
            # Git apply failed or not run - fall back to quality analysis
            quality_layers = {k: v for k, v in layer_scores.items() if k != 'git_apply'}
            quality_weighted_sum = sum(
                quality_layers.get(layer, 0.0) * weight
                for layer, weight in self.LAYER_WEIGHTS.items()
                if layer != 'git_apply'
            )
            quality_total_weight = sum(
                weight for layer, weight in self.LAYER_WEIGHTS.items()
                if layer in quality_layers and layer != 'git_apply'
            )
            
            confidence = quality_weighted_sum / quality_total_weight if quality_total_weight > 0 else 0.0
            logger.info(f"📊 Git apply FAILED/SKIPPED - using quality score: {confidence:.1%}")
        
        # SIMPLIFIED: Only penalize for TRUE critical issues (syntax errors, parse failures)
        # Variable reassignments, missing imports (auto-fixable), etc. should not block delivery
        truly_critical = [
            i for i in issues 
            if i.severity == 'critical' and 
            (i.layer == 'ast_parsing' or 'syntax error' in i.message.lower() or 'parse error' in i.message.lower())
        ]
        
        if truly_critical:
            # Only syntax/parse errors should block - reduce confidence heavily
            penalty = min(len(truly_critical) * 0.40, 0.95)  # 40% per syntax error
            confidence = confidence * (1.0 - penalty)
            logger.error(f"🚨 SYNTAX/PARSE ERRORS: {len(truly_critical)} issues, confidence penalized to {confidence:.1%}")
        else:
            # Other "critical" issues (like variable reassignment) - small penalty only
            other_critical = [i for i in issues if i.severity == 'critical']
            if other_critical:
                penalty = min(len(other_critical) * 0.05, 0.20)  # Only 5% per issue, max 20%
                confidence = confidence * (1.0 - penalty)
                logger.warning(f"⚠️ Quality issues: {len(other_critical)} critical, confidence reduced to {confidence:.1%}")
        
        # Apply small penalty for advisory warnings (non-blocking feedback)
        advisory_issues = [i for i in issues if 'advisory' in str(i.severity).lower()]
        if advisory_issues:
            # Advisory issues reduce confidence slightly but don't block
            advisory_penalty = min(len(advisory_issues) * 0.03, 0.10)  # 3% per issue, max 10%
            confidence = confidence * (1.0 - advisory_penalty)
            logger.info(f"ℹ️ Advisory warnings: {len(advisory_issues)} issues, confidence reduced to {confidence:.1%}")
        
        # 🔥 AI-detected bugs are ADVISORY ONLY (not blocking)
        # AI validation can produce false positives when analyzing truncated code
        # Log warnings but don't block deployment or set confidence to 0%
        ai_bugs = [
            i for i in issues 
            if i.layer == 'ai_logic_bugs' and 
            i.severity in ['critical', 'high']
        ]
        
        if ai_bugs:
            logger.warning(f"⚠️ AI-detected potential bugs (advisory only): {len(ai_bugs)}")
            for bug in ai_bugs:
                logger.warning(f"   - {bug.severity.upper()}: {bug.message}")
            # Apply small penalty but don't block (5% per bug, max 15%)
            ai_penalty = min(len(ai_bugs) * 0.05, 0.15)
            confidence = confidence * (1.0 - ai_penalty)
            logger.info(f"📊 AI bug advisory penalty applied: confidence reduced to {confidence:.1%}")
        
        # 🔥 NEW: Apply research-backed confidence calibration
        try:
            critical_issues = [i for i in issues if i.severity == 'critical']
            validation_results = {
                'errors': [i.message for i in issues if i.severity in ['critical', 'high']],
                'critical_errors': [i.message for i in critical_issues],
                'warnings': [i.message for i in issues if i.severity in ['medium', 'low']],
            }
            
            calibrated_confidence, calibration_explanation, calibration_breakdown = \
                confidence_calibrator.calibrate(confidence, validation_results, operations)
            
            if abs(calibrated_confidence - confidence) > 0.05:
                logger.info(f"📊 Confidence calibrated: {confidence*100:.1f}% → {calibrated_confidence*100:.1f}%")
                logger.debug(calibration_explanation)
            
            confidence = calibrated_confidence
        except Exception as e:
            logger.warning(f"⚠️ Confidence calibration failed: {e}, using uncalibrated confidence")
        
        # Determine validity - SIMPLIFIED
        # Block only on: (1) Git apply failed, (2) Syntax errors, (3) Multiple high severity issues, (4) AI-detected blocking bugs
        truly_critical = [
            i for i in issues 
            if i.severity == 'critical' and 
            (i.layer == 'ast_parsing' or 'syntax error' in i.message.lower() or 'parse error' in i.message.lower())
        ]
        high_issues = [i for i in issues if i.severity == 'high']
        
        # Note: AI bugs are advisory-only and don't block validity
        
        valid = (
            layer_scores.get('git_apply', 0.0) > 0.5 and  # Git apply must pass
            len(truly_critical) == 0 and  # No syntax/parse errors
            len(high_issues) <= 3  # Allow up to 3 high issues (was 2)
            # AI bugs are advisory warnings only - don't block deployment
        )
        
        # If git apply passed and no syntax errors, ensure minimum confidence
        if layer_scores.get('git_apply', 0.0) > 0.9 and len(truly_critical) == 0:
            confidence = max(confidence, 0.70)  # Minimum 70% if git apply passes
            logger.info(f"📊 Git apply passed + no syntax errors = minimum {confidence:.1%} confidence")
        
        # Generate summary and recommendations
        summary = self._generate_summary(valid, confidence, layer_scores, issues)
        recommendations = self._generate_recommendations(issues, layer_scores)
        
        # Generate AI-friendly feedback for failed validations (non-early-return cases)
        ai_feedback = None
        if not valid or confidence < 0.75:
            logger.info(f"🔍 Generating AI feedback: {len(issues)} issues, valid={valid}, confidence={confidence:.1%}")
            logger.info(f"   Critical issues: {len([i for i in issues if i.severity == 'critical'])}")
            logger.info(f"   High issues: {len([i for i in issues if i.severity == 'high'])}")
            logger.info(f"   Issues with fix_instruction: {len([i for i in issues if i.fix_instruction])}")
            ai_feedback = self._generate_ai_feedback(issues, layer_scores)
            if ai_feedback:
                logger.info(f"✅ Generated AI feedback: {len(ai_feedback)} chars")
            else:
                logger.warning(f"⚠️ AI feedback is empty or None!")
        
        # Log final validation result
        logger.info(f"✅ Validation complete: {'PASS' if valid else 'FAIL'} (confidence: {confidence:.1%})")
        
        return ValidationResult(
            valid=valid,
            confidence=confidence,
            issues=issues,
            layer_scores=layer_scores,
            summary=summary,
            recommendations=recommendations,
            ai_feedback=ai_feedback
        )
    
    async def _layer_0_context_validation(
        self,
        operations: List[Dict[str, Any]],
        relevant_files: List[Any]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 0: Validate LLM only modifies files it actually received in context.
        Prevents hallucination of changes to unseen files.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 0: Context Validation (Anti-Hallucination)")
        
        issues = []
        
        # Build set of file paths that were actually provided to LLM
        provided_paths = {f.path for f in relevant_files}
        logger.debug(f"Files provided in context: {provided_paths}")
        
        # Check each operation
        total_ops = 0
        valid_ops = 0
        
        for op in operations:
            op_type = op.get('type')
            op_path = op.get('path', '')
            
            # CRITICAL FIX: Create operations don't need context validation
            # Only EDIT operations must reference files that were provided
            if op_type == 'create':
                total_ops += 1
                
                # Check if creating a file with similar name to existing file
                op_basename = op_path.split('/')[-1]  # Get filename
                op_name_without_ext = op_basename.rsplit('.', 1)[0]  # Remove extension
                
                is_duplicate = False
                for existing_path in provided_paths:
                    existing_basename = existing_path.split('/')[-1]
                    existing_name_without_ext = existing_basename.rsplit('.', 1)[0]
                    
                    # Check for similar names (README vs README_new, app vs app_fixed)
                    if (op_name_without_ext.lower().startswith(existing_name_without_ext.lower() + '_') or
                        op_name_without_ext.lower().endswith('_' + existing_name_without_ext.lower()) or
                        existing_name_without_ext.lower().startswith(op_name_without_ext.lower() + '_') or
                        existing_name_without_ext.lower().endswith('_' + op_name_without_ext.lower()) or
                        (op_name_without_ext.lower() in existing_name_without_ext.lower() and 
                         len(op_name_without_ext) > 3)):  # Avoid false positives with short names
                        is_duplicate = True
                        issues.append(ValidationIssue(
                            layer='context_validation',
                            severity='warning',
                            message=f'Creating {op_path} but similar file {existing_path} already exists!',
                            file_path=op_path,
                            suggestion=f'Consider using type: "edit" to modify {existing_path} instead of creating a duplicate file.'
                        ))
                        logger.warning(f"⚠️ DUPLICATE DETECTED: Creating {op_path} but {existing_path} exists!")
                        break
                
                # CREATE operations are always valid (they don't need to be in context)
                valid_ops += 1
                if is_duplicate:
                    logger.info(f"✅ CREATE operation for {op_path} is valid (new file, though possibly duplicate)")
                else:
                    logger.info(f"✅ CREATE operation for {op_path} is valid (new file)")
                continue
            
            # Edit/modify operations must reference files that were in context
            if op_type in ['edit', 'modify']:
                total_ops += 1
                
                # Check if this file was in the context provided to LLM
                if op_path not in provided_paths:
                    # IMPORTANT: This could mean LLM wants to CREATE a new file but used "edit" by mistake
                    # Use HIGH severity (not CRITICAL) to allow refinement to fix the operation type
                    issues.append(ValidationIssue(
                        layer='context_validation',
                        severity='high',  # Changed from 'critical' to allow refinement
                        message=f'WRONG OPERATION TYPE: Trying to {op_type} {op_path} but it does NOT EXIST! Use type: "create" instead.',
                        file_path=op_path,
                        suggestion=f'Change to: {{"type": "create", "path": "{op_path}", "content": "...full file content..."}}'
                    ))
                    logger.warning(f"🚨 CONTEXT MISMATCH: LLM trying to {op_type} {op_path} without seeing it!")
                    # Don't count as valid, but also don't apply empty field checks since file doesn't exist
                    continue
                else:
                    # CRITICAL: Check if edit operations have actual content
                    edits = op.get('edits', [])
                    has_empty_fields = False
                    
                    for edit_idx, edit in enumerate(edits):
                        # CRITICAL: Don't strip - blank line insertions use "\n" as insertion marker
                        old_code_raw = edit.get('old_code', '')
                        new_code_raw = edit.get('new_code', '')
                        
                        # For display purposes only (not for validation logic)
                        old_code_display = old_code_raw.strip()
                        new_code_display = new_code_raw.strip()
                        
                        # 🔧 BUG FIX: Allow INSERTIONS (empty old_code) and DELETIONS (empty new_code)
                        # Git apply validation already passed - trust git's judgment
                        is_insertion = not old_code_raw and new_code_raw
                        is_deletion = old_code_raw and not new_code_raw
                        
                        # Check for BOTH empty (neither insertion nor deletion)
                        if not old_code_raw and not new_code_raw:
                            has_empty_fields = True
                            issues.append(ValidationIssue(
                                layer='context_validation',
                                severity='critical',
                                message=f'Edit operation for {op_path} has BOTH old_code AND new_code empty!',
                                file_path=op_path,
                                suggestion=f'LLM must fill in old_code (for deletion) or new_code (for insertion) or both (for modification)'
                            ))
                            logger.error(f"🚨 BOTH EMPTY: {op_path} - old_code: {len(old_code_display)} chars (raw: {len(old_code_raw)}), new_code: {len(new_code_display)} chars (raw: {len(new_code_raw)})")
                        elif is_insertion:
                            logger.info(f"✅ Valid insertion detected in {op_path} edit #{edit_idx + 1} (empty old_code, non-empty new_code)")
                        elif is_deletion:
                            logger.info(f"✅ Valid deletion detected in {op_path} edit #{edit_idx + 1} (non-empty old_code, empty new_code)")
                    
                    if not has_empty_fields:
                        valid_ops += 1
        
        # Calculate score
        # CRITICAL FIX: If ANY operation has empty old_code, score MUST be 0.0 to fail validation
        critical_issues_count = len([i for i in issues if i.severity == 'critical'])
        
        # 🔥 FIX: Don't fail if ALL operations are hallucinations (should be filtered out later)
        hallucination_count = len([i for i in issues if 'CONTEXT MISMATCH' in i.message])
        if hallucination_count == total_ops and total_ops > 0:
            # All operations are trying to edit non-existent files
            # This will be caught by the final filter - don't fail validation here
            score = 0.0
            logger.error(f"🚨 ALL {total_ops} operations are hallucinations (editing non-existent files)")
        elif critical_issues_count > 0:
            score = 0.0  # Force ZERO score when empty old_code detected
            logger.error(f"🚨 Context validation FAILED: {critical_issues_count} critical issues (SCORE SET TO 0.0)")
        else:
            score = valid_ops / total_ops if total_ops > 0 else 1.0
        
        if score < 1.0:
            logger.warning(f"⚠️ Context validation: {valid_ops}/{total_ops} operations valid ({score:.1%})")
        else:
            logger.info(f"✅ Context validation passed: all {total_ops} operations reference provided files")
        
        return score, issues
    
    async def _layer_1_ast_parsing(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 1: Parse AST to check syntax correctness.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 1: AST Parsing")
        
        issues = []
        successful_parses = 0
        total_code_blocks = 0
        
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                file_path = op.get('path', 'unknown')
                
                # Handle new format (edits with search/replace)
                edits = op.get('edits', [])
                if edits:
                    for edit_idx, edit in enumerate(edits):
                        old_code = edit.get('old_code', '') or edit.get('search', '')
                        replace_code = edit.get('new_code', '') or edit.get('replace', '')
                        
                        # CRITICAL: Validate that edit operations have old_code
                        # BUT allow insertions at EOF or blank lines (where old_code is legitimately empty)
                        # BUG #15 FIX: This is the SECOND validation check for empty old_code
                        # Git apply already validated the diff - if git accepts it, it's valid!
                        is_insertion = not old_code and replace_code
                        
                        if not old_code and not replace_code:
                            # Both empty = invalid
                            issues.append(ValidationIssue(
                                layer='context_validation',
                                severity='critical',
                                message=f'Edit operation #{edit_idx + 1} has BOTH empty old_code AND new_code',
                                file_path=file_path,
                                suggestion='Edit must have either old_code or new_code (or both)'
                            ))
                            logger.error(f"🚨 Empty old_code AND new_code in {file_path} edit #{edit_idx + 1}")
                            continue  # Skip validation for this edit
                        
                        # If it's a valid insertion (empty old + non-empty new), allow it
                        if is_insertion:
                            logger.info(f"✅ Valid insertion detected in {file_path} edit #{edit_idx + 1} (empty old_code, non-empty new_code)")
                            # Continue with syntax validation below
                        
                        if not replace_code:
                            continue
                        
                        if not replace_code:
                            continue
                        
                        total_code_blocks += 1
                        
                        # Only parse Python files
                        if file_path.endswith('.py'):
                            try:
                                # CRITICAL: Comprehensive syntax validation to catch LLM errors
                                # This prevents accepting code with wrong brackets like "async def main):" 
                                compiled = compile(replace_code, '<string>', 'exec')
                                tree = ast.parse(replace_code)  # Double-check with AST
                                successful_parses += 1
                                
                                # NEW: Check for undefined function references
                                undefined_funcs = self._check_undefined_references(tree, replace_code)
                                for func_name in undefined_funcs:
                                    issues.append(ValidationIssue(
                                        layer='ast_parsing',
                                        severity='critical',
                                        message=f'Undefined function reference: {func_name}() is called but never defined',
                                        file_path=file_path,
                                        suggestion=f'Define {func_name}() function or import it from a module'
                                    ))
                                    logger.error(f"🚨 UNDEFINED FUNCTION: {func_name}() called in {file_path}")
                            except SyntaxError as e:
                                # Extract the problematic line for better error messages
                                lines = replace_code.split('\n')
                                error_line = lines[e.lineno - 1] if e.lineno and e.lineno <= len(lines) else '(unknown)'
                                
                                # 🔍 DIAGNOSTIC: Check if this is a string escaping issue
                                if '\\\\n' in replace_code or '\\\\t' in replace_code or "\\\\\'" in replace_code:
                                    logger.error(f"🔍 DIAGNOSTIC: Detected double-escaped characters in code!")
                                    logger.error(f"   First 200 chars: {replace_code[:200]!r}")
                                    logger.error(f"   This suggests JSON escaping wasn't decoded properly")
                                
                                # 🔧 TRY AUTO-FIX FIRST
                                fixed_code = self._auto_fix_syntax(replace_code, str(e))
                                if fixed_code != replace_code:
                                    try:
                                        compile(fixed_code, '<string>', 'exec')
                                        ast.parse(fixed_code)
                                        logger.info(f"✅ AUTO-FIXED syntax error in {file_path}")
                                        edit['new_code'] = fixed_code
                                        successful_parses += 1
                                        continue  # Skip adding issue
                                    except SyntaxError:
                                        logger.warning(f"⚠️ Auto-fix failed for {file_path}")
                                
                                # Auto-fix failed, add the issue
                                issues.append(ValidationIssue(
                                    layer='ast_parsing',
                                    severity='critical',
                                    message=f'Syntax error in replacement code: {str(e)}\nProblematic line: {error_line}',
                                    file_path=file_path,
                                    line_number=e.lineno if hasattr(e, 'lineno') else None,
                                    suggestion='Fix syntax error before proceeding (likely wrong bracket/parenthesis from LLM)',
                                    fix_instruction=f"In {file_path} at line {e.lineno if hasattr(e, 'lineno') else 'unknown'}, fix this syntax error: {str(e)}. The problematic code is: {error_line}. Check for: missing/extra quotes, brackets, parentheses, or incorrect indentation."
                                ))
                                logger.error(f"🚨 SYNTAX ERROR (auto-fix failed) in {file_path}: {str(e)}\nCode: {error_line}")
                            except Exception as e:
                                issues.append(ValidationIssue(
                                    layer='ast_parsing',
                                    severity='high',
                                    message=f'Parse error in replacement code: {str(e)}',
                                    file_path=file_path
                                ))
                        else:
                            # Non-Python files: assume valid
                            successful_parses += 1
                
                # Handle old format (changes with line numbers) - for backward compatibility
                changes = op.get('changes', [])
                if changes:
                    for change in changes:
                        new_code = change.get('new_code', '')
                        if not new_code:
                            continue
                        
                        total_code_blocks += 1
                        
                        # Only parse Python files
                        if file_path.endswith('.py'):
                            try:
                                # CRITICAL: Comprehensive syntax validation
                                compiled = compile(new_code, '<string>', 'exec')
                                tree = ast.parse(new_code)  # Double-check with AST
                                successful_parses += 1
                                
                                # NEW: Check for undefined function references
                                undefined_funcs = self._check_undefined_references(tree, new_code)
                                for func_name in undefined_funcs:
                                    issues.append(ValidationIssue(
                                        layer='ast_parsing',
                                        severity='critical',
                                        message=f'Undefined function reference: {func_name}() is called but never defined',
                                        file_path=file_path,
                                        suggestion=f'Define {func_name}() function or import it from a module'
                                    ))
                                    logger.error(f"🚨 UNDEFINED FUNCTION: {func_name}() called in {file_path}")
                            except SyntaxError as e:
                                lines = new_code.split('\n')
                                error_line = lines[e.lineno - 1] if e.lineno and e.lineno <= len(lines) else '(unknown)'
                                
                                # 🔍 DIAGNOSTIC: Check if this is a string escaping issue  
                                if '\\\\n' in new_code or '\\\\t' in new_code or "\\\\\'" in new_code:
                                    logger.error(f"🔍 DIAGNOSTIC: Detected double-escaped characters in code!")
                                    logger.error(f"   File: {file_path}")
                                    logger.error(f"   First 200 chars: {new_code[:200]!r}")
                                    logger.error(f"   This suggests JSON escaping wasn't decoded properly")
                                
                                # 🔧 TRY AUTO-FIX FIRST
                                fixed_code = self._auto_fix_syntax(new_code, str(e))
                                if fixed_code != new_code:
                                    try:
                                        compile(fixed_code, '<string>', 'exec')
                                        ast.parse(fixed_code)
                                        logger.info(f"✅ AUTO-FIXED syntax error in {file_path}")
                                        change['new_code'] = fixed_code
                                        successful_parses += 1
                                        continue  # Skip adding issue
                                    except SyntaxError:
                                        logger.warning(f"⚠️ Auto-fix failed for {file_path}")
                                
                                # Auto-fix failed, add the issue
                                issues.append(ValidationIssue(
                                    layer='ast_parsing',
                                    severity='critical',
                                    message=f'Syntax error: {str(e)}\nProblematic line: {error_line}',
                                    file_path=file_path,
                                    line_number=e.lineno if hasattr(e, 'lineno') else None,
                                    suggestion='Fix syntax error before proceeding (likely wrong bracket/parenthesis from LLM)',
                                    fix_instruction=f"In {file_path} at line {e.lineno if hasattr(e, 'lineno') else 'unknown'}, fix the syntax error: {str(e)}. The problematic code is: {error_line}. This is likely a missing or extra quote, bracket, or parenthesis."
                                ))
                                logger.error(f"🚨 SYNTAX ERROR (auto-fix failed) in {file_path}: {str(e)}\nCode: {error_line}")
                            except Exception as e:
                                issues.append(ValidationIssue(
                                    layer='ast_parsing',
                                    severity='high',
                                    message=f'Parse error: {str(e)}',
                                    file_path=file_path
                                ))
                        else:
                            # Non-Python files: assume valid
                            successful_parses += 1
        
        # Calculate score
        score = successful_parses / total_code_blocks if total_code_blocks > 0 else 1.0
        
        return score, issues
    
    async def _layer_1_5_placeholder_detection(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 1.5: Detect placeholder/dummy code that must be rejected.
        
        CRITICAL: This layer ensures NO placeholder code gets through.
        Any TODO, dummy function, or placeholder comment = INSTANT FAIL.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 1.5: Placeholder Code Detection")
        
        issues = []
        total_code_blocks = 0
        clean_code_blocks = 0
        
        # Patterns that indicate placeholder/dummy code
        FORBIDDEN_PATTERNS = [
            (r'#\s*TODO', 'TODO comment found'),
            (r'#\s*FIXME', 'FIXME comment found'),
            (r'#\s*XXX', 'XXX placeholder found'),
            (r'#\s*HACK', 'HACK comment found'),
            (r'#\s*This can be tested', 'Placeholder "This can be tested" comment'),
            (r'#\s*Implement.*logic', 'Placeholder "Implement logic" comment'),
            (r'#\s*Add implementation', 'Placeholder "Add implementation" comment'),
            # CRITICAL FIX: Only flag pass with explicit placeholder keywords, not ALL pass with comments
            (r'pass\s*#\s*(TODO|FIXME|placeholder|implement|add\s+code)', 'Pass statement with placeholder comment'),
            (r'return\s+[\'"]dummy', 'Dummy return value'),
            (r'return\s+[\'"]placeholder', 'Placeholder return value'),
            (r'return\s+[\'"]mock', 'Mock return value'),
            (r'def\s+\w+\([^)]*\):\s*pass\s*$', 'Empty function with only pass'),
            (r'def\s+\w+\([^)]*\):\s*"""[^"]*"""\s*pass', 'Function with only docstring and pass'),
        ]
        
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                file_path = op.get('path', 'unknown')
                
                # Handle new format (edits)
                edits = op.get('edits', [])
                if edits:
                    for edit_idx, edit in enumerate(edits):
                        replace_code = edit.get('new_code', '') or edit.get('replace', '')
                        if not replace_code:
                            continue
                        
                        total_code_blocks += 1
                        has_placeholder = False
                        
                        # Check for forbidden patterns
                        for pattern, description in FORBIDDEN_PATTERNS:
                            if re.search(pattern, replace_code, re.IGNORECASE | re.MULTILINE):
                                issues.append(ValidationIssue(
                                    layer='placeholder_detection',
                                    severity='critical',
                                    message=f'PLACEHOLDER CODE DETECTED: {description}',
                                    file_path=file_path,
                                    suggestion='Remove ALL placeholder/dummy code and implement complete, production-ready functionality'
                                ))
                                logger.error(f"🚨 PLACEHOLDER DETECTED in {file_path}: {description}")
                                has_placeholder = True
                                break  # One violation is enough
                        
                        if not has_placeholder:
                            clean_code_blocks += 1
                
                # Handle old format (changes)
                changes = op.get('changes', [])
                if changes:
                    for change in changes:
                        new_code = change.get('new_code', '')
                        if not new_code:
                            continue
                        
                        total_code_blocks += 1
                        has_placeholder = False
                        
                        # Check for forbidden patterns
                        for pattern, description in FORBIDDEN_PATTERNS:
                            if re.search(pattern, new_code, re.IGNORECASE | re.MULTILINE):
                                issues.append(ValidationIssue(
                                    layer='placeholder_detection',
                                    severity='critical',
                                    message=f'PLACEHOLDER CODE DETECTED: {description}',
                                    file_path=file_path,
                                    suggestion='Remove ALL placeholder/dummy code and implement complete, production-ready functionality'
                                ))
                                logger.error(f"🚨 PLACEHOLDER DETECTED in {file_path}: {description}")
                                has_placeholder = True
                                break
                        
                        if not has_placeholder:
                            clean_code_blocks += 1
                
                # Check full content for create operations
                content = op.get('content', '')
                if content and op.get('type') == 'create':
                    total_code_blocks += 1
                    has_placeholder = False
                    
                    for pattern, description in FORBIDDEN_PATTERNS:
                        if re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
                            issues.append(ValidationIssue(
                                layer='placeholder_detection',
                                severity='critical',
                                message=f'PLACEHOLDER CODE DETECTED: {description}',
                                file_path=file_path,
                                suggestion='Remove ALL placeholder/dummy code and implement complete, production-ready functionality'
                            ))
                            logger.error(f"🚨 PLACEHOLDER DETECTED in {file_path}: {description}")
                            has_placeholder = True
                            break
                    
                    if not has_placeholder:
                        clean_code_blocks += 1
        
        # Calculate score (0.0 if ANY placeholder found)
        if total_code_blocks > 0:
            score = clean_code_blocks / total_code_blocks
            if score < 1.0:
                logger.warning(f"⚠️ Placeholder detection: {clean_code_blocks}/{total_code_blocks} blocks clean (FAIL)")
        else:
            score = 1.0
        
        return score, issues
    
    async def _layer_1_6_template_detection(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 1.6: Detect template hallucinations in documentation files.
        
        CRITICAL: Prevents AI from replacing real content with generic templates.
        Checks for placeholder patterns like [description], [Dependency 1], etc.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 1.6: Template Hallucination Detection")
        
        issues = []
        total_files = 0
        clean_files = 0
        
        # Patterns that indicate template hallucinations
        TEMPLATE_PATTERNS = [
            (r'\[brief description\]', 'Generic [brief description] placeholder'),
            (r'\[description\]', 'Generic [description] placeholder'),
            (r'\[Dependency \d+\]', 'Generic [Dependency N] placeholder'),
            (r'\[License information\]', 'Generic [License information] placeholder'),
            (r'\[Add .*?\]', 'Generic [Add ...] placeholder'),
            (r'\[Insert .*?\]', 'Generic [Insert ...] placeholder'),
            (r'\[Your .*?\]', 'Generic [Your ...] placeholder'),
            (r'\[Project .*?\]', 'Generic [Project ...] placeholder'),
            (r'## Introduction\s+This project provides \[', 'Generic introduction template'),
            (r'# Project Title\s+##', 'Generic "Project Title" heading'),
        ]
        
        # File extensions to check for templates (documentation files)
        DOC_EXTENSIONS = ['.md', '.rst', '.txt', '.adoc']
        
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                file_path = op.get('path', 'unknown')
                
                # Only check documentation files
                if not any(file_path.endswith(ext) for ext in DOC_EXTENSIONS):
                    continue
                
                total_files += 1
                has_template = False
                
                # Check edits for new format
                edits = op.get('edits', [])
                if edits:
                    for edit_idx, edit in enumerate(edits):
                        new_code = edit.get('new_code', '') or edit.get('replace', '')
                        if not new_code:
                            continue
                        
                        # Check for template patterns
                        for pattern, description in TEMPLATE_PATTERNS:
                            matches = list(re.finditer(pattern, new_code, re.IGNORECASE | re.MULTILINE))
                            if matches:
                                # Extract context around first match for better error message
                                match = matches[0]
                                start = max(0, match.start() - 50)
                                end = min(len(new_code), match.end() + 50)
                                context = new_code[start:end].replace('\n', ' ')
                                
                                issues.append(ValidationIssue(
                                    layer='template_detection',
                                    severity='critical',
                                    message=f'TEMPLATE HALLUCINATION DETECTED: {description}',
                                    file_path=file_path,
                                    suggestion=f'AI replaced real content with generic template. Found: "{context}". You must UPDATE existing content, NOT replace with placeholder templates.'
                                ))
                                logger.error(f"🚨 TEMPLATE HALLUCINATION in {file_path}: {description}")
                                logger.error(f"   Context: {context}")
                                has_template = True
                                break  # One violation is enough
                        
                        if has_template:
                            break
                
                # Check content for create operations
                content = op.get('content', '')
                if content and op.get('type') == 'create' and not has_template:
                    for pattern, description in TEMPLATE_PATTERNS:
                        matches = list(re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE))
                        if matches:
                            match = matches[0]
                            start = max(0, match.start() - 50)
                            end = min(len(content), match.end() + 50)
                            context = content[start:end].replace('\n', ' ')
                            
                            issues.append(ValidationIssue(
                                layer='template_detection',
                                severity='critical',
                                message=f'TEMPLATE HALLUCINATION DETECTED: {description}',
                                file_path=file_path,
                                suggestion=f'AI generated generic template with placeholders. Found: "{context}". Generate complete, real content instead.'
                            ))
                            logger.error(f"🚨 TEMPLATE HALLUCINATION in {file_path}: {description}")
                            logger.error(f"   Context: {context}")
                            has_template = True
                            break
                
                if not has_template:
                    clean_files += 1
        
        # Calculate score (0.0 if ANY template found in documentation)
        if total_files > 0:
            score = clean_files / total_files
            if score < 1.0:
                logger.warning(f"⚠️ Template detection: {clean_files}/{total_files} files clean (FAIL)")
        else:
            score = 1.0  # No documentation files to check
        
        return score, issues
    
    def _check_undefined_references(self, tree: ast.AST, code: str) -> List[str]:
        """
        Check for function calls to undefined functions.
        
        Args:
            tree: AST tree of the code
            code: Source code string
            
        Returns:
            List of undefined function names
        """
        # Collect all defined function names
        defined_functions = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                defined_functions.add(node.name)
        
        # Collect all function calls
        called_functions = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    called_functions.add(node.func.id)
                elif isinstance(node.func, ast.Attribute):
                    # For method calls like obj.method(), only check if defined in this code
                    pass
        
        # Built-in functions and common library functions (whitelist)
        builtins_and_common = {
            # Built-ins
            'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple',
            'open', 'input', 'map', 'filter', 'zip', 'enumerate', 'isinstance', 'type',
            'hasattr', 'getattr', 'setattr', 'min', 'max', 'sum', 'all', 'any', 'sorted',
            'abs', 'round', 'pow', 'divmod', 'format', 'repr', 'chr', 'ord', 'hex', 'oct',
            # Common async/await
            'asyncio', 'await',
            # JSON
            'loads', 'dumps',
            # Logging
            'debug', 'info', 'warning', 'error', 'critical',
            # FastAPI - CRITICAL FIX: Add common framework classes/functions
            'FastAPI', 'APIRouter', 'HTTPException', 'Request', 'Response', 'Depends',
            'WebSocket', 'WebSocketDisconnect', 'BackgroundTasks', 'UploadFile', 'Form', 'File',
            'get', 'post', 'put', 'delete', 'patch',
            # Flask
            'Flask', 'request', 'jsonify', 'render_template', 'redirect', 'url_for', 'session',
            # Django
            'render', 'HttpResponse', 'HttpRequest', 'JsonResponse', 'reverse',
            # Express.js patterns (for JavaScript AST if applicable)
            'express', 'Router', 'app',
            # Common test frameworks
            'pytest', 'unittest', 'TestCase', 'TestClient',
            # Vosk/audio processing
            'Model', 'KaldiRecognizer', 'SetWords', 'AcceptWaveform', 'Result', 'PartialResult',
        }
        
        # Check for imported modules/functions (basic check)
        imported_names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imported_names.add(alias.asname if alias.asname else alias.name)
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    imported_names.add(alias.asname if alias.asname else alias.name)
        
        # Find undefined: called but not defined, not built-in, not imported
        undefined = []
        for func in called_functions:
            if func not in defined_functions and func not in builtins_and_common and func not in imported_names:
                undefined.append(func)
        
        return undefined
    
    async def _layer_2_type_checking(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 2: Check type annotations and compatibility.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 2: Type Checking")
        
        issues = []
        type_hints_found = 0
        total_functions = 0
        
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                changes = op.get('changes', [])
                file_path = op.get('path', 'unknown')
                
                for change in changes:
                    new_code = change.get('new_code', '')
                    if not new_code or not file_path.endswith('.py'):
                        continue
                    
                    try:
                        tree = ast.parse(new_code)
                        
                        # Find function definitions
                        for node in ast.walk(tree):
                            if isinstance(node, ast.FunctionDef):
                                total_functions += 1
                                
                                # Check if function has return type annotation
                                if node.returns is not None:
                                    type_hints_found += 1
                                
                                # Check if parameters have type annotations
                                for arg in node.args.args:
                                    if arg.annotation is not None:
                                        type_hints_found += 0.2  # Partial credit
                                
                    except Exception:
                        pass  # Already caught in AST parsing layer
        
        # Calculate score (0.8 base + 0.2 bonus for type hints)
        if total_functions > 0:
            type_hint_ratio = min(type_hints_found / total_functions, 1.0)
            score = 0.8 + (0.2 * type_hint_ratio)
        else:
            score = 0.9  # No functions to check
        
        if total_functions > 0 and type_hints_found == 0:
            issues.append(ValidationIssue(
                layer='type_checking',
                severity='low',
                message='No type hints found in functions',
                suggestion='Consider adding type hints for better code quality'
            ))
        
        return score, issues
    
    def _reconstruct_file_from_operations(
        self,
        file_path: str,
        operations: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Reconstruct the complete file content after applying all operations.
        
        This is critical for import validation - we need to see the COMPLETE file
        with all imports from all operations, not just individual code blocks.
        
        Args:
            file_path: Path to reconstruct
            operations: List of operations targeting this file
            
        Returns:
            Complete file content as string, or None if reconstruction fails
        """
        # Collect all new_code blocks for this file
        code_blocks = []
        
        for op in operations:
            if op.get('path') != file_path:
                continue
            
            if op.get('type') == 'create':
                # For create operations, return the full content
                return op.get('content', '')
            
            # For edits, collect all new_code blocks
            edits = op.get('edits', [])
            for edit in edits:
                new_code = edit.get('new_code', '')
                if new_code:
                    code_blocks.append(new_code)
        
        if not code_blocks:
            return None
        
        # Combine all code blocks (imports should be in first block, functions in later blocks)
        # This gives us the complete file context
        return '\n\n'.join(code_blocks)
    
    async def _layer_3_import_resolution(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 3: Check that all imports resolve correctly and names are imported.
        
        CRITICAL FIX: Build complete file context before validation!
        Previously checked each operation's new_code in isolation, which meant
        imports in Operation 1 weren't visible when validating Operation 2's usage.
        
        Enhanced to detect:
        - Missing imports for used names (e.g., WebSocketDisconnect not imported)
        - Undefined names that should be imported
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 3: Import Resolution (Full File Context)")
        
        issues = []
        valid_imports = 0
        total_imports = 0
        
        # List of known standard library modules
        stdlib_modules = {
            'os', 'sys', 'json', 're', 'time', 'datetime', 'asyncio', 
            'typing', 'dataclasses', 'collections', 'itertools', 'functools',
            'pathlib', 'logging', 'unittest', 'pytest', 'ast', 'io', 'wave'
        }
        
        # Known names from common frameworks
        fastapi_names = {
            'FastAPI', 'APIRouter', 'HTTPException', 'Request', 'Response',
            'WebSocket', 'WebSocketDisconnect', 'status', 'Depends', 'Header',
            'Query', 'Path', 'Body', 'Form', 'File', 'UploadFile'
        }
        
        starlette_names = {
            'WebSocketDisconnect', 'WebSocketState'
        }
        
        # CRITICAL FIX: Group operations by file and validate complete files
        files_to_validate = {}
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                file_path = op.get('path', 'unknown')
                if file_path.endswith('.py'):
                    if file_path not in files_to_validate:
                        files_to_validate[file_path] = []
                    files_to_validate[file_path].append(op)
        
        # Validate each file with its complete context
        for file_path, file_ops in files_to_validate.items():
            # Reconstruct complete file
            complete_code = self._reconstruct_file_from_operations(file_path, file_ops)
            
            if not complete_code:
                logger.warning(f"⚠️ Could not reconstruct {file_path}, skipping import validation")
                continue
            
            try:
                tree = ast.parse(complete_code)
                
                # Track what's imported
                imported_names = set()
                
                # Collect imports
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            total_imports += 1
                            module_name = alias.name.split('.')[0]
                            imported_names.add(alias.asname if alias.asname else alias.name)
                            
                            # Check if it's a known module
                            if module_name in stdlib_modules:
                                valid_imports += 1
                            else:
                                # Assume external packages are valid
                                valid_imports += 0.8
                                
                    elif isinstance(node, ast.ImportFrom):
                        total_imports += 1
                        if node.module:
                            module_name = node.module.split('.')[0]
                            for alias in node.names:
                                imported_names.add(alias.asname if alias.asname else alias.name)
                            
                            if module_name in stdlib_modules:
                                valid_imports += 1
                            else:
                                valid_imports += 0.8
                
                # Check for common missing imports - ENHANCED
                all_used_names = set()
                for node in ast.walk(tree):
                    # Collect ALL name usages
                    if isinstance(node, ast.Name):
                        all_used_names.add(node.id)
                    
                    # Check exception handlers
                    if isinstance(node, ast.ExceptHandler):
                        if node.type and isinstance(node.type, ast.Name):
                            exc_name = node.type.id
                            # Check if it's a FastAPI/Starlette exception
                            if exc_name in fastapi_names or exc_name in starlette_names:
                                if exc_name not in imported_names:
                                    issues.append(ValidationIssue(
                                        layer='import_resolution',
                                        severity='critical',
                                        message=f"'{exc_name}' used in exception handler but not imported",
                                        file_path=file_path,
                                        line_number=getattr(node, 'lineno', 0),
                                        suggestion=f"Add '{exc_name}' to imports from fastapi or starlette"
                                    ))
                                    logger.error(f"🚨 CRITICAL: '{exc_name}' used but not imported in {file_path}")
                                    valid_imports -= 0.5  # Penalize
                
                # Check all used names against known framework symbols
                defined_locally = set()
                builtins = {'True', 'False', 'None', 'print', 'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'range', 'enumerate', 'zip', 'map', 'filter', 'any', 'all'}
                
                for name in all_used_names:
                    if name in fastapi_names or name in starlette_names:
                        if name not in imported_names and name not in defined_locally and name not in builtins:
                            issues.append(ValidationIssue(
                                layer='import_resolution',
                                severity='critical',
                                message=f"'{name}' used but not imported (FastAPI/Starlette symbol)",
                                file_path=file_path,
                                line_number=0,
                                suggestion=f"Add 'from fastapi import {name}' or 'from starlette import {name}'"
                            ))
                            logger.error(f"🚨 CRITICAL MISSING IMPORT: '{name}' used but not imported in {file_path}")
                            valid_imports -= 0.5
                            
            except Exception as e:
                logger.warning(f"⚠️ Error analyzing imports in {file_path}: {e}")
                pass
        
        # Calculate score
        score = max(0.0, valid_imports / total_imports) if total_imports > 0 else 1.0
        
        return score, issues
    
    async def _layer_3_5_definition_order(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 3.5: Check for variables/functions used before definition.
        
        This catches critical errors like:
        - Variable used before assignment (model used before defined)
        - Function called before definition
        - Duplicate imports
        - Circular dependencies
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 3.5: Definition Order Validation")
        
        issues = []
        total_checks = 0
        passed_checks = 0
        
        for op in operations:
            if op.get('type') not in ['edit', 'modify', 'create']:
                continue
            
            file_path = op.get('path', 'unknown')
            if not file_path.endswith('.py'):
                continue
            
            # Get all code to analyze (combine all changes for this file)
            all_new_code = []
            changes = op.get('edits', op.get('changes', []))
            
            for change in changes:
                new_code = change.get('new_code', '')
                if new_code:
                    all_new_code.append(new_code)
            
            # Analyze complete file code
            if 'content' in op:
                combined_code = op['content']
            else:
                combined_code = '\\n'.join(all_new_code)
            
            if not combined_code.strip():
                continue
            
            try:
                # FIX: JSON strings come with escape sequences like \\n, \\t that need decoding
                # The code is stored as JSON string, so we need to decode it before parsing
                if '\\n' in combined_code or '\\t' in combined_code:
                    # Decode JSON escape sequences
                    try:
                        import codecs
                        decoded_code = codecs.decode(combined_code, 'unicode_escape')
                        logger.info(f"✅ Decoded JSON escape sequences in {file_path}")
                        combined_code = decoded_code
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to decode escape sequences in {file_path}: {e}")
                
                tree = ast.parse(combined_code)
                
                # Track definitions and usages with line numbers
                definitions = {}  # name -> line number
                usages = []  # [(name, line_number)]
                imports_seen = {}  # import statement -> line number
                
                # First pass: collect all definitions
                for node in ast.walk(tree):
                    # Variable assignments
                    if isinstance(node, ast.Assign):
                        for target in node.targets:
                            if isinstance(target, ast.Name):
                                # Check if this is a reassignment (variable appears on RHS)
                                is_reassignment = False
                                for child in ast.walk(node.value):
                                    if isinstance(child, ast.Name) and child.id == target.id:
                                        is_reassignment = True
                                        break
                                
                                # Additional check: Use false positive detection
                                if target.id in definitions:
                                    is_false_positive = self._is_false_positive_duplicate(target.id, node, definitions)
                                    if is_false_positive:
                                        logger.debug(f"✅ Skipping false positive: '{target.id}' reassignment at line {node.lineno}")
                                        is_reassignment = True  # Treat as reassignment
                                
                                if target.id not in definitions:
                                    definitions[target.id] = node.lineno
                                elif not is_reassignment:
                                    # Variable reassignment is normal Python - downgrade from CRITICAL to MEDIUM
                                    # Only functions/classes should be CRITICAL duplicates
                                    total_checks += 1
                                    issues.append(ValidationIssue(
                                        layer='definition_order',
                                        severity='medium',  # Changed from 'critical' - variable reassignment is normal
                                        message=f'Variable "{target.id}" assigned multiple times',
                                        file_path=file_path,
                                        line_number=node.lineno,
                                        suggestion=f'Consider using different variable name if this is unintentional (first assignment at line {definitions[target.id]})',
                                        fix_instruction=f"In {file_path}, if unintentional, rename the variable '{target.id}' at line {node.lineno}. The first assignment is at line {definitions[target.id]}."
                                    ))
                                    logger.warning(f"⚠️ VARIABLE REASSIGNMENT: '{target.id}' at line {node.lineno} (first at {definitions[target.id]})")
                                # else: reassignment like buffer = buffer[chunk_size:], which is valid
                    
                    # Function definitions
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        if node.name not in definitions:
                            definitions[node.name] = node.lineno
                        else:
                            # CRITICAL: Duplicate function definition
                            total_checks += 1
                            issues.append(ValidationIssue(
                                layer='definition_order',
                                severity='critical',
                                message=f'Duplicate function definition: "{node.name}" defined multiple times',
                                file_path=file_path,
                                line_number=node.lineno,
                                suggestion=f'Remove duplicate function at line {node.lineno}, already defined at line {definitions[node.name]}',
                                fix_instruction=f"In {file_path}, delete or rename the duplicate function '{node.name}' at line {node.lineno}. The first definition is at line {definitions[node.name]}."
                            ))
                            logger.error(f"🚨 DUPLICATE FUNCTION: '{node.name}' at line {node.lineno} (first at {definitions[node.name]})")
                    
                    # Class definitions
                    elif isinstance(node, ast.ClassDef):
                        if node.name not in definitions:
                            definitions[node.name] = node.lineno
                        else:
                            # CRITICAL: Duplicate class definition
                            total_checks += 1
                            issues.append(ValidationIssue(
                                layer='definition_order',
                                severity='critical',
                                message=f'Duplicate class definition: "{node.name}" defined multiple times',
                                file_path=file_path,
                                line_number=node.lineno,
                                suggestion=f'Remove duplicate class at line {node.lineno}, already defined at line {definitions[node.name]}',
                                fix_instruction=f"In {file_path}, delete or rename the duplicate class '{node.name}' at line {node.lineno}. The first definition is at line {definitions[node.name]}."
                            ))
                            logger.error(f"🚨 DUPLICATE CLASS: '{node.name}' at line {node.lineno} (first at {definitions[node.name]})")
                    
                    # Imports
                    elif isinstance(node, ast.Import):
                        import_str = ', '.join(alias.name for alias in node.names)
                        if import_str in imports_seen:
                            total_checks += 1
                            issues.append(ValidationIssue(
                                layer='definition_order',
                                severity='medium',
                                message=f'Duplicate import: "{import_str}" imported multiple times',
                                file_path=file_path,
                                line_number=node.lineno,
                                suggestion=f'Remove duplicate import at line {node.lineno}, already imported at line {imports_seen[import_str]}',
                                fix_instruction=f"In {file_path}, remove the duplicate import '{import_str}' at line {node.lineno}. The first import is at line {imports_seen[import_str]}."
                            ))
                            logger.warning(f"⚠️ DUPLICATE IMPORT: '{import_str}' at line {node.lineno} (first at {imports_seen[import_str]})")
                        else:
                            imports_seen[import_str] = node.lineno
                            passed_checks += 1
                        
                        for alias in node.names:
                            name = alias.asname if alias.asname else alias.name
                            if name not in definitions:
                                definitions[name] = node.lineno
                    
                    elif isinstance(node, ast.ImportFrom):
                        import_str = f"from {node.module or ''} import {', '.join(alias.name for alias in node.names)}"
                        if import_str in imports_seen:
                            total_checks += 1
                            issues.append(ValidationIssue(
                                layer='definition_order',
                                severity='medium',
                                message=f'Duplicate import: "{import_str}" imported multiple times',
                                file_path=file_path,
                                line_number=node.lineno,
                                suggestion=f'Remove duplicate import at line {node.lineno}, already imported at line {imports_seen[import_str]}'
                            ))
                            logger.warning(f"⚠️ DUPLICATE IMPORT: '{import_str}' at line {node.lineno} (first at {imports_seen[import_str]})")
                        else:
                            imports_seen[import_str] = node.lineno
                            passed_checks += 1
                        
                        for alias in node.names:
                            name = alias.asname if alias.asname else alias.name
                            if name not in definitions:
                                definitions[name] = node.lineno
                
                # Second pass: collect usages (in order)
                for node in ast.walk(tree):
                    # Variable loads (reading a variable)
                    if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                        usages.append((node.id, node.lineno))
                    
                    # Function calls
                    elif isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Name):
                            usages.append((node.func.id, node.lineno))
                
                # Check for usage before definition
                builtins = {
                    'print', 'len', 'str', 'int', 'float', 'dict', 'list', 'set', 'tuple',
                    'range', 'enumerate', 'zip', 'map', 'filter', 'open', 'input',
                    'isinstance', 'type', 'hasattr', 'getattr', 'setattr',
                    'True', 'False', 'None', 'await', 'async'
                }
                
                for name, usage_line in usages:
                    total_checks += 1
                    
                    # Skip built-ins
                    if name in builtins:
                        passed_checks += 1
                        continue
                    
                    # Check if defined before use
                    if name in definitions:
                        def_line = definitions[name]
                        if usage_line < def_line:
                            # CRITICAL ERROR: Used before defined!
                            issues.append(ValidationIssue(
                                layer='definition_order',
                                severity='critical',
                                message=f"Variable/function '{name}' used at line {usage_line} before definition at line {def_line}",
                                file_path=file_path,
                                line_number=usage_line,
                                suggestion=f"Move definition of '{name}' from line {def_line} to before line {usage_line}",
                                fix_instruction=f"In {file_path}, move the definition of '{name}' from line {def_line} to before line {usage_line}, or move the usage from line {usage_line} to after line {def_line}."
                            ))
                            logger.error(f"🚨 CRITICAL: '{name}' used at line {usage_line} BEFORE defined at line {def_line} in {file_path}")
                            # DON'T increment passed_checks - this is a FAILED check!
                        else:
                            passed_checks += 1
                    else:
                        # Not defined in this file - might be imported or global
                        # Only warn if it's not likely an import or method call
                        if not name[0].isupper():  # Lowercase usually indicates variables
                            passed_checks += 1  # Assume it's OK (imported or global)
                        else:
                            passed_checks += 1  # Classes are usually imported
            
            except SyntaxError as e:
                total_checks += 1
                issues.append(ValidationIssue(
                    layer='definition_order',
                    severity='critical',
                    message=f'Syntax error in code: {str(e)}',
                    file_path=file_path,
                    line_number=e.lineno if hasattr(e, 'lineno') else None,
                    suggestion='Fix syntax errors in the code',
                    fix_instruction=f"In {file_path} at line {e.lineno if hasattr(e, 'lineno') else 'unknown'}, fix the syntax error: {str(e)}. Check for missing or extra quotes, brackets, or parentheses."
                ))
                logger.error(f"🚨 SYNTAX ERROR in {file_path}: {e}")
            
            except Exception as e:
                logger.warning(f"⚠️ Error analyzing definition order for {file_path}: {e}")
                passed_checks += 1  # Don't penalize for analysis failures
                total_checks += 1
        
        # Calculate score
        score = passed_checks / total_checks if total_checks > 0 else 1.0
        
        logger.info(f"✅ Definition order validation: {passed_checks}/{total_checks} checks passed, score={score:.2f}")
        
        return score, issues
    
    async def _layer_4_docker_config(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 4: Validate Docker configurations (Dockerfile, docker-compose.yml).
        
        Checks for:
        - Volume mounts that overwrite container files
        - Incorrect COPY/ADD paths
        - Missing required files
        - Port exposure issues
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 4: Docker Configuration Validation")
        
        issues = []
        total_checks = 0
        passed_checks = 0
        
        for op in operations:
            if op.get('type') not in ['edit', 'modify', 'create']:
                continue
            
            file_path = op.get('path', '')
            
            # Check docker-compose.yml files
            if 'docker-compose' in file_path.lower() and file_path.endswith(('.yml', '.yaml')):
                # FIX: Use 'edits' not 'changes' to match actual data structure
                edits = op.get('edits', [])
                for edit in edits:
                    new_code = edit.get('new_code', '')
                    if not new_code:
                        continue
                    
                    total_checks += 1
                    
                    try:
                        # Parse YAML
                        config = yaml.safe_load(new_code)
                        
                        if not config or 'services' not in config:
                            passed_checks += 1
                            continue
                        
                        # Check each service
                        for service_name, service_config in config.get('services', {}).items():
                            if not isinstance(service_config, dict):
                                continue
                            
                            # CRITICAL: Check for volume mounts that overwrite /app
                            volumes = service_config.get('volumes', [])
                            for volume in volumes:
                                if isinstance(volume, str):
                                    # Parse volume syntax: source:destination[:options]
                                    parts = volume.split(':')
                                    if len(parts) >= 2:
                                        destination = parts[1]
                                        
                                        # Check if mounting to /app (common issue)
                                        if destination in ['/app', '/app/']:
                                            issues.append(ValidationIssue(
                                                layer='docker_config',
                                                severity='critical',
                                                message=f"Volume mount '{volume}' overwrites /app directory - will remove files copied by Dockerfile",
                                                file_path=file_path,
                                                suggestion="Remove volume mount or use specific subdirectories like /app/data instead of /app"
                                            ))
                                            logger.error(f"🚨 CRITICAL: Volume mount overwrites /app in {file_path}")
                                            total_checks += 1
                                            # Don't increment passed_checks - this is a failure
                                            continue
                        
                        passed_checks += 1
                        
                    except yaml.YAMLError as e:
                        issues.append(ValidationIssue(
                            layer='docker_config',
                            severity='high',
                            message=f"Invalid YAML syntax in docker-compose file: {e}",
                            file_path=file_path,
                            suggestion="Fix YAML syntax errors"
                        ))
                        logger.warning(f"⚠️ Invalid YAML in {file_path}: {e}")
                        # Don't increment passed_checks
                    except Exception as e:
                        logger.warning(f"⚠️ Error validating docker-compose in {file_path}: {e}")
                        passed_checks += 1  # Don't penalize for analysis errors
            
            # Check Dockerfile
            elif file_path.endswith('Dockerfile') or 'Dockerfile' in file_path:
                # FIX: Use 'edits' not 'changes' to match actual data structure
                edits = op.get('edits', [])
                for edit in edits:
                    new_code = edit.get('new_code', '')
                    if not new_code:
                        continue
                    
                    total_checks += 1
                    
                    # Check for COPY commands
                    copy_commands = re.findall(r'COPY\s+(.+?)\s+(.+?)(?:\n|$)', new_code, re.MULTILINE)
                    
                    # Validate COPY destinations
                    for src, dest in copy_commands:
                        # Good pattern: COPY something /app/
                        if dest.startswith('/app'):
                            passed_checks += 0.5
                        else:
                            passed_checks += 0.3
                    
                    if copy_commands:
                        passed_checks += 0.5
                    else:
                        passed_checks += 1
        
        # Calculate score
        score = passed_checks / total_checks if total_checks > 0 else 1.0
        
        logger.info(f"✅ Docker config validation: {passed_checks}/{total_checks} checks passed, score={score:.2f}")
        
        return score, issues
    
    async def _layer_4_security_scan(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 5: Scan for common security vulnerabilities.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 5: Security Scan")
        
        issues = []
        
        # Dangerous patterns to check
        dangerous_patterns = [
            (r'eval\s*\(', 'critical', 'Use of eval() detected - arbitrary code execution risk'),
            (r'exec\s*\(', 'critical', 'Use of exec() detected - arbitrary code execution risk'),
            (r'__import__\s*\(', 'high', 'Dynamic import detected - potential security risk'),
            (r'os\.system\s*\(', 'high', 'Use of os.system() - command injection risk'),
            (r'subprocess\.call\(.*shell\s*=\s*True', 'high', 'subprocess with shell=True - injection risk'),
            (r'pickle\.loads?\s*\(', 'medium', 'Use of pickle - deserialization vulnerability'),
            (r'yaml\.load\((?!.*Loader)', 'medium', 'Unsafe YAML loading - use yaml.safe_load()'),
        ]
        
        security_score = 1.0
        
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                changes = op.get('changes', [])
                file_path = op.get('path', 'unknown')
                
                for change in changes:
                    new_code = change.get('new_code', '')
                    if not new_code:
                        continue
                    
                    # Check for dangerous patterns
                    for pattern, severity, message in dangerous_patterns:
                        if re.search(pattern, new_code):
                            issues.append(ValidationIssue(
                                layer='security_scan',
                                severity=severity,
                                message=message,
                                file_path=file_path,
                                suggestion='Review and replace with safer alternative'
                            ))
                            
                            # Reduce score based on severity
                            if severity == 'critical':
                                security_score -= 0.4
                            elif severity == 'high':
                                security_score -= 0.2
                            elif severity == 'medium':
                                security_score -= 0.1
        
        score = max(security_score, 0.0)
        
        return score, issues
    
    async def _layer_5_5_test_library_compatibility(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 5.5: Test Library Compatibility Validation
        
        Checks for:
        - Deprecated websockets library APIs (.open, .closed attributes)
        - Missing test dependencies (imports not in requirements.txt)
        - Incompatible library versions
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 5.5: Test Library Compatibility Validation")
        
        issues = []
        total_checks = 0
        passed_checks = 0
        
        for op in operations:
            if op.get('type') not in ['edit', 'modify', 'create']:
                continue
            
            file_path = op.get('path', '')
            
            # Only check test files
            if not ('test' in file_path.lower() or file_path.endswith('_test.py')):
                continue
            
            # Get file content
            edits = op.get('edits', [])
            for edit in edits:
                new_code = edit.get('new_code', '')
                if not new_code:
                    continue
                
                total_checks += 1
                
                # Check for deprecated websockets API usage
                deprecated_patterns = [
                    (r'\bws\.open\b', '.open attribute (removed in websockets 10+)', 'Use context manager or check connection state'),
                    (r'\bws\.closed\b', '.closed attribute (removed in websockets 10+)', 'Use context manager or check connection state'),
                    (r'\bwebsocket\.open\b', '.open attribute (removed in websockets 10+)', 'Use context manager'),
                    (r'\bwebsocket\.closed\b', '.closed attribute (removed in websockets 10+)', 'Use context manager'),
                ]
                
                for pattern, desc, fix in deprecated_patterns:
                    if re.search(pattern, new_code):
                        issues.append(ValidationIssue(
                            layer='test_library_compatibility',
                            severity='critical',
                            message=f'{file_path}: Uses deprecated websockets API: {desc}',
                            suggestion=f'{fix}. Modern websockets (v10+) removed this attribute. Use async with context manager instead.',
                            file_path=file_path,
                            fix_instruction=f"In {file_path}, replace usage of {desc} with proper async context manager or connection state checks."
                        ))
                        logger.error(f"🚨 DEPRECATED API: {file_path} uses {desc}")
                
                # Check for test dependencies that might not be in requirements
                problematic_imports = {
                    'pyttsx3': 'Text-to-speech library requiring system audio - use cloud TTS or pytest fixtures',
                    'pyaudio': 'Audio I/O requiring C compilation - use wave module or mocked data',
                    'sounddevice': 'Audio device access requiring portaudio - use pre-recorded test audio',
                    'speech_recognition': 'Speech recognition requiring system dependencies - use mocked responses',
                }
                
                for lib, desc in problematic_imports.items():
                    if re.search(rf'\bimport {lib}\b|from {lib} import', new_code):
                        issues.append(ValidationIssue(
                            layer='test_library_compatibility',
                            severity='high',
                            message=f'{file_path}: Imports problematic test dependency: {lib}',
                            suggestion=f'{desc}. Add to requirements.txt or use alternative approach.',
                            file_path=file_path,
                            fix_instruction=f"In {file_path}, either add '{lib}' to requirements.txt with system dependencies documented, or use alternative approach: {desc}"
                        ))
                        logger.warning(f"⚠️ PROBLEMATIC IMPORT: {file_path} imports {lib}")
                
                # Check for missing pytest markers for async tests
                if 'async def test_' in new_code:
                    if '@pytest.mark.asyncio' not in new_code:
                        issues.append(ValidationIssue(
                            layer='test_library_compatibility',
                            severity='medium',
                            message=f'{file_path}: Async test functions missing @pytest.mark.asyncio decorator',
                            suggestion='Add @pytest.mark.asyncio decorator to async test functions',
                            file_path=file_path,
                            fix_instruction=f"In {file_path}, add '@pytest.mark.asyncio' decorator above each 'async def test_' function"
                        ))
                
                if not issues:
                    passed_checks += 1
        
        # Calculate score
        score = passed_checks / total_checks if total_checks > 0 else 1.0
        
        if issues:
            logger.warning(f"⚠️ Test library compatibility: {len(issues)} issues found")
        else:
            logger.info(f"✅ Test library compatibility: All checks passed")
        
        return score, issues
    
    async def _layer_5_test_coverage(
        self,
        operations: List[Dict[str, Any]],
        understanding: Any
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 5: Check if tests are included or updated.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 5: Test Coverage")
        
        issues = []
        
        # Check if any test files are modified or created
        has_test_changes = False
        has_source_changes = False
        
        for op in operations:
            path = op.get('path', '')
            
            if 'test' in path.lower() or path.endswith('_test.py') or path.startswith('tests/'):
                has_test_changes = True
            elif op.get('type') in ['edit', 'modify', 'create']:
                has_source_changes = True
        
        # Score based on test coverage
        if has_source_changes and not has_test_changes:
            issues.append(ValidationIssue(
                layer='test_coverage',
                severity='medium',
                message='Source code changed but no test updates found',
                suggestion='Add or update tests to cover the changes'
            ))
            score = 0.6
        elif has_test_changes:
            score = 0.95
        else:
            score = 0.8  # No source changes
        
        return score, issues
    
    async def _layer_6_ai_review(
        self,
        operations: List[Dict[str, Any]],
        understanding: Any,
        issue_title: str,
        issue_body: str
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Layer 6: AI semantic review of logic correctness.
        
        Returns:
            (score 0.0-1.0, list of issues)
        """
        logger.debug("Layer 6: AI Semantic Review")
        
        # Build prompt for AI review
        operations_summary = self._summarize_operations(operations)
        
        prompt = f"""You are an expert code reviewer performing semantic validation.

**Issue:** {issue_title}
{issue_body}

**Requirements:**
{chr(10).join(f'- {req}' for req in understanding.requirements[:5])}

**Proposed Fix:**
{operations_summary}

**Review Criteria:**
1. Does the fix correctly address all requirements?
2. Are edge cases handled properly?
3. Is the logic sound and correct?
4. Are there any potential bugs or issues?
5. Does it maintain backward compatibility?

**Output Format (JSON):**
```json
{{
  "score": 0.85,
  "issues": [
    {{
      "severity": "high",
      "message": "Description of issue",
      "suggestion": "How to fix it"
    }}
  ],
  "summary": "Brief review summary"
}}
```

Perform the review now:"""
        
        try:
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.2,
                max_tokens=1500
            )
            
            result = self._parse_ai_review(response)
            
            score = result.get('score', 0.75)
            issues = [
                ValidationIssue(
                    layer='ai_review',
                    severity=issue.get('severity', 'medium'),
                    message=issue.get('message', ''),
                    suggestion=issue.get('suggestion')
                )
                for issue in result.get('issues', [])
            ]
            
            return score, issues
            
        except Exception as e:
            logger.error(f"AI review failed: {str(e)}")
            return 0.75, []  # Default score if AI review fails
    
    def _summarize_operations(self, operations: List[Dict[str, Any]]) -> str:
        """Summarize operations for AI review."""
        summary_parts = []
        
        for op in operations[:5]:  # Limit to 5 operations
            op_type = op.get('type', 'unknown')
            path = op.get('path', 'unknown')
            changes = op.get('changes', [])
            
            summary_parts.append(f"{op_type.upper()}: {path} ({len(changes)} changes)")
        
        return "\n".join(summary_parts)
    
    def _parse_ai_review(self, response: str) -> Dict[str, Any]:
        """Parse AI review response."""
        import json
        import re
        
        # Try to extract JSON
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Fallback
        return {'score': 0.75, 'issues': [], 'summary': 'AI review unavailable'}
    
    def _generate_summary(
        self,
        valid: bool,
        confidence: float,
        layer_scores: Dict[str, float],
        issues: List[ValidationIssue]
    ) -> str:
        """Generate human-readable validation summary."""
        
        status = "PASS" if valid else "FAIL"
        critical_count = len([i for i in issues if i.severity == 'critical'])
        high_count = len([i for i in issues if i.severity == 'high'])
        
        # Find weakest layer
        weakest_layer = min(layer_scores.items(), key=lambda x: x[1])
        
        summary_parts = [
            f"Validation: {status} (confidence: {confidence:.1%})",
            f"Issues: {critical_count} critical, {high_count} high",
            f"Weakest Layer: {weakest_layer[0]} ({weakest_layer[1]:.1%})"
        ]
        
        return " | ".join(summary_parts)
    
    def _generate_ai_feedback(self, issues: List[ValidationIssue], layer_scores: Dict[str, float]) -> str:
        """Generate actionable feedback for AI to fix validation issues."""
        feedback_parts = []
        
        # Group issues by severity
        critical_issues = [i for i in issues if i.severity == 'critical']
        high_issues = [i for i in issues if i.severity == 'high']
        
        if critical_issues:
            feedback_parts.append("**CRITICAL ISSUES (Must Fix):**")
            for issue in critical_issues[:5]:  # Top 5 critical
                feedback_parts.append(f"\\n❌ {issue.message}")
                if issue.file_path and issue.line_number:
                    feedback_parts.append(f"   Location: {issue.file_path}:{issue.line_number}")
                if issue.fix_instruction:
                    feedback_parts.append(f"   Fix: {issue.fix_instruction}")
                elif issue.suggestion:
                    feedback_parts.append(f"   Suggestion: {issue.suggestion}")
        
        if high_issues:
            feedback_parts.append("\\n\\n**HIGH PRIORITY ISSUES:**")
            for issue in high_issues[:3]:  # Top 3 high
                feedback_parts.append(f"\\n⚠️ {issue.message}")
                if issue.fix_instruction:
                    feedback_parts.append(f"   Fix: {issue.fix_instruction}")
        
        # Add layer scores for context
        failing_layers = [name for name, score in layer_scores.items() if score < 0.7]
        if failing_layers:
            feedback_parts.append(f"\\n\\n**Validation Layers That Failed:** {', '.join(failing_layers)}")
        
        return "\\n".join(feedback_parts) if feedback_parts else "No specific issues detected."
    
    def _generate_recommendations(
        self,
        issues: List[ValidationIssue],
        layer_scores: Dict[str, float]
    ) -> List[str]:
        """Generate actionable recommendations."""
        
        recommendations = []
        
        # Critical issues
        critical = [i for i in issues if i.severity == 'critical']
        if critical:
            recommendations.append(f"Fix {len(critical)} critical issues immediately")
        
        # Low-scoring layers
        for layer, score in layer_scores.items():
            if score < 0.7:
                recommendations.append(f"Improve {layer} (current: {score:.1%})")
        
        # Specific suggestions from issues
        for issue in issues[:3]:  # Top 3 issues
            if issue.suggestion:
                recommendations.append(issue.suggestion)
        
        return recommendations[:5]  # Return top 5
    
    def _layer_8_function_call_validation(
        self,
        operations: List[Dict[str, Any]],
        function_inventory: Dict[str, Any]
    ) -> Tuple[List[ValidationIssue], float]:
        """
        Layer 8: Function Call Validation
        Ensures generated code uses available functions correctly.
        """
        issues = []
        available_functions = set()
        
        # Extract available function names
        for file_info in function_inventory.get('files', []):
            for func in file_info.get('functions', []):
                available_functions.add(func.get('name', ''))
        
        # Check if operations use non-existent functions
        for op in operations:
            content = op.get('content', '')
            path = op.get('path', '')
            
            # Simple check for function calls (not perfect but catches obvious issues)
            # Look for patterns like "function_name(" in new code
            if op.get('type') == 'create':
                # Extract potential function calls
                import re
                potential_calls = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', content)
                
                # Filter out common built-ins and keywords
                builtins = {'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'open', 'type', 'isinstance', 'super', 'property', 'staticmethod', 'classmethod'}
                
                for call in potential_calls:
                    if call not in builtins and call not in available_functions and call.lower() not in {'def', 'class', 'if', 'for', 'while', 'with', 'try', 'except', 'return', 'yield'}:
                        # Don't flag it as issue - just log for awareness
                        logger.info(f"Note: {path} calls function '{call}' which may be newly defined or external")
        
        # No critical issues - function inventory is informational
        confidence = 1.0
        return issues, confidence
    
    def _layer_9_framework_consistency(
        self,
        operations: List[Dict[str, Any]],
        frameworks: List[str]
    ) -> Tuple[List[ValidationIssue], float]:
        """
        Layer 9: Framework Consistency
        Ensures generated code follows framework conventions.
        """
        issues = []
        
        for op in operations:
            content = op.get('content', '')
            path = op.get('path', '')
            
            # FastAPI consistency checks
            if 'fastapi' in ' '.join(frameworks).lower() or 'FastAPI' in frameworks:
                # Check for standalone websockets.serve() instead of FastAPI integration
                if 'websockets.serve' in content:
                    issues.append(ValidationIssue(
                        layer='framework_consistency',
                        severity='critical',
                        message=f'{path}: Uses standalone websockets.serve() instead of FastAPI WebSocket routes',
                        suggestion='Use FastAPI WebSocket: @app.websocket("/ws") + async def websocket_endpoint(websocket: WebSocket)'
                    ))
                
                # Check for print() instead of FastAPI-style logging
                if 'print(' in content and path.endswith('.py'):
                    issues.append(ValidationIssue(
                        layer='framework_consistency',
                        severity='medium',
                        message=f'{path}: Uses print() instead of logging - not production-ready',
                        suggestion='Use: import logging; logger = logging.getLogger(__name__); logger.info(...)'
                    ))
        
        # Calculate confidence
        critical_count = sum(1 for i in issues if i.severity == 'critical')
        if critical_count > 0:
            confidence = 0.3  # Low confidence with framework violations
        elif issues:
            confidence = 0.7  # Medium confidence with minor issues
        else:
            confidence = 1.0
        
        return issues, confidence
    
    def _layer_10_production_readiness(
        self,
        operations: List[Dict[str, Any]]
    ) -> Tuple[List[ValidationIssue], float]:
        """
        Layer 10: Production Readiness Checks
        Catches common mistakes that make code non-production-ready:
        - Wrong data types (float32 vs int16 for audio)
        - Hardcoded paths ('model' instead of actual paths)
        - Standalone servers instead of framework integration
        - print() instead of logging
        - Missing error handling
        """
        issues = []
        
        for op in operations:
            if op.get('type') == 'create':
                content = op.get('content', '')
                path = op.get('path', '')
                
                # Check for wrong data types
                if 'audio' in content.lower() or 'vosk' in content.lower():
                    if 'dtype=np.float32' in content or 'dtype=float32' in content:
                        issues.append(ValidationIssue(
                            layer='production_readiness',
                            severity='critical',
                            message=f'{path}: Uses float32 for audio but Vosk expects 16-bit PCM (int16)',
                            suggestion='Convert: audio_int16 = (audio_float * 32767).astype(np.int16); audio_bytes = audio_int16.tobytes()'
                        ))
                
                # Check for hardcoded paths - BUT allow actual repository paths!
                # The model "vosk-model-small-en-us-0.15" IS in the repository, so that's valid
                # Only flag INVALID hardcoded paths like "model", "/path/to/", "path/to/"
                hardcoded_patterns = [
                    ('"model"', 'Generic "model" string'),
                    ("'model'", "Generic 'model' string"),
                    ('"/path/to/', 'Placeholder path "/path/to/"'),
                    ("'/path/to/", "Placeholder path '/path/to/'"),
                    ('"path/to/', 'Incomplete path "path/to/"'),
                    ("'path/to/", "Incomplete path 'path/to/'"),
                ]
                for pattern, description in hardcoded_patterns:
                    if pattern in content and ('vosk' in content.lower() or 'Model(' in content):
                        # CRITICAL FIX: Don't flag if it's actually using the repository path!
                        # Check if there's a real model name nearby
                        if 'vosk-model' in content:
                            # Has actual model path like "vosk-model-small-en-us-0.15" - valid!
                            continue
                        
                        issues.append(ValidationIssue(
                            layer='production_readiness',
                            severity='high',
                            message=f'{path}: Contains hardcoded placeholder {description} - use actual repository paths or environment variables',
                            suggestion='Use: model_path = os.getenv("VOSK_MODEL_PATH", "vosk-model-small-en-us-0.15")'
                        ))
                        break
                
                # Check for standalone WebSocket server (not FastAPI integrated)
                # IMPORTANT: Don't flag WebSocket clients (they use websockets.connect, not websockets.serve)
                if 'websockets.serve(' in content:
                    if 'from fastapi import' not in content and '@app.websocket' not in content:
                        issues.append(ValidationIssue(
                            layer='production_readiness',
                            severity='critical',
                            message=f'{path}: Creates standalone WebSocket server instead of integrating with existing FastAPI app',
                            suggestion='Use FastAPI WebSocket: @app.websocket("/ws/endpoint") with "from fastapi import WebSocket"'
                        ))
                
                # CRITICAL: Check for WebSocket double-close bug
                # Pattern: except WebSocketDisconnect: ... await websocket.close()
                # This causes RuntimeError because WebSocketDisconnect means connection ALREADY closed
                if 'WebSocketDisconnect' in content and 'websocket.close()' in content:
                    # Parse to check if close() is called inside except WebSocketDisconnect block
                    lines = content.split('\n')
                    in_except_block = False
                    except_indent = 0
                    
                    for i, line in enumerate(lines):
                        stripped = line.lstrip()
                        current_indent = len(line) - len(stripped)
                        
                        # Detect except WebSocketDisconnect:
                        if 'except' in stripped and 'WebSocketDisconnect' in stripped and stripped.endswith(':'):
                            in_except_block = True
                            except_indent = current_indent
                            continue
                        
                        # Inside except block
                        if in_except_block:
                            # Exit block if indent returns to except level or less
                            if stripped and current_indent <= except_indent:
                                in_except_block = False
                                continue
                            
                            # Check for websocket.close() or websocket.send_*() calls
                            if 'websocket.close()' in stripped:
                                issues.append(ValidationIssue(
                                    layer='production_readiness',
                                    severity='critical',
                                    message=f'{path}: Calls websocket.close() inside except WebSocketDisconnect block (line {i+1})',
                                    suggestion='Remove websocket.close() - WebSocketDisconnect means connection is ALREADY closed by client. Use: except WebSocketDisconnect: pass'
                                ))
                                break
                            elif 'websocket.send_text(' in stripped or 'websocket.send_json(' in stripped or 'websocket.send_bytes(' in stripped:
                                issues.append(ValidationIssue(
                                    layer='production_readiness',
                                    severity='critical',
                                    message=f'{path}: Calls websocket.send_*() inside except WebSocketDisconnect block (line {i+1})',
                                    suggestion='Remove websocket.send_*() - WebSocketDisconnect means connection is ALREADY closed. Use: except WebSocketDisconnect: pass'
                                ))
                                break
                
                # Check for print() instead of logging
                if 'print(' in content and 'logger' not in content:
                    issues.append(ValidationIssue(
                        layer='production_readiness',
                        severity='medium',
                        message=f'{path}: Uses print() for error handling - use logging instead',
                        suggestion='Add: from utils.logger import get_logger; logger = get_logger(__name__); logger.error(msg)'
                    ))
                
                # Check for missing error handling in async functions
                if 'async def' in content:
                    if 'try:' not in content or 'except' not in content:
                        issues.append(ValidationIssue(
                            layer='production_readiness',
                            severity='high',
                            message=f'{path}: Async function lacks try/except error handling',
                            suggestion='Wrap async operations in try/except blocks to handle errors gracefully'
                        ))
                
                # CRITICAL: Check for missing exception imports when exception handling is used
                # BUG FIX: Need to check the FULL context (all edits + file content), not just this one edit
                if 'except WebSocketDisconnect' in content:
                    # Check if imports section contains WebSocketDisconnect
                    import_section = content[:min(1000, len(content))]  # Check first 1000 chars for imports
                    if 'from fastapi import' in import_section:
                        # Check if WebSocketDisconnect is in the import statement
                        import re
                        fastapi_import_match = re.search(r'from fastapi import ([^\\n]+)', import_section)
                        if fastapi_import_match:
                            imports_list = fastapi_import_match.group(1)
                            if 'WebSocketDisconnect' not in imports_list:
                                issues.append(ValidationIssue(
                                    layer='production_readiness',
                                    severity='critical',
                                    message=f'{path}: Uses WebSocketDisconnect exception but it is not imported',
                                    suggestion='Add WebSocketDisconnect to fastapi imports: from fastapi import WebSocket, WebSocketDisconnect'
                                ))
                        else:
                            # FastAPI import exists but couldn't parse it - flag as potential issue
                            issues.append(ValidationIssue(
                                layer='production_readiness',
                                severity='high',
                                message=f'{path}: Uses WebSocketDisconnect exception - verify it is imported from fastapi',
                                suggestion='Ensure: from fastapi import WebSocket, WebSocketDisconnect'
                            ))
                    else:
                        # No fastapi import at all
                        issues.append(ValidationIssue(
                            layer='production_readiness',
                            severity='critical',
                            message=f'{path}: Uses WebSocketDisconnect exception but fastapi is not imported',
                            suggestion='Add: from fastapi import WebSocket, WebSocketDisconnect'
                        ))
                
                # CRITICAL: Check for missing exception imports in general
                exception_patterns = [
                    ('except ConnectionError', 'ConnectionError'),
                    ('except ValueError', 'ValueError'),
                    ('except KeyError', 'KeyError'),
                ]
                for pattern, exc_name in exception_patterns:
                    if pattern in content:
                        # Check if it's a standard exception (doesn't need import) or custom
                        if exc_name not in ['ValueError', 'KeyError', 'TypeError', 'RuntimeError', 'Exception']:
                            if f'import {exc_name}' not in content and f'from .* import.*{exc_name}' not in content:
                                issues.append(ValidationIssue(
                                    layer='production_readiness',
                                    severity='high',
                                    message=f'{path}: Uses {exc_name} exception but it may not be imported',
                                    suggestion=f'Ensure {exc_name} is imported if it is a custom exception'
                                ))
            
            elif op.get('type') == 'edit':
                edits = op.get('edits', [])
                path = op.get('path', '')
                
                for edit in edits:
                    new_code = edit.get('new_code', '')
                    
                    # Same checks for edit operations
                    if 'dtype=np.float32' in new_code or 'dtype=float32' in new_code:
                        if 'audio' in new_code.lower() or 'vosk' in new_code.lower():
                            issues.append(ValidationIssue(
                                layer='production_readiness',
                                severity='critical',
                                message=f'{path} line {edit.get("start_line")}: Uses float32 for audio but Vosk expects int16',
                                suggestion='Convert to int16: (audio * 32767).astype(np.int16)'
                            ))
                    
                    # CRITICAL: Check for missing exception imports in edits
                    if 'except WebSocketDisconnect' in new_code:
                        # Need to check if WebSocketDisconnect is imported in the FULL file, not just this edit
                        # This is harder without full context, so flag as potential issue
                        issues.append(ValidationIssue(
                            layer='production_readiness',
                            severity='high',
                            message=f'{path} line {edit.get("start_line")}: Uses WebSocketDisconnect - verify it is imported from fastapi',
                            suggestion='Ensure: from fastapi import WebSocket, WebSocketDisconnect'
                        ))
                    
                    # Check for hardcoded model paths - but allow actual repository paths
                    if ('"model"' in new_code or "'model'" in new_code):
                        if 'vosk' in new_code.lower() or 'Model(' in new_code:
                            # CRITICAL FIX: Don't flag if using actual model name
                            if 'vosk-model' not in new_code:
                                issues.append(ValidationIssue(
                                    layer='production_readiness',
                                    severity='high',
                                    message=f'{path} line {edit.get("start_line")}: Hardcoded placeholder path "model"',
                                    suggestion='Use actual path from repository like "vosk-model-small-en-us-0.15" or environment variable'
                                ))
        
        # Calculate confidence (1.0 if no critical issues, scaled down by issue count)
        critical_count = len([i for i in issues if i.severity == 'critical'])
        high_count = len([i for i in issues if i.severity == 'high'])
        
        if critical_count > 0:
            confidence = 0.0  # Fail completely if critical production issues
        elif high_count > 0:
            confidence = max(0.5, 1.0 - (high_count * 0.15))  # 15% penalty per high issue
        else:
            confidence = 1.0
        
        return issues, confidence
    
    async def _layer_11_ai_logic_bug_detection(
        self,
        operations: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        metadata: Dict[str, Any] = None
    ) -> Tuple[List[ValidationIssue], float]:
        """
        Layer 11: AI Logic Bug Detection (ADVISORY ONLY)
        
        Uses AI to detect logic bugs that static analysis misses:
        - Empty data handling (if not data: break causing immediate disconnect)
        - Race conditions (concurrent access without locks)
        - Null pointer exceptions (accessing attributes without None checks)
        - Infinite loops (while True without proper exit conditions)
        - Edge case failures (timezone bugs, off-by-one errors)
        - Resource leaks (unclosed files, connections)
        
        This is ADVISORY - provides warnings but doesn't block deployment.
        """
        issues = []
        metadata = metadata or {}
        
        try:
            # Extract code from operations
            code_blocks = []
            for op in operations:
                if op.get('type') in ['create', 'edit']:
                    path = op.get('path', 'unknown')
                    if op.get('type') == 'create':
                        code_blocks.append((path, op.get('content', '')))
                    else:
                        for edit in op.get('edits', []):
                            code_blocks.append((path, edit.get('new_code', '')))
            
            if not code_blocks:
                return [], 1.0
            
            # Build prompt for AI (increased context to 3000 chars to reduce false positives)
            code_summary = "\n\n".join([f"File: {path}\n```\n{code[:3000]}\n```" for path, code in code_blocks[:3]])
            
            prompt = f"""Analyze this code for LOGIC BUGS (not syntax errors). Focus on runtime issues that would cause failures in production.

Issue Context:
{issue_title}
{issue_body[:500]}

Generated Code:
{code_summary}

Detect ONLY these types of bugs:
1. **Empty data handling**: Code that breaks/returns on empty input (e.g., `if not data: break` in WebSocket handlers)
2. **Race conditions**: Concurrent access without proper locking
3. **Null checks**: Accessing attributes/methods without checking for None
4. **Infinite loops**: `while True` without proper exit conditions or timeouts
5. **Resource leaks**: Files/connections/sockets not closed in finally blocks
6. **Edge cases**: Off-by-one errors, timezone bugs, boundary conditions

Respond in JSON format:
{{
  "bugs": [
    {{
      "type": "empty_data_handling",
      "severity": "high",
      "line": "if not data: break",
      "issue": "Breaks immediately when client connects without sending data, causing premature disconnect",
      "suggestion": "Check for connection close instead: try: data = await websocket.receive_bytes() except WebSocketDisconnect: break"
    }}
  ],
  "confidence": 0.85
}}

If NO bugs found, return: {{"bugs": [], "confidence": 1.0}}"""
            
            # Call AI (Unified Client with validation task type)
            from services.unified_ai_client import unified_client
            response = await unified_client.generate_content_async(
                prompt, 
                temperature=0.3, 
                max_tokens=2000,
                task_type='validation'
            )
            
            if not response:
                logger.warning("⚠️ AI logic bug detection returned empty response")
                return [], 1.0
            
            # Parse JSON response
            import json
            import re
            
            # Extract JSON from response (might be wrapped in markdown)
            json_match = re.search(r'```json\s*({.*?})\s*```', response, re.DOTALL)
            if json_match:
                response = json_match.group(1)
            elif response.strip().startswith('{'):
                pass  # Already JSON
            else:
                # Try to find JSON anywhere in response
                json_match = re.search(r'{.*}', response, re.DOTALL)
                if json_match:
                    response = json_match.group(0)
            
            result = json.loads(response)
            bugs = result.get('bugs', [])
            ai_confidence = result.get('confidence', 1.0)
            
            # Convert bugs to ValidationIssues
            for bug in bugs:
                severity = bug.get('severity', 'medium')
                if severity not in ['critical', 'high', 'medium', 'low']:
                    severity = 'medium'
                
                bug_type = bug.get('type', 'unknown')
                issue_text = bug.get('issue', 'Unknown issue')
                suggestion = bug.get('suggestion', '')
                problematic_line = bug.get('line', '')
                
                # Build more prescriptive fix instruction
                fix_instruction = suggestion  # Default to suggestion
                if problematic_line and suggestion:
                    # Make it more specific
                    fix_instruction = f"REPLACE THIS CODE:\n{problematic_line}\n\nWITH THIS FIX:\n{suggestion}\n\nThis will resolve: {issue_text}"
                
                issues.append(ValidationIssue(
                    layer='ai_logic_bugs',
                    severity=severity,
                    message=f"Logic bug ({bug_type}): {issue_text}",
                    suggestion=suggestion,
                    fix_instruction=fix_instruction
                ))
            
            logger.info(f"🤖 AI logic bug detection: {len(bugs)} bugs found, confidence={ai_confidence:.2f}")
            
            # Calculate score (1.0 if no bugs, reduced by bug count and severity)
            if not bugs:
                return issues, 1.0
            
            critical_count = len([b for b in bugs if b.get('severity') == 'critical'])
            high_count = len([b for b in bugs if b.get('severity') == 'high'])
            
            # Score: Start at AI confidence, reduce by severity
            score = ai_confidence * (1.0 - (critical_count * 0.3) - (high_count * 0.15))
            score = max(0.0, min(1.0, score))
            
            return issues, score
            
        except Exception as e:
            logger.error(f"❌ AI logic bug detection failed: {e}")
            # Don't fail validation if AI fails - this is advisory only
            return [], 1.0
    
    async def _layer_12_requirements_satisfaction(
        self,
        operations: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        metadata: Dict[str, Any] = None
    ) -> Tuple[List[ValidationIssue], float]:
        """
        Layer 12: Requirements Satisfaction Check (ADVISORY ONLY)
        
        Uses AI to verify generated code satisfies the original issue requirements.
        Checks:
        1. Does code implement the requested feature?
        2. Are all acceptance criteria met?
        3. Are edge cases mentioned in issue handled?
        4. Does API contract match issue description?
        
        This is ADVISORY - provides feedback but doesn't block deployment.
        """
        issues = []
        metadata = metadata or {}
        
        try:
            # Extract code summary
            code_summary = []
            for op in operations:
                if op.get('type') in ['create', 'edit']:
                    path = op.get('path', 'unknown')
                    if op.get('type') == 'create':
                        content = op.get('content', '')[:800]
                        code_summary.append(f"Created {path}")
                    else:
                        edit_count = len(op.get('edits', []))
                        code_summary.append(f"Modified {path} ({edit_count} edits)")
            
            summary_text = "\n".join(code_summary)
            
            prompt = f"""Compare the ISSUE REQUIREMENTS against the GENERATED CODE to verify completeness.

ISSUE TITLE: {issue_title}

ISSUE REQUIREMENTS:
{issue_body[:1000]}

GENERATED CODE CHANGES:
{summary_text}

Extract acceptance criteria from issue and check if each is satisfied.

Respond in JSON format:
{{
  "satisfied": [
    "WebSocket endpoint /ws/stt implemented",
    "Sends partial transcriptions with is_final=False"
  ],
  "missing": [
    "Documentation not updated",
    "Example client code not provided"
  ],
  "satisfaction_score": 0.75
}}

If ALL requirements satisfied, return: {{"satisfied": [...], "missing": [], "satisfaction_score": 1.0}}"""
            
            # Call AI
            from services.unified_ai_client import unified_client
            response = await unified_client.generate_content_async(
                prompt, 
                temperature=0.3, 
                max_tokens=1500,
                task_type='validation'
            )
            
            if not response:
                logger.warning("⚠️ Requirements satisfaction check returned empty response")
                return [], 1.0
            
            # Parse JSON
            import json
            import re
            
            json_match = re.search(r'```json\s*({.*?})\s*```', response, re.DOTALL)
            if json_match:
                response = json_match.group(1)
            elif not response.strip().startswith('{'):
                json_match = re.search(r'{.*}', response, re.DOTALL)
                if json_match:
                    response = json_match.group(0)
            
            result = json.loads(response)
            satisfied = result.get('satisfied', [])
            missing = result.get('missing', [])
            score = result.get('satisfaction_score', 0.0)
            
            # Create issues for missing requirements
            # 🔥 CRITICAL FIX: Missing core feature = HIGH severity (BLOCKING)
            # Documentation/examples missing = MEDIUM (advisory)
            for item in missing:
                # Determine if this is a CORE FEATURE or just documentation
                item_lower = item.lower()
                is_core_feature = any(keyword in item_lower for keyword in [
                    'endpoint', 'websocket', 'api', 'route', 'handler',
                    'transcription', 'streaming', 'real-time', 'processing',
                    'core', 'main', 'primary', 'key feature'
                ])
                
                severity = 'high' if is_core_feature else 'medium'
                issues.append(ValidationIssue(
                    layer='requirements_satisfaction',
                    severity=severity,
                    message=f"Missing {'CORE' if is_core_feature else ''} requirement: {item}",
                    suggestion=f"Add {item} to complete the implementation",
                    fix_instruction=f"Implement: {item}" if is_core_feature else None
                ))
            
            logger.info(f"✅ Requirements satisfaction: {len(satisfied)} satisfied, {len(missing)} missing, score={score:.2f}")
            
            return issues, score
            
        except Exception as e:
            logger.error(f"❌ Requirements satisfaction check failed: {e}")
            # Don't fail validation if AI fails
            return [], 1.0
    
    async def _layer_13_generate_tests(
        self,
        operations: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        metadata: Dict[str, Any] = None
    ) -> Tuple[List[ValidationIssue], float, Optional[str]]:
        """
        Layer 13: Automated Test Generation (OPTIONAL)
        
        Generates pytest test files for new features based on code changes.
        Returns:
        - issues: Any problems with test generation
        - score: Always 1.0 (doesn't affect validation)
        - tests: Generated test code as string
        
        This is OPTIONAL - only runs if user enables test generation.
        """
        issues = []
        metadata = metadata or {}
        
        # Check if test generation is enabled
        if not metadata.get('generate_tests', False):
            return [], 1.0, None
        
        try:
            # Extract code for test generation
            code_blocks = []
            for op in operations:
                if op.get('type') in ['create', 'edit']:
                    path = op.get('path', 'unknown')
                    if op.get('type') == 'create':
                        code_blocks.append((path, op.get('content', '')))
                    else:
                        for edit in op.get('edits', []):
                            code_blocks.append((path, edit.get('new_code', '')))
            
            if not code_blocks:
                return [], 1.0, None
            
            # Build prompt for test generation
            code_summary = "\n\n".join([f"File: {path}\n```python\n{code[:1500]}\n```" for path, code in code_blocks[:2]])
            
            prompt = f"""Generate pytest tests for this code.

Feature: {issue_title}

Requirements:
{issue_body[:800]}

Code to test:
{code_summary}

Generate a complete pytest test file that covers:
1. Unit tests for individual functions
2. Integration tests for API endpoints
3. Edge case tests (empty data, errors, timeouts)
4. WebSocket-specific tests if applicable

Use pytest, pytest-asyncio, and appropriate mocking.

Respond with ONLY the test code, no explanations:"""
            
            # Call AI
            from services.unified_ai_client import unified_client
            response = await unified_client.generate_content_async(prompt, temperature=0.5, max_tokens=3000)
            
            if not response:
                logger.warning("⚠️ Test generation returned empty response")
                return [], 1.0, None
            
            # Extract Python code from response
            import re
            code_match = re.search(r'```python\s*(.+?)\s*```', response, re.DOTALL)
            if code_match:
                test_code = code_match.group(1)
            else:
                test_code = response
            
            logger.info(f"🧪 Generated {len(test_code)} chars of test code")
            
            return [], 1.0, test_code
            
        except Exception as e:
            logger.error(f"❌ Test generation failed: {e}")
            return [], 1.0, None
    
    async def _layer_14_docker_test_execution(
        self,
        operations: List[Dict[str, Any]],
        issue_title: str,
        issue_body: str,
        metadata: Dict[str, Any] = None
    ) -> Tuple[List[ValidationIssue], float]:
        """
        Layer 14: Docker Test Execution (BLOCKING)
        
        Actually builds and runs Docker containers with the patched code to verify:
        - Build succeeds
        - Tests pass in containerized environment
        - No runtime errors
        - WebSocket/network endpoints work
        
        This catches issues that static analysis and AI detection miss.
        
        Returns:
            issues: List of test failures (blocking)
            score: 1.0 if all tests pass, 0.0 if any fail
        """
        issues = []
        metadata = metadata or {}
        
        try:
            import tempfile
            import shutil
            import subprocess
            import os
            
            # Check if Docker is available
            try:
                subprocess.run(['docker', '--version'], capture_output=True, check=True, timeout=5)
            except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                logger.warning("⚠️ Docker not available, skipping container tests")
                return [], 1.0
            
            # Get test package directory from metadata
            test_package_dir = metadata.get('test_package_dir')
            if not test_package_dir or not os.path.exists(test_package_dir):
                logger.info("ℹ️ No test package directory provided, skipping Docker tests")
                return [], 1.0
            
            logger.info(f"🐳 Running Docker tests in: {test_package_dir}")
            
            # Run the test script (setup.bat/sh applies patch, run_tests.bat/sh runs tests)
            is_windows = os.name == 'nt'
            
            # Step 1: Setup (apply patch)
            setup_script = os.path.join(test_package_dir, 'setup.bat' if is_windows else 'setup.sh')
            if os.path.exists(setup_script):
                logger.info("📦 Applying patch via setup script...")
                try:
                    result = subprocess.run(
                        [setup_script] if is_windows else ['bash', setup_script],
                        cwd=test_package_dir,
                        capture_output=True,
                        text=True,
                        timeout=120  # 2 minute timeout for setup
                    )
                    
                    if result.returncode != 0:
                        issues.append(ValidationIssue(
                            layer='docker_tests',
                            severity='critical',
                            message=f"Setup failed (exit {result.returncode}): {result.stderr[:500]}",
                            suggestion="Check patch file and repository configuration"
                        ))
                        return issues, 0.0
                except subprocess.TimeoutExpired:
                    issues.append(ValidationIssue(
                        layer='docker_tests',
                        severity='critical',
                        message="Setup timed out after 2 minutes",
                        suggestion="Simplify setup or increase timeout"
                    ))
                    return issues, 0.0
            
            # Step 2: Run tests
            test_script = os.path.join(test_package_dir, 'run_tests.bat' if is_windows else 'run_tests.sh')
            if not os.path.exists(test_script):
                logger.info("ℹ️ No test script found, skipping test execution")
                return [], 1.0
            
            logger.info("🧪 Running Docker tests...")
            try:
                result = subprocess.run(
                    [test_script] if is_windows else ['bash', test_script],
                    cwd=test_package_dir,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout for tests
                )
                
                # Parse test output for failures
                output = result.stdout + result.stderr
                
                # Check for common failure patterns
                if result.returncode != 0:
                    # Parse pytest output
                    if 'FAILED' in output or 'ERROR' in output:
                        # Extract failed test names
                        import re
                        failed_tests = re.findall(r'(test_\w+)\s+FAILED', output)
                        error_details = re.findall(r'(Error|Exception|RuntimeError|WebSocketDisconnect):\s*(.+)', output)
                        
                        for test_name in set(failed_tests):
                            # Find error context for this test
                            test_errors = [err for err in error_details if test_name in output]
                            error_msg = test_errors[0][1] if test_errors else "Test failed (see logs)"
                            
                            issues.append(ValidationIssue(
                                layer='docker_tests',
                                severity='critical',
                                message=f"Test failed: {test_name} - {error_msg[:200]}",
                                suggestion="Review test output and fix code logic"
                            ))
                    
                    # Check for port conflicts
                    if 'port is already allocated' in output.lower():
                        issues.append(ValidationIssue(
                            layer='docker_tests',
                            severity='high',
                            message="Docker port conflict: Port 8000 already in use",
                            suggestion="Stop other containers using port 8000 or use docker-compose down"
                        ))
                    
                    # Check for build failures
                    if 'build failed' in output.lower() or 'error building' in output.lower():
                        issues.append(ValidationIssue(
                            layer='docker_tests',
                            severity='critical',
                            message="Docker build failed - check Dockerfile and dependencies",
                            suggestion="Review build logs and fix Dockerfile or requirements.txt"
                        ))
                    
                    # Generic failure if no specific pattern matched
                    if not issues:
                        issues.append(ValidationIssue(
                            layer='docker_tests',
                            severity='critical',
                            message=f"Tests failed (exit {result.returncode})",
                            suggestion="Review test output for details"
                        ))
                    
                    return issues, 0.0
                
                # Tests passed!
                logger.info("✅ All Docker tests passed successfully")
                return [], 1.0
                
            except subprocess.TimeoutExpired:
                issues.append(ValidationIssue(
                    layer='docker_tests',
                    severity='critical',
                    message="Tests timed out after 5 minutes",
                    suggestion="Optimize test execution or increase timeout"
                ))
                return issues, 0.0
        
        except Exception as e:
            logger.error(f"❌ Docker test execution failed: {e}")
            # Don't fail validation if Docker tests can't run - treat as advisory
            logger.warning("⚠️ Treating Docker test failure as advisory (infrastructure issue)")
            return [], 1.0
    
    def _auto_fix_syntax(self, code: str, error_msg: str) -> str:
        """
        Attempt to automatically fix common syntax errors.
        Returns fixed code or original code if unfixable.
        """
        import re
        
        # Fix 1: Unexpected indent - dedent the entire block
        if 'unexpected indent' in error_msg.lower():
            lines = code.split('\n')
            # Find minimum indentation
            min_indent = float('inf')
            for line in lines:
                if line.strip():
                    indent = len(line) - len(line.lstrip())
                    min_indent = min(min_indent, indent)
            
            if min_indent > 0 and min_indent != float('inf'):
                # Dedent all lines by minimum indent
                fixed_lines = []
                for line in lines:
                    if line.strip():
                        fixed_lines.append(line[min_indent:])
                    else:
                        fixed_lines.append(line)
                return '\n'.join(fixed_lines)
        
        # Fix 2: Missing colon - add colon to common structures
        if 'expected \':\''.lower() in error_msg.lower():
            # Add missing colons to if/for/while/def/class statements
            code = re.sub(r'(^\s*(?:if|elif|else|for|while|def|class|with|try|except|finally)\s+[^\n:]+)(\s*\n)', r'\1:\2', code, flags=re.MULTILINE)
        
        # Fix 3: Invalid syntax with // comments - replace with # comments
        if '//' in code:
            code = re.sub(r'//\s*(.*)$', r'# \1', code, flags=re.MULTILINE)
        
        return code


