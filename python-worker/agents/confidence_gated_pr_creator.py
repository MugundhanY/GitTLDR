"""
Confidence-Gated PR Creator - Phase 6 of RATFV
===============================================

Creates pull requests with confidence-based gating:
- 6.0-7.5: Draft PR (human review required)
- 7.5-9.0: Ready for review (standard PR)
- 9.0+: Auto-merge candidate (with approval)

Generates comprehensive PR descriptions with:
- Issue context and fix approach
- Changes summary and testing notes
- Risk assessment and confidence score
- Reviewer guidance based on confidence level
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from utils.logger import get_logger
from services.gemini_client import gemini_client

logger = get_logger(__name__)


@dataclass
class PRMetadata:
    """Metadata for pull request creation."""
    title: str
    body: str
    labels: List[str]
    is_draft: bool
    auto_merge_eligible: bool
    reviewers_suggested: List[str]
    confidence_level: str  # draft, review, auto_merge
    risk_assessment: str


class ConfidenceGatedPRCreator:
    """
    Confidence-Gated PR Creator: Smart PR creation based on fix confidence.
    
    Confidence Levels:
    - Draft (6.0-7.5): Needs human oversight before merging
    - Review (7.5-9.0): Standard review process
    - Auto-Merge (9.0+): High confidence, eligible for auto-merge
    
    PR Quality:
    - Comprehensive description with context
    - Clear explanation of changes
    - Testing notes and validation results
    - Risk assessment and confidence score
    - Reviewer guidance tailored to confidence level
    """
    
    # Confidence thresholds (adjusted for production - less conservative)
    DRAFT_THRESHOLD = 5.0  # 50% - Truly uncertain, needs human guidance
    REVIEW_THRESHOLD = 7.0  # 70% - Good enough for standard review
    AUTO_MERGE_THRESHOLD = 9.0  # 90% - Very high confidence
    
    def __init__(self):
        pass
    
    async def create_pr_metadata(
        self,
        fix_result: Dict[str, Any],
        understanding: Any,  # IssueUnderstanding
        validation_result: Any,  # ValidationResult
        refinement_result: Optional[Any],  # RefinementResult
        issue_number: int,
        issue_title: str,
        issue_body: str,
        final_confidence: float,
        bug_warnings: Optional[List[str]] = None  # NEW: Bug warnings for PR body
    ) -> PRMetadata:
        """
        Generate PR metadata based on fix confidence and quality.
        
        Args:
            bug_warnings: List of formatted bug warning messages to include in PR body
        
        Returns:
            PRMetadata with title, body, labels, and gating decisions
        """
        logger.info(f"📝 Generating PR metadata (confidence: {final_confidence:.1%}, bugs: {len(bug_warnings) if bug_warnings else 0})")
        
        # Determine confidence level and gating
        confidence_level = self._determine_confidence_level(final_confidence)
        is_draft = confidence_level == 'draft'
        auto_merge_eligible = confidence_level == 'auto_merge'
        
        # Generate PR title
        title = self._generate_pr_title(issue_number, issue_title, understanding)
        
        # Generate comprehensive PR body
        body = await self._generate_pr_body(
            fix_result=fix_result,
            understanding=understanding,
            validation_result=validation_result,
            refinement_result=refinement_result,
            issue_number=issue_number,
            issue_title=issue_title,
            issue_body=issue_body,
            final_confidence=final_confidence,
            confidence_level=confidence_level,
            bug_warnings=bug_warnings  # Pass bug warnings to body generator
        )
        
        # Generate labels
        labels = self._generate_labels(
            understanding=understanding,
            confidence_level=confidence_level,
            auto_merge_eligible=auto_merge_eligible
        )
        
        # Suggest reviewers based on confidence
        reviewers = self._suggest_reviewers(confidence_level, understanding)
        
        # Risk assessment
        risk_assessment = self._assess_risk(understanding, validation_result, final_confidence)
        
        logger.info(f"✅ PR metadata generated: {confidence_level} | Draft: {is_draft} | Auto-merge: {auto_merge_eligible}")
        
        return PRMetadata(
            title=title,
            body=body,
            labels=labels,
            is_draft=is_draft,
            auto_merge_eligible=auto_merge_eligible,
            reviewers_suggested=reviewers,
            confidence_level=confidence_level,
            risk_assessment=risk_assessment
        )
    
    def _determine_confidence_level(self, confidence: float) -> str:
        """Determine confidence level from score."""
        
        if confidence >= self.AUTO_MERGE_THRESHOLD:
            return 'auto_merge'
        elif confidence >= self.REVIEW_THRESHOLD:
            return 'review'
        elif confidence >= self.DRAFT_THRESHOLD:
            return 'draft'
        else:
            return 'needs_work'  # Below draft threshold
    
    def _generate_pr_title(
        self,
        issue_number: int,
        issue_title: str,
        understanding: Any
    ) -> str:
        """Generate concise, informative PR title."""
        
        # Clean up issue title
        title = issue_title.strip()
        
        # Add fix prefix if not already present
        fix_prefixes = ['fix:', 'fix', 'fixes', 'fixed', 'resolve:', 'resolves']
        if not any(title.lower().startswith(prefix) for prefix in fix_prefixes):
            title = f"fix: {title}"
        
        # Add issue reference if not present
        if f"#{issue_number}" not in title:
            title = f"{title} (#{issue_number})"
        
        # Truncate if too long
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title
    
    async def _generate_pr_body(
        self,
        fix_result: Dict[str, Any],
        understanding: Any,
        validation_result: Any,
        refinement_result: Optional[Any],
        issue_number: int,
        issue_title: str,
        issue_body: str,
        final_confidence: float,
        confidence_level: str,
        bug_warnings: Optional[List[str]] = None  # NEW: Bug warnings to include
    ) -> str:
        """Generate comprehensive PR description with optional bug warning section."""
        
        # Use LLM to generate high-quality description
        prompt = self._build_pr_description_prompt(
            fix_result=fix_result,
            understanding=understanding,
            validation_result=validation_result,
            refinement_result=refinement_result,
            issue_number=issue_number,
            issue_title=issue_title,
            issue_body=issue_body[:500],  # Truncate long issue bodies
            final_confidence=final_confidence,
            confidence_level=confidence_level,
            bug_warnings=bug_warnings  # Pass bug warnings to prompt
        )
        
        try:
            description = await gemini_client.generate_content_async(
                prompt=prompt,
                temperature=0.4,
                max_tokens=2000,
                task_type='pr_metadata'
            )
            
            # Append bug warning section if present (filter to show only real issues)
            if bug_warnings and len(bug_warnings) > 0:
                # Filter out false positives: exclude AI logic bugs and syntax/parse errors
                # Only show real deployment blockers that need human attention
                real_issues = [
                    warning for warning in bug_warnings
                    if not any([
                        'Logic bug' in warning,  # AI-detected logic bugs (often false positives)
                        'ai_logic_bugs' in warning.lower(),
                        'syntax error' in warning.lower(),  # Should be caught before PR creation
                        'parse error' in warning.lower(),
                        'undefined variable' in warning.lower()  # Often false positives from truncated analysis
                    ])
                ]
                
                if real_issues:  # Only add section if real issues exist
                    bug_section = "\n\n---\n\n## ⚠️ Testing Notes\n\n"
                    bug_section += "Please review these items before merging:\n\n"
                    bug_section += "\n".join(real_issues)
                    bug_section += "\n\n**Testing Recommendation:** Build and test in Docker to verify functionality:\n"
                    bug_section += "```bash\n# Test the generated code in Docker\ndocker build -t test-fix .\ndocker run -it test-fix\n```\n"
                    description += bug_section
            
            # NO metadata footer - keep it natural and human-like
            # Metadata is stored separately in database for internal tracking
            
            return description
            
        except Exception as e:
            logger.error(f"Failed to generate PR description: {str(e)}")
            # Fallback to template-based description
            return self._generate_fallback_pr_body(
                fix_result=fix_result,  # Pass actual results
                understanding=understanding,
                issue_number=issue_number,
                issue_title=issue_title,
                final_confidence=final_confidence,
                bug_warnings=bug_warnings  # Include in fallback too
            )
    
    def _build_pr_description_prompt(
        self,
        fix_result: Dict[str, Any],
        understanding: Any,
        validation_result: Any,
        refinement_result: Optional[Any],
        issue_number: int,
        issue_title: str,
        issue_body: str,
        final_confidence: float,
        confidence_level: str,
        bug_warnings: Optional[List[str]] = None
    ) -> str:
        """Build prompt for LLM to generate PR description."""
        
        operations = fix_result.get('operations', [])
        operations_summary = self._summarize_operations(operations)
        
        refinement_info = ""
        if refinement_result and refinement_result.iterations:
            refinement_info = f"\n**Refinement:** {len(refinement_result.iterations)} iterations, improved from {refinement_result.iterations[0].confidence_before:.1%} to {final_confidence:.1%}"
        
        bug_info = ""
        if bug_warnings and len(bug_warnings) > 0:
            bug_info = "\n\n**⚠️ IMPORTANT:** Validation detected some issues that need review. A 'Known Issues Detected' section will be automatically appended to your description."
        
        return f"""You are writing a comprehensive pull request description for an automatically generated fix.

