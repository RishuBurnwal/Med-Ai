from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routes.auth import get_current_user
from services.ai_service import parse_json_response

router = APIRouter()


class InteractionRequest(BaseModel):
    drugs: list[str]
    patient_age: int | None = None
    provider: str | None = "openrouter"


class DrugInfoRequest(BaseModel):
    drug_name: str
    provider: str | None = "openrouter"


@router.post("/drug-interaction")
async def interaction(payload: InteractionRequest, user=Depends(get_current_user)):
    drugs_list = ", ".join(payload.drugs)
    age_info = f"Patient age: {payload.patient_age}" if payload.patient_age else "Age not provided"

    user_prompt = f"""
Medications to check: {drugs_list}
{age_info}

Please analyze these medications for potential drug-drug interactions. List any interactions found with severity levels (major/moderate/minor), safe combinations, and an overall summary."""

    try:
        result, provider_used = await parse_json_response(
            system_prompt_key="drug_checker",
            user_prompt=user_prompt,
            preferred_provider=payload.provider,
        )
        return {
            "interactions": result.get("interactions", []),
            "safe_combinations": result.get("safe_combinations", []),
            "high_risk_alert": result.get("high_risk_alert", False),
            "overall_summary": result.get("overall_summary", "No interactions analyzed."),
            "disclaimer": result.get("disclaimer", "Always consult a pharmacist or doctor before changing medications."),
        }
    except Exception as e:
        return {
            "interactions": [],
            "safe_combinations": [f"{a} + {b}" for i, a in enumerate(payload.drugs) for b in payload.drugs[i+1:]],
            "high_risk_alert": False,
            "overall_summary": "AI service temporarily unavailable. Please consult a pharmacist for interaction checking.",
            "disclaimer": "Always consult a pharmacist or doctor before changing medications.",
        }


@router.post("/drug-info")
async def drug_info(payload: DrugInfoRequest, user=Depends(get_current_user)):
    drug_name = payload.drug_name.strip()

    user_prompt = f"""
Please provide detailed information about the medication: {drug_name}

Include: uses, dosage forms, common side effects, contraindications, and storage instructions."""

    try:
        result, provider_used = await parse_json_response(
            system_prompt_key="drug_checker",
            user_prompt=user_prompt,
            preferred_provider=payload.provider,
        )
        return {
            "name": result.get("name", drug_name),
            "uses": result.get("uses", ["Information unavailable"]),
            "dosage_forms": result.get("dosage_forms", ["Information unavailable"]),
            "common_side_effects": result.get("common_side_effects", ["Information unavailable"]),
            "contraindications": result.get("contraindications", ["Information unavailable"]),
            "storage": result.get("storage", "Store according to manufacturer's instructions."),
        }
    except Exception as e:
        return {
            "name": drug_name,
            "uses": ["AI service unavailable — please consult a pharmacist or doctor for medication information."],
            "dosage_forms": ["Information temporarily unavailable"],
            "common_side_effects": ["Information temporarily unavailable — consult a pharmacist"],
            "contraindications": ["Information temporarily unavailable — consult a doctor"],
            "storage": "Information temporarily unavailable — refer to medication packaging.",
        }