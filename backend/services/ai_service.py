"""
Multi-provider AI Service for MedAI Hospital Platform.

Supports:
  - Google Gemini (primary, with vision for report analysis)
  - OpenRouter (OpenAI-compatible API)
  - Groq Cloud
  - NVIDIA NIM

Fallback chain: tries each provider in order until one succeeds.
"""

import asyncio
import json
from typing import Any, Optional

try:
    import google.generativeai as genai
    _GEMINI_AVAILABLE = True
except ImportError:
    _GEMINI_AVAILABLE = False

import httpx

from config.ai_config import AI_PROVIDERS, DEFAULT_PROVIDER

# ── System prompts for each feature ──────────────────────────────────────────────────

SYSTEM_PROMPTS: dict[str, str] = {
    "chatbot": (
        "You are MedAssist, an AI medical triage assistant for a hospital platform. "
        "Your role is to provide general health information, symptom assessment guidance, "
        "and help patients understand when to seek medical care.\n\n"
        "RULES:\n"
        "- Always include a disclaimer that you are not a substitute for professional medical advice.\n"
        "- If symptoms suggest an emergency (chest pain, difficulty breathing, severe bleeding, "
        "stroke symptoms, unconsciousness), clearly flag it as EMERGENCY and advise calling 108 immediately.\n"
        "- Be empathetic, clear, and concise.\n"
        "- Respond in the same language the user writes in.\n"
        "- Do NOT diagnose conditions definitively — suggest possibilities and recommend seeing a doctor.\n"
        "- For medication-specific questions, advise consulting a doctor or pharmacist.\n"
        "- Keep responses under 300 words unless the user asks for more detail.\n\n"
        "Remember: You are NOT a doctor. Always prioritize patient safety."
    ),
    "clinical_support": (
        "You are an AI clinical decision support system designed for healthcare professionals. "
        "You assist doctors by generating differential diagnoses, suggesting investigations, "
        "and flagging red flags based on patient data.\n\n"
        "RULES:\n"
        "- Always respond with VALID JSON only. No markdown, no code blocks, no extra text.\n"
        "- Your response must be parseable by json.loads().\n"
        "- Use ICD-10 codes where appropriate.\n"
        "- Include a disclaimer that this is AI-assisted and final diagnosis must be by a qualified physician.\n"
        "- Be thorough but concise in differential diagnoses.\n"
        "- Flag any red flags or emergency indicators prominently.\n"
        "- For SOAP note summarization, structure the output as Subjective, Objective, Assessment, Plan sections.\n\n"
        "OUTPUT FORMAT for clinical-decision:\n"
        "{\n"
        '  "differential_diagnoses": [{"condition": "...", "probability": "high/medium/low", "key_supporting_symptoms": [...], "ici_code": "..."}],\n'
        '  "recommended_investigations": [...],\n'
        '  "red_flags": [...],\n'
        '  "immediate_actions": [...],\n'
        '  "suggested_specialist": "...",\n'
        '  "clinical_summary": "...",\n'
        '  "disclaimer": "This is AI-assisted decision support. Final diagnosis must be made by qualified physician."\n'
        "}\n\n"
        "OUTPUT FORMAT for SOAP summarization:\n"
        "{\n"
        '  "summary": "Full SOAP note text with Subjective, Objective, Assessment, Plan sections clearly labeled.",\n'
        '  "format": "SOAP"\n'
        "}"
    ),
    "drug_checker": (
        "You are an AI clinical pharmacist and drug interaction checker. "
        "Your role is to analyze medication lists for potential interactions and provide "
        "detailed drug information.\n\n"
        "RULES:\n"
        "- Always respond with VALID JSON only. No markdown, no code blocks, no extra text.\n"
        "- Use reputable drug interaction data. If you're unsure about a specific interaction, say so.\n"
        "- Include severity levels: major, moderate, or minor.\n"
        "- For drug info, provide accurate uses, dosage forms, side effects, and contraindications.\n"
        "- Always include a disclaimer to consult a pharmacist or doctor.\n"
        "- Consider patient age when relevant (elderly patients may have higher risk).\n\n"
        "OUTPUT FORMAT for drug-interaction:\n"
        "{\n"
        '  "interactions": [{"drug1": "...", "drug2": "...", "severity": "major/moderate/minor", "description": "...", "recommendation": "..."}],\n'
        '  "safe_combinations": [...],\n'
        '  "high_risk_alert": true/false,\n'
        '  "overall_summary": "...",\n'
        '  "disclaimer": "Always consult a pharmacist or doctor before changing medications."\n'
        "}\n\n"
        "OUTPUT FORMAT for drug-info:\n"
        "{\n"
        '  "name": "...",\n'
        '  "uses": [...],\n'
        '  "dosage_forms": [...],\n'
        '  "common_side_effects": [...],\n'
        '  "contraindications": [...],\n'
        '  "storage": "..."\n'
        "}"
    ),
    "report_analyzer": (
        "You are an AI medical report analyzer with vision capabilities. "
        "You analyze medical documents, lab reports, imaging results, and prescriptions.\n\n"
        "RULES:\n"
        "- Provide a clear, structured analysis of the medical report.\n"
        "- For blood tests: flag abnormal values, suggest possible implications.\n"
        "- For imaging: describe visible findings, note limitations.\n"
        "- For prescriptions: verify medication names, dosages, check for errors.\n"
        "- Always include a disclaimer that this is AI-assisted and requires clinician verification.\n"
        "- Do NOT make definitive diagnoses — describe what you see and suggest possibilities.\n"
        "- Keep analysis thorough but readable (under 500 words).\n"
        "- Respond in plain text (not JSON) suitable for display to medical staff.\n\n"            "Remember: You are a decision support tool, not a replacement for qualified medical professionals."
    ),
    "quick_assessment": (
        "You are a medical triage AI that provides quick symptom assessments. "
        "Your role is to rapidly assess symptoms and suggest possible conditions, "
        "the recommended hospital department, urgency level, and advice.\n\n"
        "RULES:\n"
        "- Always respond with VALID JSON only. No markdown, no code blocks, no extra text.\n"
        "- Your response must be parseable by json.loads().\n"
        "- Be conservative - if unsure, recommend seeing a doctor.\n"
        "- For emergency symptoms, flag 'emergency' urgency.\n"
        "- Consider patient age in your assessment.\n\n"
        "OUTPUT FORMAT:\n"
        "{\n"
        '  "possible_conditions": ["Condition 1", "Condition 2"],\n'
        '  "recommended_department": "Department name",\n'
        '  "urgency_level": "low/medium/high/emergency",\n'
        '  "advice": "Clear advice for the patient"\n'
        "}"
    ),
}

