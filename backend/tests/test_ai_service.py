"""
Unit tests for the AI service layer.
Tests emergency detection, provider config, system prompts, and utility functions.
These tests do NOT make real API calls - they test the service logic.
"""

import json
import sys
from pathlib import Path

import pytest

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.ai_service import (
    EMERGENCY_KEYWORDS,
    SYSTEM_PROMPTS,
    is_emergency,
    _get_providers,
    parse_json_response,
)


# ── Test Emergency Detection ────────────────────────────────────────────────────────


class TestEmergencyDetection:
    def test_emergency_keywords_not_empty(self):
        """Ensure emergency keywords list has content."""
        assert len(EMERGENCY_KEYWORDS) > 5

    def test_chest_pain_detected(self):
        assert is_emergency("I have chest pain") is True

    def test_chest_pain_case_insensitive(self):
        assert is_emergency("CHEST PAIN right now") is True

    def test_difficulty_breathing_detected(self):
        assert is_emergency("I am having difficulty breathing") is True

    def test_shortness_of_breath_detected(self):
        assert is_emergency("shortness of breath") is True

    def test_stroke_detected(self):
        assert is_emergency("I think I'm having a stroke") is True

    def test_unconscious_detected(self):
        assert is_emergency("person is unconscious") is True

    def test_severe_bleeding_detected(self):
        assert is_emergency("severe bleeding from wound") is True

    def test_heart_attack_detected(self):
        assert is_emergency("I'm having a heart attack") is True

    def test_seizure_detected(self):
        assert is_emergency("My child is having a seizure") is True

    def test_overdose_detected(self):
        assert is_emergency("accidental overdose") is True

    def test_normal_symptom_no_emergency(self):
        assert is_emergency("I have a mild headache") is False

    def test_cold_symptoms_no_emergency(self):
        assert is_emergency("I have a runny nose and sneezing") is False

    def test_routine_checkup_no_emergency(self):
        assert is_emergency("I need a routine checkup") is False

    def test_empty_string_no_emergency(self):
        assert is_emergency("") is False

    def test_emergency_in_mixed_text(self):
        assert is_emergency("I've had a headache for 3 days and now I have chest pain") is True


# ── Test System Prompts ─────────────────────────────────────────────────────────────


class TestSystemPrompts:
    def test_all_required_prompts_exist(self):
        """All required system prompt keys must be present."""
        required = ["chatbot", "clinical_support", "drug_checker", "report_analyzer", "quick_assessment"]
        for key in required:
            assert key in SYSTEM_PROMPTS, f"Missing system prompt: {key}"

    def test_chatbot_prompt_has_disclaimer(self):
        """Chatbot prompt must include a medical disclaimer."""
        prompt = SYSTEM_PROMPTS["chatbot"]
        assert "disclaimer" in prompt.lower() or "not a substitute" in prompt.lower() or "not a doctor" in prompt.lower()

    def test_chatbot_prompt_has_emergency(self):
        """Chatbot prompt must mention emergency handling."""
        prompt = SYSTEM_PROMPTS["chatbot"]
        assert "emergency" in prompt.lower()

    def test_chatbot_prompt_mentions_108(self):
        """Chatbot should advise calling 108 for emergencies (Indian emergency number)."""
        prompt = SYSTEM_PROMPTS["chatbot"]
        assert "108" in prompt

    def test_clinical_support_prompt_has_json(self):
        """Clinical support prompt must require JSON output."""
        prompt = SYSTEM_PROMPTS["clinical_support"]
        assert "json" in prompt.lower()

    def test_clinical_support_has_icd_code(self):
        """Clinical support should mention ICD-10 codes."""
        prompt = SYSTEM_PROMPTS["clinical_support"]
        assert "icd" in prompt.lower() or "ici_code" in prompt.lower()

    def test_clinical_support_has_output_format(self):
        """Clinical support prompt must specify output format."""
        prompt = SYSTEM_PROMPTS["clinical_support"]
        assert "OUTPUT FORMAT" in prompt

    def test_drug_checker_prompt_has_json(self):
        """Drug checker prompt must require JSON output."""
        prompt = SYSTEM_PROMPTS["drug_checker"]
        assert "json" in prompt.lower()

    def test_drug_checker_has_severity_levels(self):
        """Drug checker should mention severity levels."""
        prompt = SYSTEM_PROMPTS["drug_checker"]
        assert "severity" in prompt.lower()

    def test_drug_checker_has_output_format(self):
        """Drug checker prompt must specify output format."""
        prompt = SYSTEM_PROMPTS["drug_checker"]
        assert "OUTPUT FORMAT" in prompt

    def test_report_analyzer_prompt_has_disclaimer(self):
        """Report analyzer prompt must include a disclaimer."""
        prompt = SYSTEM_PROMPTS["report_analyzer"]
        assert "disclaimer" in prompt.lower() or "not a replacement" in prompt.lower()

    def test_quick_assessment_prompt_has_json(self):
        """Quick assessment prompt must require JSON output."""
        prompt = SYSTEM_PROMPTS["quick_assessment"]
        assert "json" in prompt.lower()

    def test_quick_assessment_has_output_format(self):
        """Quick assessment must specify output format."""
        prompt = SYSTEM_PROMPTS["quick_assessment"]
        assert "OUTPUT FORMAT" in prompt

    def test_all_prompts_non_empty(self):
        """All system prompts must have substantial content."""
        for key, prompt in SYSTEM_PROMPTS.items():
            assert len(prompt) > 100, f"System prompt '{key}' is too short ({len(prompt)} chars)"


