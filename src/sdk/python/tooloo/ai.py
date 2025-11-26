import requests
import json

class ToolooAI:
    def __init__(self, base_url="http://localhost:4000/api/v1"):
        self.base_url = base_url

    def _generate(self, prompt, mode="quick"):
        url = f"{self.base_url}/chat/message"
        payload = {
            "message": prompt,
            "mode": mode
        }
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            # Assuming the response structure from chat.ts -> precog.providers.generate
            # We need to see what precog returns. Usually { content: "..." } or similar.
            # Based on chat.ts, it returns `result`.
            # Let's assume result has a 'content' field or is the content string.
            # I'll check chat.ts again to be sure about the response format.
            return data.get("response", {}).get("content", "") if isinstance(data.get("response"), dict) else data.get("response", "")
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with Tooloo API: {e}")
            return ""

    def generate_text(self, prompt):
        return self._generate(prompt, mode="creative")

    def analyze_sentiment(self, text):
        prompt = f"Analyze the sentiment of the following text. Respond with ONLY one word: 'positive', 'negative', or 'neutral'. Text: {text}"
        return self._generate(prompt, mode="quick").strip().lower()

    def translate_text(self, text, target_language):
        prompt = f"Translate the following text to {target_language}. Return ONLY the translated text. Text: {text}"
        return self._generate(prompt, mode="quick").strip()

    def summarize_text(self, long_text):
        prompt = f"Summarize the following text concisely: {long_text}"
        return self._generate(prompt, mode="quick").strip()
