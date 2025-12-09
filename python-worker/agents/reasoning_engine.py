"""
Reasoning Engine - AI learns from mistakes
===========================================

Instead of hardcoded templates, the AI:
1. Analyzes validation failures
2. Understands WHY things failed (semantic reasoning)
3. Learns patterns from test output
4. Applies general principles, not specific rules

This scales to ANY codebase, not just FastAPI/WebSocket.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import re
from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ReasoningContext:
    """Context for AI to reason about failures."""
    error_type: str  # RuntimeError, SyntaxError, TypeError, etc.
    error_message: str
    stack_trace: Optional[str]
    failed_code: str
    test_output: Optional[str]
    validation_issues: List[str]
    framework_context: Dict[str, Any]  # FastAPI, Django, Flask, etc.


class ReasoningEngine:
    """
    Teaches AI to UNDERSTAND failures, not memorize templates.
    
    Key Principles:
    1. Show AI the ERROR + STACK TRACE (not just "don't do X")
    2. Let AI infer semantics from documentation/exceptions
    3. Build general reasoning, not specific rules
    4. Learn from test failures in real-time
    """
    
    def __init__(self, ai_client):
        self.ai_client = ai_client
    
    async def analyze_failure(self, context: ReasoningContext) -> Dict[str, Any]:
        """
        Teach AI to reason about WHY something failed.
        
        Returns:
            {
                'root_cause': 'WebSocketDisconnect exception means connection closed',
                'semantic_understanding': 'Exception handlers should not "undo" what exception represents',
                'general_principle': 'When exception indicates state change, don\'t try to change state again',
                'fix_strategy': 'Remove redundant websocket.close() call',
                'similar_patterns': ['FileNotFoundError → don\'t try to close file', ...]
            }
        """
        # Build reasoning prompt that teaches UNDERSTANDING, not rules
        prompt = f"""
You are debugging a code failure. Your goal is to UNDERSTAND the root cause semantically, not just fix symptoms.

**ERROR:**
Type: {context.error_type}
Message: {context.error_message}

**STACK TRACE:**
{context.stack_trace or 'Not available'}

**FAILED CODE:**
```python
{context.failed_code}
```

**TEST OUTPUT:**
{context.test_output or 'Not available'}

**VALIDATION ISSUES:**
{chr(10).join(f'- {issue}' for issue in context.validation_issues)}

**FRAMEWORK CONTEXT:**
{self._format_framework_context(context.framework_context)}

---

**REASONING TASK:**

Instead of telling you "don't do X", let's reason from first principles:

**STEP 1: UNDERSTAND THE ERROR**
- What does this error TYPE mean semantically?
- What STATE does the error indicate?
- What ACTION was attempted that caused the error?

**STEP 2: TRACE THE LOGIC**
- Read the exception name: what does it COMMUNICATE?
  (e.g., "WebSocketDisconnect" → WebSocket disconnected → connection closed)
- What happened BEFORE the exception?
- What does the code try to do AFTER catching the exception?
- Is there a CONTRADICTION? (e.g., "connection closed" → trying to close again)

**STEP 3: GENERALIZE THE PATTERN**
- Is this specific to WebSockets, or a general principle?
- Find similar patterns in other frameworks:
  * FileNotFoundError → file doesn't exist → don't try to close it
  * ConnectionError → connection lost → don't send data
  * SessionExpired → session ended → don't save session
- What's the GENERAL RULE?
  "When exception indicates X already happened, don't try to do X again"

**STEP 4: INFER FROM DOCUMENTATION**
If you were reading the framework docs:
- What would "WebSocketDisconnect" exception documentation say?
- What does "await websocket.close()" documentation say?
- Are they compatible?

**OUTPUT FORMAT (JSON):**
```json
{{
  "root_cause": "Exception indicates state that makes the action impossible",
  "semantic_understanding": "WebSocketDisconnect means client closed connection. Calling close() again tries to close an already-closed connection.",
  "general_principle": "Exception handlers should not perform actions that the exception itself indicates already occurred or are now impossible",
  "fix_strategy": "Remove the redundant action from exception handler",
  "similar_patterns": [
    "FileNotFoundError in with-block → don't try file.close() in except",
    "ConnectionAbortedError → don't try socket.send()",
    "SessionExpired → don't try session.commit()"
  ],
  "framework_agnostic_lesson": "Read exception names as semantic signals about system state",
  "confidence": 0.95
}}
```

