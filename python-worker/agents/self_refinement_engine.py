"""
Self-Refinement Engine - Phase 5 of RATFV
==========================================

Iteratively improves failed/low-confidence fixes through:
1. Validation feedback analysis
2. LLM-based critique generation
3. Targeted refinement of weak areas
4. Up to 3 refinement iterations

Based on: "Self-Refine: Iterative Refinement with Self-Feedback" (Madaan et al., 2023)
Target: +15% recovery rate on failed fixes
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from utils.logger import get_logger
from services.gemini_client import gemini_client

logger = get_logger(__name__)


@dataclass
class RefinementIteration:
    """Record of a single refinement iteration."""
    iteration: int
    critique: str
    focus_areas: List[str]
    improvements_made: List[str]
    confidence_before: float
    confidence_after: float
    validation_issues_before: int
    validation_issues_after: int


@dataclass
class RefinementResult:
    """Result of the refinement process."""
    refined_fix: Dict[str, Any]
    iterations: List[RefinementIteration]
    final_confidence: float
    improvement_achieved: bool
    termination_reason: str  # max_iterations, high_confidence, no_improvement, error


class SelfRefinementEngine:
    """
    Self-Refinement Engine: Iterative fix improvement.
    
    Process:
    1. Analyze validation feedback to identify weaknesses
    2. Generate targeted critique focusing on failing areas
    3. Refine the fix to address critique
    4. Re-validate and measure improvement
    5. Repeat up to 2 times or until high confidence achieved
    
    CRITICAL FIX: Reduced iterations from 5 to 2 to prevent:
    - Over-refinement causing quality degradation (54% -> 4.5% in logs)
    - Excessive API calls (28 calls for simple WebSocket)
    - Wasted time on issues that can't be fixed
    
    Termination Conditions:
    - Achieved confidence >= 0.85 (success) AND no critical issues remain
    - Reached max iterations (2)
    - Confidence degrading (early exit to prevent further damage)
    - Critical error occurred
    """
    
    MAX_ITERATIONS = 2  # Reduced from 5 to prevent over-refinement degradation
    TARGET_CONFIDENCE = 0.85  # Raised to 85% for GPT-4.1 quality
    MIN_IMPROVEMENT_THRESHOLD = 0.01  # Accept 1%+ improvement
    SKIP_THRESHOLD = 0.85  # Skip refinement if initial confidence >= 85%
    
    def __init__(self):
        self.iteration_history: List[RefinementIteration] = []
    
    async def refine_fix(
        self,
        initial_fix: Dict[str, Any],
        validation_result: Any,  # ValidationResult
        understanding: Any,  # IssueUnderstanding
        relevant_files: List[Any],  # List[RetrievedFile]
        issue_title: str,
        issue_body: str,
        validator: Any  # MultiLayerValidator instance
    ) -> RefinementResult:
        """
        Iteratively refine a fix until high confidence or max iterations.
        
        Returns:
            RefinementResult with refined fix and iteration history
        """
        logger.info(f"🔧 Starting self-refinement (max {self.MAX_ITERATIONS} iterations)")
        
        # CRITICAL FIX #3: Detect format issues vs quality issues
        critical_issues = [i for i in validation_result.issues if i.severity == 'critical']
        
        # Categorize issues
        format_issues = []
        quality_issues = []
        
        for issue in critical_issues:
            msg_lower = issue.message.lower()
            if any(keyword in msg_lower for keyword in ['empty old_code', 'empty field', 'old_code or new_code fields']):
                format_issues.append(issue)
            else:
                quality_issues.append(issue)
        
        # If ONLY format issues (no quality issues), skip refinement
        if format_issues and not quality_issues:
            logger.warning(f"⚠️ SKIPPING REFINEMENT: Found {len(format_issues)} format issues (empty old_code) but no quality issues")
            logger.warning("⚠️ These are auto-fixable - refinement would not help and wastes API calls")
            logger.info("✅ Auto-fix should have already handled these in tree_of_thought_generator.py")
            return RefinementResult(
                refined_fix=initial_fix,
                iterations=[],
                final_confidence=validation_result.confidence,
                improvement_achieved=False,
                termination_reason='format_issues_only_skip_refinement'
            )
        
        # CRITICAL FIX: Skip refinement if initial confidence is already high
        if validation_result.confidence >= self.SKIP_THRESHOLD:
            logger.info(f"✅ SKIPPING REFINEMENT: Initial confidence {validation_result.confidence:.1%} >= {self.SKIP_THRESHOLD:.0%}")
            return RefinementResult(
                refined_fix=initial_fix,
                iterations=[],
                final_confidence=validation_result.confidence,
                improvement_achieved=False,
                termination_reason='high_initial_confidence'
            )
        
        # SPECIAL CASE: Low confidence due to ONLY missing imports? Try ONE fix iteration
        missing_import_issues = [i for i in validation_result.issues 
                                  if 'import' in i.message.lower() and 
                                     ('missing' in i.message.lower() or 'not imported' in i.message.lower())]
        other_critical_issues = [i for i in validation_result.issues 
                                 if i.severity == 'critical' and i not in missing_import_issues]
        
        # CRITICAL FIX: Skip refinement for very low confidence (< 10%)
        # EXCEPT if ONLY missing imports (no other critical issues)
        if validation_result.confidence < 0.10:
            if missing_import_issues and not other_critical_issues:
                logger.info(f"💡 Low confidence ({validation_result.confidence:.1%}) but ONLY due to {len(missing_import_issues)} missing import(s)")
                logger.info("   Attempting ONE refinement iteration to fix imports")
                max_iterations_override = 1  # Just fix imports, don't iterate further
            else:
                logger.warning(f"⚠️ SKIPPING REFINEMENT: Initial confidence {validation_result.confidence:.1%} < 10%")
                logger.warning("⚠️ Confidence too low indicates fundamental issues - refinement unlikely to help")
                logger.info("💡 Better to regenerate from scratch than try to refine a broken approach")
                return RefinementResult(
                    refined_fix=initial_fix,
                    iterations=[],
                    final_confidence=validation_result.confidence,
                    improvement_achieved=False,
                    termination_reason='too_low_to_refine'
                )
        else:
            max_iterations_override = None  # Use default MAX_ITERATIONS
            max_iterations_override = None  # Use default MAX_ITERATIONS
        
        current_fix = initial_fix
        current_validation = validation_result
        iterations: List[RefinementIteration] = []
        previous_confidence = validation_result.confidence
        
        # Use override if set (for missing import cases)
        # CRITICAL FIX: Reduce MAX_ITERATIONS from 3 to 1
        # Competitive analysis showed refinement degrades quality:
        # Demo 21: Initial 54% -> Iter 1: 36% -> Iter 2: 18% -> Iter 3: 0%
        # One refinement is enough - more attempts make things worse
        max_iterations = max_iterations_override if max_iterations_override is not None else 1
        
        for iteration_num in range(1, max_iterations + 1):
            logger.info(f"Iteration {iteration_num}/{max_iterations} - Current confidence: {current_validation.confidence:.1%}")
            
            # Check for critical issues that must be fixed
            critical_issues = [i for i in current_validation.issues if i.severity == 'critical']
            has_critical_issues = len(critical_issues) > 0
            
            # Check termination conditions
            if current_validation.confidence >= self.TARGET_CONFIDENCE and not has_critical_issues:
                logger.info(f"✅ High confidence achieved ({current_validation.confidence:.1%}) with no critical issues")
                return RefinementResult(
                    refined_fix=current_fix,
                    iterations=iterations,
                    final_confidence=current_validation.confidence,
                    improvement_achieved=True,
                    termination_reason='high_confidence'
                )
            
            # Generate critique based on validation feedback
            critique, focus_areas = await self._generate_critique(
                current_fix,
                current_validation,
                understanding,
                issue_title,
                issue_body
            )
            
            logger.info(f"📝 Critique generated: {len(focus_areas)} focus areas")
            
            # Refine the fix based on critique
            try:
                refined_fix = await self._refine_based_on_critique(
                    current_fix=current_fix,
                    critique=critique,
                    focus_areas=focus_areas,
                    validation_issues=current_validation.issues,
                    understanding=understanding,
                    relevant_files=relevant_files
                )
                
                # Re-validate the refined fix
                new_validation = await validator.validate_fix(
                    proposed_fix=refined_fix,
                    understanding=understanding,
                    relevant_files=relevant_files,
                    issue_title=issue_title,
                    issue_body=issue_body
                )
                
                # Record iteration
                iteration_record = RefinementIteration(
                    iteration=iteration_num,
                    critique=critique,
                    focus_areas=focus_areas,
                    improvements_made=self._identify_improvements(current_fix, refined_fix),
                    confidence_before=current_validation.confidence,
                    confidence_after=new_validation.confidence,
                    validation_issues_before=len(current_validation.issues),
                    validation_issues_after=len(new_validation.issues)
                )
                iterations.append(iteration_record)
                
                # Check for improvement
                improvement = new_validation.confidence - current_validation.confidence
                new_critical_issues = [i for i in new_validation.issues if i.severity == 'critical']
                issues_reduced = len(new_validation.issues) < len(current_validation.issues)
                
                # CRITICAL FIX: Early exit if confidence is degrading
                if improvement < -0.05:  # More than 5% degradation
                    logger.error(f"🚨 DEGRADATION DETECTED: Confidence dropped {improvement:.1%} (stop to prevent further damage)")
                    return RefinementResult(
                        refined_fix=current_fix,  # Return previous version (better quality)
                        iterations=iterations,
                        final_confidence=current_validation.confidence,
                        improvement_achieved=False,
                        termination_reason='degradation_detected'
                    )
                
                # Continue if: confidence improved OR critical issues reduced OR still has critical issues
                should_continue = (
                    improvement >= self.MIN_IMPROVEMENT_THRESHOLD or
                    issues_reduced or
                    len(new_critical_issues) > 0
                )
                
                if improvement < self.MIN_IMPROVEMENT_THRESHOLD and not should_continue:
                    logger.warning(f"⚠️ Minimal improvement ({improvement:+.1%}), stopping refinement")
                    return RefinementResult(
                        refined_fix=current_fix if improvement < 0 else refined_fix,
                        iterations=iterations,
                        final_confidence=max(current_validation.confidence, new_validation.confidence),
                        improvement_achieved=improvement > 0,
                        termination_reason='no_improvement'
                    )
                
                logger.info(f"📈 Improvement: {improvement:+.1%} ({current_validation.confidence:.1%} → {new_validation.confidence:.1%}), issues: {len(current_validation.issues)} → {len(new_validation.issues)}")
                
                # Update for next iteration
                current_fix = refined_fix
                current_validation = new_validation
                previous_confidence = new_validation.confidence
                # Update for next iteration
                current_fix = refined_fix
                current_validation = new_validation
                
            except Exception as e:
                logger.error(f"❌ Refinement iteration {iteration_num} failed: {str(e)}")
                return RefinementResult(
                    refined_fix=current_fix,
                    iterations=iterations,
                    final_confidence=current_validation.confidence,
                    improvement_achieved=False,
                    termination_reason=f'error: {str(e)}'
                )
        
        # Max iterations reached
        logger.info(f"⏱️ Max iterations reached. Final confidence: {current_validation.confidence:.1%}")
        return RefinementResult(
            refined_fix=current_fix,
            iterations=iterations,
            final_confidence=current_validation.confidence,
            improvement_achieved=len(iterations) > 0 and iterations[-1].confidence_after > iterations[0].confidence_before,
            termination_reason='max_iterations'
        )
    
    async def _generate_critique(
        self,
        current_fix: Dict[str, Any],
        validation_result: Any,
        understanding: Any,
        issue_title: str,
        issue_body: str
    ) -> Tuple[str, List[str]]:
        """
        Generate targeted critique based on validation feedback.
        
        Returns:
            (critique_text, focus_areas)
        """
        
        # Summarize validation issues with MORE DETAIL
        critical_issues = [i for i in validation_result.issues if i.severity == 'critical']
        high_issues = [i for i in validation_result.issues if i.severity == 'high']
        medium_issues = [i for i in validation_result.issues if i.severity == 'medium']
        
        # Identify weak layers
        weak_layers = [
            (layer, score) 
            for layer, score in validation_result.layer_scores.items() 
            if score < 0.75
        ]
        
        # Build detailed issues text
        issues_detail = ""
        if critical_issues:
            issues_detail += "**CRITICAL ISSUES (MUST FIX):**\n"
            for i in critical_issues[:5]:  # Show up to 5
                file_info = f" in {i.file_path}" if i.file_path else ""
                suggestion = f"\n  Suggestion: {i.suggestion}" if i.suggestion else ""
                issues_detail += f"- {i.message}{file_info}{suggestion}\n"
            issues_detail += "\n"
        
        if high_issues:
            issues_detail += "**HIGH PRIORITY ISSUES:**\n"
            for i in high_issues[:3]:
                file_info = f" in {i.file_path}" if i.file_path else ""
                suggestion = f"\n  Suggestion: {i.suggestion}" if i.suggestion else ""
                issues_detail += f"- {i.message}{file_info}{suggestion}\n"
            issues_detail += "\n"
        
        # Build critique prompt with specific actionable issues
        prompt = f"""You are an expert code reviewer providing constructive critique.

