"""
Simple Fixer - Fast 2-phase fixer for simple issues (70% of cases)
==================================================================

Based on competitive analysis: GitHub Copilot wins on simple issues because:
1. Uses diff format (natural for AI models)
2. Minimal validation (no over-engineering)
3. Fast (1-2 API calls, 20-40 seconds)
4. No refinement (prevents degradation)

This fixer handles:
- Single-file edits
- Simple feature additions
- Bug fixes with clear scope
- Issues with <200 words description

For complex issues (multi-file, >200 words), use the existing 7-phase system.
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import re

from utils.logger import get_logger
from services.unified_ai_client import unified_client
from utils.diff_converter import operations_to_diff, diff_to_operations, validate_diff

logger = get_logger(__name__)


@dataclass
class SimpleFix:
    """Result from simple fixer."""
    success: bool
    diff: str
    operations: List[Dict[str, Any]]
    confidence: float
    api_calls: int
    time_seconds: float
    reason: str = ""


class SimpleFixer:
    """
    Fast 2-phase fixer optimized for simple issues.
    
    Design based on GitHub Copilot's approach:
    - Phase 1: Understand & Locate (1 AI call)
    - Phase 2: Generate Diff (1 AI call) 
    - Phase 3: Validate (0 AI calls, deterministic)
    - Phase 4: Refine if needed (0-1 AI calls)
    
    Success rate target: 80-85% on simple issues
    Speed target: 20-40 seconds per issue
    API calls target: 2-4 per issue
    """
    
    MIN_CONFIDENCE = 0.80  # 80% threshold (vs 90% for complex fixer)
    MAX_FILES_TO_ANALYZE = 5  # Keep it simple
    
    def __init__(self):
        self.api_calls = 0
        self.start_time = 0
    
    async def can_handle(self, issue: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Determine if this issue is simple enough for fast fixer.
        
        Returns:
            (can_handle, reason)
        """
        title = issue.get('title', '')
        body = issue.get('body', '')
        total_words = len(title.split()) + len(body.split())
        
        # Simple keyword patterns
        simple_keywords = [
            'add function', 'add method', 'add endpoint',
            'fix typo', 'fix bug', 'fix error',
            'update', 'change', 'modify',
            'add logging', 'add validation',
            'add import', 'add dependency'
        ]
        
        # Complex keyword patterns (should use 7-phase system)
        complex_keywords = [
            'refactor', 'redesign', 'architecture',
            'migrate', 'optimize performance',
            'authentication', 'authorization',
            'payment', 'security', 'database migration'
        ]
        
        text = (title + ' ' + body).lower()
        
        # Check for complex keywords
        if any(kw in text for kw in complex_keywords):
            return False, "Complex issue detected (requires 7-phase system)"
        
        # Check word count
        if total_words > 200:
            return False, "Issue description too long (>200 words)"
        
        # Check for multi-file indicators
        multi_file_indicators = [
            'multiple files', 'several files', 'across files',
            'and also', 'along with', 'package.json and',
            '.env and', 'docker-compose and'
        ]
        if any(indicator in text for indicator in multi_file_indicators):
            return False, "Multi-file changes detected"
        
        # Check for simple patterns
        if any(kw in text for kw in simple_keywords):
            return True, f"Simple issue pattern detected: {total_words} words"
        
        # Default: if short and not complex, treat as simple
        if total_words < 100:
            return True, f"Short issue ({total_words} words)"
        
        return False, "Issue doesn't match simple patterns"
    
    async def fix(
        self,
        issue: Dict[str, Any],
        repo_path: str,
        relevant_files: List[Dict[str, Any]]
    ) -> SimpleFix:
        """
        Fix simple issue using 2-phase diff-based approach.
        
        Args:
            issue: Issue dict with title and body
            repo_path: Path to repository
            relevant_files: List of relevant files with content
        
        Returns:
            SimpleFix with diff, operations, and confidence
        """
        import time
        self.start_time = time.time()
        self.api_calls = 0
        
        logger.info("🚀 Simple Fixer: Starting 2-phase approach")
        
        # Phase 1: Understand & Locate (1 AI call)
        plan = await self._phase1_understand(issue, relevant_files)
        
        if not plan['can_fix']:
            return SimpleFix(
                success=False,
                diff="",
                operations=[],
                confidence=plan['confidence'],
                api_calls=self.api_calls,
                time_seconds=time.time() - self.start_time,
                reason=plan['reason']
            )
        
        # Phase 2: Generate Diff (1 AI call)
        diff = await self._phase2_generate_diff(plan, relevant_files)
        
        if not diff:
            return SimpleFix(
                success=False,
                diff="",
                operations=[],
                confidence=0.0,
                api_calls=self.api_calls,
                time_seconds=time.time() - self.start_time,
                reason="Failed to generate diff"
            )
        
        # Phase 3: Validate (0 AI calls, deterministic)
        valid, confidence, issues = await self._phase3_validate(diff, repo_path, plan)
        
        # Phase 4: Refine if needed (0-1 AI calls)
        if not valid and confidence > 0.5:
            logger.info(f"⚠️ Validation failed (confidence: {confidence:.1%}), attempting refinement")
            diff = await self._phase4_refine(diff, issues, plan, relevant_files)
            valid, confidence, issues = await self._phase3_validate(diff, repo_path, plan)
        
        # Convert diff to operations for compatibility with existing system
        operations = diff_to_operations(diff)
        
        # Final result
        success = valid and confidence >= self.MIN_CONFIDENCE
        
        return SimpleFix(
            success=success,
            diff=diff,
            operations=operations,
            confidence=confidence,
            api_calls=self.api_calls,
            time_seconds=time.time() - self.start_time,
            reason="Success" if success else f"Confidence too low: {confidence:.1%} (issues: {len(issues)})"
        )
    
    async def _phase1_understand(
        self,
        issue: Dict[str, Any],
        relevant_files: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Phase 1: Understand issue and plan changes (1 AI call)."""
        
        title = issue.get('title', '')
        body = issue.get('body', '')
        
        # Format files for prompt
        files_context = self._format_files(relevant_files[:self.MAX_FILES_TO_ANALYZE])
        
        prompt = f"""Analyze this issue and plan the fix.

ISSUE: {title}
{body}

FILES (pick 1-2 most relevant):
{files_context}

TASK: Plan a simple, focused fix.

OUTPUT (JSON):
{{
  "can_fix": true/false,
  "reason": "explanation",
  "confidence": 0.0-1.0,
  "target_files": ["file1.py"],
  "changes": ["add endpoint", "add import"],
  "approach": "brief description"
}}

RULES:
- can_fix=false if issue is ambiguous or requires >2 files
- confidence >= 0.85 required
- Only plan changes you're CERTAIN about
- Keep it SIMPLE - one focused change

Example GOOD plan:
{{
  "can_fix": true,
  "reason": "Clear requirement: add WebSocket endpoint",
  "confidence": 0.90,
  "target_files": ["main.py"],
  "changes": ["Add WebSocket import", "Add /ws/transcribe endpoint"],
  "approach": "Add WebSocket support using FastAPI"
}}

Example BAD plan (too ambitious):
{{
  "can_fix": true,
  "target_files": ["main.py", "config.py", "requirements.txt", "tests.py"],
  "changes": ["refactor everything", "add tests", "optimize"]
}}
→ This should be can_fix=false (too complex for simple fixer)

Generate the plan:
"""
        
        response = await unified_client.generate_content_async(prompt, max_tokens=500)
        self.api_calls += 1
        
        try:
            plan = self._extract_json(response)
            return plan
        except Exception as e:
            logger.error(f"Failed to parse plan: {e}")
            return {
                'can_fix': False,
                'reason': f'Failed to parse plan: {e}',
                'confidence': 0.0
            }
    
    async def _phase2_generate_diff(
        self,
        plan: Dict[str, Any],
        relevant_files: List[Dict[str, Any]]
    ) -> str:
        """Phase 2: Generate unified diff (1 AI call)."""
        
        target_files = plan.get('target_files', [])
        changes = plan.get('changes', [])
        approach = plan.get('approach', '')
        
        # Get content of target files
        files_content = {}
        for f in relevant_files:
            if f['path'] in target_files:
                files_content[f['path']] = f['content']
        
        # Format files with line numbers
        files_formatted = []
        for path, content in files_content.items():
            lines = content.splitlines()
            numbered = '\n'.join(f"{i+1:4d}: {line}" for i, line in enumerate(lines))
            files_formatted.append(f"FILE: {path}\n{numbered}\n")
        
        prompt = f"""Generate a unified diff to implement this fix.

PLAN:
{approach}

CHANGES NEEDED:
{chr(10).join(f'- {c}' for c in changes)}

FILES:
{chr(10).join(files_formatted)}

OUTPUT: Unified diff format (like git diff)

CRITICAL REQUIREMENTS:
1. Include ALL necessary imports
2. Follow existing code style
3. Complete implementation (no TODOs)
4. Proper indentation

EXAMPLE FORMAT:
```diff
--- a/main.py
+++ b/main.py
@@ -10,2 +10,3 @@
 from fastapi import FastAPI
+from fastapi import WebSocket
 
@@ -20,0 +21,8 @@
+@app.websocket("/ws/transcribe")
+async def websocket_endpoint(websocket: WebSocket):
+    await websocket.accept()
+    try:
+        while True:
+            data = await websocket.receive_bytes()
+            # Process data
+    except WebSocketDisconnect:
+        pass
```

Generate the diff (use ``` markers):
"""
        
        response = await unified_client.generate_content_async(prompt, max_tokens=2000)
        self.api_calls += 1
        
        # Extract diff from response
        diff = self._extract_diff(response)
        return diff
    
    async def _phase3_validate(
        self,
        diff: str,
        repo_path: str,
        plan: Dict[str, Any]
    ) -> Tuple[bool, float, List[str]]:
        """Phase 3: Deterministic validation (0 AI calls)."""
        
        issues = []
        confidence = 100.0
        
        # Check 1: Diff syntax (can git parse it?)
        if not diff or not diff.strip():
            return False, 0.0, ["Empty diff"]
        
        # Check 2: Git apply validation
        valid, error = validate_diff(diff, repo_path)
        if not valid:
            issues.append(f"Diff doesn't apply cleanly: {error}")
            confidence -= 40
        
        # Check 3: Convert to operations and validate
        try:
            operations = diff_to_operations(diff)
            
            # Check for common issues
            for op in operations:
                if op['type'] in ['edit', 'modify']:
                    for edit in op.get('edits', []):
                        new_code = edit.get('new_code', '')
                        
                        # Check for placeholders
                        if any(placeholder in new_code for placeholder in ['TODO', 'FIXME', 'pass  #', 'NotImplemented']):
                            issues.append("Contains placeholder code")
                            confidence -= 20
                        
                        # Check for empty implementation
                        if new_code.strip() in ['pass', '...']:
                            issues.append("Empty implementation")
                            confidence -= 30
        
        except Exception as e:
            issues.append(f"Failed to parse diff: {e}")
            confidence = 0.0
        
        confidence = max(0, min(100, confidence)) / 100
        is_valid = confidence >= self.MIN_CONFIDENCE
        
        return is_valid, confidence, issues
    
    async def _phase4_refine(
        self,
        diff: str,
        issues: List[str],
        plan: Dict[str, Any],
        relevant_files: List[Dict[str, Any]]
    ) -> str:
        """Phase 4: Refine diff based on validation issues (0-1 AI calls)."""
        
        # Only refine if there are specific fixable issues
        if not issues:
            return diff
        
        issues_text = '\n'.join(f"- {issue}" for issue in issues)
        
        prompt = f"""Fix this diff to address validation issues.

ORIGINAL DIFF:
```diff
{diff}
```

ISSUES TO FIX:
{issues_text}

TASK: Generate corrected diff that fixes these issues.

RULES:
- Keep the same approach, just fix the issues
- Don't add new features
- Complete all placeholders with real code
- Ensure diff applies cleanly

Generate corrected diff:
"""
        
        response = await unified_client.generate_content_async(prompt, max_tokens=2000)
        self.api_calls += 1
        
        refined_diff = self._extract_diff(response)
        return refined_diff if refined_diff else diff
    
    def _format_files(self, files: List[Dict[str, Any]]) -> str:
        """Format files for prompt."""
        formatted = []
        for f in files:
            path = f.get('path', 'unknown')
            content = f.get('content', '')
            lines = content.splitlines()[:50]  # First 50 lines only
            preview = '\n'.join(lines)
            formatted.append(f"FILE: {path}\n{preview}\n...")
        return '\n\n'.join(formatted)
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from AI response."""
        import json
        
        # Try to find JSON block
        match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        
        # Try to find raw JSON
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        
        raise ValueError("No JSON found in response")
    
    def _extract_diff(self, text: str) -> str:
        """Extract diff from AI response."""
        # Try to find diff block
        match = re.search(r'```diff\s*(.+?)\s*```', text, re.DOTALL)
        if match:
            return match.group(1)
        
        # Try to find any block with --- a/
        match = re.search(r'(---\s+a/.+)', text, re.DOTALL)
        if match:
            return match.group(1)
        
        return ""


# Convenience function
async def try_simple_fix(
    issue: Dict[str, Any],
    repo_path: str,
    relevant_files: List[Dict[str, Any]]
) -> Optional[SimpleFix]:
    """
    Try to fix issue with simple fixer.
    
    Returns:
        SimpleFix if successful, None if issue is too complex
    """
    fixer = SimpleFixer()
    
    # Check if we can handle this
    can_handle, reason = await fixer.can_handle(issue)
    if not can_handle:
        logger.info(f"⏭️ Simple Fixer cannot handle: {reason}")
        return None
    
    logger.info(f"✅ Simple Fixer can handle: {reason}")
    
    # Attempt fix
    result = await fixer.fix(issue, repo_path, relevant_files)
    
    if result.success:
        logger.info(f"✅ Simple Fixer SUCCESS: {result.confidence:.1%} confidence, {result.api_calls} calls, {result.time_seconds:.1f}s")
    else:
        logger.warning(f"⚠️ Simple Fixer FAILED: {result.reason}")
    
    return result
