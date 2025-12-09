"""
Diff Converter - Convert JSON operations to/from unified diff format
====================================================================

Based on competitive analysis: GitHub Copilot uses diff format which:
- Eliminates line number ambiguity (AI models trained on diffs)
- Makes insertions vs modifications clear (+ vs -)
- Natural format for AI models (what they see in training data)
- Easier to validate (can use git apply)

This module provides:
1. operations_to_diff() - Convert JSON operations to unified diff
2. diff_to_operations() - Parse unified diff back to operations
3. validate_diff() - Check if diff is valid (uses git apply --check)
"""

import re
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import tempfile
import subprocess
from utils.logger import get_logger

logger = get_logger(__name__)


class DiffConverter:
    """Convert between JSON operations and unified diff format."""
    
    @staticmethod
    def operations_to_diff(
        operations: List[Dict[str, Any]],
        file_contents: Dict[str, str]
    ) -> str:
        """
        Convert JSON operations to unified diff format.
        
        Args:
            operations: List of file operations (edit, create, delete)
            file_contents: Dict mapping file paths to their current content
        
        Returns:
            Unified diff string (like git diff output)
        
        Example:
            operations = [{
                "type": "edit",
                "path": "main.py",
                "edits": [{
                    "old_code": "def old():\n    pass",
                    "new_code": "def new():\n    return True",
                    "start_line": 10,
                    "end_line": 11
                }]
            }]
            
            Returns:
            --- a/main.py
            +++ b/main.py
            @@ -10,2 +10,2 @@
            -def old():
            -    pass
            +def new():
            +    return True
        """
        diff_lines = []
        
        # CRITICAL FIX: Group operations by file to avoid duplicate diff blocks
        from collections import defaultdict
        ops_by_file = defaultdict(list)
        for op in operations:
            path = op.get('path', '')
            ops_by_file[path].append(op)
        
        # Process each file once, merging all its operations
        for path in sorted(ops_by_file.keys()):
            file_ops = ops_by_file[path]
            
            # If multiple operations for same file, merge their edits
            if len(file_ops) > 1:
                # Combine all edits into single operation
                merged_op = file_ops[0].copy()
                all_edits = []
                for op in file_ops:
                    if 'edits' in op:
                        all_edits.extend(op['edits'])
                if all_edits:
                    merged_op['edits'] = all_edits
                file_ops = [merged_op]
            
            op = file_ops[0]
            op_type = op.get('type', 'edit')
            path = op.get('path', '')
            
            if op_type == 'create':
                # New file: all lines prefixed with +
                content = op.get('content', '')
                # CRITICAL FIX (Bug #9): Clean line endings for new files
                content = content.replace('\r\n', '\n').replace('\r', '\n').replace('\ufffd', '')
                diff_lines.append(f"--- /dev/null")
                diff_lines.append(f"+++ b/{path}")
                diff_lines.append(f"@@ -0,0 +1,{len(content.splitlines())} @@")
                for line in content.splitlines():
                    diff_lines.append(f"+{line}")
                diff_lines.append("")  # Blank line between files
            
            elif op_type == 'delete':
                # Deleted file: all lines prefixed with -
                content = file_contents.get(path, '')
                # CRITICAL FIX (Bug #9): Clean line endings for deleted files
                content = content.replace('\r\n', '\n').replace('\r', '\n').replace('\ufffd', '')
                diff_lines.append(f"--- a/{path}")
                diff_lines.append(f"+++ /dev/null")
                diff_lines.append(f"@@ -1,{len(content.splitlines())} +0,0 @@")
                for line in content.splitlines():
                    diff_lines.append(f"-{line}")
                diff_lines.append("")
            
            elif op_type in ['edit', 'modify']:
                # Modified file: context + changes
                edits = op.get('edits', [])
                if not edits:
                    continue
                
                diff_lines.append(f"--- a/{path}")
                diff_lines.append(f"+++ b/{path}")
                
                # Get current file content
                current_content = file_contents.get(path, '')
                
                # CRITICAL FIX (Bug #9): Clean any stray \r characters and ensure Unix line endings
                # Files from B2 might have mixed line endings or invalid UTF-8 replacement chars
                current_content = current_content.replace('\r\n', '\n').replace('\r', '\n')
                # Remove Unicode replacement characters that appear when binary data is decoded as UTF-8
                current_content = current_content.replace('\ufffd', '')
                
                current_lines = current_content.splitlines(keepends=False)  # Don't keep line endings
                
                # CRITICAL FIX: Sort edits by start_line to process in order
                sorted_edits = sorted(edits, key=lambda e: e.get('start_line', 1))
                
                # 🔧 BUG #18 FIX: Force each edit into its own hunk to avoid multi-edit complexity
                # Multi-edit hunks cause issues when AI generates wrong line numbers - Bug #11 "fixes"
                # create hunks that don't match what git expects. Single-edit hunks are more robust.
                # Trade-off: Slightly larger diffs, but MUCH higher success rate
                merged_hunks = [[edit] for edit in sorted_edits]
                
                logger.info(f"🔧 Split {len(sorted_edits)} edits into {len(merged_hunks)} single-edit hunks for robustness")
                
                # 🔧 BUG #14 FIX: Track file state changes between hunks
                # We need to apply each hunk's changes to current_lines before generating the next hunk
                # This ensures subsequent hunks see the modified file state, not the original
                working_lines = current_lines.copy()  # Working copy that gets modified between hunks
                cumulative_offset = 0
                
                # Process each merged hunk
                for hunk_idx, hunk_edits in enumerate(merged_hunks):
                    # CRITICAL FIX (Bug #12): Sort edits by start_line to ensure correct context generation
                    hunk_edits = sorted(hunk_edits, key=lambda e: e.get('start_line', 1))
                    logger.info(f"📍 Sorted {len(hunk_edits)} edits in hunk by start_line:")
                    for i, edit in enumerate(hunk_edits):
                        logger.info(f"   Edit {i+1}: lines {edit.get('start_line')}-{edit.get('end_line', edit.get('start_line'))}")
                    
                    # Find the overall range for this hunk
                    hunk_start = min(e.get('start_line', 1) for e in hunk_edits)
                    hunk_end = max(e.get('end_line', e.get('start_line', 1)) for e in hunk_edits)
                    
                    # Convert to 0-based indexing
                    hunk_start_idx = hunk_start - 1
                    hunk_end_idx = hunk_end - 1
                    
                    # CRITICAL FIX: Handle appending beyond file end
                    if hunk_start_idx >= len(working_lines):
                        hunk_start_idx = len(working_lines)
                        hunk_end_idx = len(working_lines)
                    
                    # Calculate context (3 lines before/after the entire hunk)
                    context_before_idx = max(0, hunk_start_idx - 3)
                    context_after_idx = min(len(working_lines), hunk_end_idx + 4)
                    
                    # Build the hunk content line by line
                    hunk_content = []
                    current_line_idx = context_before_idx
                    
                    # Add context before first edit
                    logger.info(f"📍 Building hunk for {path}: hunk_start={hunk_start}, hunk_end={hunk_end}")
                    logger.info(f"📍 Context range: lines {context_before_idx+1} to {context_after_idx}")
                    logger.info(f"📍 Adding context BEFORE first edit (lines {current_line_idx+1} to {hunk_start_idx})")
                    while current_line_idx < hunk_start_idx:
                        if current_line_idx < len(working_lines):
                            logger.info(f"   Line {current_line_idx+1}: {repr(working_lines[current_line_idx][:60])}")
                            hunk_content.append(('context', working_lines[current_line_idx]))
                        current_line_idx += 1
                    
                    # Process each edit in this hunk
                    for edit in hunk_edits:
                        edit_start = edit.get('start_line', 1) - 1
                        edit_end = edit.get('end_line', edit.get('start_line', 1)) - 1
                        old_code = edit.get('old_code', '')
                        new_code = edit.get('new_code', '')
                        
                        # CRITICAL FIX (Bug #9): Clean AI-generated code as well
                        old_code = old_code.replace('\r\n', '\n').replace('\r', '\n').replace('\ufffd', '')
                        new_code = new_code.replace('\r\n', '\n').replace('\r', '\n').replace('\ufffd', '')
                        
                        # Add context between previous edit and this one (MOVED BEFORE Bug #11 check)
                        logger.info(f"📍 Adding context BETWEEN edits (lines {current_line_idx+1} to {edit_start+1})")
                        while current_line_idx < edit_start:
                            if current_line_idx < len(working_lines):
                                logger.info(f"   Line {current_line_idx+1}: {repr(working_lines[current_line_idx][:60])}")
                                hunk_content.append(('context', working_lines[current_line_idx]))
                            current_line_idx += 1
                        
                        # CRITICAL FIX (Bug #11): Ensure old_code from AI exactly matches file content
                        # If old_code is provided but doesn't match, try to find it in the file
                        if old_code:
                            # Extract the exact content from working_lines for these line numbers
                            actual_old_lines = working_lines[edit_start:edit_end + 1]
                            actual_old_code = '\n'.join(actual_old_lines)
                            
                            # DEBUG: Always log the comparison
                            logger.info(f"🔍 Bug #11 check for {path} lines {edit_start+1}-{edit_end+1}:")
                            logger.info(f"   AI old_code length: {len(old_code)}, actual length: {len(actual_old_code)}")
                            logger.info(f"   AI old_code: {repr(old_code)}")
                            logger.info(f"   Actual file: {repr(actual_old_code)}")
                            logger.info(f"   Match after strip: {old_code.strip() == actual_old_code.strip()}")
                            
                            # If AI's old_code doesn't match actual file content, use actual
                            if old_code.strip() != actual_old_code.strip():
                                logger.warning(f"⚠️ AI old_code mismatch at lines {edit_start+1}-{edit_end+1}, using actual file content")
                                logger.warning(f"   AI had: {repr(old_code[:100])}")
                                logger.warning(f"   File has: {repr(actual_old_code[:100])}")
                                old_code = actual_old_code
                        
                        # Add old lines (removed)
                        old_lines = old_code.splitlines() if old_code else []
                        for line in old_lines:
                            hunk_content.append(('remove', line))
                        
                        # Add new lines (added)
                        new_lines = new_code.splitlines() if new_code else []
                        for line in new_lines:
                            hunk_content.append(('add', line))
                        
                        # Move past the replaced lines
                        current_line_idx = edit_end + 1
                    
                    # Add context after last edit
                    while current_line_idx < context_after_idx:
                        if current_line_idx < len(working_lines):
                            hunk_content.append(('context', working_lines[current_line_idx]))
                        current_line_idx += 1
                    
                    # Calculate hunk header counts
                    old_count = sum(1 for t, _ in hunk_content if t in ['context', 'remove'])
                    new_count = sum(1 for t, _ in hunk_content if t in ['context', 'add'])
                    old_start = context_before_idx + 1  # 1-based
                    new_start = context_before_idx + 1 + cumulative_offset  # Adjusted for previous hunks
                    
                    # Update cumulative offset for next hunk
                    lines_added = sum(1 for t, _ in hunk_content if t == 'add')
                    lines_removed = sum(1 for t, _ in hunk_content if t == 'remove')
                    cumulative_offset += (lines_added - lines_removed)
                    
                    # Write hunk header
                    diff_lines.append(f"@@ -{old_start},{old_count} +{new_start},{new_count} @@")
                    
                    # 🔍 BUG #14 DIAGNOSTIC: Log exact hunk content being written
                    logger.info(f"=" * 80)
                    logger.info(f"🔍 HUNK #{hunk_idx+1} for {path}: old={old_start},{old_count} new={new_start},{new_count}")
                    logger.info(f"   Hunk content ({len(hunk_content)} lines):")
                    for i, (line_type, line_text) in enumerate(hunk_content[:20], 1):  # First 20 lines
                        prefix = ' ' if line_type == 'context' else ('-' if line_type == 'remove' else '+')
                        logger.info(f"     {i:2d}. [{line_type:7s}] {prefix}{repr(line_text[:70])}")
                    if len(hunk_content) > 20:
                        logger.info(f"     ... ({len(hunk_content)-20} more lines)")
                    logger.info(f"=" * 80)
                    
                    # Write hunk content
                    for line_type, line_text in hunk_content:
                        if line_type == 'context':
                            diff_lines.append(f" {line_text}")
                        elif line_type == 'remove':
                            diff_lines.append(f"-{line_text}")
                        elif line_type == 'add':
                            diff_lines.append(f"+{line_text}")
                    
                    # 🔧 BUG #14 FIX: Apply hunk changes to working_lines for subsequent hunks
                    # This ensures the next hunk sees the modified file state, not the original
                    # 
                    # CRITICAL: We apply changes from the ENTIRE hunk at once, tracking cumulative offset
                    # Do NOT modify edit positions mid-hunk - git unified diff format expects original positions
                    edit_offset = 0  # Track offset within THIS hunk (separate from cumulative_offset for hunk headers)
                    for edit in hunk_edits:
                        # Use original positions from edits list (not modified)
                        edit_start = edit.get('start_line', 1) - 1
                        edit_end = edit.get('end_line', edit.get('start_line', 1)) - 1
                        old_code = edit.get('old_code', '')
                        new_code = edit.get('new_code', '')
                        
                        # Apply the transformation to working_lines with edit_offset
                        old_lines = old_code.splitlines() if old_code else []
                        new_lines = new_code.splitlines() if new_code else []
                        
                        # Adjust position by edit_offset from previous edits in this hunk
                        adjusted_start = edit_start + edit_offset
                        adjusted_end = edit_end + edit_offset
                        
                        # Remove old lines and insert new lines at adjusted position
                        working_lines[adjusted_start:adjusted_end + 1] = new_lines
                        
                        # Track edit_offset for next edit in this hunk
                        position_shift = len(new_lines) - (edit_end - edit_start + 1)
                        edit_offset += position_shift
                
                diff_lines.append("")  # Blank line between files
        
        return "\n".join(diff_lines)
    
    @staticmethod
    def diff_to_operations(diff_str: str) -> List[Dict[str, Any]]:
        """
        Parse unified diff back to JSON operations.
        
        Args:
            diff_str: Unified diff string
        
        Returns:
            List of operations in JSON format
        """
        operations = []
        current_file = None
        current_hunk = []
        is_new_file = False
        is_deleted_file = False
        
        for line in diff_str.splitlines():
            # File headers
            if line.startswith('--- '):
                if current_file:
                    # Process previous file
                    op = DiffConverter._parse_hunks(current_file, current_hunk, is_new_file, is_deleted_file)
                    if op:
                        operations.append(op)
                
                # Start new file
                if line == '--- /dev/null':
                    is_new_file = True
                    current_file = None
                else:
                    is_new_file = False
                    current_file = line[6:]  # Remove '--- a/'
                current_hunk = []
            
            elif line.startswith('+++ '):
                if line == '+++ /dev/null':
                    is_deleted_file = True
                else:
                    is_deleted_file = False
                    if is_new_file:
                        current_file = line[6:]  # Remove '+++ b/'
            
            elif line.startswith('@@'):
                # Hunk header
                current_hunk.append(line)
            
            elif line.startswith(('+', '-', ' ')):
                # Hunk content
                current_hunk.append(line)
        
        # Process last file
        if current_file:
            op = DiffConverter._parse_hunks(current_file, current_hunk, is_new_file, is_deleted_file)
            if op:
                operations.append(op)
        
        return operations
    
    @staticmethod
    def _parse_hunks(
        file_path: str,
        hunks: List[str],
        is_new: bool,
        is_deleted: bool
    ) -> Optional[Dict[str, Any]]:
        """Parse hunks for a single file into operation dict."""
        if not hunks:
            return None
        
        if is_new:
            # Create operation
            new_lines = [line[1:] for line in hunks if line.startswith('+')]
            return {
                'type': 'create',
                'path': file_path,
                'content': '\n'.join(new_lines)
            }
        
        elif is_deleted:
            # Delete operation
            return {
                'type': 'delete',
                'path': file_path
            }
        
        else:
            # Edit operation
            edits = []
            old_lines = []
            new_lines = []
            start_line = 1
            
            for line in hunks:
                if line.startswith('@@'):
                    # Parse line number from hunk header
                    match = re.search(r'@@ -(\d+),\d+ \+\d+,\d+ @@', line)
                    if match:
                        start_line = int(match.group(1))
                elif line.startswith('-'):
                    # Remove the '-' prefix
                    old_lines.append(line[1:])
                elif line.startswith('+'):
                    # Remove the '+' prefix and decode escape sequences
                    line_content = line[1:]
                    
                    # CRITICAL FIX: AI-generated diffs often contain literal escape sequences
                    # Try multiple decoding strategies to fix common issues
                    try:
                        # Check if line contains literal backslash sequences
                        if '\\' in line_content:
                            # Try decode with unicode_escape (handles \n, \t, \r, etc.)
                            decoded = line_content.encode('utf-8').decode('unicode_escape')
                            # Only use decoded version if it actually changed something
                            if decoded != line_content:
                                logger.info(f"🔧 Decoded escape sequences in line")
                                line_content = decoded
                    except Exception as e:
                        # If decoding fails, use original (better to have working code with issues
                        # than broken code that crashes validator)
                        logger.debug(f"Could not decode escape sequences: {e}")
                    
                    new_lines.append(line_content)
                elif line.startswith(' '):
                    # Context line - if we have accumulated changes, save them
                    if old_lines or new_lines:
                        edits.append({
                            'start_line': start_line,
                            'end_line': start_line + len(old_lines),
                            'old_code': '\n'.join(old_lines),
                            'new_code': '\n'.join(new_lines),
                            'change_type': 'insert' if not old_lines else 'modify'
                        })
                        old_lines = []
                        new_lines = []
                    start_line += 1
            
            # Save final edit if any
            if old_lines or new_lines:
                edits.append({
                    'start_line': start_line,
                    'end_line': start_line + len(old_lines),
                    'old_code': '\n'.join(old_lines),
                    'new_code': '\n'.join(new_lines),
                    'change_type': 'insert' if not old_lines else 'modify'
                })
            
            if edits:
                return {
                    'type': 'edit',
                    'path': file_path,
                    'edits': edits
                }
        
        return None
    
    @staticmethod
    def validate_diff(diff_str: str, repo_path: str) -> Tuple[bool, str]:
        """
        Validate diff using git apply --check.
        
        Args:
            diff_str: Unified diff string
            repo_path: Path to repository (or temp directory with files)
        
        Returns:
            (is_valid, error_message)
        """
        try:
            # Initialize git repo if not exists
            git_dir = Path(repo_path) / '.git'
            if not git_dir.exists():
                subprocess.run(
                    ['git', 'init'],
                    cwd=repo_path,
                    capture_output=True,
                    check=True
                )
                # Add all files to git
                subprocess.run(
                    ['git', 'add', '-A'],
                    cwd=repo_path,
                    capture_output=True,
                    check=True
                )
            else:
                # CRITICAL FIX (Bug #10): Reset any uncommitted changes from previous runs
                # This ensures we're validating against clean original files
                subprocess.run(
                    ['git', 'restore', '.'],
                    cwd=repo_path,
                    capture_output=True,
                    check=False  # Don't fail if nothing to restore
                )
                logger.info("🔄 Reset test repo to clean state (removed uncommitted changes)")
            
            # CRITICAL FIX (Bug #9): Write diff in binary mode to prevent Windows from adding \r
            # Git expects Unix line endings (\n) in diffs, even on Windows
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.diff', delete=False) as f:
                f.write(diff_str.encode('utf-8'))
                diff_file = f.name
            
            try:
                # Run git apply --check
                result = subprocess.run(
                    ['git', 'apply', '--check', '--verbose', '--ignore-space-change', '--ignore-whitespace', diff_file],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    return True, "Diff is valid"
                else:
                    # Return both stdout and stderr for debugging
                    error_msg = result.stderr or result.stdout
                    return False, error_msg
            finally:
                # Clean up temp diff file
                Path(diff_file).unlink(missing_ok=True)
        
        except Exception as e:
            return False, f"Validation error: {str(e)}"


# Convenience functions
def operations_to_diff(operations: List[Dict[str, Any]], file_contents: Dict[str, str]) -> str:
    """Convert operations to unified diff (convenience function)."""
    return DiffConverter.operations_to_diff(operations, file_contents)


def diff_to_operations(diff_str: str) -> List[Dict[str, Any]]:
    """Parse unified diff to operations (convenience function)."""
    return DiffConverter.diff_to_operations(diff_str)


def validate_diff(diff_str: str, repo_path: str) -> Tuple[bool, str]:
    """Validate diff (convenience function)."""
    return DiffConverter.validate_diff(diff_str, repo_path)
