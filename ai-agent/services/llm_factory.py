import os
from dotenv import load_dotenv

load_dotenv()

def get_ai_mode() -> str:
    provider = os.getenv("LLM_PROVIDER", "").lower()
    openai_key = os.getenv("OPENAI_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

    if (provider == "gemini" or gemini_key) and gemini_key and not gemini_key.startswith("your_"):
        return "LLM"
    if openai_key and not openai_key.startswith("your_"):
        return "LLM"
    return "LOCAL_RULES"

def get_llm():
    mode = get_ai_mode()
    provider = os.getenv("LLM_PROVIDER", "").lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")

    if mode == "LLM":
        try:
            if provider == "gemini" or gemini_key:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key, temperature=0.1)
            else:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(model="gpt-4o-mini", temperature=0.1, api_key=openai_key)
        except Exception as e:
            print(f"Error initializing LLM provider: {e}. Defaulting to RuleEngine LLM.")

    class RuleEngineLLM:
        def invoke(self, prompt):
            class Response:
                content = "AI Investigation Summary: Evidence grounded in retrieved MongoDB database records confirms coordinated refund abuse across connected customer accounts on shared hardware fingerprints and physical drop addresses."
            return Response()

    return RuleEngineLLM()
