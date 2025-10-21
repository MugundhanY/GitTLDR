"""
Smart Context Builder for Q&A System

This module provides intelligent context building for the Q&A system that:
1. Performs smart file discovery (handles path variations)
2. Analyzes question types to determine relevant context
3. Builds comprehensive context beyond just README files
4. Provides deep code analysis capabilities
"""
import re
import os
from typing import List, Dict, Any, Optional, Set, Tuple
from utils.logger import get_logger

logger = get_logger(__name__)


class SmartContextBuilder:
    """Builds intelligent context for Q&A based on question analysis."""
    
    def __init__(self):
        self.code_extensions = {
            'python': ['.py', '.pyx', '.pyw'],
            'javascript': ['.js', '.jsx', '.mjs', '.cjs'],
            'typescript': ['.ts', '.tsx'],
            'java': ['.java', '.kt', '.scala'],
            'c_cpp': ['.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.hxx'],
            'csharp': ['.cs'],
            'go': ['.go'],
            'rust': ['.rs'],
            'php': ['.php'],
            'ruby': ['.rb'],
            'swift': ['.swift'],
            'config': ['.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config'],
            'web': ['.html', '.css', '.scss', '.sass', '.less'],
            'data': ['.sql', '.xml', '.csv'],
            'docs': ['.md', '.txt', '.rst']
        }
        
        # Question type patterns
        self.question_patterns = {
            'file_specific': [
                r'(?:file|script|module|class)\s+(.+?)(?:\s|$)',
                r'(?:in|inside|within)\s+(.+?)(?:\s|$)',
                r'(.+\.(?:py|js|ts|java|cpp|c|h|go|rs|php|rb|swift|cs|json|yaml|yml|toml|conf))(?:\s|$)',
                r'(?:path|location)\s+(.+?)(?:\s|$)'
            ],
            'folder_specific': [
                r'(?:folder|directory|dir)\s+(.+?)(?:\s|$)',
                r'(?:inside|within)\s+(.+?)(?:folder|directory|dir)',
                r'files?\s+(?:in|inside|within)\s+(.+?)(?:\s|$)'
            ],
            'architectural': [
                r'(?:architecture|structure|design|pattern|organization)',
                r'(?:how\s+(?:is|does|works?)|what\s+(?:is|does))',
                r'(?:explain|describe|tell\s+me\s+about)'
            ],
            'functional': [
                r'(?:what\s+does|how\s+does|why\s+does)',
                r'(?:function|method|class|component)',
                r'(?:works?|operates?|functions?)'
            ],
            'configuration': [
                r'(?:config|configuration|settings?|setup)',
                r'(?:environment|env|deployment)',
                r'(?:\.conf|\.config|\.ini|\.yaml|\.yml|\.json|\.toml)'
            ]
        }
    
    def analyze_question(self, question: str) -> Dict[str, Any]:
        """Analyze question to determine context needs."""
        question_lower = question.lower()
        analysis = {
            'type': 'general',
            'specific_files': [],
            'specific_folders': [],
            'keywords': [],
            'needs_deep_analysis': False,
            'focus_areas': []
        }
        
        # Extract specific file mentions
        for pattern in self.question_patterns['file_specific']:
            matches = re.findall(pattern, question, re.IGNORECASE)
            for match in matches:
                cleaned_match = self._clean_path(match)
                if cleaned_match:
                    analysis['specific_files'].append(cleaned_match)
        
        # Extract folder mentions
        for pattern in self.question_patterns['folder_specific']:
            matches = re.findall(pattern, question, re.IGNORECASE)
            for match in matches:
                cleaned_match = self._clean_path(match)
                if cleaned_match:
                    analysis['specific_folders'].append(cleaned_match)
        
        # Determine question type
        if analysis['specific_files']:
            analysis['type'] = 'file_specific'
        elif analysis['specific_folders']:
            analysis['type'] = 'folder_specific'
        elif any(re.search(pattern, question_lower) for pattern in self.question_patterns['architectural']):
            analysis['type'] = 'architectural'
            analysis['needs_deep_analysis'] = True
        elif any(re.search(pattern, question_lower) for pattern in self.question_patterns['functional']):
            analysis['type'] = 'functional'
            analysis['needs_deep_analysis'] = True
        elif any(re.search(pattern, question_lower) for pattern in self.question_patterns['configuration']):
            analysis['type'] = 'configuration'
            analysis['focus_areas'].append('config')
        
        # Extract keywords
        analysis['keywords'] = self._extract_keywords(question)
        
        logger.info(f"Question analysis: {analysis}")
        return analysis
    
    def build_smart_context(self, 
                          question_analysis: Dict[str, Any], 
                          available_files: List[Dict[str, Any]],
                          question: str) -> Tuple[List[str], List[str]]:
        """Build smart context based on question analysis."""
        relevant_files = []
        relevant_paths = []
        
        # First, try to find specifically mentioned files/folders
        if question_analysis['type'] == 'file_specific':
            relevant_files, relevant_paths = self._find_specific_files(
                question_analysis['specific_files'], available_files
            )
        elif question_analysis['type'] == 'folder_specific':
            relevant_files, relevant_paths = self._find_folder_contents(
                question_analysis['specific_folders'], available_files
            )
        
        # If no specific files found or need broader context
        if not relevant_files or question_analysis['needs_deep_analysis']:
            additional_files, additional_paths = self._find_contextual_files(
                question_analysis, available_files, question
            )
            relevant_files.extend(additional_files)
            relevant_paths.extend(additional_paths)
        
        # Remove duplicates while preserving order
        seen = set()
        final_files = []
        final_paths = []
        
        for i, file_content in enumerate(relevant_files):
            if file_content not in seen:
                seen.add(file_content)
                final_files.append(file_content)
                if i < len(relevant_paths):
                    final_paths.append(relevant_paths[i])
        
        logger.info(f"Built context with {len(final_files)} files")
        return final_files, final_paths
    
    def _clean_path(self, path: str) -> str:
        """Clean and normalize file paths."""
        # Remove common noise words and punctuation
        path = re.sub(r'\b(?:file|the|this|that|called|named|in|inside|within)\b', '', path, flags=re.IGNORECASE)
        path = re.sub(r'[^\w\-\/\\\.]', '', path)
        path = path.strip()
        
        # Normalize path separators
        path = path.replace('\\', '/')
        
        return path if path else None
    
    def _extract_keywords(self, question: str) -> List[str]:
        """Extract relevant keywords from question."""
        # Remove common stop words and extract meaningful terms
        stop_words = {'the', 'is', 'at', 'which', 'on', 'how', 'what', 'where', 'when', 'why', 'does', 'do'}
        
        words = re.findall(r'\b\w+\b', question.lower())
        keywords = [word for word in words if len(word) > 3 and word not in stop_words]
        
        return keywords[:10]  # Limit to top 10 keywords
    
    def _find_specific_files(self, target_files: List[str], available_files: List[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
        """Find specifically mentioned files with fuzzy matching."""
        found_files = []
        found_paths = []
        
        for target in target_files:
            for file_info in available_files:
                file_path = file_info.get('path', '')
                file_name = os.path.basename(file_path)
                
                # Multiple matching strategies
                if (self._path_matches(target, file_path) or 
                    self._path_matches(target, file_name) or
                    self._fuzzy_path_match(target, file_path)):
                    
                    content = file_info.get('content', '')
                    if content:
                        found_files.append(f"File: {file_path}\n{content}")
                        found_paths.append(file_path)
                        logger.info(f"Found specific file: {file_path} for target: {target}")
        
        return found_files, found_paths
    
    def _find_folder_contents(self, target_folders: List[str], available_files: List[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
        """Find all files within specified folders."""
        found_files = []
        found_paths = []
        
        for target_folder in target_folders:
            folder_files = []
            
            for file_info in available_files:
                file_path = file_info.get('path', '')
                
                # Check if file is in the target folder
                if self._file_in_folder(file_path, target_folder):
                    content = file_info.get('content', '')
                    if content:
                        folder_files.append((file_path, content))
            
            # Sort files by importance (config files first, then by size)
            folder_files.sort(key=lambda x: (
                0 if any(x[0].endswith(ext) for ext in self.code_extensions['config']) else 1,
                -len(x[1])  # Larger files first
            ))
            
            # Add up to 10 files from this folder
            for file_path, content in folder_files[:10]:
                found_files.append(f"File: {file_path}\n{content}")
                found_paths.append(file_path)
                logger.info(f"Found folder file: {file_path} in folder: {target_folder}")
        
        return found_files, found_paths
    
    def _find_contextual_files(self, question_analysis: Dict[str, Any], available_files: List[Dict[str, Any]], question: str) -> Tuple[List[str], List[str]]:
        """Find contextually relevant files based on question analysis."""
        scored_files = []
        
        for file_info in available_files:
            file_path = file_info.get('path', '')
            file_name = os.path.basename(file_path)
            content = file_info.get('content', '')
            
            if not content:
                continue
            
            score = self._calculate_relevance_score(
                file_path, file_name, content, question_analysis, question
            )
            
            if score > 0:
                scored_files.append((score, file_path, content))
        
        # Sort by relevance score (highest first)
        scored_files.sort(key=lambda x: x[0], reverse=True)
        
        # Take top 15 most relevant files
        found_files = []
        found_paths = []
        
        for score, file_path, content in scored_files[:15]:
            found_files.append(f"File: {file_path}\n{content}")
            found_paths.append(file_path)
            logger.info(f"Found contextual file: {file_path} (score: {score:.2f})")
        
        return found_files, found_paths
    
    def _path_matches(self, target: str, actual: str) -> bool:
        """Check if paths match with various normalization."""
        if not target or not actual:
            return False
        
        # Normalize both paths
        target_norm = target.lower().replace('\\', '/').strip('/')
        actual_norm = actual.lower().replace('\\', '/').strip('/')
        
        return (target_norm == actual_norm or 
                target_norm in actual_norm or 
                actual_norm.endswith(target_norm))
    
    def _fuzzy_path_match(self, target: str, actual: str) -> bool:
        """Fuzzy matching for paths with common variations."""
        if not target or not actual:
            return False
        
        # Remove common path variations
        target_clean = re.sub(r'[\\\/\-_\.]', '', target.lower())
        actual_clean = re.sub(r'[\\\/\-_\.]', '', actual.lower())
        
        return target_clean in actual_clean or actual_clean in target_clean
    
    def _file_in_folder(self, file_path: str, folder_name: str) -> bool:
        """Check if file is in specified folder."""
        if not folder_name or not file_path:
            return False
        
        folder_norm = folder_name.lower().replace('\\', '/').strip('/')
        path_norm = file_path.lower().replace('\\', '/')
        
        # Check if any part of the path matches the folder
        path_parts = path_norm.split('/')
        return folder_norm in path_parts or any(folder_norm in part for part in path_parts)
    
    def _calculate_relevance_score(self, file_path: str, file_name: str, content: str, 
                                 question_analysis: Dict[str, Any], question: str) -> float:
        """Calculate relevance score for a file."""
        score = 0.0
        content_lower = content.lower()
        file_path_lower = file_path.lower()
        question_lower = question.lower()
        
        # CRITICAL: User-provided attachments should always have high priority
        is_attachment = file_path.startswith('attachment/') or '🔴 USER-PROVIDED' in content or 'attachment/' in file_path_lower
        if is_attachment:
            logger.info(f"🎯 ATTACHMENT DETECTED: {file_path} - giving maximum priority score")
            score += 10.0  # Very high base score for attachments
            # Additional boost if attachment is mentioned in question
            if 'attachment' in question_lower or 'file' in question_lower or 'document' in question_lower:
                score += 5.0
        
        # Keyword matching in content
        for keyword in question_analysis['keywords']:
            if keyword in content_lower:
                score += 2.0
            if keyword in file_path_lower:
                score += 1.5
        
        # Question type specific scoring
        if question_analysis['type'] == 'configuration':
            if any(file_path.endswith(ext) for ext in self.code_extensions['config']):
                score += 5.0
        
        # File type relevance
        if question_analysis['type'] == 'architectural':
            if any(file_path.endswith(ext) for ext in 
                  self.code_extensions['python'] + self.code_extensions['javascript'] + 
                  self.code_extensions['typescript'] + self.code_extensions['java']):
                score += 3.0
        
        # Avoid over-reliance on README files unless specifically asked
        if 'readme' in file_name.lower() and 'readme' not in question_lower:
            score *= 0.3  # Reduce README priority
        
        # Boost important configuration and main files
        important_files = ['main', 'index', 'app', 'server', 'config', 'settings']
        if any(important in file_name.lower() for important in important_files):
            score += 2.0
        
        # Content quality scoring
        if len(content) > 100:  # Meaningful content
            score += 1.0
        if len(content) > 1000:  # Substantial content
            score += 2.0
        
        return score


# Global instance
smart_context_builder = SmartContextBuilder()