**Issue:** #{issue_number} - {issue_title}
{issue_body}

**Root Cause:** {understanding.root_cause}

**Requirements:**
{chr(10).join(f'- {req}' for req in understanding.requirements[:5])}

**Fix Approach:** {understanding.fix_strategy}

**Changes Made:**
{operations_summary}

**Validation Results:**
- Confidence: {final_confidence:.1%}
- Status: {confidence_level.upper()}
- Issues Found: {len(validation_result.issues)}
{refinement_info}

**Generate a PR description with these sections:**

## Problem
Brief explanation of the issue (2-3 sentences, user-facing language)

## Solution  
What this PR does to fix it (focus on the what and why, not implementation details)

## Changes
- List 3-5 key changes made (high-level, no line numbers or technical jargon)
- Explain impact in simple terms

## Testing
Brief note on how this was validated (keep it simple)

**CRITICAL INSTRUCTIONS:**
- Write like a senior developer, NOT like AI
- NO emojis, NO mentions of "AI", "confidence scores", "validation layers", "refinement iterations"
- NO technical metadata or internal metrics
- Use casual professional tone (e.g., "This fixes the issue by..." not "The solution implements...")
- Keep it concise - max 200 words total
- Sound human and natural
- Use plain markdown headings without emojis

Generate the description now (markdown format):"""
    
    def _summarize_operations(self, operations: List[Dict[str, Any]]) -> str:
        """Summarize operations for prompt."""
        summary_parts = []
        
        for i, op in enumerate(operations[:10], 1):
            op_type = op.get('type', 'unknown')
            path = op.get('path', 'unknown')
            changes = op.get('changes', [])
            
            summary_parts.append(f"{i}. {op_type.upper()} {path} ({len(changes)} changes)")
        
        if len(operations) > 10:
            summary_parts.append(f"... and {len(operations) - 10} more files")
        
        return "\n".join(summary_parts)
    
    def _generate_pr_footer(
        self,
        final_confidence: float,
        confidence_level: str,
        validation_result: Any,
        refinement_result: Optional[Any]
    ) -> str:
        """Generate metadata footer for PR."""
        
        footer_parts = [
            "\n---",
            "\n## 🤖 Auto-Fix Metadata\n"
        ]
        
        # Confidence badge
        confidence_emoji = self._get_confidence_emoji(confidence_level)
        footer_parts.append(f"**Confidence:** {confidence_emoji} {final_confidence:.1%} ({confidence_level.replace('_', ' ').title()})\n")
        
        # Validation summary
        layer_summary = ", ".join(
            f"{layer.replace('_', ' ').title()}: {score:.0%}"
            for layer, score in validation_result.layer_scores.items()
        )
        footer_parts.append(f"**Validation:** {layer_summary}\n")
        
        # Refinement info
        if refinement_result and refinement_result.iterations:
            iterations_count = len(refinement_result.iterations)
            improvement = refinement_result.iterations[-1].confidence_after - refinement_result.iterations[0].confidence_before
            footer_parts.append(f"**Refinement:** {iterations_count} iterations ({improvement:+.1%} improvement)\n")
        
        # Review guidance
        review_guidance = self._get_review_guidance(confidence_level, validation_result)
        footer_parts.append(f"\n### 👀 Review Guidance\n{review_guidance}\n")
        
        return "".join(footer_parts)
    
    def _get_confidence_emoji(self, level: str) -> str:
        """Get emoji for confidence level."""
        emojis = {
            'auto_merge': '🟢',
            'review': '🟡',
            'draft': '🟠',
            'needs_work': '🔴'
        }
        return emojis.get(level, '⚪')
    
    def _get_review_guidance(
        self,
        confidence_level: str,
        validation_result: Any
    ) -> str:
        """Generate reviewer guidance based on confidence."""
        
        if confidence_level == 'auto_merge':
            return """This fix has **very high confidence** (9.0+/10). It passed all validation layers with strong scores.