Think step-by-step. Reason about SEMANTICS, not syntax.
"""
        
        response = await self.ai_client.generate_content_async(
            prompt=prompt,
            temperature=0.3,  # Lower temp for reasoning
            max_tokens=2000
        )
        
        # Parse JSON response
        import json
        try:
            # Extract JSON from response
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group(1))
                logger.info(f"✅ Reasoning: {analysis.get('semantic_understanding', '')}")
                return analysis
            else:
                logger.error("Failed to extract JSON from reasoning response")
                return self._fallback_analysis(context)
        except Exception as e:
            logger.error(f"Reasoning failed: {e}")
            return self._fallback_analysis(context)
    
    async def generate_fix_with_reasoning(
        self,
        original_code: str,
        reasoning: Dict[str, Any],
        context: ReasoningContext
    ) -> str:
        """
        Generate fix using UNDERSTANDING, not templates.
        
        The AI has already reasoned about the problem.
        Now it applies that understanding to generate correct code.
        """
        prompt = f"""
You've analyzed a bug and understand the root cause. Now fix it.

**YOUR UNDERSTANDING:**
- Root Cause: {reasoning.get('root_cause', '')}
- Semantic Insight: {reasoning.get('semantic_understanding', '')}
- General Principle: {reasoning.get('general_principle', '')}
- Fix Strategy: {reasoning.get('fix_strategy', '')}

**SIMILAR PATTERNS YOU LEARNED:**
{chr(10).join(f'- {p}' for p in reasoning.get('similar_patterns', []))}

**ORIGINAL CODE:**
```python
{original_code}
```

**FAILED WITH:**
{context.error_type}: {context.error_message}

---

**TASK:**
Apply your understanding to fix the code. Don't just remove the bug - demonstrate you UNDERSTAND why it was wrong.

**THINK:**
1. What action does the exception indicate already happened?
2. What action is the code trying to do in the handler?
3. Is there a redundancy?
4. What's the minimal fix that respects the semantic meaning?

**GUIDELINES:**
- Apply the general principle, not a specific rule
- Your fix should work for similar patterns in other frameworks
- Comment WHY you're making the change (show understanding)

Output the COMPLETE fixed code:
```python
# Your fix here
```

NO explanations after the code block.
"""
        
        response = await self.ai_client.generate_content_async(
            prompt=prompt,
            temperature=0.4,
            max_tokens=3000
        )
        
        # Extract code
        code_match = re.search(r'```python\s*(.*?)\s*```', response, re.DOTALL)
        if code_match:
            return code_match.group(1)
        else:
            # Fallback: return raw response
            return response
    
    def _format_framework_context(self, context: Dict[str, Any]) -> str:
        """Format framework context for reasoning."""
        if not context:
            return "No framework context provided"
        
        lines = []
        for key, value in context.items():
            lines.append(f"- {key}: {value}")
        return '\n'.join(lines)
    
    def _fallback_analysis(self, context: ReasoningContext) -> Dict[str, Any]:
        """Fallback if AI reasoning fails."""
        return {
            'root_cause': f'{context.error_type}: {context.error_message}',
            'semantic_understanding': 'Could not analyze semantically',
            'general_principle': 'Fix the specific error',
            'fix_strategy': 'Apply minimal fix',
            'similar_patterns': [],
            'confidence': 0.3
        }


class FrameworkSemanticLearner:
    """
    Learns framework semantics from documentation, not hardcoded rules.
    
    Example: Instead of "don't call websocket.close() in WebSocketDisconnect",
    the AI learns:
    
    1. FastAPI imports: WebSocket, WebSocketDisconnect
    2. WebSocketDisconnect doc: "Raised when client disconnects"
    3. WebSocket.close() doc: "Close the connection"
    4. Inference: If exception = "already disconnected", close() = redundant
    
    This works for ANY framework, not just FastAPI.
    """
    
    def __init__(self, ai_client):
        self.ai_client = ai_client
        self.learned_semantics = {}
    
    async def learn_framework_semantics(
        self,
        framework_name: str,
        code_context: str,
        error_context: Optional[ReasoningContext] = None
    ) -> Dict[str, Any]:
        """
        Learn framework semantics from imports and usage.
        
        Returns:
            {
                'framework': 'FastAPI',
                'key_concepts': {
                    'WebSocketDisconnect': {
                        'type': 'exception',
                        'meaning': 'Client closed connection',
                        'state_change': 'connection_closed',
                        'implications': ['cannot send data', 'cannot close again']
                    },
                    'WebSocket.close()': {
                        'type': 'method',
                        'action': 'Close active connection',
                        'precondition': 'connection must be open',
                        'incompatible_with': ['WebSocketDisconnect']
                    }
                },
                'learned_rules': [
                    'WebSocketDisconnect means connection closed → no close() needed',
                    'Exception name indicates state → don't redo state change'
                ]
            }
        """
        prompt = f"""
