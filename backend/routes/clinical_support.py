from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routes.auth import get_current_user
from services.ai_service import generate_text, parse_json_response

router = APIRouter()


class ClinicalRequest(BaseModel):
    patient_symptoms: list[str]
    patient_age: int
    patient_gender: str
    vitals: dict
    medical_history: list[str] = []
    current_medications: list[str] = []
    provider: str | None = "openrouter"


class NotesRequest(BaseModel):
    clinical_notes: str
    provider: str | None = "openrouter"


@router.post("/clinical-decision")
async def clinical(payload: ClinicalRequest, user=Depends(get_current_user)):
    symptoms_text = ", ".join(payload.patient_symptoms)
    history_text = ", ".join(payload.medical_history) if payload.medical_history else "None reported"
    meds_text = ", ".join(payload.current_medications) if payload.current_medications else "None"
    vitals_text = (
        f"BP: {payload.vitals.get('bp', 'N/A')}, "
        f"Pulse: {payload.vitals.get('pulse', 'N/A')}, "
        f"SpO2: {payload.vitals.get('spo2', 'N/A')}, "
        f"Temp: {payload.vitals.get('temperature', 'N/A')}"
    )

    user_prompt = f"""
Patient Demographics:
- Age: {payload.patient_age}
- Gender: {payload.patient_gender}
- Symptoms: {symptoms_text}
- Vitals: {vitals_text}
- Medical History: {history_text}
- Current Medications: {meds_text}

Please provide a comprehensive clinical decision support assessment with differential diagnoses, recommended investigations, red flags, immediate actions, and suggested specialist."""

    try:
        result, provider_used = await parse_json_response(
            system_prompt_key="clinical_support",
            user_prompt=user_prompt,
            preferred_provider=payload.provider,
        )
        return {
            "differential_diagnoses": result.get("differential_diagnoses", []),
            "recommended_investigations": result.get("recommended_investigations", []),
            "red_flags": result.get("red_flags", []),
            "immediate_actions": result.get("immediate_actions", []),
            "suggested_specialist": result.get("suggested_specialist", "General Medicine"),
            "clinical_summary": result.get("clinical_summary", "AI-assisted differential generated."),
            "disclaimer": result.get("disclaimer", "This is AI-assisted decision support. Final diagnosis must be made by qualified physician."),
        }
    except Exception as e:
        return {
            "differential_diagnoses": [{
                "condition": "Unable to generate - AI service unavailable",
                "probability": "low",
                "key_supporting_symptoms": payload.patient_symptoms[:3],
                "ici_code": "Z03.9",
            }],
            "recommended_investigations": ["CBC", "CRP", "Basic metabolic panel"],
            "red_flags": ["Unable to assess via AI - please review manually"],
            "immediate_actions": ["Clinical assessment by attending physician required"],
            "suggested_specialist": "General Medicine",
            "clinical_summary": "AI service temporarily unavailable. Manual clinical assessment required.",
            "disclaimer": "This is AI-assisted decision support. Final diagnosis must be made by qualified physician.",
        }


@router.post("/summarize-notes")
async def summarize(payload: NotesRequest, user=Depends(get_current_user)):
    user_prompt = f"""
Please convert the following clinical notes into a SOAP (Subjective, Objective, Assessment, Plan) format summary:

{payload.clinical_notes}"""

    try:
        result, provider_used = await parse_json_response(
            system_prompt_key="clinical_support",
            user_prompt=user_prompt,
            preferred_provider=payload.provider,
        )
        summary = result.get("summary", payload.clinical_notes[:300])
        # If the AI returned a nested dict for summary, convert it to a formatted string
        if isinstance(summary, dict):
            sections = []
            for key in ["Subjective", "Objective", "Assessment", "Plan"]:
                val = summary.get(key, "")
                if val:
                    sections.append(f"{key}:\n{val}")
            if sections:
                summary = "\n\n".join(sections)
            else:
                summary = str(summary)
        return {"summary": summary, "format": result.get("format", "SOAP"), "provider_used": provider_used}
    except Exception as e:
        # Fallback: use generate_text in case JSON mode fails
        try:
            text, provider_used = await generate_text(
                system_prompt_key="clinical_support",
                user_prompt=f"Convert these notes to SOAP format:\n\n{payload.clinical_notes}",
                temperature=0.3,
                preferred_provider=payload.provider,
            )
            return {"summary": text, "format": "SOAP", "provider_used": provider_used}
        except Exception:
            return {
                "summary": f"Subjective: {payload.clinical_notes[:200]}\n\nObjective: Review clinical findings.\n\nAssessment: Clinical impression needs physician confirmation.\n\nPlan: Further evaluation and follow-up as indicated.",
                "format": "SOAP",
                "provider_used": "none",
            }