**Issue:** {issue_title}
{issue_body}

**Requirements:**
{chr(10).join(f'- {req}' for req in understanding.requirements[:5])}

**Current Fix Confidence:** {validation_result.confidence:.1%}
**Target Confidence:** 80%+

**🚨 VALIDATION FAILURES - YOU MUST ADDRESS THESE:**
{issues_detail}

**Validation Summary:**
- Total Issues: {len(validation_result.issues)} ({len(critical_issues)} critical, {len(high_issues)} high, {len(medium_issues)} medium)

**Weak Areas:**
{chr(10).join(f'- {layer}: {score:.1%}' for layer, score in weak_layers[:3])}

**Your Task:**
Provide a focused critique that:
1. Identifies the ROOT CAUSE of validation failures
2. Prioritizes the most critical issues
3. Suggests specific improvements
4. Focuses on 2-3 key areas for refinement

**Output Format (JSON):**
```json
{{
  "critique": "Detailed critique focusing on why the fix is failing validation",
  "focus_areas": [
    "Specific area 1 that needs improvement",
    "Specific area 2 that needs improvement"
  ],
  "priority_fixes": [
    "Most critical fix needed",
    "Second most critical fix"
  ]
}}
```

Generate the critique now:"""
        
        try:
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.3,
                max_tokens=1500
            )
            
            result = self._parse_critique_response(response)
            
            critique = result.get('critique', 'General improvements needed')
            focus_areas = result.get('focus_areas', ['Correctness', 'Safety'])
            
            return critique, focus_areas
            
        except Exception as e:
            logger.error(f"Critique generation failed: {str(e)}")
            # Fallback: use validation issues directly
            focus_areas = list(set(i.layer for i in validation_result.issues[:3]))
            critique = "Address validation issues: " + ", ".join(i.message for i in validation_result.issues[:3])
            return critique, focus_areas
    
    async def _refine_based_on_critique(
        self,
        current_fix: Dict[str, Any],
        critique: str,
        focus_areas: List[str],
        validation_issues: List[Any],
        understanding: Any,
        relevant_files: List[Any]
    ) -> Dict[str, Any]:
        """
        Generate refined fix based on critique and focus areas.
        
        IMPORTANT: Works with both diff and operations formats.
        If diff exists, use that as primary format for refinement.
        
        Returns:
            Refined fix dictionary
        """
        
        # Extract formats from current fix
        current_operations = current_fix.get('operations', [])
        current_diff = current_fix.get('diff', None)
        
        # PRIORITY: Use diff format if available
        if current_diff:
            logger.info(f"✅ Refining using unified diff format ({len(current_diff)} chars)")
            return await self._refine_diff_based_on_critique(
                current_diff=current_diff,
                critique=critique,
                focus_areas=focus_areas,
                validation_issues=validation_issues,
                understanding=understanding,
                relevant_files=relevant_files
            )
        
        # Fallback to operations format (legacy)
        logger.info(f"Using operations format for refinement ({len(current_operations)} operations)")
        
        # CRITICAL FIX #4: Build file context with line numbers
        files_context = ""
        file_content_map = {}
        
        for f in relevant_files[:8]:  # Limit to 8 files to avoid context overflow
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            content = f.content if hasattr(f, 'content') else f.page_content
            file_content_map[path] = content
            
            lines = content.split('\n')
            # Show first 80 lines with line numbers
            numbered_lines = []
            for i, line in enumerate(lines[:80], 1):
                numbered_lines.append(f"   {i:3d}: {line}")
            
            files_context += f"\n**File: {path}**\n" + '\n'.join(numbered_lines) + "\n"
        
        # Summarize current fix
        current_operations = current_fix.get('operations', [])
        operations_summary = self._summarize_operations(current_operations)
        
        # Identify problematic files from validation issues
        problematic_files = set()
        empty_old_code_files = []
        placeholder_files = []
        undefined_function_issues = []
        wrong_operation_type_files = []  # 🔥 NEW: Files using "edit" when should be "create"
        
        for issue in validation_issues:
            if issue.file_path:
                problematic_files.add(issue.file_path)
                # Categorize issues
                if 'empty old_code' in issue.message.lower() or 'empty' in issue.message.lower():
                    empty_old_code_files.append(issue.file_path)
                elif 'placeholder' in issue.message.lower() or 'todo' in issue.message.lower():
                    placeholder_files.append(issue.file_path)
                elif 'context mismatch' in issue.message.lower() or 'not in the context' in issue.message.lower():
                    # 🔥 FIX: Detect when LLM is trying to EDIT a file that doesn't exist
                    wrong_operation_type_files.append(issue.file_path)
                elif 'undefined function' in issue.message.lower():
                    # Extract function name from message like "process_audio() is called but never defined"
                    import re
                    match = re.search(r'([a-zA-Z_][a-zA-Z0-9_]*)\(\) is called', issue.message)
                    if match:
                        func_name = match.group(1)
                        undefined_function_issues.append({'file': issue.file_path, 'function': func_name})
        
        # Build specific instructions based on issue types
        specific_instructions = []
        
        # 🔥 HIGHEST PRIORITY: Fix wrong operation type (edit vs create)
        if wrong_operation_type_files:
            specific_instructions.append(
                f"🚨 CRITICAL: WRONG OPERATION TYPE for: {', '.join(set(wrong_operation_type_files[:5]))}\n"
                f"   → These files DON'T EXIST in the repository!\n"
                f"   → Change type: \"edit\" to type: \"create\" with full content\n"
                f"   → DO NOT use 'edits' array - use 'content' field with complete file content\n"
                f"   → Example: {{\"type\": \"create\", \"path\": \"new_file.py\", \"content\": \"...full code...\"}}"
            )
        
        if empty_old_code_files:
            specific_instructions.append(
                f"🚨 FIX EMPTY old_code in: {', '.join(set(empty_old_code_files[:3]))}\n"
                f"   → Include surrounding context lines in old_code to show WHERE new code goes"
            )
        
        if undefined_function_issues:
            specific_instructions.append(
                f"🚨 FIX UNDEFINED FUNCTIONS:\n" +
                "\n".join(f"   → Define {item['function']}() in {item['file']} OR import it" for item in undefined_function_issues[:3])
            )
        if placeholder_files:
            specific_instructions.append(
                f"🚨 IMPLEMENT PLACEHOLDERS in: {', '.join(set(placeholder_files[:3]))}\n"
                f"   → Replace ALL TODO/placeholder comments with actual working code"
            )
        
        specific_instructions_text = "\n".join(specific_instructions) if specific_instructions else "(No specific file issues)"
        
        # Build refinement prompt with targeted focus
        prompt = f"""You are an expert software engineer refining a code fix based on critique.

