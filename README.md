# MedAI — Intelligent Hospital Ecosystem

Final Year B.Tech Project

## Installation and Setup

### 1. Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+
- Git

### 2. Clone Repository

```bash
git clone https://github.com/RishuBurnwal/Med-Ai.git
cd Med-Ai
```

### 3. Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Create environment file:

```bash
copy .env.example .env
```

If `copy` does not work (macOS/Linux), use:

```bash
cp .env.example .env
```

Update `backend/.env` with your values. Minimum required for local development:

```env
DATABASE_URL=sqlite:///./hospital_ai.db
SECRET_KEY=change_this_to_a_long_random_secret
DEFAULT_AI_PROVIDER=groq
```

Optional AI keys (feature-dependent):

```env
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
NVIDIA_API_KEY=
```

Seed initial data (creates admin and sample records):

```bash
python seed.py
```

### 4. Frontend Setup (Admin Portal)

```bash
cd ../frontend
npm install
```

### 5. Frontend Setup (Patient Portal)

```bash
cd patient-portal
npm install
cd ..
```

### 6. Run the Project

Option A: Start everything from project root (recommended)

```bash
python main.py
```

This starts:
- Backend API on `8000`
- Admin portal on `5173`
- Patient portal on `5174`

Option B: Start services manually

Backend (Terminal 1):

```bash
cd backend
python main.py
```

Admin portal (Terminal 2):

```bash
cd frontend
npm run dev
```

Patient portal (Terminal 3):

```bash
cd frontend/patient-portal
npm run dev -- --port 5174
```

### 7. Verify Installation

- Backend health: `http://localhost:8000/api/health`
- API docs: `http://localhost:8000/docs`
- Admin portal: `http://localhost:5173`
- Patient portal: `http://localhost:5174`

### 8. Default Login

- Email: `admin@hospital.com`
- Password: `Admin@123`

## Quick Start

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python seed.py
cd ..
cd frontend && npm install && cd patient-portal && npm install && cd .. && cd ..
python main.py
```

macOS/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed.py
cd ..
cd frontend && npm install && cd patient-portal && npm install && cd .. && cd ..
python main.py
```

## Configuration

The backend reads `DATABASE_URL`, `SECRET_KEY`, AI provider keys, and CORS origins from `backend/.env`.
Use a SQLite URL such as:

```text
DATABASE_URL=sqlite:///./hospital_ai.db
```

## AI Providers

| Provider | URL | Usage |
|----------|-----|-------|
| Groq | https://console.groq.com/keys | LLaMA 3.1 — Chatbot, Clinical |
| Gemini | https://aistudio.google.com/app/apikey | Vision — Report Analysis |
| OpenRouter | https://openrouter.ai/keys | Mistral 7B — Fallback |
| NVIDIA NIM | https://build.nvidia.com | LLaMA 3.1 — Alternative |

## Features

- Patient Management
- Appointment Scheduling
- AI Medical Chatbot
- Medical Report Analyzer
- Drug Interaction Checker
- Clinical Decision Support
- Analytics Dashboard
- Day and night UI customization with digital and analog clock controls
