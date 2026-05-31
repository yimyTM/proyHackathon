import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./trazaalimento.db")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
API_KEY: str = os.getenv("API_KEY", "dev-key-change-me")
DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
