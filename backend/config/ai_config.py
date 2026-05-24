import os

from dotenv import load_dotenv

load_dotenv()


AI_PROVIDERS = {
    "gemini": os.getenv("GEMINI_API_KEY", ""),
    "groq": os.getenv("GROQ_API_KEY", ""),
    "openrouter": os.getenv("OPENROUTER_API_KEY", ""),
    "nvidia": os.getenv("NVIDIA_API_KEY", ""),
}

DEFAULT_PROVIDER = os.getenv("DEFAULT_AI_PROVIDER", "groq")