**Original Issue Analysis:**
Root Cause: {understanding.root_cause}
Requirements: {', '.join(understanding.requirements[:3])}

**FILES WITH LINE NUMBERS (for reference when filling old_code):**
{files_context}

**Current Fix:**
{operations_summary}

**Critique:**
{critique}

**Focus Areas for Improvement:**
{chr(10).join(f'{i+1}. {area}' for i, area in enumerate(focus_areas))}

**🎯 SPECIFIC ISSUES TO FIX:**
{specific_instructions_text}

**Validation Issues to Address:**
{chr(10).join(f'- {issue.message}' for issue in validation_issues[:5])}

**🚨 CRITICAL: When fixing empty old_code:**
- Look at the FILE CONTEXT WITH LINE NUMBERS above
- Find the exact lines you want to modify
- COPY those exact lines into old_code field
- Example: If modifying lines 10-12, copy content from "   10: ..." to "   12: ..." above

**Your Task:**
Generate an IMPROVED version of the fix that:
1. Uses the FILE CONTEXT above to fill all empty old_code fields
2. Implements ALL placeholder comments with real code
3. Addresses all critique points
4. Maintains the overall fix approach but improves quality
5. **PRESERVES EXACT INDENTATION** (critical for Python!)

**🚨 INDENTATION REQUIREMENT (CRITICAL FOR PYTHON):**