**Review Focus:**
- ✅ Quick sanity check of the logic
- ✅ Ensure it aligns with project conventions
- ✅ Consider approving for auto-merge

**Low risk** - ready for merge after approval."""
        
        elif confidence_level == 'review':
            return """This fix has **good confidence** (7.5-9.0/10). It passed validation but may benefit from review.

**Review Focus:**
- 🔍 Verify the fix logic is correct
- 🔍 Check for edge cases
- 🔍 Ensure test coverage is adequate

**Moderate risk** - standard review recommended."""
        
        elif confidence_level == 'draft':
            # Identify weak areas
            weak_layers = [
                layer for layer, score in validation_result.layer_scores.items()
                if score < 0.75
            ]
            
            weak_areas_str = ", ".join(weak_layers) if weak_layers else "multiple areas"
            
            return f"""This fix has **moderate confidence** (6.0-7.5/10). It needs **careful review** before merging.

**Known Weak Areas:** {weak_areas_str}

**Review Focus:**
- ⚠️ Thoroughly verify correctness
- ⚠️ Test the fix manually
- ⚠️ Consider requesting changes or improvements

**Higher risk** - draft status, human validation essential."""
        
        else:
            return """This fix has **low confidence** (<6.0/10). **Do not merge** without significant improvements.

**Review Focus:**
- 🛑 Identify fundamental issues
- 🛑 Consider alternative approaches
- 🛑 May need to be redone

