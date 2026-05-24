from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routes.auth import get_current_user
from services.ai_service import generate_text, is_emergency, parse_json_response

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []
    provider: str | None = "openrouter"


class QuickAssessmentRequest(BaseModel):
    symptoms: list[str]
    patient_age: int | None = None
    provider: str | None = "openrouter"


@router.post("/chat")
async def chat(payload: ChatRequest, user=Depends(get_current_user)):
    text = payload.message
    emergency_detected = is_emergency(text)

    # Build conversation context for the AI
    history_context = ""
    if payload.conversation_history:
        history_lines = []
        for msg in payload.conversation_history[-8:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_lines.append(f"{role.capitalize()}: {content}")
        history_context = "\n".join(history_lines)

    user_prompt = f"""
{"⚠️ EMERGENCY: The user is reporting potential emergency symptoms! Respond with urgency and advise calling 108 immediately." if emergency_detected else ""}

Previous conversation:
{history_context}

Patient message: {text}

Please provide a helpful, empathetic response."""

    try:
        reply, provider_used = await generate_text(
            system_prompt_key="chatbot",
            user_prompt=user_prompt,
            temperature=0.4,
            preferred_provider=payload.provider,
        )
    except Exception as e:
        reply = (
            "The AI service is currently unavailable. Please try again later. "
            "If you are experiencing a medical emergency, please call 108 immediately."
        )
        provider_used = "none"

    return {"reply": reply, "provider_used": provider_used, "is_emergency": emergency_detected}


@router.post("/quick-assessment")
async def quick_assessment(payload: QuickAssessmentRequest, user=Depends(get_current_user)):
    symptoms_list = ", ".join(payload.symptoms)
    age_info = f"Patient age: {payload.patient_age}" if payload.patient_age else "Age not provided"

    user_prompt = f"""
Symptoms reported: {symptoms_list}
{age_info}

Please provide a quick triage assessment including possible conditions, recommended department, urgency level, and advice."""

    try:
        result, provider_used = await parse_json_response(
            system_prompt_key="quick_assessment",
            user_prompt=user_prompt,
            preferred_provider=payload.provider,
        )
        return {
            "possible_conditions": result.get("possible_conditions", ["Unable to assess"]),
            "recommended_department": result.get("recommended_department", "General Medicine"),
            "urgency_level": result.get("urgency_level", "medium"),
            "advice": result.get("advice", "Consult a doctor for proper diagnosis."),
            "provider_used": provider_used,
        }
    except Exception as e:
        return {
            "possible_conditions": ["Unable to assess - AI service unavailable"],
            "recommended_department": "General Medicine",
            "urgency_level": "medium",
            "advice": f"Symptoms reviewed: {symptoms_list}. Please consult a doctor for proper diagnosis.",
            "provider_used": "none",
        }