When generating new_code, you MUST preserve exact indentation!

In JSON strings, use \\n for newlines and actual spaces for indentation:
```json
{{
  "new_code": "@app.websocket(\\"/ws/stt\\")\\nasync def websocket_stt(websocket: WebSocket):\\n    await websocket.accept()\\n    try:\\n        recognizer = KaldiRecognizer(model, 16000)\\n        while True:\\n            data = await websocket.receive_bytes()\\n            if recognizer.AcceptWaveform(data):\\n                result = recognizer.Result()\\n                await websocket.send_json({{\\\"result\\\": result}})\\n    except WebSocketDisconnect:\\n        pass"
}}
```

Notice each line after \\n includes the proper spaces for indentation!

**Output Format (JSON):**
```json
{{
  "operations": [
    {{
      "type": "edit|create|delete",
      "path": "path/to/file.py",
      "explanation": "What this operation does",
      
      // For EDIT: use edits array with old_code and new_code
      "edits": [
        {{
          "start_line": 10,
          "end_line": 15,
          "old_code": "EXACT code from lines 10-15 (MUST NOT BE EMPTY!)",
          "new_code": "improved code with \\n and proper indentation",
          "explanation": "How this addresses the critique"
        }}
      ]
    }}
  ],
  "improvements_summary": "Summary of key improvements made"
}}
```