You're learning the SEMANTICS of {framework_name} by reading code and errors.

**CODE CONTEXT:**
```python
{code_context}
```

**ERROR CONTEXT:**
{self._format_error_context(error_context) if error_context else 'No errors yet'}

---

**LEARNING TASK:**

Imagine you're reading the {framework_name} documentation. From the imports, class names, and exception names, INFER the semantics:

**STEP 1: IDENTIFY KEY CONCEPTS**
- What classes/exceptions are imported?
- What do their NAMES tell you? (e.g., "Disconnect" → connection ended)
- What methods are called?

**STEP 2: INFER SEMANTICS FROM NAMES**
- "WebSocketDisconnect" → What does "Disconnect" imply?
- "websocket.close()" → What does "close" do?
- Are they compatible? (Can you close something already disconnected?)

**STEP 3: LEARN GENERAL PATTERNS**
- What STATE does each exception represent?
- What ACTIONS become impossible in that state?
- What PRECONDITIONS do methods require?

**STEP 4: BUILD SEMANTIC MODEL**
Create a mental model of valid state transitions:
- open → disconnected (via client action or exception)
- disconnected → cannot send, cannot close
- attempting to close disconnected → error

**OUTPUT (JSON):**
```json
{{
  "framework": "{framework_name}",
  "concepts": {{
    "WebSocketDisconnect": {{
      "type": "exception",
      "semantic_meaning": "Connection terminated by client",
      "state_after": "disconnected",
      "actions_impossible": ["send", "close", "receive"]
    }},
    "WebSocket.close()": {{
      "type": "method",
      "semantic_meaning": "Gracefully close active connection",
      "precondition": "connection must be active",
      "postcondition": "connection disconnected"
    }}
  }},
  "incompatibilities": [
    {{
      "concept1": "WebSocketDisconnect exception raised",
      "concept2": "websocket.close() called",
      "reason": "Exception indicates connection already closed; close() requires active connection",
      "error_result": "RuntimeError: Cannot close already-closed connection"
    }}
  ],
  "learned_principles": [
    "Exception names describe state changes that already occurred",
    "Methods with preconditions fail if precondition violated by prior state change",
    "Exception handlers should NOT undo the state change that the exception represents"
  ]
}}
```

Learn from SEMANTICS, not memorization.
"""
        
        response = await self.ai_client.generate_content_async(
            prompt=prompt,
            temperature=0.3,
            max_tokens=2500
        )
        
        # Parse and cache learned semantics
        import json
        try:
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                semantics = json.loads(json_match.group(1))
                self.learned_semantics[framework_name] = semantics
                logger.info(f"📚 Learned {len(semantics.get('concepts', {}))} concepts for {framework_name}")
                return semantics
        except Exception as e:
            logger.error(f"Failed to learn semantics: {e}")
        
        return {'framework': framework_name, 'concepts': {}, 'learned_principles': []}
    
    def _format_error_context(self, context: ReasoningContext) -> str:
        """Format error context for learning."""
        return f"""
Error: {context.error_type}: {context.error_message}
Stack Trace: {context.stack_trace or 'N/A'}
"""
