"""
Processors package for GitTLDR Python worker.
Contains data processing classes for files, embeddings, and summarization.
"""

from .file_processor import FileProcessor
from .embedding import EmbeddingProcessor
from .summarization import SummarizationProcessor

__all__ = [
    'FileProcessor',
    'EmbeddingProcessor', 
    'SummarizationProcessor'
]