# ── Provider names ──────────────────────────────────────────────────────────────────

GEMINI = "gemini"
OPENROUTER = "openrouter"
GROQ = "groq"
NVIDIA = "nvidia"

# ── Model names per provider ────────────────────────────────────────────────────────

MODELS: dict[str, str] = {
    GEMINI: "gemini-2.0-flash",
    OPENROUTER: "openai/gpt-4o-mini",
    GROQ: "llama-3.3-70b-versatile",
    NVIDIA: "meta/llama-3.1-70b-instruct",
}


# ── Emergency detection keywords ───────────────────────────────────────────────────

EMERGENCY_KEYWORDS = [
    "chest pain", "cannot breathe", "difficulty breathing", "shortness of breath",
    "stroke", "unconscious", "unresponsive", "severe bleeding", "heart attack",
    "not breathing", "choking", "seizure", "head injury", "poisoning",
    "suicide", "overdose", "severe burn", "electric shock", "drowning",
]


def is_emergency(text: str) -> bool:
    """Check if user message contains emergency keywords."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in EMERGENCY_KEYWORDS)


# ── Provider call implementations ──────────────────────────────────────────────────


async def call_gemini(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    image_bytes: Optional[bytes] = None,
    image_mime: Optional[str] = None,
    temperature: float = 0.3,
) -> str:
    """Call Google Gemini API."""
    if not _GEMINI_AVAILABLE:
        raise ValueError("google.generativeai package not installed")

    api_key = AI_PROVIDERS.get(GEMINI, "")
    if not api_key:
        raise ValueError("Gemini API key not configured")

    import google.generativeai as genai_local
    genai_local.configure(api_key=api_key)

    model = genai_local.GenerativeModel(
        MODELS[GEMINI],
        system_instruction=system_prompt,
        generation_config=genai_local.types.GenerationConfig(
            temperature=temperature,
            top_p=0.95,
            top_k=40,
            max_output_tokens=2048,
            response_mime_type="application/json" if json_mode else "text/plain",
        ),
    )

    # Build content parts
    parts = [user_prompt]
    if image_bytes:
        import PIL.Image
        import io
        image = PIL.Image.open(io.BytesIO(image_bytes))
        parts.append(image)

    # Run in executor since google-generativeai is synchronous
    loop = asyncio.get_event_loop()

    def _generate():
        response = model.generate_content(parts)
        return response.text

    text = await loop.run_in_executor(None, _generate)
    return text


async def call_openrouter(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    image_bytes: Optional[bytes] = None,
    image_mime: Optional[str] = None,
    temperature: float = 0.3,
) -> str:
    """Call OpenRouter API (OpenAI-compatible)."""
    api_key = AI_PROVIDERS.get(OPENROUTER, "")
    if not api_key:
        raise ValueError("OpenRouter API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body: dict[str, Any] = {
        "model": MODELS[OPENROUTER],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": 2048,
    }

    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def call_groq(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    image_bytes: Optional[bytes] = None,
    image_mime: Optional[str] = None,
    temperature: float = 0.3,
) -> str:
    """Call Groq Cloud API."""
    api_key = AI_PROVIDERS.get(GROQ, "")
    if not api_key:
        raise ValueError("Groq API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body: dict[str, Any] = {
        "model": MODELS[GROQ],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": 2048,
    }

    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def call_nvidia(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    image_bytes: Optional[bytes] = None,
    image_mime: Optional[str] = None,
    temperature: float = 0.3,
) -> str:
    """Call NVIDIA NIM API."""
    api_key = AI_PROVIDERS.get(NVIDIA, "")
    if not api_key:
        raise ValueError("NVIDIA API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body: dict[str, Any] = {
        "model": MODELS[NVIDIA],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ── Provider registry (ordered by priority, only configured ones) ──────────────────

def _get_providers():
    """Return list of (name, callable) for configured providers."""
    providers = []
    if AI_PROVIDERS.get(GEMINI):
        providers.append((GEMINI, call_gemini))
    if AI_PROVIDERS.get(OPENROUTER):
        providers.append((OPENROUTER, call_openrouter))
    if AI_PROVIDERS.get(GROQ):
        providers.append((GROQ, call_groq))
    if AI_PROVIDERS.get(NVIDIA):
        providers.append((NVIDIA, call_nvidia))
    return providers


# ── High-level API functions ────────────────────────────────────────────────────────


async def generate_text(
    system_prompt_key: str,
    user_prompt: str,
    json_mode: bool = False,
    image_bytes: Optional[bytes] = None,
    image_mime: Optional[str] = None,
    temperature: float = 0.3,
    preferred_provider: Optional[str] = None,
) -> tuple[str, str]:
    """
    Generate text using available AI providers with fallback.

    Returns:
        (response_text, provider_used)

    Raises:
        RuntimeError: if all providers fail.
    """
    system_prompt = SYSTEM_PROMPTS.get(system_prompt_key, "")
    providers = _get_providers()

    if not providers:
        raise RuntimeError("No AI providers configured. Set at least GEMINI_API_KEY in .env")

    # If a preferred provider is specified and configured, try it first
    if preferred_provider:
        preferred = [(n, fn) for n, fn in providers if n == preferred_provider]
        if preferred:
            providers = preferred + [(n, fn) for n, fn in providers if n != preferred_provider]

    errors = []
    for provider_name, provider_fn in providers:
        try:
            text = await provider_fn(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                json_mode=json_mode,
                image_bytes=image_bytes,
                image_mime=image_mime,
                temperature=temperature,
            )
            return text, provider_name
        except Exception as e:
            errors.append(f"{provider_name}: {type(e).__name__}: {e}")
            continue

    error_msg = "All AI providers failed:\n" + "\n".join(errors)
    raise RuntimeError(error_msg)


async def parse_json_response(
    system_prompt_key: str,
    user_prompt: str,
    preferred_provider: Optional[str] = None,
) -> tuple[dict, str]:
    """
    Generate a JSON response from AI.

    Returns:
        (parsed_dict, provider_used)
    """
    text, provider = await generate_text(
        system_prompt_key=system_prompt_key,
        user_prompt=user_prompt,
        json_mode=True,
        preferred_provider=preferred_provider,
    )

    # Clean up potential markdown wrapping
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        parsed = json.loads(text)
        return parsed, provider
    except json.JSONDecodeError:
        # If JSON parsing fails, try to extract JSON from the text
        import re
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                return parsed, provider
            except json.JSONDecodeError:
                pass
        raise ValueError(f"AI response was not valid JSON. Response: {text[:500]}")
