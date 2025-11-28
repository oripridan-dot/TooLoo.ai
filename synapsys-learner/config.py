import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """
    Configuration for the Synapsys Learner module.
    """
    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

    # Scraper Settings
    USER_AGENT = os.getenv(
        "USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    # Vector Store Settings
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200
    DB_PATH = os.path.join(os.path.dirname(__file__), "data", "chroma_db")

    # Model Settings
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"
    LLM_MODEL = "claude-3-5-haiku-20241022"

    @staticmethod
    def validate():
        """
        Validates that necessary configuration is present.
        """
        if not Config.ANTHROPIC_API_KEY:
            raise ValueError(
                "ANTHROPIC_API_KEY is not set in environment variables.")
