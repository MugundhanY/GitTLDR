"""
API endpoint for handling issue clarification questions and answers
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import json

from services.database_service import database_service
from services.redis_client import redis_client
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class ClarificationAnswer(BaseModel):
    question: str
    answer: str


class SubmitClarificationRequest(BaseModel):
    issue_fix_id: str
    answers: List[ClarificationAnswer]


@router.post("/submit-clarification")
async def submit_clarification(request: SubmitClarificationRequest):
    """
    Submit clarification answers and restart the fix process
    
    User provides answers to clarifying questions, which are added to the
    issue context and the fix is retried.
    """
    try:
        # 1. Get issue fix record
        issue_fix = await database_service.get_issue_fix(request.issue_fix_id)
        
        if not issue_fix:
            raise HTTPException(status_code=404, detail="Issue fix not found")
        
        if issue_fix['status'] != 'NEEDS_CLARIFICATION':
            raise HTTPException(
                status_code=400,
                detail=f"Issue fix is not awaiting clarification (current status: {issue_fix['status']})"
            )
        
        # 2. Get existing analysis with clarifying questions
        analysis = issue_fix.get('analysis', {})
        clarifying_questions = analysis.get('clarifying_questions', [])
        
        if not clarifying_questions:
            raise HTTPException(
                status_code=400,
                detail="No clarifying questions found for this issue fix"
            )
        
        # 3. Validate that all questions are answered
        answered_questions = {ans.question for ans in request.answers}
        missing_questions = set(clarifying_questions) - answered_questions
        
        if missing_questions:
            raise HTTPException(
                status_code=400,
                detail=f"Not all questions answered. Missing: {list(missing_questions)}"
            )
        
        # 4. Format answers as additional context
        clarification_context = "\\n\\n=== USER CLARIFICATION ===\\n"
        for i, answer in enumerate(request.answers, 1):
            clarification_context += f"\\nQ{i}: {answer.question}\\n"
            clarification_context += f"A{i}: {answer.answer}\\n"
        clarification_context += "\\n========================\\n"
        
        # 5. Update issue body with clarification context
        updated_issue_body = (issue_fix.get('issue_body', '') + clarification_context)
        
        # 6. Reset status, clear error message, and update issue body with clarifications
        await database_service.update_issue_fix(
            issue_fix_id=request.issue_fix_id,
            status='PENDING',
            error_message=None,
            issue_body=updated_issue_body,
            analysis={
                **analysis,
                'clarification_provided': True,
                'clarification_answers': [ans.dict() for ans in request.answers]
            }
        )
        
        # 7. Re-queue the task with updated context
        task_data = {
            'type': 'issue_fix',
            'jobId': f"issue_fix_{request.issue_fix_id}_{int(__import__('time').time() * 1000)}",
            'issue_fix_id': request.issue_fix_id,
            'repository_id': issue_fix['repository_id'],
            'user_id': issue_fix['user_id'],
            'issue_number': issue_fix['issue_number'],
            'issue_title': issue_fix['issue_title'],
            'issue_body': updated_issue_body,  # Updated with clarifications
            'issue_url': issue_fix.get('issue_url', ''),
            'retry_with_clarification': True
        }
        
        await redis_client.push_task(task_data)
        
        logger.info(f"✅ Clarification submitted, task re-queued: {request.issue_fix_id}")
        
        return {
            'success': True,
            'message': 'Clarification answers submitted successfully. Fix generation restarted.',
            'issue_fix_id': request.issue_fix_id,
            'status': 'PENDING'
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting clarification: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit clarification: {str(e)}"
        )


@router.get("/clarification-questions/{issue_fix_id}")
async def get_clarification_questions(issue_fix_id: str):
    """
    Get clarifying questions for an issue fix
    
    Returns the list of questions that need to be answered
    """
    try:
        # Get issue fix record
        issue_fix = await database_service.get_issue_fix(issue_fix_id)
        
        if not issue_fix:
            raise HTTPException(status_code=404, detail="Issue fix not found")
        
        # Get clarifying questions from analysis
        analysis = issue_fix.get('analysis', {})
        clarifying_questions = analysis.get('clarifying_questions', [])
        ambiguities = analysis.get('ambiguities', [])
        confidence = issue_fix.get('confidence', 0.0)
        
        return {
            'issue_fix_id': issue_fix_id,
            'status': issue_fix['status'],
            'confidence': confidence,
            'clarifying_questions': clarifying_questions,
            'ambiguities': ambiguities,
            'needs_clarification': issue_fix['status'] == 'NEEDS_CLARIFICATION'
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting clarification questions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get clarification questions: {str(e)}"
        )