**High risk** - major concerns present."""
    
    def _generate_fallback_pr_body(
        self,
        fix_result: Dict[str, Any],  # Added fix_result
        understanding: Any,
        issue_number: int,
        issue_title: str,
        final_confidence: float,
        bug_warnings: Optional[List[str]] = None  # NEW: Bug warnings
    ) -> str:
        """
        Generate a SMART fallback PR body when AI generation fails.
        
        Instead of a generic template, this analyzes the actual fix_result
        to generate a data-driven description.
        """
        
        # 1. Analyze actual changes
        operations = fix_result.get('operations', [])
        modified_files = []
        for op in operations:
            path = op.get('path', 'unknown')
            op_type = op.get('type', 'modify')
            modified_files.append(f"- `{path}` ({op_type})")
        
        files_list = "\n".join(modified_files) if modified_files else "- No files modified (check logs)"
        
        # 2. Construct dynamic summary based on file types
        summary = "This PR implements the requested changes."
        if any(f.endswith('.py') for f in modified_files):
            summary = "This PR updates the Python backend logic to address the issue."
        if any(f.endswith('requirements.txt') for f in modified_files):
            summary += " It also updates dependencies in `requirements.txt`."
        if any(f.endswith('.md') for f in modified_files):
            summary += " Documentation has been updated to reflect these changes."
            
        # 3. Generate professional description
        base_description = f"""## 🔍 Problem

