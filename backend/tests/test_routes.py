"""
API integration tests for all AI routes.
Tests endpoint response structure, validates real AI responses (not demo/hardcoded data).
Requires the backend server to be running on localhost:8000.
"""

import sys
from pathlib import Path

import httpx
import pytest

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_URL = "http://localhost:8000/api"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing.
    This is a module-level fixture so it runs once per test module.
    """
    import httpx
    resp = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@hospital.com", "password": "Admin@123"},
        timeout=30,
    )
    if resp.status_code != 200:
        pytest.skip("Cannot login - is the server running?")
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}"}


# ── Chatbot Tests ────────────────────────────────────────────────────────────────────


class TestChatbot:
    @pytest.mark.asyncio
    async def test_chat_returns_reply(self, headers):
        """Chat endpoint should return a real AI reply."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/chat",
                json={"message": "I have a mild headache and fever for 2 days", "provider": "openrouter"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "reply" in data
            assert len(data["reply"]) > 50  # Real AI reply should be substantive
            assert "provider_used" in data
            assert data["provider_used"] in ("openrouter", "groq")
            assert "is_emergency" in data

    @pytest.mark.asyncio
    async def test_chat_groq(self, headers):
        """Chat with Groq provider should work."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/chat",
                json={"message": "I have a mild headache", "provider": "groq"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data.get("reply", "")) > 50
            # Could be groq or openrouter (fallback)
            assert data["provider_used"] in ("groq", "openrouter")

    @pytest.mark.asyncio
    async def test_chat_emergency_detection(self, headers):
        """Emergency keywords should set is_emergency=True."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/chat",
                json={"message": "I have chest pain and cannot breathe"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["is_emergency"] is True

    @pytest.mark.asyncio
    async def test_chat_non_emergency(self, headers):
        """Non-emergency should set is_emergency=False."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/chat",
                json={"message": "I have a mild headache"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["is_emergency"] is False


# ── Quick Assessment Tests ───────────────────────────────────────────────────────────


class TestQuickAssessment:
    @pytest.mark.asyncio
    async def test_quick_assessment_structure(self, headers):
        """Quick assessment should return structured data with real AI content."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/quick-assessment",
                json={"symptoms": ["Fever", "Cough", "Fatigue"], "patient_age": 30, "provider": "openrouter"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "possible_conditions" in data
            assert len(data["possible_conditions"]) > 0
            assert "recommended_department" in data
            assert "urgency_level" in data
            assert data["urgency_level"] in ("low", "medium", "high", "emergency")
            assert "advice" in data

    @pytest.mark.asyncio
    async def test_quick_assessment_groq(self, headers):
        """Quick assessment with Groq should work."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/quick-assessment",
                json={"symptoms": ["Headache"], "patient_age": 25, "provider": "groq"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data.get("possible_conditions", [])) > 0


# ── Clinical Decision Tests ──────────────────────────────────────────────────────────


class TestClinicalDecision:
    @pytest.mark.asyncio
    async def test_clinical_decision_structure(self, headers):
        """Clinical decision should return full assessment with real AI content."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/clinical-decision",
                json={
                    "patient_symptoms": ["Fever 102F", "Headache", "Neck stiffness"],
                    "patient_age": 45,
                    "patient_gender": "male",
                    "vitals": {"bp": "130/85", "pulse": 98, "spo2": 97, "temperature": 102.5},
                    "provider": "openrouter",
                },
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "differential_diagnoses" in data
            assert len(data["differential_diagnoses"]) > 0
            assert "recommended_investigations" in data
            assert len(data["recommended_investigations"]) > 0
            assert "red_flags" in data
            assert "immediate_actions" in data
            assert "suggested_specialist" in data
            assert "disclaimer" in data

    @pytest.mark.asyncio
    async def test_clinical_decision_groq(self, headers):
        """Clinical decision with Groq should work."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/clinical-decision",
                json={
                    "patient_symptoms": ["Fever", "Cough"],
                    "patient_age": 30,
                    "patient_gender": "female",
                    "vitals": {"bp": "120/80", "pulse": 80, "spo2": 99, "temperature": 100.5},
                    "provider": "groq",
                },
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data.get("differential_diagnoses", [])) > 0

    @pytest.mark.asyncio
    async def test_clinical_decision_simple_vitals(self, headers):
        """Should work with minimal vitals."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/clinical-decision",
                json={
                    "patient_symptoms": ["Headache"],
                    "patient_age": 25,
                    "patient_gender": "male",
                    "vitals": {},
                    "provider": "openrouter",
                },
                headers=headers,
            )
            assert resp.status_code == 200


# ── SOAP Summarization Tests ─────────────────────────────────────────────────────────


class TestSoapSummarization:
    @pytest.mark.asyncio
    async def test_soap_returns_summary(self, headers):
        """SOAP endpoint should return a formatted summary."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/summarize-notes",
                json={
                    "clinical_notes": "45-year-old male with fever and cough for 3 days. BP 120/80, pulse 80. Lungs clear on auscultation.",
                    "provider": "openrouter",
                },
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "summary" in data
            summary = data["summary"]
            assert len(str(summary)) > 50
            assert "format" in data

    @pytest.mark.asyncio
    async def test_soap_groq(self, headers):
        """SOAP with Groq should work."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/summarize-notes",
                json={
                    "clinical_notes": "Patient with headache for 2 days. No other symptoms.",
                    "provider": "groq",
                },
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(str(data.get("summary", ""))) > 50


# ── Drug Interaction Tests ───────────────────────────────────────────────────────────


class TestDrugInteraction:
    @pytest.mark.asyncio
    async def test_drug_interaction_structure(self, headers):
        """Drug interaction should return structured data with real AI content."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-interaction",
                json={
                    "drugs": ["Aspirin", "Warfarin", "Ibuprofen"],
                    "patient_age": 65,
                    "provider": "openrouter",
                },
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "interactions" in data
            assert len(data["interactions"]) > 0  # Should detect Aspirin+Warfarin interaction
            assert "high_risk_alert" in data
            assert "overall_summary" in data
            assert "disclaimer" in data

    @pytest.mark.asyncio
    async def test_drug_interaction_groq(self, headers):
        """Drug interaction with Groq should work."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-interaction",
                json={"drugs": ["Metformin", "Lisinopril"], "patient_age": 50, "provider": "groq"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "interactions" in data
            assert "overall_summary" in data

    @pytest.mark.asyncio
    async def test_drug_interaction_no_duplicates(self, headers):
        """Should handle duplicate drugs gracefully."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-interaction",
                json={"drugs": ["Aspirin", "Aspirin"], "provider": "openrouter"},
                headers=headers,
            )
            assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_drug_interaction_single_drug(self, headers):
        """Should handle single drug (no interactions to check)."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-interaction",
                json={"drugs": ["Metformin"], "provider": "openrouter"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            # No interactions expected with single drug
            assert "interactions" in data


# ── Drug Info Tests ──────────────────────────────────────────────────────────────────


class TestDrugInfo:
    @pytest.mark.asyncio
    async def test_drug_info_structure(self, headers):
        """Drug info should return detailed medication information."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-info",
                json={"drug_name": "Metformin", "provider": "openrouter"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "name" in data
            assert data["name"].lower() == "metformin"
            assert "uses" in data
            assert len(data["uses"]) > 0
            assert "dosage_forms" in data
            assert "common_side_effects" in data
            assert len(data["common_side_effects"]) > 0
            assert "contraindications" in data
            assert "storage" in data

    @pytest.mark.asyncio
    async def test_drug_info_groq(self, headers):
        """Drug info with Groq should work."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-info",
                json={"drug_name": "Atorvastatin", "provider": "groq"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data.get("uses", [])) > 0

    @pytest.mark.asyncio
    async def test_drug_info_unknown_drug(self, headers):
        """Should handle unknown drug names."""
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{BASE_URL}/ai/drug-info",
                json={"drug_name": "Xyz123nonexistent", "provider": "openrouter"},
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "name" in data


# ── Report Analyzer Tests ────────────────────────────────────────────────────────────


class TestReportAnalyzer:
    @pytest.mark.asyncio
    async def test_analyze_report_general(self, headers):
        """Report analyzer should analyze text reports."""
        async with httpx.AsyncClient(timeout=90) as client:
            # Create a simple text file as a mock medical report
            files = {"file": ("report.txt", b"Patient: John Doe\nHb: 14.5 g/dL\nWBC: 11000\nPlatelets: 250000", "text/plain")}
            data = {"analysis_type": "general", "provider": "openrouter"}
            resp = await client.post(
                f"{BASE_URL}/ai/analyze-report",
                files=files,
                data=data,
                headers=headers,
            )
            assert resp.status_code == 200
            result = resp.json()
            assert "analysis" in result
            assert len(result["analysis"]) > 50
            assert "analysis_type" in result
            assert result["analysis_type"] == "general"

    @pytest.mark.asyncio
    async def test_analyze_report_blood_test(self, headers):
        """Should analyze blood test reports."""
        async with httpx.AsyncClient(timeout=90) as client:
            files = {"file": ("blood_test.txt", b"Hb: 10.2 (Low)\nWBC: 15000 (High)\nPlatelets: 150000 (Normal)", "text/plain")}
            data = {"analysis_type": "blood_test", "provider": "openrouter"}
            resp = await client.post(
                f"{BASE_URL}/ai/analyze-report",
                files=files,
                data=data,
                headers=headers,
            )
            assert resp.status_code == 200
            result = resp.json()
            assert len(result.get("analysis", "")) > 50

    @pytest.mark.asyncio
    async def test_analyze_report_prescription(self, headers):
        """Should analyze prescriptions."""
        async with httpx.AsyncClient(timeout=90) as client:
            files = {"file": ("prescription.txt", b"Metformin 500mg twice daily\nAtorvastatin 10mg once daily", "text/plain")}
            data = {"analysis_type": "prescription", "provider": "openrouter"}
            resp = await client.post(
                f"{BASE_URL}/ai/analyze-report",
                files=files,
                data=data,
                headers=headers,
            )
            assert resp.status_code == 200
            result = resp.json()
            assert len(result.get("analysis", "")) > 50