Generate the refined fix now:"""
        
        try:
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.4,
                max_tokens=12000  # Increased from 6000 to prevent JSON truncation
            )
            
            refined_fix = self._parse_refined_fix(response)
            
            # Ensure we have operations
            if not refined_fix.get('operations'):
                logger.warning("No operations in refined fix, keeping original")
                return current_fix
            
            return refined_fix
            
        except Exception as e:
            logger.error(f"Refinement failed: {str(e)}")
            return current_fix  # Return original on failure
    
    def _summarize_operations(self, operations: List[Dict[str, Any]]) -> str:
        """Summarize operations for prompt - SHOW FULL OPERATIONS INCLUDING old_code."""
        import json
        
        # CRITICAL FIX: Don't just summarize - show the ACTUAL operations with old_code preserved!
        # The AI needs to see what it generated before, including blank line markers ("\n")
        
        summary_parts = []
        
        for i, op in enumerate(operations[:8], 1):  # Show up to 8 operations
            op_type = op.get('type', 'unknown')
            path = op.get('path', 'unknown')
            
            if op_type == 'create':
                content_len = len(op.get('content', ''))
                summary_parts.append(f"Operation {i}: CREATE {path} ({content_len} chars)")
            elif op_type == 'edit':
                edits = op.get('edits', [])
                summary_parts.append(f"\nOperation {i}: EDIT {path} ({len(edits)} edit(s))")
                
                # CRITICAL: Show the actual edits with old_code preserved!
                for j, edit in enumerate(edits[:3], 1):  # Show up to 3 edits per operation
                    old_code = edit.get('old_code', '')
                    new_code = edit.get('new_code', '')
                    start_line = edit.get('start_line', '?')
                    end_line = edit.get('end_line', '?')
                    
                    # Show old_code with repr() to preserve "\n" markers
                    old_code_display = repr(old_code[:100]) if old_code else '""'
                    new_code_preview = new_code[:80].replace('\n', '\\n') if new_code else ''
                    
                    summary_parts.append(f"  Edit {j}: lines {start_line}-{end_line}")
                    summary_parts.append(f"    old_code: {old_code_display} ({len(old_code)} chars)")
                    summary_parts.append(f"    new_code: {new_code_preview}... ({len(new_code)} chars)")
            elif op_type == 'delete':
                summary_parts.append(f"Operation {i}: DELETE {path}")
            else:
                summary_parts.append(f"Operation {i}: {op_type.upper()} {path}")
        
        return "\n".join(summary_parts)
    
    def _parse_critique_response(self, response: str) -> Dict[str, Any]:
        """Parse critique from LLM response."""
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
        return {
            'critique': response[:500],  # First 500 chars
            'focus_areas': ['Correctness', 'Safety'],
            'priority_fixes': ['Address validation issues']
        }
    
    def _parse_refined_fix(self, response: str) -> Dict[str, Any]:
        """Parse refined fix from LLM response with JSON repair."""
        import json
        import re
        
        # Check if response looks truncated
        if len(response) > 1000 and not response.rstrip().endswith(('```', '}', ']')):
            logger.warning(f"⚠️ Refinement response may be truncated (len={len(response)})")
        
        # Try to extract JSON
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
            try:
                data = json.loads(json_str)
                return {
                    'operations': data.get('operations', []),
                    'improvements_summary': data.get('improvements_summary', '')
                }
            except json.JSONDecodeError as e:
                logger.debug(f"JSON decode failed: {str(e)}")
                # Try to repair truncated JSON
                repaired = self._repair_truncated_json(json_str)
                if repaired:
                    try:
                        data = json.loads(repaired)
                        ops = data.get('operations', [])
                        if ops:
                            logger.warning(f"⚠️ Repaired truncated refinement JSON, extracted {len(ops)} operations")
                            return {
                                'operations': ops,
                                'improvements_summary': data.get('improvements_summary', 'Repaired from truncated response')
                            }
                    except:
                        pass
        
        # Try to extract operations array directly
        ops_match = re.search(r'"operations":\s*(\[[^\]]*\])', response, re.DOTALL)
        if ops_match:
            try:
                ops = json.loads(ops_match.group(1))
                if isinstance(ops, list) and len(ops) > 0:
                    logger.info(f"✅ Extracted {len(ops)} operations from refinement (direct array)")
                    return {'operations': ops, 'improvements_summary': 'Direct array extraction'}
            except:
                pass
        
        # Fallback: empty operations
        logger.warning("❌ Could not extract operations from refinement response")
        return {'operations': []}
    
    def _repair_truncated_json(self, json_str: str) -> str:
        """
        Attempt to repair truncated JSON by closing unclosed brackets/braces.
        Returns repaired JSON string or None if repair fails.
        """
        import json
        
        try:
            json.loads(json_str)
            return json_str  # Already valid
        except json.JSONDecodeError:
            pass
        
        # Count open/close brackets and braces
        open_braces = json_str.count('{') - json_str.count('}')
        open_brackets = json_str.count('[') - json_str.count(']')
        open_quotes = json_str.count('"') % 2
        
        repair = ""
        if open_quotes == 1:
            repair += '"'
        for _ in range(open_brackets):
            repair += ']'
        for _ in range(open_braces):
            repair += '}'
        
        repaired = json_str + repair
        
        try:
            json.loads(repaired)
            logger.info(f"✅ Successfully repaired truncated refinement JSON")
            return repaired
        except json.JSONDecodeError:
            return None
    
    def _identify_improvements(
        self,
        old_fix: Dict[str, Any],
        new_fix: Dict[str, Any]
    ) -> List[str]:
        """Identify what changed between old and new fix."""
        
        improvements = []
        
        old_ops = old_fix.get('operations', [])
        new_ops = new_fix.get('operations', [])
        
        # Count changes
        if len(new_ops) != len(old_ops):
            improvements.append(f"Changed number of operations ({len(old_ops)} → {len(new_ops)})")
        
        # Check for new files
        old_paths = set(op.get('path') for op in old_ops)
        new_paths = set(op.get('path') for op in new_ops)
        
        added_files = new_paths - old_paths
        removed_files = old_paths - new_paths
        
        if added_files:
            improvements.append(f"Added files: {', '.join(list(added_files)[:3])}")
        if removed_files:
            improvements.append(f"Removed files: {', '.join(list(removed_files)[:3])}")
        
        # Generic improvement if we can't detect specifics
        if not improvements:
            improvements.append("Refined code quality and structure")
        
        return improvements
    
    async def _refine_diff_based_on_critique(
        self,
        current_diff: str,
        critique: str,
        focus_areas: List[str],
        validation_issues: List[Any],
        understanding: Any,
        relevant_files: List[Any]
    ) -> Dict[str, Any]:
        """
        Refine a unified diff based on critique.
        
        This method parses the diff, identifies issues, and generates an improved diff.
        """
        logger.info("🔄 Refining unified diff based on critique")
        
        # Build file context
        files_context = ""
        for f in relevant_files[:5]:  # Limit to 5 files
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            content = f.content if hasattr(f, 'content') else f.page_content
            lines = content.split('\n')[:50]  # First 50 lines with numbers
            numbered = '\n'.join(f"   {i:3d}: {line}" for i, line in enumerate(lines, 1))
            files_context += f"\n**File: {path}**\n{numbered}\n"
        
        # Build validation issues summary
        issues_summary = "\n".join(
            f"- {issue.severity.upper()}: {issue.message}" 
            for issue in validation_issues[:10]
        )
        
        # Build prompt
        prompt = f"""You are refining a git unified diff patch that failed validation.

