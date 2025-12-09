"""
Fuzzy String Matching for Code Edits
====================================

Implements fuzzy matching to replace brittle line-based editing.
Uses difflib.SequenceMatcher for ~90% similarity matching.

This solves the problem where exact string matching fails due to:
- Whitespace differences (tabs vs spaces)
- Trailing whitespace
- Line ending differences (\n vs \r\n)
- LLM approximations
"""
from typing import Tuple, Optional, List
from difflib import SequenceMatcher
from utils.logger import get_logger

logger = get_logger(__name__)


class FuzzyMatcher:
    """Fuzzy string matching for resilient code edits."""
    
    def __init__(self, similarity_threshold: float = 0.85):
        """
        Initialize fuzzy matcher.
        
        Args:
            similarity_threshold: Minimum similarity score (0.0-1.0)
                                0.85 = 85% similar (allows some whitespace differences)
                                0.90 = 90% similar (stricter)
                                0.95 = 95% similar (almost exact)
        """
        self.similarity_threshold = similarity_threshold
    
    def fuzzy_find(
        self,
        search_text: str,
        file_content: str,
        context_lines: int = 3
    ) -> Optional[Tuple[int, int, float]]:
        """
        Find best fuzzy match for search_text in file_content.
        
        Args:
            search_text: Text to search for
            file_content: File content to search within
            context_lines: Number of context lines to show before/after
        
        Returns:
            Tuple of (start_line, end_line, similarity_score) or None if no match
        """
        lines = file_content.split('\n')
        search_lines = search_text.split('\n')
        num_search_lines = len(search_lines)
        
        if num_search_lines == 0:
            logger.warning("Search text is empty")
            return None
        
        best_match = None
        best_score = 0.0
        
        # Try different window sizes (exact size, +/-1 line for flexibility)
        for window_offset in [0, 1, -1, 2, -2]:
            window_size = num_search_lines + window_offset
            if window_size <= 0:
                continue
            
            # Slide window across file
            for i in range(len(lines) - window_size + 1):
                candidate_lines = lines[i:i + window_size]
                candidate = '\n'.join(candidate_lines)
                
                # Calculate similarity
                score = self._calculate_similarity(search_text, candidate)
                
                if score > best_score and score >= self.similarity_threshold:
                    best_score = score
                    best_match = (i, i + window_size)
        
        if best_match:
            start_line, end_line = best_match
            logger.info(f"✅ Fuzzy match found at lines {start_line+1}-{end_line} (score: {best_score:.1%})")
            return (start_line, end_line, best_score)
        else:
            logger.warning(f"❌ No fuzzy match found (best score: {best_score:.1%}, threshold: {self.similarity_threshold:.1%})")
            return None
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two strings.
        
        Uses SequenceMatcher which finds longest contiguous matching subsequence.
        Returns score from 0.0 (no match) to 1.0 (exact match).
        """
        # Normalize whitespace for better matching
        text1_normalized = self._normalize_whitespace(text1)
        text2_normalized = self._normalize_whitespace(text2)
        
        # Calculate similarity
        matcher = SequenceMatcher(None, text1_normalized, text2_normalized)
        return matcher.ratio()
    
    def _normalize_whitespace(self, text: str) -> str:
        """
        Normalize whitespace to improve matching.
        
        - Convert tabs to spaces
        - Strip trailing whitespace from each line
        - Normalize multiple spaces to single space
        """
        lines = text.split('\n')
        normalized_lines = []
        
        for line in lines:
            # Convert tabs to 4 spaces
            line = line.replace('\t', '    ')
            # Strip trailing whitespace
            line = line.rstrip()
            # Keep line (don't collapse multiple spaces, as indentation matters)
            normalized_lines.append(line)
        
        return '\n'.join(normalized_lines)
    
    def apply_fuzzy_edit(
        self,
        file_content: str,
        search: str,
        replace: str,
        context_lines: int = 3
    ) -> Tuple[str, bool, str]:
        """
        Apply edit using fuzzy matching.
        
        Args:
            file_content: Original file content
            search: Text to search for (fuzzy)
            replace: Text to replace with
            context_lines: Context lines for logging
        
        Returns:
            Tuple of (new_content, success, message)
        """
        # Find fuzzy match
        match_result = self.fuzzy_find(search, file_content, context_lines)
        
        if not match_result:
            return (
                file_content,
                False,
                f"Could not find match for search text (threshold: {self.similarity_threshold:.1%})"
            )
        
        start_line, end_line, score = match_result
        
        # Replace matched lines
        lines = file_content.split('\n')
        replace_lines = replace.split('\n')
        
        # Build new content
        new_lines = lines[:start_line] + replace_lines + lines[end_line:]
        new_content = '\n'.join(new_lines)
        
        message = f"Applied fuzzy edit at lines {start_line+1}-{end_line} (similarity: {score:.1%})"
        logger.info(f"✅ {message}")
        
        return (new_content, True, message)
    
    def apply_multiple_edits(
        self,
        file_content: str,
        edits: List[Tuple[str, str]],
        context_lines: int = 3
    ) -> Tuple[str, List[dict]]:
        """
        Apply multiple edits sequentially.
        
        Args:
            file_content: Original file content
            edits: List of (search, replace) tuples
            context_lines: Context lines for logging
        
        Returns:
            Tuple of (new_content, results_list)
            results_list contains {success: bool, message: str} for each edit
        """
        content = file_content
        results = []
        
        for i, (search, replace) in enumerate(edits):
            logger.info(f"Applying edit {i+1}/{len(edits)}")
            
            new_content, success, message = self.apply_fuzzy_edit(
                content, search, replace, context_lines
            )
            
            results.append({
                'edit_number': i + 1,
                'success': success,
                'message': message,
                'search_text': search[:100] + '...' if len(search) > 100 else search
            })
            
            if success:
                content = new_content
            else:
                logger.warning(f"⚠️ Edit {i+1} failed: {message}")
        
        # Summary
        successful = sum(1 for r in results if r['success'])
        logger.info(f"✅ Applied {successful}/{len(edits)} edits successfully")
        
        return (content, results)


# Helper function for backwards compatibility
def apply_fuzzy_edit(
    file_content: str,
    search: str,
    replace: str,
    similarity_threshold: float = 0.85
) -> Tuple[str, bool, str]:
    """
    Helper function for applying a single fuzzy edit.
    
    Args:
        file_content: Original file content
        search: Text to search for
        replace: Text to replace with
        similarity_threshold: Minimum similarity (0.0-1.0)
    
    Returns:
        Tuple of (new_content, success, message)
    """
    matcher = FuzzyMatcher(similarity_threshold=similarity_threshold)
    return matcher.apply_fuzzy_edit(file_content, search, replace)


# Helper function for finding fuzzy matches
def fuzzy_find(
    search_text: str,
    file_content: str,
    similarity_threshold: float = 0.85
) -> Optional[Tuple[int, int, float]]:
    """
    Helper function for finding fuzzy match.
    
    Args:
        search_text: Text to search for
        file_content: File content to search within
        similarity_threshold: Minimum similarity (0.0-1.0)
    
    Returns:
        Tuple of (start_line, end_line, similarity_score) or None
    """
    matcher = FuzzyMatcher(similarity_threshold=similarity_threshold)
    return matcher.fuzzy_find(search_text, file_content)
