import unittest
import sys
import os

# Add the SDK path to sys.path so we can import tooloo
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src/sdk/python')))

from tooloo import ai

class TestToolooAI(unittest.TestCase):

    def setUp(self):
        self.ai = ai.ToolooAI() # Assuming ToolooAI class exists in tooloo.ai

    def test_generate_text(self):
        prompt = "Write a short poem about the moon."
        result = self.ai.generate_text(prompt)
        print(f"\n[Generate Text] Result: {result[:50]}...")
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)

    def test_analyze_sentiment(self):
        text = "This is a great day!"
        result = self.ai.analyze_sentiment(text)
        print(f"\n[Sentiment] Result: {result}")
        self.assertIsInstance(result, str) 
        # Add assertions to check sentiment value, e.g., if positive:
        self.assertIn(result.lower(), ["positive", "neutral", "negative"])

    def test_translate_text(self):
        text = "Hello world"
        target_language = "es"
        result = self.ai.translate_text(text, target_language)
        print(f"\n[Translate] Result: {result}")
        self.assertIsInstance(result, str)
        self.assertNotEqual(result, text)

    def test_summarize_text(self):
        long_text = "A very long piece of text that needs to be summarized. It should capture the main points but be significantly shorter. This text is just a placeholder for a longer text that would actually be summarized by the AI model."
        result = self.ai.summarize_text(long_text)
        print(f"\n[Summarize] Result: {result}")
        self.assertIsInstance(result, str)
        self.assertLess(len(result), len(long_text)) # Summary should be shorter

if __name__ == '__main__':
    unittest.main()