**Issue to fix:**
{understanding.problem_statement if hasattr(understanding, 'problem_statement') else 'See critique below'}

**Current Unified Diff:**
```diff
{current_diff}
```

**Validation Issues Found:**
{issues_summary}

**Critique of Current Diff:**
{critique}

**Focus Areas for Improvement:**
{chr(10).join(f"{i+1}. {area}" for i, area in enumerate(focus_areas))}

**File Context (for reference):**
{files_context}

**Task:** Generate an IMPROVED unified diff that:
1. Addresses all validation issues
2. Fixes the problems identified in the critique
3. Maintains proper diff format (--- a/file, +++ b/file, @@ hunks, context lines)
4. Uses context lines to show WHERE changes go (no line number ambiguity)

Return ONLY the improved diff in this format:
```diff
--- a/path/to/file1.py
+++ b/path/to/file1.py
@@ -10,3 +10,4 @@
 context line
-removed line
+added line
 context line
```

Generate the refined diff now:"""
        
        try:
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.4,
                max_tokens=12000
            )
            
            # Extract diff from response
            import re
            diff_match = re.search(r'```diff\s*(.*?)\s*```', response, re.DOTALL)
            if diff_match:
                refined_diff = diff_match.group(1).strip()
                logger.info(f"✅ Generated refined diff ({len(refined_diff)} chars)")
                
                # Convert diff to operations for backward compatibility
                try:
                    from utils.diff_converter import DiffConverter
                    diff_converter = DiffConverter()
                    operations = diff_converter.diff_to_operations(refined_diff)
                    
                    return {
                        'diff': refined_diff,  # PRIMARY format
                        'operations': operations,  # Backward compatibility
                        'improvements_summary': 'Refined based on validation feedback'
                    }
                except Exception as e:
                    logger.error(f"Failed to convert refined diff to operations: {e}")
                    return {
                        'diff': refined_diff,
                        'operations': [],
                        'improvements_summary': 'Refined diff (operations conversion failed)'
                    }
            else:
                logger.warning("Could not extract diff from refinement response")
                # Return original
                return {'diff': current_diff, 'operations': []}
                
        except Exception as e:
            logger.error(f"Diff refinement failed: {str(e)}")
            return {'diff': current_diff, 'operations': []}
