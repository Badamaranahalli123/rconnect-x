from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.school import Homework
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.services.question_generator import question_generator

router = APIRouter(prefix="/schools/ai", tags=["schools-ai"])


class QuestionRequest(BaseModel):
    content: str
    num_questions: Optional[int] = 5
    grade_level: Optional[str] = "middle school"
    subject: Optional[str] = "general"


class QuestionResponse(BaseModel):
    success: bool
    questions: List[dict]
    total: int
    error: Optional[str] = None


@router.post("/generate-questions")
async def generate_questions(
    request: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate questions from content using AI - for teachers"""
    
    # Check if user is a teacher or admin
    if current_user.platform_role != "SUPER_ADMIN" and current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can generate questions")
    
    result = await question_generator.generate_questions(
        content=request.content,
        num_questions=request.num_questions,
        grade_level=request.grade_level,
        subject=request.subject
    )
    
    return result


@router.post("/homework/{homework_id}/questions")
async def generate_homework_questions(
    homework_id: str,
    num_questions: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate questions for a specific homework"""
    
    # Get homework
    result = await db.execute(
        select(Homework).where(Homework.id == homework_id)
    )
    homework = result.scalar_one_or_none()
    
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")
    
    # Check permission: teacher who created it, school admin, or super admin
    if homework.teacher_id != current_user.id and current_user.platform_role != "SUPER_ADMIN":
        # Check if user is school admin
        from app.models.school import School
        school_result = await db.execute(
            select(School).where(School.admin_id == current_user.id)
        )
        school = school_result.scalar_one_or_none()
        if not school:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Combine title and description for content
    content = f"{homework.title}\n\n{homework.description}"
    
    # Add any attachments text if available
    if homework.attachments:
        content += f"\n\nAttachments: {', '.join(homework.attachments)}"
    
    questions = await question_generator.generate_questions(
        content=content,
        num_questions=num_questions,
        grade_level="middle school"
    )
    
    return questions


@router.post("/classroom/{classroom_id}/generate-questions")
async def generate_questions_for_classroom(
    classroom_id: str,
    request: QuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate questions for a classroom - can be used for live teaching"""
    
    # Verify classroom exists
    from app.models.school import Classroom
    result = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id)
    )
    classroom = result.scalar_one_or_none()
    
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check permission
    if classroom.teacher_id != current_user.id and current_user.platform_role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Add classroom context
    context = f"Classroom: {classroom.name} (Grade: {classroom.grade or 'N/A'})\n\n"
    context += f"Subject: {request.subject or 'General'}\n\n"
    context += f"Content to create questions from:\n{request.content}"
    
    questions = await question_generator.generate_questions(
        content=context,
        num_questions=request.num_questions,
        grade_level=classroom.grade or "middle school",
        subject=request.subject
    )
    
    return questions
