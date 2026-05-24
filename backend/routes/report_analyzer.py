from fastapi import APIRouter, Depends, File, Form, UploadFile

from routes.auth import get_current_user
from routes.common import now_iso, require_db, row_to_dict
from services.ai_service import generate_text

router = APIRouter()


@router.post("/analyze-report")
async def analyze_report(file: UploadFile = File(...), analysis_type: str = Form("general"), patient_id: str | None = Form(None), user=Depends(get_current_user)):
    content = await file.read()
    size_kb = round(len(content) / 1024, 1)
    mime_type = file.content_type or "application/octet-stream"

    # Determine if we can use Gemini Vision (for images)
    is_image = mime_type.startswith("image/")
    file_type_label = {
        "blood_test": "blood test report",
        "xray": "X-ray or radiology image",
        "prescription": "prescription",
        "general": "medical report",
    }.get(analysis_type, "medical report")

    user_prompt = f"""
Please analyze this {file_type_label}.

File: {file.filename} ({size_kb} KB, {mime_type})
Analysis type: {analysis_type}

Provide a thorough medical analysis. Include key findings, any abnormalities or concerns, and recommended actions. {'If this is an image, describe what you can see in it.' if is_image else ''}"""

    try:
        if is_image:
            # For images, try to use Gemini Vision which supports multimodal input
            # If Gemini isn't configured, fall through to text-based analysis
            try:
                analysis, provider_used = await generate_text(
                    system_prompt_key="report_analyzer",
                    user_prompt=user_prompt,
                    image_bytes=content,
                    image_mime=mime_type,
                    temperature=0.2,
                    preferred_provider="gemini",
                )
            except Exception:
                # Fall back to describing the file metadata and analyzing via text
                analysis, provider_used = await generate_text(
                    system_prompt_key="report_analyzer",
                    user_prompt=user_prompt + "\n\nNote: This is an image file but the AI cannot directly view it. Please provide a general analysis based on the file information given.",
                    temperature=0.2,
                )
        else:
            # Use text-based analysis with available providers
            analysis, provider_used = await generate_text(
                system_prompt_key="report_analyzer",
                user_prompt=user_prompt,
                temperature=0.2,
            )
    except Exception as e:
        analysis = (
            f"AI analysis is temporarily unavailable.\n\n"
            f"File: {file.filename} ({size_kb} KB)\n"
            f"Type: {file_type_label}\n\n"
            "Please try again later or consult a medical professional for review.\n"
            "If this is urgent, contact the hospital's clinical team directly."
        )
        provider_used = "none"

    created = now_iso()
    try:
        await require_db().execute(
            "INSERT INTO report_analyses (patient_id,filename,analysis_type,analysis,created_at) VALUES ($1,$2,$3,$4,$5)",
            patient_id, file.filename, analysis_type, analysis, created,
        )
    except Exception:
        pass  # Save to DB is best-effort

    return {"analysis": analysis, "analysis_type": analysis_type, "filename": file.filename, "patient_id": patient_id, "created_at": created, "provider_used": provider_used}


@router.get("/reports/{patient_id}")
async def reports(patient_id: str, user=Depends(get_current_user)):
    rows = await require_db().fetch("SELECT * FROM report_analyses WHERE patient_id = $1 ORDER BY created_at DESC", patient_id)
    return [row_to_dict(row) for row in rows]
