import httpx
import json
from typing import List, Dict, Optional
from app.config.settings import settings

class QuestionGenerator:
    def __init__(self):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
    
    async def generate_questions(
        self, 
        content: str, 
        num_questions: int = 5,
        grade_level: str = "middle school",
        subject: str = "general"
    ) -> Dict:
        """
        Generate questions from given content
        """
        
        prompt = f"""
        You are a teacher creating questions for {grade_level} students.
        
        Subject: {subject}
        
        Content to analyze:
        {content[:3000]}  # Limit to 3000 chars
        
        Generate {num_questions} questions based on this content.
        Questions should test understanding, not just recall.
        
        IMPORTANT: ONLY return questions. DO NOT provide answers.
        
        Format the response as a JSON array:
        [
            {{
                "question": "Question text here",
                "type": "comprehension|critical_thinking|application|analysis",
                "difficulty": "easy|medium|hard",
                "topic": "Main topic of this question"
            }}
        ]
        
        Return ONLY the JSON array, no other text.
        """
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=self.headers,
                    json={
                        "model": "openai/gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": "You are an expert teacher who creates thoughtful questions."},
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 1000,
                        "temperature": 0.7
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    answer = data["choices"][0]["message"]["content"]
                    
                    # Parse the JSON response
                    try:
                        questions = json.loads(answer)
                        return {
                            "success": True,
                            "questions": questions,
                            "total": len(questions)
                        }
                    except json.JSONDecodeError:
                        # If not valid JSON, try to extract questions manually
                        return {
                            "success": True,
                            "questions": self._extract_questions_from_text(answer),
                            "total": num_questions
                        }
                else:
                    return {
                        "success": False,
                        "error": f"API Error: {response.status_code}",
                        "questions": []
                    }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "questions": []
            }
    
    def _extract_questions_from_text(self, text: str) -> List[Dict]:
        """Extract questions from plain text response"""
        lines = text.strip().split('\n')
        questions = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if it's a question (ends with ?)
            if '?' in line and len(line) > 10:
                # Remove number prefixes (e.g., "1.", "2.")
                import re
                cleaned = re.sub(r'^\d+[\.\)]\s*', '', line)
                
                questions.append({
                    "question": cleaned,
                    "type": "comprehension",
                    "difficulty": "medium",
                    "topic": "general"
                })
        
        return questions[:5]  # Max 5 questions

question_generator = QuestionGenerator()