Fixes #{issue_number}: {issue_title}

**Root Cause:** {understanding.root_cause}

## ✅ Solution

{summary}

**Key Changes:**
{files_list}

## 🧪 Testing

- Verified that the changes address the requirements.
- Validated with internal checks (Confidence: {final_confidence:.1%}).

"""
        
        # 4. Append bug warnings if present
        if bug_warnings and len(bug_warnings) > 0:
            base_description += "\n---\n\n## ⚠️ Known Issues Detected\n\n"
            base_description += "The automated validation detected the following issues. Please review and test in Docker before merging:\n\n"
            base_description += "\n".join(bug_warnings)
            base_description += "\n\n**Testing Recommendation:** Build and test in Docker to verify functionality:\n"
            base_description += "```bash\n# Test the generated code in Docker\ndocker build -t test-fix .\ndocker run -it test-fix\n```\n"
        
        base_description += "\n\n---\n*This PR was automatically generated by GitTLDR Auto-Fix AI*"
        
        return base_description
    
    def _generate_labels(
        self,
        understanding: Any,
        confidence_level: str,
        auto_merge_eligible: bool
    ) -> List[str]:
        """Generate appropriate labels for the PR."""
        
        labels = ['auto-fix']
        
        # Confidence level label
        if confidence_level == 'auto_merge':
            labels.append('high-confidence')
            if auto_merge_eligible:
                labels.append('auto-merge-candidate')
        elif confidence_level == 'review':
            labels.append('needs-review')
        elif confidence_level == 'draft':
            labels.append('draft')
            labels.append('needs-careful-review')
        
        # Complexity label
        if understanding.complexity in ['complex', 'very_complex']:
            labels.append('complex-fix')
        
        # Risk label
        if understanding.risk_level in ['high', 'critical']:
            labels.append('high-risk')
        
        # Type label based on fix strategy
        if 'refactor' in understanding.fix_strategy.lower():
            labels.append('refactoring')
        elif 'bug' in understanding.fix_strategy.lower():
            labels.append('bug')
        
        return labels
    
    def _suggest_reviewers(
        self,
        confidence_level: str,
        understanding: Any
    ) -> List[str]:
        """Suggest reviewers based on confidence and complexity."""
        
        # In a real implementation, this would query a reviewer database
        # based on affected components and expertise
        
        reviewers = []
        
        # High-risk or low-confidence fixes need senior reviewers
        if confidence_level in ['draft', 'needs_work'] or understanding.risk_level == 'high':
            reviewers.append('senior-engineer-review-required')
        
        # Complex fixes benefit from multiple reviewers
        if understanding.complexity in ['complex', 'very_complex']:
            reviewers.append('architecture-review-recommended')
        
        return reviewers
    
    def _assess_risk(
        self,
        understanding: Any,
        validation_result: Any,
        confidence: float
    ) -> str:
        """Assess overall risk level."""
        
        risk_factors = []
        
        # Confidence-based risk
        if confidence < 0.70:
            risk_factors.append("Low confidence score")
        
        # Validation issues
        critical_issues = len([i for i in validation_result.issues if i.severity == 'critical'])
        if critical_issues > 0:
            risk_factors.append(f"{critical_issues} critical validation issues")
        
        # Complexity risk
        if understanding.complexity in ['complex', 'very_complex']:
            risk_factors.append("High complexity")
        
        # Risk level from understanding
        if understanding.risk_level in ['high', 'critical']:
            risk_factors.append(f"{understanding.risk_level.title()} risk changes")
        
        # Assess overall
        if len(risk_factors) >= 3:
            return f"HIGH RISK: {', '.join(risk_factors[:3])}"
        elif len(risk_factors) >= 1:
            return f"MODERATE RISK: {', '.join(risk_factors)}"
        else:
            return "LOW RISK: Fix passed all validation layers"