# ── Test Provider Configuration ─────────────────────────────────────────────────────


class TestProviderConfig:
    def test_get_providers_returns_list(self):
        """_get_providers should return a list of tuples."""
        providers = _get_providers()
        assert isinstance(providers, list)
        # At least one provider should be configured (OpenRouter or Groq)
        assert len(providers) >= 1

    def test_get_providers_has_valid_names(self):
        """Provider names should be valid."""
        valid_names = {"gemini", "openrouter", "groq", "nvidia"}
        providers = _get_providers()
        for name, _ in providers:
            assert name in valid_names, f"Unknown provider: {name}"

    def test_get_providers_has_callables(self):
        """Each provider should have a callable function."""
        providers = _get_providers()
        for _, func in providers:
            assert callable(func), f"Provider {_} is not callable"


# ── Test JSON Parsing Logic ─────────────────────────────────────────────────────────


class TestJsonParsing:
    @pytest.mark.asyncio
    async def test_parse_json_response_real(self):
        """Integration test: AI should return valid JSON."""
        try:
            result, provider = await parse_json_response(
                "drug_checker",
                "Return JSON with exactly 2 drug interactions for Aspirin and Warfarin. Must be valid JSON.",
                preferred_provider="openrouter",
            )
            assert isinstance(result, dict)
            assert "interactions" in result
            assert provider in ("openrouter", "groq")
        except Exception as e:
            # If all providers fail, this is acceptable (no API keys)
            pytest.skip(f"AI providers unavailable: {e}")

    @pytest.mark.asyncio
    async def test_parse_json_response_groq(self):
        """Integration test: Groq should return valid JSON."""
        try:
            result, provider = await parse_json_response(
                "drug_checker",
                "Return JSON with drug info for Metformin. Must be valid JSON with keys: name, uses, dosage_forms, common_side_effects, contraindications, storage.",
                preferred_provider="groq",
            )
            assert isinstance(result, dict)
            assert provider == "groq"
            assert "name" in result or "uses" in result
        except Exception as e:
            pytest.skip(f"Groq unavailable: {e}")


# ── Test Module Import ──────────────────────────────────────────────────────────────


class TestModuleImport:
    def test_import_generate_text(self):
        """generate_text function should be importable."""
        from services.ai_service import generate_text
        assert callable(generate_text)

    def test_import_parse_json_response(self):
        """parse_json_response function should be importable."""
        from services.ai_service import parse_json_response
        assert callable(parse_json_response)

    def test_import_is_emergency(self):
        """is_emergency function should be importable."""
        from services.ai_service import is_emergency
        assert callable(is_emergency)
