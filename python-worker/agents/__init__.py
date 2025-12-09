"""
RATFV Architecture Agents for Auto-Fix AI - COMPLETE IMPLEMENTATION
===================================================================

Multi-agent system implementing research-backed techniques:
- ReACT: Reasoning and Acting
- RAG-Fusion: Multi-strategy retrieval with query rewriting
- Tree-of-Thought: Multi-candidate generation
- Multi-Layer Validation: 6-layer comprehensive checking
- Self-Refinement: Iterative improvement
- Confidence-Gated PR: Smart pull request creation

All 7 Phases Implemented:
1. DeepUnderstandingAgent: ReACT reasoning with 95% accuracy target
2. PrecisionRetrievalAgent: RAG-Fusion with 90% accuracy target
3. TreeOfThoughtGenerator: Generate and score 3 fix candidates
4. MultiLayerValidator: 6-layer validation (AST, types, imports, security, tests, AI)
5. SelfRefinementEngine: Iterative improvement with up to 3 refinement cycles
6. ConfidenceGatedPRCreator: Smart PR creation (draft/review/auto-merge)
7. MetaController: Orchestrates all phases with proper error handling

Target Performance: 80-85% success rate (2.5x improvement over 33% baseline)
"""

from .deep_understanding_agent import DeepUnderstandingAgent
from .precision_retrieval_agent import PrecisionRetrievalAgent
from .tree_of_thought_generator import TreeOfThoughtGenerator
from .multi_layer_validator import MultiLayerValidator
from .self_refinement_engine import SelfRefinementEngine
from .confidence_gated_pr_creator import ConfidenceGatedPRCreator
from .meta_controller import MetaController

__all__ = [
    'DeepUnderstandingAgent',
    'PrecisionRetrievalAgent',
    'TreeOfThoughtGenerator',
    'MultiLayerValidator',
    'SelfRefinementEngine',
    'ConfidenceGatedPRCreator',
    'MetaController'
]
