"""
Tree-of-Thought Generator - Phase 3 of RATFV
============================================

Generates multiple fix candidates using Tree-of-Thought reasoning:
1. Generate 3 diverse fix candidates with different approaches
2. Score each candidate with static analysis and reasoning
3. Select the best candidate based on comprehensive scoring

Based on: "Tree of Thoughts: Deliberate Problem Solving with Large Language Models" (Yao et al., 2023)
Target: 85% accuracy with candidate diversity
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from utils.logger import get_logger
from services.gemini_client import gemini_client
from services.tech_stack_detector import tech_stack_detector
from utils.file_type_schemas import file_type_validator
from utils.diff_converter import DiffConverter
import json
import re

logger = get_logger(__name__)


@dataclass
class FixCandidate:
    """A single fix candidate with operations and metadata."""
    operations: List[Dict[str, Any]]  # List of file operations (create, modify, delete) - DEPRECATED, use diff
    diff: Optional[str] = None  # Unified diff string (NEW: primary format)
    approach: str = ""  # Description of the fix approach
    rationale: str = ""  # Why this approach was chosen
    estimated_impact: str = ""  # high, medium, low
    risk_assessment: str = ""
    test_strategy: str = ""
    confidence: float = 0.0  # 0.0-1.0


@dataclass
class ScoredCandidate:
    """A fix candidate with comprehensive scoring."""
    candidate: FixCandidate
    scores: Dict[str, float]  # Individual dimension scores
    total_score: float  # Weighted total score
    ranking: int  # 1, 2, or 3
    selection_rationale: str


class TreeOfThoughtGenerator:
    """
    Tree-of-Thought Generator: Multi-candidate code generation.
    
    Strategy:
    1. Generate 3 diverse candidates using different prompting strategies:
       - Conservative: Minimal changes, high safety
       - Balanced: Moderate changes, reasonable risk
       - Comprehensive: Thorough refactoring, addresses root cause
    
    2. Score each candidate on 6 dimensions:
       - Correctness (40%): Addresses the issue completely
       - Safety (25%): Won't break existing functionality
       - Maintainability (15%): Clean, readable, follows conventions
       - Test Coverage (10%): Includes/updates tests
       - Performance (5%): No performance regressions
       - Completeness (5%): Handles edge cases
    
    3. Select best candidate based on weighted score
    """
    
    # Scoring weights (must sum to 1.0)
    SCORING_WEIGHTS = {
        'correctness': 0.40,
        'safety': 0.25,
        'maintainability': 0.15,
        'test_coverage': 0.10,
        'performance': 0.05,
        'completeness': 0.05
    }
    
    def __init__(self):
        self.num_candidates = 3
    
    async def generate_candidates(
        self,
        understanding: Any,  # IssueUnderstanding
        relevant_files: List[Any],  # List[RetrievedFile]
        issue_title: str,
        issue_body: str,
        repository_id: str
    ) -> List[FixCandidate]:
        """
        Generate multiple fix candidates using different approaches.
        
        Returns:
            List of 1-3 FixCandidate objects
        """
        logger.info(f"🌳 Generating {self.num_candidates} fix candidates with Tree-of-Thought")
        
        # CRITICAL FIX: Generate only 1 candidate to save API calls
        # Was generating 3 candidates (conservative, balanced, comprehensive) = 12+ extra calls
        tasks = [
            self._generate_comprehensive_fix(understanding, relevant_files, issue_title, issue_body)
        ]
        
        candidates = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions AND empty candidates
        valid_candidates = []
        failed_count = 0
        for i, candidate in enumerate(candidates):
            if isinstance(candidate, Exception):
                failed_count += 1
                logger.error(f"Failed to generate candidate {i+1}: {str(candidate)}")
            elif not candidate.operations:
                failed_count += 1
                logger.error(f"Candidate {i+1} ({candidate.approach}) has NO operations - rejected")
            else:
                valid_candidates.append(candidate)
                logger.info(f"✅ Candidate {i+1} ({candidate.approach}): {len(candidate.operations)} operations")
        
        if not valid_candidates:
            raise ValueError("Failed to generate any valid fix candidates (all had empty operations or errors)")
        
        # Calculate generation success rate
        total_candidates = len(candidates)
        generation_success_rate = len(valid_candidates) / total_candidates
        
        logger.info(f"✅ Generated {len(valid_candidates)} valid candidates ({generation_success_rate:.0%} success rate)")
        if failed_count > 0:
            logger.warning(f"⚠️ {failed_count}/{total_candidates} candidates failed generation")
        
        # Store metadata on candidates for downstream confidence adjustment
        for candidate in valid_candidates:
            if not hasattr(candidate, 'metadata'):
                candidate.metadata = {}
            candidate.metadata['generation_success_rate'] = generation_success_rate
            candidate.metadata['total_candidates'] = total_candidates
            candidate.metadata['failed_candidates'] = failed_count
        
        return valid_candidates
    
    async def score_candidates(
        self,
        candidates: List[FixCandidate],
        understanding: Any,
        relevant_files: List[Any]
    ) -> List[ScoredCandidate]:
        """
        Score all candidates on 6 dimensions and rank them.
        
        Returns:
            List of ScoredCandidate objects, sorted by total_score (best first)
        """
        logger.info(f"📊 Scoring {len(candidates)} candidates")
        
        scored_candidates = []
        
        for i, candidate in enumerate(candidates):
            # Score on each dimension
            scores = await self._score_candidate(candidate, understanding, relevant_files)
            
            # Calculate weighted total score
            total_score = sum(
                scores[dimension] * weight
                for dimension, weight in self.SCORING_WEIGHTS.items()
            )
            
            # Generate selection rationale
            rationale = self._generate_selection_rationale(candidate, scores, total_score)
            
            scored_candidates.append(ScoredCandidate(
                candidate=candidate,
                scores=scores,
                total_score=total_score,
                ranking=0,  # Will be set after sorting
                selection_rationale=rationale
            ))
        
        # Sort by total_score (descending)
        scored_candidates.sort(key=lambda sc: sc.total_score, reverse=True)
        
        # Assign rankings
        for rank, sc in enumerate(scored_candidates, start=1):
            sc.ranking = rank
        
        logger.info(f"🏆 Best candidate: {scored_candidates[0].candidate.approach} (score: {scored_candidates[0].total_score:.2f})")
        
        return scored_candidates
    
    async def select_best_candidate(
        self,
        candidates: List[FixCandidate],
        understanding: Any,
        relevant_files: List[Any]
    ) -> Tuple[FixCandidate, Dict[str, Any]]:
        """
        Score candidates and return the best one with metadata.
        
        Returns:
            (best_candidate, selection_metadata)
        """
        scored_candidates = await self.score_candidates(candidates, understanding, relevant_files)
        
        best = scored_candidates[0]
        
        metadata = {
            'total_candidates': len(candidates),
            'selected_approach': best.candidate.approach,
            'selection_score': best.total_score,
            'dimension_scores': best.scores,
            'selection_rationale': best.selection_rationale,
            'runner_up': scored_candidates[1].candidate.approach if len(scored_candidates) > 1 else None,
            'all_scores': [
                {
                    'approach': sc.candidate.approach,
                    'score': sc.total_score,
                    'ranking': sc.ranking
                }
                for sc in scored_candidates
            ]
        }
        
        return best.candidate, metadata
    
    async def _generate_conservative_fix(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> FixCandidate:
        """Generate conservative fix: minimal changes, high safety."""
        
        # Retry up to 2 times if operations are empty (parser rejected due to validation)
        operations = []
        for attempt in range(2):
            prompt = self._build_conservative_prompt(understanding, relevant_files, issue_title, issue_body)
            
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.3 + (attempt * 0.1),  # Slightly increase temp on retry
                max_tokens=8000
            )
            
            operations = self._parse_operations(response, relevant_files)
            
            if operations:  # Success!
                logger.info(f"✅ Conservative fix generated {len(operations)} operations (attempt {attempt + 1})")
                break
            else:
                logger.warning(f"⚠️ Conservative fix attempt {attempt + 1} produced empty operations (likely empty old_code)")
                if attempt == 1:  # Last attempt
                    logger.error("❌ Conservative fix failed after 2 attempts - returning empty operations")
        
        return FixCandidate(
            operations=operations,
            approach="Conservative (Minimal Changes)",
            rationale="Applies minimal changes to fix the immediate issue with lowest risk",
            estimated_impact="low",
            risk_assessment="Very low risk - only modifies necessary code",
            test_strategy="Focus on regression testing existing functionality",
            confidence=0.85 if operations else 0.0  # Zero confidence if no operations
        )
    
    async def _generate_balanced_fix(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> FixCandidate:
        """Generate balanced fix: moderate changes, reasonable risk."""
        
        # Retry up to 2 times if operations are empty
        operations = []
        for attempt in range(2):
            prompt = self._build_balanced_prompt(understanding, relevant_files, issue_title, issue_body)
            
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.5 + (attempt * 0.1),
                max_tokens=12000
            )
            
            operations = self._parse_operations(response, relevant_files)
            
            if operations:
                logger.info(f"✅ Balanced fix generated {len(operations)} operations (attempt {attempt + 1})")
                break
            else:
                logger.warning(f"⚠️ Balanced fix attempt {attempt + 1} produced empty operations")
                if attempt == 1:
                    logger.error("❌ Balanced fix failed after 2 attempts")
        
        return FixCandidate(
            operations=operations,
            approach="Balanced (Moderate Changes)",
            rationale="Fixes the issue and improves related code with acceptable risk",
            estimated_impact="medium",
            risk_assessment="Moderate risk - refactors affected areas",
            test_strategy="Test both fix and refactored code paths",
            confidence=0.78 if operations else 0.0
        )
    
    async def _generate_comprehensive_fix(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> FixCandidate:
        """Generate comprehensive fix using TWO-PHASE approach to prevent hallucination."""
        
        # Store issue context in understanding for downstream filtering
        if not hasattr(understanding, 'issue_title'):
            understanding.issue_title = issue_title
        if not hasattr(understanding, 'issue_description'):
            understanding.issue_description = issue_body
        
        # PHASE 1: Identify locations (LLM suggests WHERE to edit)
        locations = await self._identify_edit_locations(
            understanding, relevant_files, issue_title, issue_body
        )
        
        if locations is None:
            # Fallback to single-phase if location identification failed (LLM error or parsing error)
            logger.warning("⚠️ Location identification failed (None returned), using single-phase fallback")
            prompt = self._build_comprehensive_prompt(understanding, relevant_files, issue_title, issue_body)
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.7,
                max_tokens=16000
            )
            operations = self._parse_operations(response, relevant_files)
        else:
            # PHASE 2: Generate replacements for EXTRACTED code (guaranteed to exist!)
            # Note: locations might be [] if validation filtered them all out. 
            # In that case, we proceed with [] to avoid hallucinating in single-phase.
            logger.info(f"✅ Two-phase generation: {len(locations)} locations identified")
            operations = await self._generate_replacements_for_locations(
                locations, understanding, relevant_files
            )
        
        # CRITICAL: Generate unified diff from operations
        # This is the PRIMARY format - operations are kept for backward compatibility only
        diff_str = None
        try:
            file_contents = {}
            for f in relevant_files:
                path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
                content = f.content if hasattr(f, 'content') else f.page_content
                file_contents[path] = content
            
            diff_converter = DiffConverter()
            diff_str = diff_converter.operations_to_diff(operations, file_contents)
            logger.info(f"✅ Generated unified diff ({len(diff_str)} chars)")
        except Exception as e:
            logger.error(f"❌ Failed to generate diff from operations: {e}")
            logger.error(f"   Will store operations only (fallback)")
        
        return FixCandidate(
            operations=operations,  # Kept for backward compatibility
            diff=diff_str,  # PRIMARY format
            approach="Comprehensive (Two-Phase)" if locations is not None else "Comprehensive (Single-Phase Fallback)",
            rationale="Uses extracted code to prevent hallucination" if locations is not None else "Fallback generation",
            estimated_impact="high",
            risk_assessment="Lower risk - validated code extraction" if locations is not None else "Higher risk",
            test_strategy="Comprehensive test suite including integration tests",
            confidence=0.85 if locations is not None else 0.72
        )
    
    # =====================================================
    # TWO-PHASE GENERATION METHODS (Sprint 2 & 3)
    # =====================================================
    
    async def _identify_edit_locations(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Phase 1: LLM identifies line ranges to edit.
        Returns list of locations with extracted code.
        Returns None if identification failed completely.
        """
        try:
            prompt = self._build_location_prompt(understanding, relevant_files, issue_title, issue_body)
            
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.3,  # Low temp for precise locations
                max_tokens=4000
            )
            
            # Parse locations from response
            locations = self._parse_locations_response(response)
            
            if locations is None:
                logger.warning("No locations parsed from LLM response")
                return None
            
            if not locations:
                logger.warning("LLM returned empty locations list")
                return []
            
            # Validate and extract actual code
            validated_locations = self._validate_and_extract_locations(locations, relevant_files)
            
            if not validated_locations and locations:
                logger.warning("⚠️ All identified locations were invalid (likely hallucinated line numbers)")
                # Return empty list, NOT None, to prevent fallback to single-phase
                return []
            
            logger.info(f"📍 Identified {len(validated_locations)} edit locations")
            return validated_locations
            
        except Exception as e:
            logger.error(f"Location identification failed: {e}")
            return None
    
    def _build_location_prompt(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> str:
        """Build prompt for Phase 1: location identification."""
        
        files_with_numbers = self._format_files_with_line_numbers(relevant_files[:5])
        
        return f"""You are identifying WHERE to make code changes to implement a COMPLETE, PRODUCTION-READY solution.

**Issue:** {issue_title}
{issue_body}

**Analysis:**
- Root Cause: {understanding.root_cause}
- Requirements: {', '.join(understanding.requirements[:3])}

**Files with Line Numbers:**
{files_with_numbers}

**Task**: Identify ALL locations needed for a COMPLETE implementation.

🚨 **CRITICAL - DO NOT GENERATE MINIMAL/INCOMPLETE SOLUTIONS:**
❌ **FORBIDDEN** - Only editing requirements.txt or config files
❌ **FORBIDDEN** - Suggesting "just add a dependency" without actual implementation
❌ **FORBIDDEN** - Leaving implementation details for "later"

✅ **REQUIRED** - Identify ALL locations for complete feature:
- Main implementation code (endpoints, handlers, logic)
- Integration points (where new code connects to existing code)
- Tests (if needed)
- Configuration (only if also implementing the feature)

**Example - WebSocket Feature (GOOD ✅):**
```json
{{
  "edit_locations": [
    {{
      "file": "main.py",
      "start_line": 10,
      "end_line": 15,
      "reason": "Add WebSocket imports and setup",
      "change_type": "modify"
    }},
    {{
      "file": "main.py",
      "start_line": 40,
      "end_line": 60,
      "reason": "Add WebSocket endpoint with complete transcription logic",
      "change_type": "modify"
    }},
    {{
      "file": "requirements.txt",
      "start_line": 1,
      "end_line": 7,
      "reason": "Add websockets dependency",
      "change_type": "modify"
    }}
  ]
}}
```

**Example - WebSocket Feature (BAD ❌ - INCOMPLETE):**
```json
{{
  "edit_locations": [
    {{
      "file": "requirements.txt",
      "start_line": 1,
      "end_line": 7,
      "reason": "Add websockets dependency",
      "change_type": "modify"
    }}
  ]
}}
```
☝️ This is WRONG because it only adds dependency without implementing the feature!

**🚨 INSERTION POINT RULES (CRITICAL FOR BLANK LINE INSERTIONS):**

When you need to INSERT new code at a blank line:

❌ WRONG: Specify ONLY the blank line (no context)
```json
{{
  "file": "main.py",
  "start_line": 14,
  "end_line": 14,  // Just one blank line - ambiguous!
  "reason": "Insert endpoint here"
}}
```
**Problem**: File has 20 blank lines. Which one is line 14? The replacement logic will find the FIRST blank line, not line 14!

✅ CORRECT: Specify range INCLUDING surrounding code (for context)
```json
{{
  "file": "main.py",
  "start_line": 13,
  "end_line": 14,  // Includes model initialization + blank line ONLY
  "reason": "Insert WebSocket endpoint after model initialization (between line 13 and 14)",
  "change_type": "modify"
}}
```
**Why This Works**: The replacement logic can find EXACTLY where to insert by matching:
- Line 13: `model = Model("vosk-model")`
- Line 14: blank line (insertion point)

**🔴 CRITICAL: END LINE MUST BE COMPLETE STATEMENT**

When specifying line ranges, the END line MUST be a COMPLETE statement or blank line:

❌ WRONG: End line is START of next function
```json
{{
  "file": "main.py",
  "start_line": 13,
  "end_line": 15,  // Line 15 is '@app.post("/stt")' - this is incomplete!
  "reason": "Insert endpoint"
}}
```
**Problem**: Line 15 is just the DECORATOR `@app.post("/stt")`, not the full function. Replacing this will CUT OFF the decorator, causing syntax error!

✅ CORRECT: End line is blank line BEFORE next function
```json
{{
  "file": "main.py",
  "start_line": 13,
  "end_line": 14,  // Line 14 is blank line - this is complete!
  "reason": "Insert endpoint after model init"
}}
```

**LINE RANGE VALIDATION CHECKLIST:**
Before finalizing line ranges, verify:
1. ✅ End line is NOT a decorator without its function (e.g., `@app.post(...)`)
2. ✅ End line is NOT a function definition without its body (e.g., `def foo():`)
3. ✅ End line is NOT a class definition without its body (e.g., `class Foo:`)
4. ✅ End line is NOT an if/for/while without its body (e.g., `if condition:`)
5. ✅ End line IS either: blank line, complete statement ending in newline, or closing brace/bracket

**RULE FOR BLANK LINE INSERTIONS**: 
- Always include AT LEAST 1 line of actual code (not blank) in your range
- Prefer 1-2 lines BEFORE + blank line (do NOT include lines AFTER if they start a new function)
- If next line starts a new definition (decorator, def, class), STOP at blank line
- This gives unique context that can be located in the file

**CRITICAL RULES FOR PRECISE EDITS:**
1. start_line and end_line MUST reference line numbers shown above
2. Do NOT make up line numbers - only use what you see
3. **MINIMAL EDIT SCOPE**: Only include lines that ACTUALLY NEED CHANGING
   ❌ WRONG: lines 1-10 to add import (includes unrelated code)
   ✅ CORRECT: lines 1-2 to add import (only import section)
   
4. **AVOID LARGE RANGES**: Smaller, focused edits are better
   ❌ WRONG: Replacing 50 lines when only 5 lines change
   ✅ CORRECT: Replacing 5 lines that actually change
   
5. **INSERTION STRATEGY**: When adding new code (endpoints, functions):
   - Option A: Find EMPTY LINES after logical section, replace those
   - Option B: Find END of logical section, replace last few lines + add new code
   - ❌ NEVER: Replace entire file section (imports + app + init) just to add 1 function
   
6. **Example - Adding WebSocket endpoint CORRECTLY:**
   Given file:
   ```
   1: import ffmpeg
   2: from fastapi import FastAPI
   3:
   4: app = FastAPI()
   5:
   6: model = Model("vosk-model")
   7:
   8: @app.post("/stt")
   9: async def transcribe():
   10:     pass
   ```
   
   ❌ WRONG: Edit lines 5-6 (before model initialization)
      - This creates definition order error: WebSocket handler would use 'model' before it's defined!
   ❌ WRONG: Edit lines 1-10 (too broad, includes everything)
   ✅ CORRECT: Edit lines 2-2 (just imports to add WebSocket import)
   ✅ CORRECT: Edit lines 7-8 (empty lines AFTER model init to insert new endpoint)
   
   **DEFINITION ORDER RULE**: When inserting code that uses a variable:
   - Find where that variable is defined (e.g., line 6: model = Model(...))
   - Insert AFTER that line (e.g., line 7-8), never before!
   
7. For new files, use DESCRIPTIVE filenames based on PURPOSE:
   - WebSocket handler → {{"file": "websocket_handler.py", "start_line": 0, "end_line": 0, "change_type": "create"}}
   - Database models → {{"file": "models.py", "start_line": 0, "end_line": 0, "change_type": "create"}}
   - API routes → {{"file": "routes.py", "start_line": 0, "end_line": 0, "change_type": "create"}}
   - Utility functions → {{"file": "utils.py", "start_line": 0, "end_line": 0, "change_type": "create"}}
   ❌ NEVER use generic names like "new_file.py", "file.py", "temp.py"
   ✅ ALWAYS use descriptive names that explain what the file does
4. Identify ALL locations needed for COMPLETE implementation (not just config changes)
5. If the issue asks for a feature, you MUST identify where to implement that feature

Generate the locations now:"""
    
    def _format_files_with_line_numbers(self, files: List[Any]) -> str:
        """Format files with line numbers for location identification."""
        parts = []
        
        for f in files[:5]:  # Limit to 5 files
            content = f.content if hasattr(f, 'content') else f.page_content
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            lines = content.splitlines()
            
            numbered = []
            for i, line in enumerate(lines[:100], 1):  # Show first 100 lines
                numbered.append(f"   {i:3d}: {line}")
            
            parts.append(f"File: {path}\n" + '\n'.join(numbered))
        
        return '\n\n'.join(parts)
    
    def _parse_locations_response(self, response: str) -> List[Dict]:
        """Parse location JSON from LLM response."""
        import json
        import re
        
        try:
            # Extract JSON from response
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(1))
                return data.get('edit_locations', [])
            
            # Try without code fences
            json_match = re.search(r'\{.*"edit_locations".*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                return data.get('edit_locations', [])
                
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse locations JSON: {e}")
        
        return []
    
    def _validate_and_extract_locations(
        self,
        locations: List[Dict],
        files: List[Any]
    ) -> List[Dict]:
        """Validate line numbers and extract actual code."""
        file_map = {}
        for f in files:
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            file_map[path] = f
        
        validated = []
        
        for loc in locations:
            file_path = loc.get('file', '')
            change_type = loc.get('change_type', 'modify')
            
            # Handle create operations
            if change_type == 'create':
                loc['extracted_old_code'] = ''
                validated.append(loc)
                logger.info(f"✅ New file: {file_path}")
                continue
            
            # Validate file exists
            file_obj = file_map.get(file_path)
            if not file_obj:
                logger.warning(f"File {file_path} not in context, skipping")
                continue
            
            content = file_obj.content if hasattr(file_obj, 'content') else file_obj.page_content
            lines = content.splitlines()
            
            start = loc.get('start_line', 1) - 1  # Convert to 0-indexed
            end = loc.get('end_line', 1)
            
            # Validate line range
            if start < 0 or end > len(lines) or start >= end:
                logger.warning(f"Invalid line range {start+1}-{end} for {file_path} (file has {len(lines)} lines)")
                continue
            
            # EXTRACT actual code (THIS IS THE KEY!)
            old_code = '\n'.join(lines[start:end])
            
            # CRITICAL: Handle blank line insertions during initial extraction
            # Same logic as re-extraction to prevent inconsistencies
            if not old_code.strip():
                logger.info(f"✅ Initial extraction found blank line in {file_path} - marking as insertion point")
                if not old_code:
                    old_code = "\n"
            
            loc['extracted_old_code'] = old_code
            loc['file_content'] = content  # Keep for reference
            validated.append(loc)
            
            logger.info(f"✅ Extracted {len(old_code)} chars from {file_path} (lines {start+1}-{end})")
        
        return validated
    
    async def _generate_replacements_for_locations(
        self,
        locations: List[Dict],
        understanding: Any,
        relevant_files: List[Any]
    ) -> List[Dict]:
        """
        Phase 2: Generate replacements for extracted code.
        """
        from services.function_extractor import function_extractor
        from services.tech_stack_detector import tech_stack_detector
        
        # CRITICAL FIX: Build file content map for context
        file_content_map = {}
        for f in relevant_files:
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            content = f.content if hasattr(f, 'content') else f.page_content
            file_content_map[path] = content
        
        # Get function inventory and tech stack
        func_inventory = function_extractor.extract_inventory(relevant_files)
        tech_stack = tech_stack_detector.detect_stack([
            {'path': f.path if hasattr(f, 'path') else f.metadata.get('path', ''),
             'content': f.content if hasattr(f, 'content') else f.page_content,
             'language': f.language if hasattr(f, 'language') else 'unknown'}
            for f in relevant_files
        ])
        
        logger.info(f"🔧 Generating replacements with {len(func_inventory['functions'])} available functions")
        logger.info(f"🔧 Tech stack: {', '.join(tech_stack['frameworks'])}")
        
        # TODO: OPTIMIZATION OPPORTUNITY (Issue #5 from Dec 2, 2025)
        # Current: 1 API call per location (e.g., 6 locations = 6 calls)
        # Potential: Batch similar edits to same file (e.g., 3 main.py edits → 1 call)
        # Target savings: 7 calls → 4-5 calls (reduce from 12 total → 8-10 total)
        # Implementation: Group locations by file, generate all edits for file in one prompt
        # Trade-off: Larger prompts, potentially lower quality, harder to debug failures
        
        operations = []
        
        for i, loc in enumerate(locations, 1):
            try:
                logger.info(f"Generating replacement {i}/{len(locations)} for {loc['file']}")
                
                # CRITICAL FIX: Verify old_code exists and re-extract if missing
                # Don't use .strip() here as it would remove valid "\n" insertion markers!
                if loc.get('change_type') != 'create':
                    old_code_raw = loc.get('extracted_old_code', '')
                    if not old_code_raw:  # Only re-extract if truly empty ("")
                        logger.warning(f"⚠️ Empty extracted_old_code for {loc['file']}, re-extracting...")
                        # Re-extract from file content
                        file_content = file_content_map.get(loc['file'], '')
                        if file_content:
                            lines = file_content.splitlines()
                            start = loc.get('start_line', 1) - 1
                            end = loc.get('end_line', start + 1)
                            if 0 <= start < len(lines) and start < end <= len(lines):
                                old_code = '\n'.join(lines[start:end])
                                
                                # CRITICAL FIX: Handle empty lines (whitespace) ANYWHERE in file, not just EOF
                                # This allows inserting code at blank lines between sections (e.g., after imports, after model init)
                                if not old_code.strip():
                                    logger.info(f"✅ Converting empty/whitespace line to insertion marker for {loc['file']}")
                                    # Keep the original whitespace/newlines for proper indentation context
                                    if not old_code:
                                        old_code = "\n"
                                    loc['extracted_old_code'] = old_code
                                else:
                                    loc['extracted_old_code'] = old_code
                                
                                logger.info(f"✅ Re-extracted {len(old_code)} chars from {loc['file']} lines {start+1}-{end}")
                            else:
                                logger.error(f"❌ Invalid line range {start+1}-{end} for {loc['file']}")
                                continue
                        else:
                            logger.error(f"❌ File {loc['file']} not in content map")
                            continue
                    
                    # Final safety check - ALLOW empty/whitespace for blank line insertions
                    # Previously this blocked all empty extractions, breaking insertions at blank lines
                    old_code_raw = loc.get('extracted_old_code', '')
                    if not old_code_raw:
                        logger.error(f"❌ Still no old_code after re-extraction for {loc['file']}, skipping")
                        continue
                
                # Count other operations on the same file
                same_file_ops = sum(1 for l in locations if l.get('file') == loc.get('file'))
                
                prompt = self._build_replacement_prompt(
                    loc, func_inventory, tech_stack, understanding, file_content_map,
                    operation_index=i, total_operations=len(locations),
                    same_file_operation_count=same_file_ops
                )
                
                response = await gemini_client.generate_content_async(
                    prompt=prompt,
                    temperature=0.5,
                    max_tokens=4000
                )
                
                replacement = self._parse_replacement_response(response)
                
                if not replacement:
                    logger.warning(f"Failed to parse replacement for {loc['file']}")
                    continue
                
                # Build operation with EXTRACTED old_code
                if loc.get('change_type') == 'create':
                    # ✅ CRITICAL: Validate content is not empty before creating files
                    file_content = replacement.get('new_code', '').strip()
                    
                    if not file_content:
                        logger.error(f"❌ EMPTY CONTENT for new file {loc['file']} - skipping creation")
                        logger.error(f"   Replacement dict was: {str(replacement)[:500]}")
                        logger.error(f"   This indicates JSON parsing failed - check AI response")
                        continue  # Skip this operation
                    
                    if len(file_content) < 10:
                        logger.warning(f"⚠️ SUSPICIOUSLY SHORT content for {loc['file']}: {len(file_content)} chars")
                        logger.warning(f"   Content: {file_content[:200]}")
                    
                    operation = {
                        'type': 'create',
                        'path': loc['file'],
                        'content': file_content,
                        'explanation': loc.get('reason', '')
                    }
                    
                    logger.info(f"✅ Creating {loc['file']} with {len(file_content)} chars")
                else:
                    # DEBUG: Check old_code value
                    old_code_value = loc.get('extracted_old_code', '')
                    logger.info(f"🔍 DEBUG: Building operation for {loc['file']}, old_code length: {len(old_code_value)}, repr: {repr(old_code_value[:50])}")
                    
                    # CRITICAL FIX: Preserve newline when inserting at blank lines
                    # When old_code is "\n" (blank line insertion), new_code must START with "\n"
                    # to avoid concatenating with the previous line.
                    # Example: "ffmpeg-python\n" + "\n" → if we replace "\n" with "websockets\n",
                    # we get "ffmpeg-pythonwebsockets\n" (WRONG!)
                    # Correct: replace "\n" with "\nwebsockets\n" → "ffmpeg-python\n\nwebsockets\n"
                    new_code_value = replacement.get('new_code', '')
                    if old_code_value == '\n' and new_code_value and not new_code_value.startswith('\n'):
                        logger.info(f"🔧 CRITICAL FIX: Preserving newline for blank line insertion in {loc['file']}")
                        new_code_value = '\n' + new_code_value
                    
                    operation = {
                        'type': 'edit',
                        'path': loc['file'],
                        'explanation': loc.get('reason', ''),
                        'edits': [{
                            'start_line': loc['start_line'],
                            'end_line': loc['end_line'],
                            'old_code': old_code_value,  # ✅ GUARANTEED to exist!
                            'new_code': new_code_value,  # ✅ NEWLINE PRESERVED!
                            'explanation': replacement.get('explanation', '')
                        }]
                    }
                
                operations.append(operation)
                logger.info(f"✅ Generated replacement for {loc['file']}")
                
            except Exception as e:
                logger.error(f"Failed to generate replacement for {loc['file']}: {e}")
                continue
        
        # CRITICAL FIX: Deduplicate operations before filtering
        # Prevents AI hallucination where same location gets 3 different implementations
        operations = self._deduplicate_operations(operations)
        
        # Filter out test files unless explicitly requested
        # Get issue context from understanding
        issue_title = getattr(understanding, 'issue_title', '')
        issue_body = getattr(understanding, 'issue_description', '')
        filtered_operations = self._filter_test_operations(operations, issue_title, issue_body)
        
        return filtered_operations
    
    def _deduplicate_operations(self, operations: List[Dict]) -> List[Dict]:
        """
        Remove duplicate AND overlapping operations targeting the same file.
        
        Critical fix for AI hallucination where Tree-of-Thought generates
        multiple candidate implementations that conflict:
        - Exact duplicates: Same file, same line range
        - Overlapping edits: Same file, overlapping line ranges
        - Whole-file replacements: Rewrites entire file, conflicts with incremental edits
        
        Example issues:
        1. 3 WebSocket endpoints added to same EOF line → 3 duplicate functions
        2. Operations 1-3 add WebSocket incrementally, Operation 4 rewrites entire file → conflicts
        
        Args:
            operations: List of operation dicts with 'path' and 'edits'
        
        Returns:
            Deduplicated list with no overlapping or conflicting operations
        """
        # Group operations by file
        ops_by_file = {}
        for op in operations:
            file_path = op.get('path', '')
            if file_path not in ops_by_file:
                ops_by_file[file_path] = []
            ops_by_file[file_path].append(op)
        
        unique_ops = []
        duplicates_removed = 0
        overlaps_removed = 0
        
        # Process each file's operations independently
        for file_path, file_ops in ops_by_file.items():
            if len(file_ops) == 1:
                # Single operation for this file - no conflicts possible
                unique_ops.extend(file_ops)
                continue
            
            # CRITICAL: Check for whole-file replacements that conflict with incremental edits
            whole_file_ops = []
            incremental_ops = []
            
            for op in file_ops:
                if not op.get('edits'):
                    unique_ops.append(op)  # Operations without edits (creates, deletes)
                    continue
                
                first_edit = op['edits'][0]
                start_line = first_edit.get('start_line', 0)
                end_line = first_edit.get('end_line', 0)
                
                # Detect whole-file replacement: starts at line 1 and covers >50 lines
                if start_line <= 1 and end_line > 50:
                    whole_file_ops.append((op, start_line, end_line))
                else:
                    incremental_ops.append((op, start_line, end_line))
            
            # If both whole-file AND incremental ops exist → CONFLICT!
            if whole_file_ops and incremental_ops:
                logger.error(
                    f"🚨 OVERLAP DETECTED: {file_path} has {len(whole_file_ops)} whole-file replacement(s) "
                    f"AND {len(incremental_ops)} incremental edit(s) - they will conflict!"
                )
                logger.error(
                    f"   Whole-file ops: lines {[(s, e) for _, s, e in whole_file_ops]}"
                )
                logger.error(
                    f"   Incremental ops: lines {[(s, e) for _, s, e in incremental_ops]}"
                )
                logger.error(
                    f"   RESOLUTION: Keeping incremental edits (more precise), "
                    f"discarding {len(whole_file_ops)} whole-file replacement(s)"
                )
                
                # Keep incremental ops (more targeted), discard whole-file replacements
                overlaps_removed += len(whole_file_ops)
                unique_ops.extend([op for op, _, _ in incremental_ops])
                continue
            
            # No whole-file conflicts - check for exact duplicates, overlaps, and semantic duplicates within incremental ops
            seen_locations = {}
            seen_patterns = {}  # Track code patterns to detect semantic duplicates
            
            for op, start_line, end_line in (incremental_ops or whole_file_ops):
                # Check for exact duplicate
                location_key = (file_path, start_line, end_line)
                if location_key in seen_locations:
                    duplicates_removed += 1
                    logger.warning(
                        f"⚠️ Removing exact duplicate for {file_path} lines {start_line}-{end_line}"
                    )
                    continue
                
                # CRITICAL NEW: Check for semantic duplicates (same functionality, different locations)
                # This catches the pattern where AI adds WebSocket endpoint at line 10 AND line 81
                edits = op.get('edits', [])
                if edits and file_path.endswith('.py'):
                    new_code = edits[0].get('new_code', '')
                    old_code = edits[0].get('old_code', '')
                    
                    # CRITICAL FIX: Don't treat blank line insertions as semantic duplicates!
                    # When old_code is "\n" (blank line marker), this is an INSERTION at a specific location.
                    # Two insertions at lines 14 and 81 are NOT duplicates - they're at different places!
                    is_blank_line_insertion = (old_code.strip() == '' and len(old_code) <= 2)
                    
                    if is_blank_line_insertion:
                        # For blank line insertions, use location as the unique key
                        # Each blank line insertion point is unique by its line number
                        logger.debug(f"✅ Blank line insertion at {file_path} line {start_line} (not checking for semantic duplicate)")
                    else:
                        # Extract key patterns that indicate duplicate functionality
                        # WebSocket endpoint pattern
                        import re
                        ws_endpoint_match = re.search(r'@app\.websocket\(["\']([^"\']+)["\']\)', new_code)
                        if ws_endpoint_match:
                            endpoint_path = ws_endpoint_match.group(1)
                            pattern_key = f"websocket_{endpoint_path}"
                            
                            if pattern_key in seen_patterns:
                                duplicates_removed += 1
                                prev_lines = seen_patterns[pattern_key]
                                logger.error(
                                    f"🚨 SEMANTIC DUPLICATE: {file_path} has duplicate WebSocket endpoint '{endpoint_path}'"
                                )
                                logger.error(
                                    f"   First definition: lines {prev_lines}, Second definition: lines {start_line}-{end_line}"
                                )
                                logger.error(
                                    f"   RESOLUTION: Keeping first implementation, discarding duplicate"
                                )
                                continue
                            
                            seen_patterns[pattern_key] = (start_line, end_line)
                        
                        # REST endpoint pattern
                        rest_endpoint_match = re.search(r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']\)', new_code)
                        if rest_endpoint_match:
                            method = rest_endpoint_match.group(1)
                            endpoint_path = rest_endpoint_match.group(2)
                            pattern_key = f"rest_{method}_{endpoint_path}"
                            
                            if pattern_key in seen_patterns:
                                duplicates_removed += 1
                                prev_lines = seen_patterns[pattern_key]
                                logger.error(
                                    f"🚨 SEMANTIC DUPLICATE: {file_path} has duplicate REST endpoint {method.upper()} '{endpoint_path}'"
                                )
                                logger.error(
                                    f"   First definition: lines {prev_lines}, Second definition: lines {start_line}-{end_line}"
                                )
                                logger.error(
                                    f"   RESOLUTION: Keeping first implementation, discarding duplicate"
                                )
                                continue
                            
                            seen_patterns[pattern_key] = (start_line, end_line)
                
                # Check for overlapping operations
                has_overlap = False
                for (seen_path, seen_start, seen_end) in seen_locations.keys():
                    if seen_path != file_path:
                        continue
                    
                    # Check if line ranges overlap
                    # Overlap exists if: NOT (end1 < start2 OR end2 < start1)
                    if not (end_line < seen_start or seen_end < start_line):
                        logger.error(
                            f"🚨 OVERLAP: {file_path} operations overlap! "
                            f"Lines {start_line}-{end_line} conflicts with {seen_start}-{seen_end}"
                        )
                        logger.error(
                            f"   RESOLUTION: Keeping first operation (lines {seen_start}-{seen_end}), "
                            f"discarding conflicting operation (lines {start_line}-{end_line})"
                        )
                        overlaps_removed += 1
                        has_overlap = True
                        break
                
                if not has_overlap:
                    seen_locations[location_key] = True
                    unique_ops.append(op)
        
        # Report summary
        total_removed = duplicates_removed + overlaps_removed
        if total_removed > 0:
            logger.info(
                f"✂️ Removed {total_removed} conflicting operation(s): "
                f"{duplicates_removed} exact duplicates + {overlaps_removed} overlaps/conflicts → "
                f"{len(operations)} → {len(unique_ops)} unique operations"
            )
        else:
            logger.info(f"✅ No conflicts found ({len(operations)} operations all unique)")
        
        return unique_ops
    
    def _should_include_tests_in_repo(self, issue_title: str, issue_body: str) -> bool:
        """
        Check if the issue explicitly requests test files to be added to the repo.
        
        Returns:
            True if issue explicitly asks for tests, False otherwise
        """
        # Combine title and body for analysis
        text = f"{issue_title} {issue_body}".lower()
        
        # Explicit test request keywords
        test_request_keywords = [
            'add test', 'add tests', 'create test', 'write test',
            'include test', 'test suite', 'unit test', 'integration test',
            'test coverage', 'test file', 'test case',
            # Patterns that suggest tests are part of requirements
            'with tests', 'including tests', 'and tests'
        ]
        
        # Check for explicit requests
        has_explicit_request = any(keyword in text for keyword in test_request_keywords)
        
        # Check acceptance criteria for test mentions
        has_test_in_criteria = (
            'acceptance criteria' in text and 
            any(word in text for word in ['test', 'tested', 'testing'])
        )
        
        if has_explicit_request or has_test_in_criteria:
            logger.info(f"✅ Tests explicitly requested in issue - will include in repo")
            return True
        
        logger.info(f"ℹ️ Tests NOT requested in issue - will exclude from repo operations")
        return False
    
    def _filter_test_operations(self, operations: List[Dict], issue_title: str, issue_body: str) -> List[Dict]:
        """
        Remove test file operations unless explicitly requested.
        
        This prevents scope creep where AI adds tests to the repo when:
        - User only asked for feature implementation
        - Tests should be in external test package, not repo
        
        Returns:
            Filtered operations list
        """
        if not operations:
            return operations
        
        # Check if tests were requested
        if self._should_include_tests_in_repo(issue_title, issue_body):
            return operations  # Keep all operations including tests
        
        # Filter out test operations
        test_patterns = [
            'test_', '_test.', '/tests/', '\\tests\\',
            'spec_', '_spec.', '/specs/', '\\specs\\',
            '.test.', '.spec.'
        ]
        
        filtered_ops = []
        removed_count = 0
        
        for op in operations:
            path = op.get('path', '').lower()
            is_test_file = any(pattern in path for pattern in test_patterns)
            
            if is_test_file:
                removed_count += 1
                logger.info(f"🚫 Filtered out test operation: {op.get('path')} (not requested in issue)")
            else:
                filtered_ops.append(op)
        
        if removed_count > 0:
            logger.info(f"✂️ Filtered {removed_count} test operation(s) - tests not requested in issue")
            logger.info(f"ℹ️ Note: External test package will still be generated for validation")
        
        return filtered_ops
    
    def _build_replacement_prompt(
        self,
        location: Dict,
        func_inventory: Dict,
        tech_stack: Dict,
        understanding: Any,
        file_content_map: Dict[str, str] = None,
        operation_index: int = 1,
        total_operations: int = 1,
        same_file_operation_count: int = 1
    ) -> str:
        """Build prompt for Phase 2: replacement generation."""
        
        available_functions = ', '.join(func_inventory['functions'][:30])
        old_code = location.get('extracted_old_code', '')
        
        # CRITICAL FIX: Provide surrounding context with line numbers
        context_with_lines = ""
        if file_content_map and location['file'] in file_content_map:
            file_content = file_content_map[location['file']]
            lines = file_content.splitlines()
            start = location.get('start_line', 1) - 1
            end = location.get('end_line', start + 1)
            
            # Show 10 lines before and after for context
            context_start = max(0, start - 10)
            context_end = min(len(lines), end + 10)
            
            context_lines = []
            for i in range(context_start, context_end):
                marker = ">>>" if start <= i < end else "   "
                context_lines.append(f"{marker} {i+1:3d}: {lines[i]}")
            
            context_with_lines = "\n".join(context_lines)
        
        return f"""Generate REPLACEMENT code for this specific location.

**File**: {location['file']}
**Lines to Replace**: {location.get('start_line', 0)}-{location.get('end_line', 0)}
**Why**: {location.get('reason', 'Fix issue')}
**Operation {operation_index} of {total_operations}** (File has {same_file_operation_count} total operations)

**CRITICAL INSTRUCTION - READ CAREFULLY:**

When you provide old_code and new_code, DO NOT include line numbers!

❌ WRONG:
```
"old_code": "10: import sys\n11: import os"
```

✅ CORRECT:
```
"old_code": "import sys\nimport os"
```

The line numbers are ONLY for your reference to find the code.
The old_code and new_code fields must contain PURE CODE without any prefixes!

**FILE CONTEXT WITH LINE NUMBERS** (>>> marks lines to replace):
```
{context_with_lines}
```

**EXACT CODE TO REPLACE** (lines {location.get('start_line', 0)}-{location.get('end_line', 0)}):
```
{old_code if old_code.strip() else '<empty line - you are INSERTING new code here>'}
```

{f'''**🔴 BLANK LINE INSERTION MODE - CRITICAL CONTEXT:**

You are INSERTING new code at a blank/empty line (line {location.get('start_line', 0)}).

**THIS IS OPERATION {operation_index} OF {total_operations} on {location["file"]}**.
**THIS FILE HAS {same_file_operation_count} TOTAL OPERATIONS.**

⚠️ **CRITICAL ANTI-DUPLICATION RULES:**

When multiple operations target the same file:
- Each operation handles ONE specific responsibility
- Do NOT duplicate code that other operations will handle
- Read the "Why" field carefully to understand THIS operation's scope

**Examples of multi-operation scenarios**:
- Operation 1: Add imports → Generate ONLY import statements
- Operation 2: Add endpoint → Generate ONLY the endpoint function  
- Operation 3: Add comments → Generate ONLY documentation comments
- Operation 4: Add helper → Generate ONLY helper functions

**FOR THIS OPERATION (#{operation_index})**:
**Your responsibility**: {location.get('reason', 'Insert code here')}

Generate ONLY the code that fulfills THIS SPECIFIC responsibility at line {location.get('start_line', 0)}.

❌ WRONG: Generating the ENTIRE feature (imports + endpoint + comments + helpers) in one block
✅ CORRECT: Generating ONLY what this operation's "reason" describes

**Context Awareness**:
Look at the FILE CONTEXT above to see what's already present:
- Lines BEFORE your insertion point show what comes before
- Lines AFTER your insertion point show what comes after

Your new code should fit LOGICALLY between these sections and work together with other operations on this file.''' if not old_code.strip() else ""}

{tech_stack.get('guidance', '')}

**AVAILABLE FUNCTIONS** (you may ONLY call these):
{available_functions}

**CRITICAL RULES:**
1. Generate ONLY the replacement code (don't repeat the old_code)
2. DO NOT call functions not in the available list above
3. Use {', '.join(tech_stack.get('frameworks', []))} framework patterns
4. **PRESERVE EXACT INDENTATION** - this is critical for Python!
5. Be complete - no TODO comments or placeholders
6. NO undefined function calls!
7. **CHECK VARIABLE/FUNCTION DEFINITION ORDER** - Variables must be defined BEFORE use!
8. **NO DUPLICATE IMPORTS** - Check if import already exists in file context above!

**🚨 DEFINITION ORDER REQUIREMENT (CRITICAL):**

Variables and functions MUST be defined BEFORE they are used!

❌ WRONG (model used before defined):
```python
@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    recognizer = KaldiRecognizer(model, 16000)  # ❌ ERROR: 'model' not defined yet!
    ...

# Later in file
model = Model("vosk-model-small-en-us-0.15")  # ❌ Too late!
```

✅ CORRECT (model defined first):
```python
# Define model first
model = Model("vosk-model-small-en-us-0.15")  # ✅ Defined

@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    recognizer = KaldiRecognizer(model, 16000)  # ✅ OK, model exists
    ...
```

**🚨 IMPORT COMPLETENESS REQUIREMENT (CRITICAL):**

When you use a class or function, ALL required imports MUST be present!

❌ WRONG (missing WebSocketDisconnect import):
```python
# In old_code (line 2):
from fastapi import FastAPI, Request, HTTPException, WebSocket

# Your new_code:
@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    try:
        ...
    except WebSocketDisconnect:  # ❌ ERROR: WebSocketDisconnect not imported!
        await websocket.close()
```

**🔴 CRITICAL FOR WEBSOCKET ENDPOINTS:**
If you see `except WebSocketDisconnect:` in ANY code (old or new), you MUST include `WebSocketDisconnect` in the import statement!

✅ CORRECT (complete imports for WebSocket):
```python
# In old_code (line 2):
from fastapi import FastAPI, Request, HTTPException, WebSocket

# Your new_code:
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect  # ✅ Added WebSocketDisconnect
```

**IMPORT CHECKLIST:**
1. List ALL classes/functions/exceptions you use in your code
2. Check if each one is already imported in the file context above
3. Add ONLY the missing imports
4. For FastAPI WebSocket endpoints, you typically need:
   - `WebSocket` (for accepting connections)
   - `WebSocketDisconnect` (for handling disconnections)

❌ WRONG (duplicate imports):
```python
# In old_code (line 2):
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect

# Your new_code:
from fastapi import WebSocket, WebSocketDisconnect  # ❌ DUPLICATE! Already imported above!
```

✅ CORRECT (no duplicate):
```python
# In old_code (line 2):
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect

# Your new_code:
# (No import needed - already imported above!)
@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    ...
```

**🚨 INDENTATION REQUIREMENT (CRITICAL FOR PYTHON):**

When generating new_code, you MUST preserve the exact indentation structure!

Example - Adding a function inside a class:
```python
"new_code": "@app.websocket(\"/ws/stt\")\\nasync def websocket_stt(websocket: WebSocket):\\n    await websocket.accept()\\n    try:\\n        recognizer = KaldiRecognizer(model, 16000)\\n        while True:\\n            audio_chunk = await websocket.receive_bytes()\\n            if recognizer.AcceptWaveform(audio_chunk):\\n                result = recognizer.Result()\\n                await websocket.send_json({{\"result\": result}})\\n    except WebSocketDisconnect:\\n        await websocket.close()"
```

Notice:
- Top-level decorator has NO indentation
- Function body is indented 4 spaces (\\n followed by 4 spaces)
- Nested blocks add 4 more spaces each level

**🚨 CRITICAL: AVOID DUPLICATE VARIABLE DEFINITIONS**:

When implementing streaming/WebSocket endpoints, NEVER initialize the same accumulator variable multiple times:

❌ WRONG (duplicate initialization):
```python
@app.websocket("/ws/transcribe")
async def transcribe(websocket: WebSocket):
    partial_text = ""  # First initialization
    # ... some code ...
    partial_text = ""  # ❌ ERROR: Second initialization - causes "DUPLICATE VARIABLE" error!
```

✅ CORRECT (single initialization, then accumulation):
```python
@app.websocket("/ws/transcribe")
async def transcribe(websocket: WebSocket):
    partial_text = ""  # ✅ Single initialization at start
    while True:
        chunk = await websocket.receive_bytes()
        # Process chunk and accumulate
        partial_text += process(chunk)  # ✅ Accumulate using +=
        # Send result back to client (use websocket.send_json method)
```

**Key pattern for streaming:**
1. Initialize accumulator ONCE at the start (e.g., `partial_text = ""`, `buffer = b""`)
2. Use `+=` or `.append()` to accumulate data in loops
3. NEVER re-initialize the accumulator inside the loop or later in the function

**FORBIDDEN**:
- Calling undefined functions (emit, socketio_send, etc.)
- Using different framework than detected
- TODO comments, pass statements, or placeholders
- ❌ Code with NO indentation (all on left margin)
- ❌ Inconsistent indentation (mixing tabs/spaces)
- ❌ Duplicate variable initializations (e.g., `partial_text = ""` appearing twice)

**Output Format (JSON with \\n for newlines, proper indentation):**
```json
{{
  "new_code": "... complete replacement code with \\n for newlines and proper indentation ...",
  "explanation": "What this replacement does"
}}
```

Generate the replacement now:"""
    
    def _parse_replacement_response(self, response: str) -> Dict:
        """Parse replacement JSON from LLM response with multiple fallback strategies."""
        import json
        import re
        
        # CRITICAL FIX: AI sometimes generates JSON with literal newlines in strings
        # This causes "Invalid control character" errors. Pre-escape them.
        def escape_literal_newlines_in_json(json_str: str) -> str:
            """Escape literal newlines inside JSON string values."""
            # Only escape newlines that are inside quoted strings
            # Strategy: Find all strings, replace literal \n with \\n
            result = []
            in_string = False
            escape_next = False
            
            for i, char in enumerate(json_str):
                if escape_next:
                    result.append(char)
                    escape_next = False
                    continue
                
                if char == '\\':
                    result.append(char)
                    escape_next = True
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                    result.append(char)
                    continue
                
                if in_string and char == '\n':
                    # Replace literal newline with escaped version
                    result.append('\\n')
                elif in_string and char == '\t':
                    # Also escape tabs
                    result.append('\\t')
                elif in_string and char == '\r':
                    # Escape carriage returns
                    result.append('\\r')
                else:
                    result.append(char)
            
            return ''.join(result)
        
        # Strategy 1: Try JSON with code fences
        try:
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                # CRITICAL: Escape literal newlines before parsing
                json_str = escape_literal_newlines_in_json(json_str)
                parsed = json.loads(json_str)
                if 'new_code' in parsed and parsed['new_code']:
                    # CRITICAL FIX: Strip line numbers from code
                    parsed = self._strip_line_numbers_from_operation(parsed)
                    return parsed
                else:
                    logger.warning(f"⚠️ Strategy 1: JSON parsed but 'new_code' missing or empty")
        except json.JSONDecodeError as e:
            logger.warning(f"Strategy 1 failed (JSON with fences): {e}")
        
        # Strategy 2: Try JSON without code fences
        try:
            json_match = re.search(r'\{.*"new_code".*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                # CRITICAL: Escape literal newlines before parsing
                json_str = escape_literal_newlines_in_json(json_str)
                parsed = json.loads(json_str)
                if 'new_code' in parsed and parsed['new_code']:
                    # CRITICAL FIX: Strip line numbers from code
                    parsed = self._strip_line_numbers_from_operation(parsed)
                    return parsed
                else:
                    logger.warning(f"⚠️ Strategy 2: JSON parsed but 'new_code' missing or empty")
        except json.JSONDecodeError as e:
            logger.warning(f"Strategy 2 failed (JSON without fences): {e}")
        
        # Strategy 3: Extract code block without JSON wrapper
        code_match = re.search(r'```(?:python|javascript|typescript|java|go|rust|cpp|c)?\s*\n(.*?)\n```', response, re.DOTALL)
        if code_match:
            code = code_match.group(1).strip()
            if code and len(code) > 10:
                # Strip line numbers from extracted code
                code = self._strip_line_numbers_from_code(code)
                logger.info(f"✅ Strategy 3 success: Extracted code block ({len(code)} chars)")
                return {'new_code': code, 'explanation': 'Extracted from code block'}
        
        # Strategy 4: Take entire response as code (last resort, if no code fences)
        if response and len(response) > 50 and '```' not in response[:100]:
            # Looks like raw code without formatting
            response_clean = self._strip_line_numbers_from_code(response.strip())
            logger.warning(f"⚠️ Strategy 4: Using entire response as code (last resort, {len(response_clean)} chars)")
            return {'new_code': response_clean, 'explanation': 'Raw response without formatting'}
        
        # All strategies failed
        logger.error(f"❌ ALL 4 PARSING STRATEGIES FAILED")
        logger.error(f"   Response length: {len(response)} chars")
        logger.error(f"   Response preview: {response[:500]}")
        logger.error(f"   Has code fences: {'```' in response}")
        logger.error(f"   Has JSON braces: {'{' in response and '}' in response}")
        return {}  # Return empty dict - caller MUST validate
    
    def _strip_line_numbers_from_code(self, code: str) -> str:
        """Remove line number prefixes from code (both N: and N.M: formats).
        
        Preserves indentation that comes AFTER the line number prefix.
        
        Examples:
            '10: import sys\n11: import os' -> 'import sys\nimport os'
            '   5: def foo():' -> 'def foo():'
            '   15.1: class Foo:' -> 'class Foo:'
            '   15.2:     def bar():' -> '    def bar():' (indentation preserved)
            '   2.1: websockets' -> 'websockets'
        """
        import re
        lines = code.splitlines()
        cleaned_lines = []
        for line in lines:
            # Match patterns: '10: ' or '   5: ' or '   15.1: ' or '   2.1: '
            # Regex explanation:
            #   ^\s*        - Start of line + optional spaces (before line number)
            #   \d+         - One or more digits
            #   (?:\.\d+)?  - Optional: dot + more digits (non-capturing group)
            #   :           - Colon
            #   \s?         - Optional SINGLE space after colon (not \s* which matches all whitespace!)
            # This preserves any indentation after the line number prefix
            cleaned = re.sub(r'^\s*\d+(?:\.\d+)?:\s?', '', line)
            cleaned_lines.append(cleaned)
        return '\n'.join(cleaned_lines)
    
    def _strip_line_numbers_from_operation(self, operation: Dict) -> Dict:
        """Strip line numbers from old_code and new_code in an operation."""
        if 'old_code' in operation and isinstance(operation['old_code'], str):
            operation['old_code'] = self._strip_line_numbers_from_code(operation['old_code'])
        if 'new_code' in operation and isinstance(operation['new_code'], str):
            operation['new_code'] = self._strip_line_numbers_from_code(operation['new_code'])
        
        # Also clean edits array if present
        if 'edits' in operation and isinstance(operation['edits'], list):
            for edit in operation['edits']:
                if isinstance(edit, dict):
                    if 'old_code' in edit:
                        edit['old_code'] = self._strip_line_numbers_from_code(edit['old_code'])
                    if 'new_code' in edit:
                        edit['new_code'] = self._strip_line_numbers_from_code(edit['new_code'])
        
        return operation

    def _build_conservative_prompt(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> str:
        """Build prompt for conservative fix generation."""
        
        files_context = self._format_files_context(relevant_files[:5])  # Limit to 5 most relevant
        
        # Build a clear list of files that EXIST in the repository
        existing_files_list = "\n".join([f"  ✅ {f.metadata.get('path', 'unknown')}" for f in relevant_files[:10] if hasattr(f, 'metadata')])
        if not existing_files_list:
            existing_files_list = "  (No files retrieved - this may be a new repository)"
        
        # Check if mentioned files are missing
        missing_files = []
        if relevant_files and hasattr(relevant_files[0], 'metadata'):
            missing_files = relevant_files[0].metadata.get('mentioned_files_missing', [])
        
        missing_files_warning = ""
        if missing_files:
            missing_files_warning = f"""
⚠️ **CRITICAL CONTEXT ALERT:**
The following files mentioned in the issue DO NOT EXIST in the repository:
{chr(10).join(f'  - {f}' for f in missing_files)}

These files must be CREATED from scratch using "type": "create" operations.
DO NOT generate "edit" operations for non-existent files!
"""
        
        return f"""You are a senior software engineer generating a CONSERVATIVE fix for a GitHub issue.
{missing_files_warning}

**📁 FILES THAT EXIST IN REPOSITORY (use type: "edit" for these):**
{existing_files_list}

**Issue:** {issue_title}
{issue_body}

**Analysis:**
Root Cause: {understanding.root_cause}
Requirements: {', '.join(understanding.requirements[:3])}
Complexity: {understanding.complexity}

**Relevant Code:**
{files_context}

**Your Task:**
Generate a MINIMAL, LOW-RISK fix that:
1. Fixes the immediate issue with smallest possible code change
2. Preserves all existing functionality (no refactoring)
3. Uses proven, safe patterns
4. Has very low risk of introducing bugs

**🚨 #1 VALIDATION FAILURE CAUSE - EMPTY OLD_CODE FIELDS! 🚨**

**YOU WILL SEE NUMBERED LINES LIKE THIS:**
```
File: main.py
   1: import os
   2: import sys
   3:
   4: def main():
```

**TO EDIT LINES 1-2 (add imports), YOU MUST:**
✅ **COPY LINES 1-2 INTO old_code (without line numbers!):**
```json
{{
  "start_line": 1,
  "end_line": 2,
  "old_code": "import os\\nimport sys",
  "new_code": "import os\\nimport sys\\nimport asyncio"
}}
```

❌ **NEVER LEAVE old_code EMPTY:**
```json
{{
  "old_code": "",
  "new_code": "import asyncio"
}}
```
🚨 Empty old_code = UI can't show diff = VALIDATION FAILS = 75% failure rate!

**RULE:** For EVERY edit operation, COPY THE EXACT LINES from numbered context into old_code!

**Important Guidelines:**
- 📝 **EDIT existing files** (shown in context) when modifying code
- ➕ **CREATE new files** only if truly needed (tests, new utilities, missing files)
- 🗑️ **DELETE files** that are obsolete or problematic
- ⚠️ **PREFERENCE:** Edit existing files when possible. Only create new files when necessary.

**🚨 CRITICAL IMPLEMENTATION RULES - ANY VIOLATION = IMMEDIATE REJECTION:**

**ZERO TOLERANCE FOR PLACEHOLDER CODE:**
❌ **ABSOLUTELY FORBIDDEN - These will cause INSTANT FAILURE:**
- `# TODO: implement this`
- `# FIXME: add logic here`
- `# This can be tested later`
- `pass  # Add implementation here`
- Dummy functions: `def process(data): return 'dummy result'`
- Commented placeholders: `# Implement audio processing logic`
- Empty functions with just docstrings
- Functions that return fake/mock data instead of real implementation

✅ **REQUIRED - Every function must:**
- Have complete, production-ready implementation
- Include proper error handling
- Work with real data, not dummy/mock returns
- Be fully functional and testable

**MANDATORY REQUIREMENTS:**
1. **COMPLETE ALL IMPLEMENTATIONS** - Every function fully implemented with actual logic
2. **FULLY INTEGRATE** - If creating new files, integrate them into existing application
3. **WORKING CODE ONLY** - Every change must be complete and functional
4. **NO PLACEHOLDERS** - Code must be production-ready, not "to be completed later"
5. **CORRECT DATA TYPES** - Use proper data formats (e.g., int16 for audio, not float32 if library expects int16)
6. **REAL PATHS** - Use actual file paths from repository context, never hardcoded 'model' or '/path/to/file'
7. **INTEGRATE, DON'T REPLACE** - Extend existing FastAPI/Flask/Django apps, don't create standalone servers
8. **PRODUCTION ERROR HANDLING** - Use logging with proper levels, handle edge cases, never just print() errors
9. **SECURITY AWARE** - Add authentication/authorization if handling sensitive data or user connections
10. **COMPLETE IMPORTS** - When adding framework features (WebSocket, SSE, OAuth), include ALL related imports together:
    ❌ BAD: `from fastapi import WebSocket` (missing WebSocketDisconnect for exception handling)
    ✅ GOOD: `from fastapi import WebSocket, WebSocketDisconnect` (complete import set)
    - FastAPI WebSocket: Always include `WebSocket, WebSocketDisconnect` together
    - FastAPI File Upload: Include `File, UploadFile` together
    - FastAPI Dependency Injection: Include `Depends, HTTPException` with any auth code
    - Django Auth: Include `authenticate, login, logout` together
    - Flask Auth: Include `login_user, logout_user, login_required` together

**Output Format (JSON) - Professional Line-Based Diffs:**
```json
{{
  "operations": [
    {{
      "type": "create|edit|delete",
      "path": "path/to/file.py",
      "explanation": "What this operation does",
      
      // For CREATE: provide full file content
      "content": "full file content here...",
      
      // For EDIT: provide line-based changes with context
      "edits": [
        {{
          "start_line": 10,
          "end_line": 15,
          "old_code": "exact code from lines 10-15 that you see above",
          "new_code": "replacement code for lines 10-15",
          "explanation": "why this change is needed"
        }}
      ],
      
      // For DELETE: just type and path
    }}
  ]
}}
```

**Operation Type Guide:**
- **"create"**: New file that doesn't exist. Use `content` field with full file.
- **"edit"**: Change existing file. Use `edits` with line numbers and before/after code.
- **"delete"**: Remove entire file. Only needs `type` and `path`.

🔴 **CRITICAL DECISION TREE - READ FIRST:**

**Step 1: Check if file EXISTS in the context above**
- Look at the "📁 FILES THAT EXIST IN REPOSITORY" section at the very top
- Look at the **Relevant Code:** section with numbered lines
- If filename appears in either list with ✅ → Use type: "edit"
- If filename is NOT in those lists → Use type: "create"

**Step 2: For EDIT operations - NEVER leave old_code empty!**
- Find the exact lines in the file context above
- Copy those lines EXACTLY into old_code
- Empty old_code = BROKEN UI = INVALID OPERATION

**Step 3: For ADDING NEW CODE (imports, functions, endpoints)**
🚨 **MOST COMMON MISTAKE:** Using edit with empty old_code to "insert" new lines!

❌ **WRONG - This breaks the UI:**
```json
{{
  "old_code": "",
  "new_code": "import asyncio"
}}
```
Problem: Empty old_code means UI shows "(No code to remove)"

✅ **CORRECT - Include surrounding context:**
Find WHERE to insert (e.g., after existing imports):
```json
{{
  "start_line": 1,
  "end_line": 2,
  "old_code": "import os\\nimport sys",
  "new_code": "import os\\nimport sys\\nimport asyncio",
  "explanation": "Add asyncio import after existing imports"
}}
```
Solution: Include existing code at insertion point in old_code, then add new code to it

**Insertion Strategies:**
- **Adding imports?** → Replace existing import block with expanded version
- **Adding function?** → Replace last function + newlines with last function + new function
- **Adding at end of file?** → Replace last 2-3 lines with last lines + new code
- **Adding in middle?** → Replace surrounding lines that define insertion point

**🔴 SPECIAL CASE: EOF Append Marker**
If you see `old_code` with value `<<EOF_APPEND_MARKER>>`, this means:
- The file ends with empty lines and you're appending new content
- **DO NOT include `<<EOF_APPEND_MARKER>>` in your `new_code`!**
- This is just a marker indicating "append here at end of file"
- Replace it with your actual new content (e.g., new documentation section)
- The test package apply script recognizes this marker and will append your code at EOF
- ❌ WRONG: `new_code: "<<EOF_APPEND_MARKER>>\n## New Section\n"`
- ✅ CORRECT: `new_code: "## New Section\n"`

**Example:**
FILE CONTEXT shows: `requirements.txt` with lines 1-5
→ Use `type: "edit"` with old_code copied from above

FILE CONTEXT does NOT show: `requirements.txt`
→ Use `type: "create"` with content field

🚨 **CRITICAL: requirements.txt FORMAT WARNING** 🚨
The file `requirements.txt` contains PACKAGE NAMES ONLY - NOT Python code!
Each package goes on ITS OWN LINE - DO NOT merge package names!

✅ **CORRECT** requirements.txt content (EACH PACKAGE ON NEW LINE):
```
fastapi
uvicorn
websockets
vosk
```

❌ **WRONG** - DO NOT merge package names into one word:
```
fastapiwebsockets
```
This will cause "ERROR: No matching distribution found for fastapiwebsockets"!

❌ **WRONG** - DO NOT write Python code in requirements.txt:
```python
@app.websocket("/ws")
async def websocket_handler():
    pass
```

⚠️ **NEVER put in requirements.txt**:
- Function definitions (def, async def)
- Class definitions
- Import statements
- Decorators (@app.websocket, @router)
- Merged package names (fastapiwebsockets, websocketsstarlette)
- Any Python code

requirements.txt is a TEXT FILE listing package names for pip install, ONE PER LINE!

**Example: Adding WebSocket dependencies to requirements.txt**

❌ WRONG (merges packages):
```json
{
  "old_code": "\n",
  "new_code": "fastapiwebsockets"
}
```

✅ CORRECT (one package per line):
```json
{
  "old_code": "\n",
  "new_code": "websockets\nstarlette"
}
```

Or if appending to existing requirements:
```json
{
  "old_code": "fastapi\nuvicorn\nvosk\n",
  "new_code": "fastapi\nuvicorn\nvosk\nwebsockets\nstarlette\n"
}
```

**For EDIT operations (CRITICAL - Read Carefully):**
1. **Use the ACTUAL code** you see in the file context above
2. **Include line numbers** (start_line, end_line) for the section to change
3. **Copy exact code** in `old_code` - must match what you see above exactly!
4. **Provide new code** in `new_code` - this will replace lines start_line to end_line
5. **Multiple edits** are fine - they will be applied in sequence

**Example:**
If you see:
```
10: def calculate_sum(a, b):
11:     return a - b  # BUG: Should be addition!
12:
```

Your edit should be:
```json
{{
  "start_line": 10,
  "end_line": 11,
  "old_code": "def calculate_sum(a, b):\\n    return a - b  # BUG: Should be addition!",
  "new_code": "def calculate_sum(a, b):\\n    return a + b  # Fixed: Now correctly adds",
  "explanation": "Fixed bug: changed subtraction to addition"
}}
```

**Examples:**

// Create new file
{{
  "type": "create",
  "path": "models/user.py",
  "content": "class User:\\n    def __init__(self):\\n        pass",
  "explanation": "Create User model"
}}

// Edit existing file (line-based)
{{
  "type": "edit",
  "path": "requirements.txt",
  "edits": [
    {{
      "start_line": 1,
      "end_line": 2,
      "old_code": "fastapi\\nuvicorn",
      "new_code": "fastapi\\nuvicorn\\nsqlalchemy\\npsycopg2-binary",
      "explanation": "Add database dependencies"
    }}
  ],
  "explanation": "Add missing database packages"
}}

// Delete file
{{
  "type": "delete",
  "path": "old_file.py",
  "explanation": "Remove deprecated file"
}}

⚠️ **CRITICAL REMINDERS - READ CAREFULLY:**
1. **For edit operations**: You MUST copy the EXACT code from the file above into `old_code`
   - Don't leave it empty! Copy what you see in the numbered lines above!
   - Use line numbers to find the exact code to replace
2. **For edit operations**: Fill `new_code` with your improved version
3. **NEVER leave `old_code` empty** - this breaks the UI and makes changes invisible!
4. **If a file doesn't exist above**: Use `type: "create"` with full `content`
5. **If a file exists above**: Use `type: "edit"` with `edits` array containing old_code and new_code

**Example of CORRECT edit operation:**
```json
{{
  "type": "edit",
  "path": "main.py",
  "edits": [
    {{
      "start_line": 10,
      "end_line": 15,
      "old_code": "def old_function():\n    pass  # old implementation",
      "new_code": "def new_function():\n    return True  # new implementation",
      "explanation": "Improved function"
    }}
  ]
}}
```

**Example of WRONG edit operation (DO NOT DO THIS):**
```json
{{
  "type": "edit",
  "path": "main.py",
  "edits": [
    {{
      "start_line": 10,
      "end_line": 15,
      "old_code": "",
      "new_code": "def new_function():\n    return True"
    }}
  ]
}}
```
Problem: Empty old_code field breaks UI display

**🎯 EXAMPLE OF CORRECT IMPLEMENTATION (Learn from this!):**

Issue: "Add WebSocket support for real-time transcription"
Framework Detected: **FastAPI**

❌ WRONG (Uses raw websockets library - REJECTED):
```python
import websockets

async def handle_audio_stream(websocket, path):
    while True:
        audio_data = await websocket.recv()
        # TODO: Implement transcription
        await websocket.send("dummy result")
```

✅ CORRECT (Uses FastAPI WebSocket - THIS IS WHAT WE WANT):
```python
from fastapi import WebSocket, WebSocketDisconnect
import vosk
import json
import numpy as np

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    model = vosk.Model("vosk-model-small-en-us-0.15")
    recognizer = vosk.KaldiRecognizer(model, 16000)
    
    try:
        while True:
            # Receive audio data from client
            audio_data = await websocket.receive_bytes()
            
            # 🚨 CRITICAL: Vosk expects 16-bit PCM audio, NOT float32!
            # If client sends float32, convert it:
            if len(audio_data) % 2 != 0:
                # Likely float32 (4 bytes per sample)
                audio_float = np.frombuffer(audio_data, dtype=np.float32)
                audio_int16 = (audio_float * 32767).astype(np.int16)
                audio_bytes = audio_int16.tobytes()
            else:
                # Already 16-bit PCM
                audio_bytes = audio_data
            
            # Process with Vosk
            if recognizer.AcceptWaveform(audio_bytes):
                result = json.loads(recognizer.Result())
                transcription = result.get('text', '')
                await websocket.send_json({'type': 'final', 'text': transcription})
            else:
                partial = json.loads(recognizer.PartialResult())
                await websocket.send_json({'type': 'partial', 'text': partial.get('partial', '')})
    except WebSocketDisconnect:
        logger.info("Client disconnected from transcription WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({'type': 'error', 'message': str(e)})
```

Key Differences:
✅ Uses FastAPI's WebSocket decorator (@app.websocket)
✅ Integrates with existing FastAPI app object
✅ Uses FastAPI's WebSocketDisconnect exception
✅ Uses FastAPI's WebSocket methods (accept, receive_bytes, send_json)
✅ **CORRECT audio format**: Handles 16-bit PCM conversion (Vosk requirement)
✅ **Proper error handling** with logging, not just print()
✅ Complete implementation with no placeholder/TODO comments
✅ **Production-ready** with proper exception handling

Generate the conservative fix now:"""
    
    def _build_balanced_prompt(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> str:
        """Build prompt for balanced fix generation."""
        
        files_context = self._format_files_context(relevant_files[:8])
        
        # Build a clear list of files that EXIST in the repository
        existing_files_list = "\n".join([f"  ✅ {f.metadata.get('path', 'unknown')}" for f in relevant_files[:10] if hasattr(f, 'metadata')])
        if not existing_files_list:
            existing_files_list = "  (No files retrieved - this may be a new repository)"
        
        # Check if mentioned files are missing
        missing_files = []
        if relevant_files and hasattr(relevant_files[0], 'metadata'):
            missing_files = relevant_files[0].metadata.get('mentioned_files_missing', [])
        
        missing_files_warning = ""
        if missing_files:
            missing_files_warning = f"""
⚠️ **CRITICAL CONTEXT ALERT:**
The following files mentioned in the issue DO NOT EXIST in the repository:
{chr(10).join(f'  - {f}' for f in missing_files)}

These files must be CREATED from scratch using "type": "create" operations.
DO NOT generate "edit" operations for non-existent files!
"""
        
        return f"""You are a senior software engineer generating a BALANCED fix for a GitHub issue.
{missing_files_warning}

**📁 FILES THAT EXIST IN REPOSITORY (use type: "edit" for these):**
{existing_files_list}

**Issue:** {issue_title}
{issue_body}

**Analysis:**
Root Cause: {understanding.root_cause}
Requirements: {', '.join(understanding.requirements)}
Affected Components: {', '.join(understanding.affected_components[:3])}
Complexity: {understanding.complexity}

**Relevant Code:**
{files_context}

**Your Task:**
Generate a BALANCED fix that:
1. Fixes the issue completely and correctly
2. Refactors affected code for better maintainability
3. Balances thoroughness with reasonable risk
4. Follows best practices and design patterns

**🚨 #1 VALIDATION FAILURE CAUSE - EMPTY OLD_CODE FIELDS! 🚨**

**YOU WILL SEE NUMBERED LINES LIKE THIS:**
```
File: main.py
   1: import os
   2: import sys
   3:
   4: def main():
```

**TO EDIT LINES 1-2 (add imports), YOU MUST:**
✅ **COPY LINES 1-2 INTO old_code (without line numbers!):**
```json
{{
  "start_line": 1,
  "end_line": 2,
  "old_code": "import os\\nimport sys",
  "new_code": "import os\\nimport sys\\nimport asyncio"
}}
```

❌ **NEVER LEAVE old_code EMPTY:**
```json
{{
  "old_code": "",
  "new_code": "import asyncio"
}}
```
🚨 Empty old_code = UI can't show diff = VALIDATION FAILS = 75% failure rate!

**RULE:** For EVERY edit operation, COPY THE EXACT LINES from numbered context into old_code!

**Important Guidelines:**
- 📝 **EDIT existing files** (shown in context) when modifying code - this is preferred!
- ➕ **CREATE new files** when needed: missing test files, new utilities, documentation
- 🗑️ **DELETE files** that are obsolete or problematic
- ⚠️ **PREFERENCE:** Modify existing files rather than creating similar new files

**🚨 CRITICAL IMPLEMENTATION RULES - ANY VIOLATION = IMMEDIATE REJECTION:**

**ZERO TOLERANCE FOR PLACEHOLDER CODE:**
❌ **ABSOLUTELY FORBIDDEN - These will cause INSTANT FAILURE:**
- `# TODO: implement this`
- `# FIXME: add logic here`
- `# This can be tested later`
- `pass  # Add implementation here`
- Dummy functions: `def process(data): return 'dummy result'`
- Commented placeholders: `# Implement audio processing logic`
- Empty functions with just docstrings
- Functions that return fake/mock data instead of real implementation

✅ **REQUIRED - Every function must:**
- Have complete, production-ready implementation
- Include proper error handling
- Work with real data, not dummy/mock returns
- Be fully functional and testable

**MANDATORY REQUIREMENTS:**
1. **COMPLETE ALL IMPLEMENTATIONS** - Every function fully implemented with actual logic
2. **FULLY INTEGRATE** - If creating new files/modules, MUST integrate them into existing code
3. **NO GUESSWORK** - Don't leave things commented out or incomplete
4. **WORKING CODE ONLY** - Every operation must result in fully functional code
5. **INTEGRATION IS MANDATORY** - Creating a feature? Integrate it into the main application

**Output Format (JSON) - Professional Line-Based Diffs:**
```json
{{
  "operations": [
    {{
      "type": "create|edit|delete",
      "path": "path/to/file.py",
      "explanation": "What this operation does",
      "content": "full file content (for create only)",
      "edits": [
        {{
          "start_line": 10,
          "end_line": 15,
          "old_code": "exact code from lines 10-15",
          "new_code": "replacement code",
          "explanation": "why this change"
        }}
      ]
    }}
  ]
}}
```

**Edit Guidelines:** Use line numbers from the code shown above. Copy old_code exactly as you see it.

🔴 **CRITICAL DECISION TREE - READ FIRST:**

**Step 1: Check if file EXISTS in the context above**
- Look at the **Relevant Code:** section above
- Search for the filename you want to modify
- If you see numbered lines for that file → Use "edit"
- If you DON'T see that file → Use "create"

**Step 2: For EDIT operations - NEVER leave old_code empty!**
- Find the exact lines in the file context above
- Copy those lines EXACTLY into old_code
- Empty old_code = BROKEN UI = INVALID OPERATION

**Step 3: For ADDING NEW CODE (imports, functions, endpoints)**
🚨 **MOST COMMON MISTAKE:** Using edit with empty old_code to "insert" new lines!

❌ **WRONG - This breaks the UI:**
```json
{{
  "old_code": "",
  "new_code": "import asyncio"
}}
```
Problem: Empty old_code means UI shows "(No code to remove)"

✅ **CORRECT - Include surrounding context:**
Find WHERE to insert (e.g., after existing imports):
```json
{{
  "start_line": 1,
  "end_line": 2,
  "old_code": "import os\\nimport sys",
  "new_code": "import os\\nimport sys\\nimport asyncio",
  "explanation": "Add asyncio import after existing imports"
}}
```
Solution: Include existing code at insertion point in old_code, then add new code to it

**Insertion Strategies:**
- **Adding imports?** → Replace existing import block with expanded version
- **Adding function?** → Replace last function + newlines with last function + new function
- **Adding at end of file?** → Replace last 2-3 lines with last lines + new code
- **Adding in middle?** → Replace surrounding lines that define insertion point

⚠️ **CRITICAL REMINDERS:**
1. **For edits**: ALWAYS fill in `old_code` with exact code from file context
2. **For edits**: ALWAYS fill in `new_code` with the replacement code
3. **Never leave `old_code` or `new_code` empty!**
4. **Copy line numbers** from the file context shown above
5. **Use "type": "edit"** for modifying existing files (not "modify")

**REMINDER: Before choosing operation type, check "📁 FILES THAT EXIST" at the very top!**

**🎯 ANTI-PLACEHOLDER EXAMPLE:**

❌ WRONG (Will be REJECTED):
```python
def process_audio_chunk(chunk):
    # TODO: Implement audio processing
    return "dummy transcription"
```

✅ CORRECT (Full Implementation):
```python
import vosk
import json

def process_audio_chunk(chunk: bytes) -> str:
    \"\"\"Process audio chunk and return transcription.\"\"\"
    if not chunk:
        return ""
    
    model = vosk.Model("model_path")
    recognizer = vosk.KaldiRecognizer(model, 16000)
    
    if recognizer.AcceptWaveform(chunk):
        result = json.loads(recognizer.Result())
        return result.get('text', '')
    
    return ""
```

Generate the balanced fix now:"""
    
    def _build_comprehensive_prompt(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str
    ) -> str:
        """Build prompt for comprehensive fix generation."""
        
        files_context = self._format_files_context(relevant_files[:10])
        
        # TECH STACK DETECTION (NEW!)
        tech_stack = tech_stack_detector.detect_stack([
            {'path': f.path if hasattr(f, 'path') else f.metadata.get('path', ''),
             'content': f.content if hasattr(f, 'content') else f.page_content,
             'language': f.language if hasattr(f, 'language') else 'unknown'}
            for f in relevant_files[:10]
        ])
        
        tech_stack_guidance = ""
        if tech_stack['frameworks']:
            tech_stack_guidance = f"""

{'='*80}
🔧 **TECH STACK DETECTED: {', '.join(tech_stack['frameworks'])}**
{'='*80}

{tech_stack['guidance']}

**CRITICAL RULES FOR THIS TECH STACK:**
1. Use the EXISTING frameworks shown above ({', '.join(tech_stack['frameworks'])})
2. Integrate with EXISTING application structure from the provided files
3. DO NOT create standalone servers or use different libraries
4. Reuse existing model/app instances shown in the file context above
5. Follow the framework's conventions and best practices

{'='*80}
"""
        
        # Build a clear list of files that EXIST in the repository
        existing_files_list = "\n".join([f"  ✅ {f.metadata.get('path', 'unknown')}" for f in relevant_files[:10] if hasattr(f, 'metadata')])
        if not existing_files_list:
            existing_files_list = "  (No files retrieved - this may be a new repository)"
        
        return f"""You are a senior software engineer generating a COMPREHENSIVE fix for a GitHub issue.

**📁 FILES THAT EXIST IN REPOSITORY (use type: "edit" for these):**
{existing_files_list}

**Issue:** {issue_title}
{issue_body}

**Analysis:**
Root Cause: {understanding.root_cause}
Requirements: {', '.join(understanding.requirements)}
Affected Components: {', '.join(understanding.affected_components)}
Potential Side Effects: {', '.join(understanding.potential_side_effects[:3])}
Complexity: {understanding.complexity}

**Relevant Code:**
{files_context}

{tech_stack_guidance}

**Your Task:**
Generate a COMPREHENSIVE fix that:
1. Addresses the ROOT CAUSE, not just symptoms
2. Improves overall system design and architecture
3. Prevents similar issues in the future
4. Includes proper error handling and edge cases
5. May involve significant refactoring for long-term benefit

**🚨 #1 VALIDATION FAILURE CAUSE - EMPTY OLD_CODE FIELDS! 🚨**

**YOU WILL SEE NUMBERED LINES LIKE THIS:**
```
File: main.py
   1: import os
   2: import sys
   3:
   4: def main():
```

**TO EDIT LINES 1-2 (add imports), YOU MUST:**
✅ **COPY LINES 1-2 INTO old_code (without line numbers!):**
```json
{{
  "start_line": 1,
  "end_line": 2,
  "old_code": "import os\\nimport sys",
  "new_code": "import os\\nimport sys\\nimport asyncio"
}}
```

❌ **NEVER LEAVE old_code EMPTY:**
```json
{{
  "old_code": "",
  "new_code": "import asyncio"
}}
```
🚨 Empty old_code = UI can't show diff = VALIDATION FAILS = 75% failure rate!

**RULE:** For EVERY edit operation, COPY THE EXACT LINES from numbered context into old_code!

**Important Guidelines:**
- 📝 **EDIT existing files** (shown in context) - prefer modifying existing code
- ➕ **CREATE new files** when beneficial: test suites, documentation, new services/utilities
- 🗑️ **DELETE files** that are obsolete or problematic
- 💡 **Think holistically**: Add tests and docs, but modify existing files when appropriate
- ⚠️ **AVOID:** Creating similar files with different names (e.g., README_new.md instead of editing README.md)

**🚨 CRITICAL IMPLEMENTATION RULES - ANY VIOLATION = IMMEDIATE REJECTION:**

**ZERO TOLERANCE FOR PLACEHOLDER CODE:**
❌ **ABSOLUTELY FORBIDDEN - These will cause INSTANT FAILURE:**
- `# TODO: implement this`
- `# FIXME: add logic here`
- `# This can be tested later`
- `pass  # Add implementation here`
- Dummy functions: `def process(data): return 'dummy result'`
- Commented placeholders: `# Implement audio processing logic`
- Empty functions with just docstrings
- Functions that return fake/mock data instead of real implementation

✅ **REQUIRED - Every function must:**
- Have complete, production-ready implementation
- Include proper error handling
- Work with real data, not dummy/mock returns
- Be fully functional and testable

**MANDATORY REQUIREMENTS:**
1. **COMPLETE ALL IMPLEMENTATIONS** - Every function fully implemented with actual logic
2. **FULLY INTEGRATE** - If you create a new module (e.g., websocket_handler.py), you MUST integrate it into the main application file
3. **NO GUESSWORK** - Don't comment out code or leave things for the user to complete
4. **WORKING CODE ONLY** - Every file operation must result in fully functional, ready-to-run code
5. **INTEGRATION IS MANDATORY** - Creating an endpoint? Add it to the main app. Creating a utility? Import and use it.

**Example of WRONG approach:**
❌ Create websocket_handler.py with new endpoint
❌ Leave main.py unchanged (not integrating the new endpoint)
❌ Comment: "This can be tested by running..."

**Example of CORRECT approach:**
✅ Create websocket_handler.py with new endpoint
✅ Edit main.py to import and integrate the WebSocket handler
✅ Edit main.py to uncomment/add necessary code to run the handler
✅ Result: Complete, working implementation ready to test

**Output Format (JSON) - Professional Line-Based Diffs:**
```json
{{
  "operations": [
    {{
      "type": "create|edit|delete",
      "path": "path/to/file.py",
      "explanation": "What this operation does",
      "content": "full file content (for create only)",
      "edits": [
        {{
          "start_line": 10,
          "end_line": 15,
          "old_code": "exact code from lines 10-15",
          "new_code": "replacement code",
          "explanation": "why this change"
        }}
      ]
    }}
  ]
}}
```

**Edit Guidelines:** Use line numbers from the code shown above. Copy old_code exactly as you see it.

🔴 **CRITICAL DECISION TREE - READ FIRST:**

**Step 1: Check if file EXISTS in the context above**
- Look at the **Relevant Code:** section above
- Search for the filename you want to modify
- If you see numbered lines for that file → Use "edit"
- If you DON'T see that file → Use "create"

**Step 2: For EDIT operations - NEVER leave old_code empty!**
- Find the exact lines in the file context above
- Copy those lines EXACTLY into old_code
- Empty old_code = BROKEN UI = INVALID OPERATION

**Step 3: For ADDING NEW CODE (imports, functions, endpoints)**
🚨 **MOST COMMON MISTAKE:** Using edit with empty old_code to "insert" new lines!

❌ **WRONG - This breaks the UI:**
```json
{{
  "old_code": "",
  "new_code": "import asyncio"
}}
```
Problem: Empty old_code means UI shows "(No code to remove)"

✅ **CORRECT - Include surrounding context:**
Find WHERE to insert (e.g., after existing imports):
```json
{{
  "start_line": 1,
  "end_line": 2,
  "old_code": "import os\\nimport sys",
  "new_code": "import os\\nimport sys\\nimport asyncio",
  "explanation": "Add asyncio import after existing imports"
}}
```
Solution: Include existing code at insertion point in old_code, then add new code to it

**Insertion Strategies:**
- **Adding imports?** → Replace existing import block with expanded version
- **Adding function?** → Replace last function + newlines with last function + new function
- **Adding at end of file?** → Replace last 2-3 lines with last lines + new code
- **Adding in middle?** → Replace surrounding lines that define insertion point

⚠️ **CRITICAL REMINDERS - READ CAREFULLY:**
1. **For edit operations**: You MUST copy the EXACT code from the file above into `old_code`
   - Don't leave it empty! Copy what you see in the numbered lines above!
   - Use line numbers to find the exact code to replace
2. **For edit operations**: Fill `new_code` with your improved version
3. **NEVER leave `old_code` empty** - this breaks the UI and makes changes invisible!
4. **If a file doesn't exist above**: Use `type: "create"` with full `content`
5. **If a file exists above**: Use `type: "edit"` with `edits` array containing old_code and new_code
6. **Use "type": "edit"** for modifying existing files (not "modify")

**Example of CORRECT edit operation:**
```json
{{
  "type": "edit",
  "path": "main.py",
  "edits": [
    {{
      "start_line": 10,
      "end_line": 15,
      "old_code": "def old_function():\n    pass  # old implementation",
      "new_code": "def new_function():\n    return True  # new implementation",
      "explanation": "Improved function"
    }}
  ]
}}
```

**Example of WRONG edit operation (DO NOT DO THIS):**
```json
{{
  "type": "edit",
  "path": "main.py",
  "edits": [
    {{
      "start_line": 10,
      "end_line": 15,
      "old_code": "",
      "new_code": "def new_function():\n    return True"
    }}
  ]
}}
```
Problem: Empty old_code field breaks UI display

**REMINDER: Before choosing operation type, check "📁 FILES THAT EXIST" at the very top!**

**🚀 EXAMPLE OF COMPREHENSIVE, PRODUCTION-READY CODE:**

Issue: "Add WebSocket support"

❌ WRONG (Placeholder):
```python
async def websocket_handler(websocket):
    # Implement WebSocket logic here
    pass
```

✅ CORRECT (Complete Implementation with FastAPI):
```python
from fastapi import WebSocket, WebSocketDisconnect
import logging
import json
from typing import Set

logger = logging.getLogger(__name__)
active_connections: Set[WebSocket] = set()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    \"\"\"Handle WebSocket connections with full error handling.\"\"\"
    await websocket.accept()
    active_connections.add(websocket)
    logger.info(f"Client connected. Active: {len(active_connections)}")
    
    try:
        while True:
            try:
                message = await websocket.receive_text()
                response = await process_message(message)
                await websocket.send_json({'response': response})
            except Exception as e:
                logger.error(f"Error processing: {e}")
                await websocket.send_json({'error': str(e)})
    except WebSocketDisconnect:
        logger.info("Connection closed")
    finally:
        active_connections.discard(websocket)
        logger.info(f"Client disconnected. Active: {len(active_connections)}")
```

Key Differences:
✅ Uses FastAPI's @app.websocket() decorator
✅ Calls await websocket.accept() first
✅ Uses websocket.receive_text()/receive_bytes()
✅ Uses websocket.send_json() for responses
✅ Catches WebSocketDisconnect (FastAPI exception)
✅ Complete implementation with error handling
✅ No placeholder/TODO comments

Generate the comprehensive fix now:"""
    
    def _format_files_context(self, files: List[Any]) -> str:
        """Format retrieved files for prompt."""
        if not files:
            return """⚠️ WARNING: No existing code files were found in the repository.

This means:
1. The files mentioned in the issue don't exist yet (need to be created)
2. OR the files exist but weren't indexed properly
3. OR this is a new feature requiring new files

IMPORTANT: DO NOT generate diffs that modify non-existent files!
- Use "type": "create" for new files
- Only use "type": "edit" if you have the actual existing code above
- Be explicit about file paths and ensure they match project structure
"""
        
        # FRAMEWORK DETECTION: Analyze files to detect web framework
        detected_framework = self._detect_framework(files)
        
        context_parts = []
        file_paths = []  # Track which files exist
        
        # Add framework detection notice at the top
        if detected_framework:
            context_parts.append(f"\n{'='*80}")
            context_parts.append(f"🔍 **DETECTED FRAMEWORK: {detected_framework}**")
            context_parts.append(f"{'='*80}")
            context_parts.append(f"⚠️ YOU MUST use {detected_framework}-specific patterns and APIs!")
            context_parts.append(f"⚠️ DO NOT use raw libraries when framework provides built-in support!")
            context_parts.append(f"{'='*80}\n")
            
            # Add framework-specific examples for common features
            if detected_framework == 'FastAPI':
                context_parts.append(f"\n🚨 **CRITICAL - FastAPI WebSocket Example:**\n")
                context_parts.append(f"❌ **WRONG - Using raw websockets library:**")
                context_parts.append(f"```python")
                context_parts.append(f"import websockets")
                context_parts.append(f"async def websocket_handler(websocket, path):")
                context_parts.append(f"    await websocket.send('hello')")
                context_parts.append(f"```\n")
                context_parts.append(f"✅ **CORRECT - Using FastAPI WebSocket:**")
                context_parts.append(f"```python")
                context_parts.append(f"from fastapi import WebSocket, WebSocketDisconnect")
                context_parts.append(f"")
                context_parts.append(f"@app.websocket('/ws')")
                context_parts.append(f"async def websocket_endpoint(websocket: WebSocket):")
                context_parts.append(f"    await websocket.accept()")
                context_parts.append(f"    try:")
                context_parts.append(f"        while True:")
                context_parts.append(f"            data = await websocket.receive_bytes()")
                context_parts.append(f"            await websocket.send_json({{'response': 'hello'}})")
                context_parts.append(f"    except WebSocketDisconnect:")
                context_parts.append(f"        pass")
                context_parts.append(f"```")
                context_parts.append(f"🔑 **Key Differences:**")
                context_parts.append(f"  - Use `@app.websocket()` decorator (NOT raw websockets)")
                context_parts.append(f"  - Import `WebSocket, WebSocketDisconnect` from fastapi")
                context_parts.append(f"  - Call `await websocket.accept()` first")
                context_parts.append(f"  - Use `websocket.receive_bytes()`, `websocket.send_json()`")
                context_parts.append(f"  - Catch `WebSocketDisconnect` (NOT websockets.ConnectionClosed)")
                context_parts.append(f"{'='*80}\n")
        
        for f in files:
            # CRITICAL: FILE TYPE VALIDATION - Add guidance for special file types
            file_type_guidance = file_type_validator.get_generation_guidance(f.path)
            if file_type_guidance:
                context_parts.append(file_type_guidance)
            
            # CRITICAL FIX: Don't truncate files! LLM needs full context for exact matching
            # Old broken approach: content = f.content[:5000]
            # This caused empty old_code fields because LLM couldn't see full file
            content = f.content  # Use FULL file content
            
            # For very long files (>10K lines), show summary + relevant sections
            lines = content.splitlines()
            if len(lines) > 10000:
                # Show first 5000 lines + warning
                content = '\n'.join(lines[:5000])
                content += f"\n\n... (File continues for {len(lines) - 5000} more lines - truncated for brevity) ...\n"
            
            # Add line numbers to help LLM reference specific lines
            lines = content.split('\n')
            numbered_lines = []
            for i, line in enumerate(lines, start=1):
                numbered_lines.append(f"{i:4d}: {line}")
            numbered_content = '\n'.join(numbered_lines)
            
            context_parts.append(f"File: {f.path}\n```{f.language}\n{numbered_content}\n```\n")
            file_paths.append(f.path)
        
        context_parts.append(f"{'='*80}")
        for path in file_paths:
            context_parts.append(f"  ✓ {path}")
        context_parts.append(f"{'='*80}")
        
        context_parts.append(f"\n**⚠️ CRITICAL - File Paths Must Match EXACTLY:**")
        context_parts.append(f"  1. **ONLY** edit files listed above - these are the ONLY files you can see!")
        context_parts.append(f"  2. If a file is NOT in the list above, you CANNOT edit it - use 'create' instead")
        context_parts.append(f"  3. Use EXACT paths: 'main.py' NOT 'app/main.py', 'src/app.py' NOT 'app.py'")
        context_parts.append(f"  4. The issue may mention 'app.py' but if the actual file is 'main.py', use 'main.py'!")
        
        context_parts.append(f"\n**Examples of CORRECT usage:**")
        context_parts.append(f"  ✅ File 'main.py' is in list → type: 'edit', path: 'main.py'")
        context_parts.append(f"  ✅ File 'app.py' NOT in list → type: 'create', path: 'app.py'")
        context_parts.append(f"  ✅ Need new file 'websocket_handler.py' → type: 'create', path: 'websocket_handler.py'")
        
        context_parts.append(f"\n**Examples of WRONG usage:**")
        context_parts.append(f"  ❌ File 'app.py' NOT in list but used type: 'edit' → HALLUCINATION!")
        context_parts.append(f"  ❌ List shows 'main.py' but you use 'app/main.py' → PATH MISMATCH!")
        context_parts.append(f"  ❌ Creating 'README_new.md' when 'README.md' exists → DUPLICATE!")
        
        return "\n".join(context_parts)
    
    def _parse_operations(self, response: str, relevant_files: List[Any] = None) -> List[Dict[str, Any]]:
        """Parse operations from LLM response with improved extraction and JSON repair."""
        import json
        import re
        
        operations = []
        
        # Check if response looks truncated
        if len(response) > 1000 and not response.rstrip().endswith(('```', '}', ']')):
            logger.warning(f"⚠️ Response may be truncated (len={len(response)}, ends with: '{response[-50:]}')")
        
        # Method 1: Try to extract full JSON from code blocks
        json_block_pattern = r'```json\s*\n([\s\S]*?)\n\s*```'
        json_blocks = re.findall(json_block_pattern, response)
        
        for json_str in json_blocks:
            try:
                data = json.loads(json_str)
                if isinstance(data, list):
                    operations.extend(data)
                    logger.info(f"✅ Extracted {len(data)} operations (array format)")
                    return operations
                elif isinstance(data, dict) and 'operations' in data:
                    ops = data['operations']
                    if isinstance(ops, list):
                        operations.extend(ops)
                        logger.info(f"✅ Extracted {len(ops)} operations (dict format)")
                        return operations
            except json.JSONDecodeError as e:
                logger.debug(f"JSON decode failed for block: {str(e)}")
                # Try JSON repair on truncated response
                repaired_json = self._repair_truncated_json(json_str)
                if repaired_json:
                    try:
                        data = json.loads(repaired_json)
                        if isinstance(data, dict) and 'operations' in data:
                            ops = data['operations']
                            if isinstance(ops, list) and len(ops) > 0:
                                logger.warning(f"⚠️ JSON was truncated, repaired and extracted {len(ops)} operations")
                                operations.extend(ops)
                                return operations
                    except:
                        pass
                continue
        
        # Method 2: Try to find operations array directly (without ```json markers)
        operations_pattern = r'"operations":\s*(\[[^\]]*\{[^\}]*\}[^\]]*\])'
        matches = re.findall(operations_pattern, response, re.DOTALL)
        for match in matches:
            try:
                ops = json.loads(match)
                if isinstance(ops, list):
                    operations.extend(ops)
                    logger.info(f"✅ Extracted {len(ops)} operations (direct array match)")
                    return operations
            except json.JSONDecodeError:
                continue
        
        # Method 3: Try to extract individual operation objects (even from broken JSON)
        if not operations:
            # Enhanced regex to match nested structures better
            # Matches operation objects even if they're incomplete or nested
            operation_pattern = r'\{\s*"type"\s*:\s*"(create|edit|modify|delete)"[^}]*(?:\{[^}]*\}[^}]*)*\}'
            matches = list(re.finditer(operation_pattern, response, re.DOTALL))
            
            logger.info(f"🔍 Found {len(matches)} potential operation objects")
            
            for match in matches:
                op_text = match.group(0)
                try:
                    # Try to parse as-is
                    op = json.loads(op_text)
                    operations.append(op)
                    logger.debug(f"✅ Parsed operation: {op.get('type')} {op.get('path', 'unknown')}")
                except json.JSONDecodeError:
                    # Try to repair this specific operation
                    repaired = self._repair_truncated_json(op_text)
                    if repaired:
                        try:
                            op = json.loads(repaired)
                            operations.append(op)
                            logger.debug(f"✅ Repaired and parsed operation: {op.get('type')} {op.get('path', 'unknown')}")
                        except:
                            logger.debug(f"❌ Could not parse even after repair: {op_text[:100]}...")
                    continue
            
            if operations:
                logger.info(f"✅ Extracted {len(operations)} operations (individual object extraction with repair)")
        
        if not operations:
            logger.warning("❌ Could not extract operations from response")
            # Log first 500 chars of response for debugging
            logger.warning(f"Response preview: {response[:500]}...")
        
        # 🧹 CRITICAL: Strip line numbers from all operations immediately after parsing
        # AI models often include line numbers despite instructions not to
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                # Strip from top-level old_code/new_code (legacy format)
                if 'old_code' in op:
                    op['old_code'] = self._strip_line_numbers_from_code(op['old_code'])
                if 'new_code' in op:
                    op['new_code'] = self._strip_line_numbers_from_code(op['new_code'])
                if 'content' in op:
                    op['content'] = self._strip_line_numbers_from_code(op['content'])
                
                # Strip from edits array (new format)
                if 'edits' in op and isinstance(op['edits'], list):
                    for edit in op['edits']:
                        if 'old_code' in edit:
                            edit['old_code'] = self._strip_line_numbers_from_code(edit['old_code'])
                        if 'new_code' in edit:
                            edit['new_code'] = self._strip_line_numbers_from_code(edit['new_code'])
        
        logger.info(f"🧹 Stripped line numbers from {len(operations)} parsed operations")
        
        # 🚨 CRITICAL PRE-VALIDATION: Reject operations with empty old_code BEFORE attempting auto-fix
        # This prevents bad LLM responses from being accepted
        if operations:
            invalid_operations = []
            for idx, op in enumerate(operations):
                if op.get('type') in ['edit', 'modify']:
                    edits = op.get('edits', [])
                    for edit_idx, edit in enumerate(edits):
                        old_code = edit.get('old_code', '').strip()
                        new_code = edit.get('new_code', '').strip()
                        
                        # Check for empty old_code (critical validation failure)
                        if not old_code and new_code:
                            invalid_operations.append({
                                'op_index': idx,
                                'path': op.get('path', 'unknown'),
                                'edit_index': edit_idx,
                                'reason': 'empty old_code field'
                            })
                        
                        # 🔥 NEW: Use file_type_validator for comprehensive validation
                        file_path = op.get('path', '')
                        is_valid, errors = file_type_validator.validate_content(file_path, new_code)
                        
                        if not is_valid:
                            for error_msg in errors:
                                invalid_operations.append({
                                    'op_index': idx,
                                    'path': file_path,
                                    'edit_index': edit_idx,
                                    'reason': f'File type validation failed: {error_msg}'
                                })
                            logger.error(f"🚨 FILE TYPE VALIDATION FAILED: {file_path}")
                            for error_msg in errors[:3]:
                                logger.error(f"   {error_msg}")
                        
                        # 🔥 LEGACY: Keep old requirements.txt check as backup
                        if 'requirements.txt' in file_path.lower() or file_path.endswith('.txt'):
                            # Check if new_code contains Python syntax instead of package names
                            python_syntax_indicators = [
                                'def ', 'async def', 'class ', 'import ', 'from ',
                                'await ', 'async ', '@app.', 'websocket', 'FastAPI',
                                'return ', 'if ', 'while ', 'for ', 'try:', 'except'
                            ]
                            if any(indicator in new_code for indicator in python_syntax_indicators):
                                invalid_operations.append({
                                    'op_index': idx,
                                    'path': op.get('path', 'unknown'),
                                    'edit_index': edit_idx,
                                    'reason': 'Python code in requirements.txt (should be package names only)'
                                })
                                logger.error(f"🚨 HALLUCINATION DETECTED: Python code written in requirements.txt!")
                                logger.error(f"   File: {op.get('path')}")
                                logger.error(f"   Invalid content preview: {new_code[:200]}")
            
            # CRITICAL FIX #2: Attempt auto-fix BEFORE rejecting
            if invalid_operations:
                logger.warning(f"⚠️ Found {len(invalid_operations)} operations with issues, attempting auto-fix...")
                
                # Try to auto-fix empty old_code issues
                if relevant_files:
                    operations = self._fix_empty_old_code(operations, relevant_files)
                    
                    # Re-validate after auto-fix
                    still_invalid = []
                    for idx, op in enumerate(operations):
                        if op.get('type') in ['edit', 'modify']:
                            edits = op.get('edits', [])
                            for edit_idx, edit in enumerate(edits):
                                old_code = edit.get('old_code', '').strip()
                                if not old_code:
                                    still_invalid.append({
                                        'op_index': idx,
                                        'path': op.get('path', 'unknown'),
                                        'edit_index': edit_idx,
                                        'reason': 'empty old_code even after auto-fix'
                                    })
                    
                    # Only reject if STILL invalid after auto-fix attempt
                    if still_invalid:
                        logger.error(f"🚨 REJECTING LLM RESPONSE: {len(still_invalid)} operations STILL INVALID after auto-fix!")
                        for inv_op in still_invalid:
                            logger.error(f"   - Operation #{inv_op['op_index']} ({inv_op['path']}) edit #{inv_op.get('edit_index', 'N/A')}: {inv_op['reason']}")
                        return []
                    else:
                        logger.info(f"✅ Auto-fix successfully repaired {len(invalid_operations)} operations!")
                else:
                    logger.error("🚨 REJECTING LLM RESPONSE: Cannot auto-fix without relevant_files context")
                    return []
        
        # Additional auto-fix pass for any remaining issues
        if relevant_files:
            operations = self._fix_empty_old_code(operations, relevant_files)
        
        return operations
    
    def _repair_truncated_json(self, json_str: str) -> str:
        """
        Attempt to repair truncated JSON by closing unclosed brackets/braces.
        Returns repaired JSON string or None if repair fails.
        """
        import json
        
        # Try to parse as-is first
        try:
            json.loads(json_str)
            return json_str  # Already valid
        except json.JSONDecodeError:
            pass
        
        # Count open/close brackets and braces
        open_braces = json_str.count('{') - json_str.count('}')
        open_brackets = json_str.count('[') - json_str.count(']')
        open_quotes = json_str.count('"') % 2  # Should be even
        
        # Build repair string
        repair = ""
        
        # Close any open string
        if open_quotes == 1:
            repair += '"'
        
        # Close nested structures (innermost first)
        # Heuristic: close brackets before braces for operations array
        for _ in range(open_brackets):
            repair += ']'
        for _ in range(open_braces):
            repair += '}'
        
        repaired = json_str + repair
        
        # Test if repaired JSON is valid
        try:
            json.loads(repaired)
            logger.info(f"✅ Successfully repaired truncated JSON (added: {repr(repair)})")
            return repaired
        except json.JSONDecodeError:
            logger.debug(f"JSON repair failed even after adding {repr(repair)}")
            return None
    
    def _fix_empty_old_code(self, operations: List[Dict[str, Any]], relevant_files: List[Any]) -> List[Dict[str, Any]]:
        """
        Fix operations with empty old_code by extracting the code from file context.
        
        Args:
            operations: List of operations that may have empty old_code
            relevant_files: Context files that contain the actual code
            
        Returns:
            Fixed operations list with old_code populated from file context
        """
        if not operations or not relevant_files:
            return operations
        
        # Build file content map
        file_map = {}
        for f in relevant_files:
            if hasattr(f, 'path') and hasattr(f, 'content'):
                file_map[f.path] = f.content
            elif hasattr(f, 'metadata') and hasattr(f, 'page_content'):
                path = f.metadata.get('path', '')
                if path:
                    file_map[path] = f.page_content
        
        fixed_operations = []
        for op in operations:
            op_type = op.get('type', '')
            op_path = op.get('path', '')
            
            # Only fix edit operations with empty old_code
            if op_type == 'edit' and op_path in file_map:
                edits = op.get('edits', [])
                fixed_edits = []
                
                for edit in edits:
                    old_code = edit.get('old_code', '').strip()
                    new_code = edit.get('new_code', '').strip()
                    start_line = edit.get('start_line', 0)
                    end_line = edit.get('end_line', 0)
                    
                    # If old_code is empty but we have line numbers, extract from file
                    if not old_code and (start_line > 0 or end_line > 0) and op_path in file_map:
                        file_content = file_map[op_path]
                        lines = file_content.splitlines()
                        
                        # Extract the lines (handle 0-indexed vs 1-indexed)
                        if start_line == 0 and end_line == 0:
                            # Insertion at beginning - use first few lines as context
                            extracted_old = '\n'.join(lines[:3]) if len(lines) >= 3 else file_content
                        elif start_line > 0 and end_line >= start_line:
                            # Extract specified range
                            extracted_old = '\n'.join(lines[start_line-1:end_line])
                        elif start_line > 0:
                            # Single line
                            extracted_old = lines[start_line-1] if start_line <= len(lines) else ''
                        else:
                            extracted_old = ''
                        
                        if extracted_old:
                            logger.warning(f"🔧 AUTO-FIX: Extracted old_code for {op_path} (lines {start_line}-{end_line}): {len(extracted_old)} chars")
                            edit['old_code'] = extracted_old
                    
                    # CRITICAL FIX: If still empty and we have new_code, try intelligent search
                    if not edit.get('old_code', '').strip() and new_code and op_path in file_map:
                        file_content = file_map[op_path]
                        lines = file_content.splitlines()
                        
                        # Strategy 1: If we have line numbers, use context around them
                        if start_line > 0 and start_line <= len(lines):
                            # Get 2 lines before and after as context
                            context_start = max(0, start_line - 2)
                            context_end = min(len(lines), start_line + 2)
                            context_old = '\n'.join(lines[context_start:context_end])
                            logger.warning(f"🔧 AUTO-FIX: Using context for {op_path} (lines {context_start+1}-{context_end}): {len(context_old)} chars")
                            edit['old_code'] = context_old
                        
                        # Strategy 2: No line numbers - search for similar content in new_code
                        elif not edit.get('old_code', '').strip():
                            # Try to find anchor points from new_code in file
                            new_lines = new_code.splitlines()
                            
                            # Look for function/class definitions, imports, or distinctive patterns
                            anchor_candidates = []
                            for new_line in new_lines[:5]:  # Check first 5 lines for anchors
                                new_line_stripped = new_line.strip()
                                if (new_line_stripped.startswith('def ') or 
                                    new_line_stripped.startswith('class ') or
                                    new_line_stripped.startswith('import ') or
                                    new_line_stripped.startswith('from ') or
                                    '=' in new_line_stripped):
                                    anchor_candidates.append(new_line_stripped)
                            
                            # Search for anchors in file
                            found_context = False
                            for anchor in anchor_candidates:
                                for i, file_line in enumerate(lines):
                                    if anchor in file_line:
                                        # Found anchor - use surrounding lines
                                        context_start = max(0, i - 2)
                                        context_end = min(len(lines), i + 5)
                                        context_old = '\n'.join(lines[context_start:context_end])
                                        logger.warning(f"🔧 AUTO-FIX: Found anchor '{anchor[:50]}...' in {op_path} at line {i+1}, using context (lines {context_start+1}-{context_end})")
                                        edit['old_code'] = context_old
                                        found_context = True
                                        break
                                if found_context:
                                    break
                            
                            # Strategy 3: Last resort - use file header for documentation files
                            if not edit.get('old_code', '').strip():
                                if op_path.lower().endswith('.md') or op_path.lower().endswith('readme'):
                                    # For markdown/readme, use first 10 lines as context
                                    context_old = '\n'.join(lines[:10])
                                    logger.warning(f"🔧 AUTO-FIX: Using file header for {op_path}: {len(context_old)} chars")
                                    edit['old_code'] = context_old
                                else:
                                    # For code files, use first 5 lines
                                    context_old = '\n'.join(lines[:5])
                                    logger.warning(f"🔧 AUTO-FIX: Using file header for {op_path}: {len(context_old)} chars")
                                    edit['old_code'] = context_old
                    
                    fixed_edits.append(edit)
                
                op['edits'] = fixed_edits
            
            fixed_operations.append(op)
        
        return fixed_operations
    
    def _detect_framework(self, files: List[Any]) -> str:
        """
        Detect web framework from file content.
        
        Returns:
            Framework name (FastAPI, Flask, Django, Express, etc.) or empty string
        """
        framework_patterns = {
            'FastAPI': [
                'from fastapi import',
                'import fastapi',
                'app = FastAPI(',
                '@app.get(',
                '@app.post(',
                'FastAPI('
            ],
            'Flask': [
                'from flask import',
                'import flask',
                'app = Flask(',
                '@app.route(',
                'Flask(__name__)'
            ],
            'Django': [
                'from django',
                'import django',
                'django.conf',
                'INSTALLED_APPS',
                'urlpatterns'
            ],
            'Express.js': [
                'express()',
                'app.get(',
                'app.post(',
                "require('express')",
                'import express from'
            ]
        }
        
        # Combine all file contents
        all_content = ""
        for f in files:
            content = f.content if hasattr(f, 'content') else f.page_content if hasattr(f, 'page_content') else ""
            all_content += content + "\n"
        
        # Check for each framework
        for framework, patterns in framework_patterns.items():
            matches = sum(1 for pattern in patterns if pattern in all_content)
            # If 2+ patterns match, we're confident it's this framework
            if matches >= 2:
                logger.info(f"🔍 Detected framework: {framework} ({matches} patterns matched)")
                return framework
        
        return ""
    
    async def _score_candidate(
        self,
        candidate: FixCandidate,
        understanding: Any,
        relevant_files: List[Any]
    ) -> Dict[str, float]:
        """
        Score a candidate on 6 dimensions using LLM reasoning.
        
        Returns:
            Dict with scores for each dimension (0.0-1.0)
        """
        
        prompt = f"""You are an expert code reviewer scoring a proposed fix for a GitHub issue.

**Issue Analysis:**
Root Cause: {understanding.root_cause}
Requirements: {', '.join(understanding.requirements[:3])}
Complexity: {understanding.complexity}

**Proposed Fix:**
Approach: {candidate.approach}
Rationale: {candidate.rationale}
Operations: {len(candidate.operations)} file operations
Risk Assessment: {candidate.risk_assessment}

**Score this fix on 6 dimensions (0.0-1.0):**

1. **Correctness (40% weight):** Does it fully address the issue?
2. **Safety (25% weight):** Will it break existing functionality?
3. **Maintainability (15% weight):** Is the code clean and readable?
4. **Test Coverage (10% weight):** Are tests included/updated?
5. **Performance (5% weight):** Any performance impact?
6. **Completeness (5% weight):** Handles edge cases?

**Output Format (JSON):**
```json
{{
  "correctness": 0.85,
  "safety": 0.90,
  "maintainability": 0.80,
  "test_coverage": 0.70,
  "performance": 0.95,
  "completeness": 0.75,
  "reasoning": "Brief explanation of scores"
}}
```

Score now:"""
        
        try:
            response = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.2,  # Low temperature for consistent scoring
                max_tokens=1000
            )
            
            scores = self._parse_scores(response)
            
            # Validate scores are in range
            for key in self.SCORING_WEIGHTS.keys():
                if key not in scores or not (0.0 <= scores[key] <= 1.0):
                    logger.warning(f"Invalid score for {key}, using default 0.7")
                    scores[key] = 0.7
            
            return scores
            
        except Exception as e:
            logger.error(f"Failed to score candidate: {str(e)}")
            # Return default scores
            return {key: 0.7 for key in self.SCORING_WEIGHTS.keys()}
    
    def _parse_scores(self, response: str) -> Dict[str, float]:
        """Parse scores from LLM response."""
        import json
        import re
        
        # Try to extract JSON
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return {
                    'correctness': data.get('correctness', 0.7),
                    'safety': data.get('safety', 0.7),
                    'maintainability': data.get('maintainability', 0.7),
                    'test_coverage': data.get('test_coverage', 0.7),
                    'performance': data.get('performance', 0.7),
                    'completeness': data.get('completeness', 0.7)
                }
            except json.JSONDecodeError:
                pass
        
        # Fallback: default scores
        return {key: 0.7 for key in self.SCORING_WEIGHTS.keys()}
    
    def _generate_selection_rationale(
        self,
        candidate: FixCandidate,
        scores: Dict[str, float],
        total_score: float
    ) -> str:
        """Generate human-readable rationale for candidate selection."""
        
        # Find top 2 strengths
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        strengths = [f"{dim} ({score:.1%})" for dim, score in sorted_scores[:2]]
        
        # Find weaknesses (scores < 0.7)
        weaknesses = [f"{dim} ({score:.1%})" for dim, score in scores.items() if score < 0.7]
        
        rationale_parts = [
            f"Total Score: {total_score:.2f}/1.0",
            f"Approach: {candidate.approach}",
            f"Strengths: {', '.join(strengths)}",
        ]
        
        if weaknesses:
            rationale_parts.append(f"Areas for Improvement: {', '.join(weaknesses)}")
        
        return " | ".join(rationale_parts)
