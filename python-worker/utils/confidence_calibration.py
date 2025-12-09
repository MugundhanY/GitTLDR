"""
Confidence Calibration Module
==============================

Research-backed confidence calibration to prevent overconfidence.
Based on: "Conformal Prediction for Reliable ML" (Angelopoulos & Bates, 2022)

PROBLEM: AI reports 90% confidence but generates 52.2% quality code.
SOLUTION: Apply calibration penalties to match confidence with actual quality.
"""

from typing import Dict, List, Any, Tuple
from utils.logger import get_logger

logger = get_logger(__name__)


class ConfidenceCalibrator:
    """Calibrate AI confidence scores to match actual quality."""
    
    # Penalty factors (research-backed)
    PENALTIES = {
        # Semantic errors (most severe)
        'wrong_file_type': -0.50,  # Python code in requirements.txt
        'wrong_language': -0.45,   # JavaScript in .py file
        
        # Syntax errors
        'syntax_error': -0.30,
        'parse_error': -0.25,
        'malformed_json': -0.30,
        
        # Context errors
        'empty_old_code': -0.40,   # Can't match context
        'placeholder_code': -0.35,  # TODO, pass, NotImplemented
        'hallucinated_file': -0.40,  # Editing non-existent file
        
        # Import/dependency errors
        'missing_import': -0.15,
        'wrong_import_source': -0.20,
        'circular_import': -0.25,
        
        # Security issues
        'security_vulnerability': -0.30,
        'hardcoded_secret': -0.25,
        
        # Test coverage
        'no_tests': -0.10,
        'insufficient_tests': -0.05,
        
        # Type errors
        'type_error': -0.20,
        'incompatible_types': -0.25,
    }
    
    # Confidence caps based on error severity
    CONFIDENCE_CAPS = {
        'critical': 0.35,   # Critical errors: cap at 35%
        'high': 0.55,       # High severity: cap at 55%
        'medium': 0.75,     # Medium severity: cap at 75%
        'low': 0.90,        # Low severity: cap at 90%
    }
    
    def calibrate(
        self,
        initial_confidence: float,
        validation_results: Dict[str, Any],
        operations: List[Dict[str, Any]]
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Calibrate confidence based on validation results.
        
        Args:
            initial_confidence: Raw confidence from validator (0.0-1.0)
            validation_results: Results from multi_layer_validator
            operations: Generated file operations
        
        Returns:
            (calibrated_confidence, explanation, penalty_breakdown)
        """
        # Start with initial confidence
        calibrated = initial_confidence
        penalties_applied = []
        total_penalty = 0.0
        
        # Extract errors from validation
        errors = validation_results.get('errors', [])
        critical_errors = validation_results.get('critical_errors', [])
        warnings = validation_results.get('warnings', [])
        
        # 1. Check for file type errors (most critical)
        file_type_errors = self._check_file_type_errors(operations)
        for error in file_type_errors:
            penalty = self.PENALTIES['wrong_file_type']
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': error,
                'penalty': penalty,
                'severity': 'critical'
            })
        
        # 2. Check for empty old_code (context matching failure)
        empty_old_code_count = self._count_empty_old_code(operations)
        if empty_old_code_count > 0:
            penalty = self.PENALTIES['empty_old_code'] * empty_old_code_count
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': f'{empty_old_code_count} operations with empty old_code',
                'penalty': penalty,
                'severity': 'critical'
            })
        
        # 3. Check for placeholder code
        placeholder_count = self._count_placeholders(operations)
        if placeholder_count > 0:
            penalty = self.PENALTIES['placeholder_code'] * placeholder_count
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': f'{placeholder_count} placeholders detected',
                'penalty': penalty,
                'severity': 'high'
            })
        
        # 4. Syntax errors from validation
        syntax_errors = [e for e in errors if 'syntax' in e.lower() or 'parse' in e.lower()]
        if syntax_errors:
            penalty = self.PENALTIES['syntax_error'] * len(syntax_errors)
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': f'{len(syntax_errors)} syntax errors',
                'penalty': penalty,
                'severity': 'high'
            })
        
        # 5. Security issues
        security_issues = [e for e in critical_errors if 'security' in e.lower()]
        if security_issues:
            penalty = self.PENALTIES['security_vulnerability'] * len(security_issues)
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': f'{len(security_issues)} security issues',
                'penalty': penalty,
                'severity': 'critical'
            })
        
        # 6. Import errors
        import_errors = [e for e in errors if 'import' in e.lower()]
        if import_errors:
            penalty = self.PENALTIES['missing_import'] * len(import_errors)
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': f'{len(import_errors)} import errors',
                'penalty': penalty,
                'severity': 'medium'
            })
        
        # 7. Type errors
        type_errors = [e for e in errors if 'type' in e.lower()]
        if type_errors:
            penalty = self.PENALTIES['type_error'] * len(type_errors)
            calibrated += penalty
            total_penalty += penalty
            penalties_applied.append({
                'reason': f'{len(type_errors)} type errors',
                'penalty': penalty,
                'severity': 'medium'
            })
        
        # Clamp to [0.0, 1.0]
        calibrated = max(0.0, min(1.0, calibrated))
        
        # Apply confidence caps based on highest severity
        max_severity = self._get_max_severity(penalties_applied)
        if max_severity:
            cap = self.CONFIDENCE_CAPS.get(max_severity, 1.0)
            if calibrated > cap:
                logger.warning(f"⚠️ Confidence capped at {cap*100:.0f}% due to {max_severity} severity errors")
                calibrated = cap
        
        # Build explanation
        explanation = self._build_explanation(
            initial_confidence,
            calibrated,
            total_penalty,
            penalties_applied
        )
        
        # Log calibration
        if abs(calibrated - initial_confidence) > 0.05:
            logger.info(f"📊 Confidence calibrated: {initial_confidence*100:.1f}% → {calibrated*100:.1f}%")
            logger.info(f"   Total penalty: {total_penalty*100:.1f}%")
            logger.info(f"   Penalties applied: {len(penalties_applied)}")
        
        return calibrated, explanation, {
            'initial': initial_confidence,
            'calibrated': calibrated,
            'total_penalty': total_penalty,
            'penalties': penalties_applied
        }
    
    def _check_file_type_errors(self, operations: List[Dict[str, Any]]) -> List[str]:
        """Check for wrong file type content."""
        from utils.file_type_schemas import file_type_validator
        
        errors = []
        for op in operations:
            if op.get('type') in ['edit', 'modify']:
                file_path = op.get('path', '')
                edits = op.get('edits', [])
                
                for edit in edits:
                    new_code = edit.get('new_code', '')
                    is_valid, validation_errors = file_type_validator.validate_content(
                        file_path, new_code
                    )
                    
                    if not is_valid:
                        errors.extend([
                            f"{file_path}: {err}" for err in validation_errors[:2]
                        ])
        
        return errors
    
    def _count_empty_old_code(self, operations: List[Dict[str, Any]]) -> int:
        """Count operations with empty old_code (ONLY for modify operations, not insertions)."""
        count = 0
        for op in operations:
            if op.get('type') in ['edit', 'modify']:
                edits = op.get('edits', [])
                for edit in edits:
                    change_type = edit.get('change_type', 'modify')
                    old_code_raw = edit.get('old_code', '')
                    
                    # CRITICAL FIX: Only penalize modify operations with empty old_code
                    # Insertions (change_type: "insert") legitimately have empty old_code
                    if change_type == 'modify' and not old_code_raw:
                        count += 1
        return count
    
    def _count_placeholders(self, operations: List[Dict[str, Any]]) -> int:
        """Count placeholder/incomplete implementations."""
        count = 0
        placeholder_patterns = [
            'TODO', 'FIXME', 'HACK', 'XXX',
            'pass  # implement', 'NotImplemented',
            'raise NotImplementedError',
            '# to be implemented', '# implement this'
        ]
        
        for op in operations:
            if op.get('type') in ['edit', 'modify', 'create']:
                edits = op.get('edits', [])
                for edit in edits:
                    new_code = edit.get('new_code', '')
                    if any(pattern in new_code for pattern in placeholder_patterns):
                        count += 1
        
        return count
    
    def _get_max_severity(self, penalties: List[Dict[str, Any]]) -> str:
        """Get highest severity from penalties."""
        severity_order = ['critical', 'high', 'medium', 'low']
        for severity in severity_order:
            if any(p['severity'] == severity for p in penalties):
                return severity
        return None
    
    def _build_explanation(
        self,
        initial: float,
        calibrated: float,
        total_penalty: float,
        penalties: List[Dict[str, Any]]
    ) -> str:
        """Build human-readable explanation."""
        if abs(initial - calibrated) < 0.01:
            return f"Confidence: {calibrated*100:.1f}% (no calibration needed)"
        
        lines = [
            f"Confidence calibrated: {initial*100:.1f}% → {calibrated*100:.1f}%",
            f"Total penalty: {total_penalty*100:.1f}%",
            "",
            "Penalties applied:"
        ]
        
        for p in penalties[:5]:  # Top 5
            lines.append(f"  - {p['reason']}: {p['penalty']*100:.1f}% ({p['severity']})")
        
        if len(penalties) > 5:
            lines.append(f"  ... and {len(penalties)-5} more")
        
        return "\n".join(lines)


# Global calibrator instance
confidence_calibrator = ConfidenceCalibrator()
