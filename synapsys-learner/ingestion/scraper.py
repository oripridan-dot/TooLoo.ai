import requests
from bs4 import BeautifulSoup
import logging
from typing import Optional
from config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebScraper:
    """
    Handles fetching and cleaning of web content.
    """

    def __init__(self):
        self.headers = {
            "User-Agent": Config.USER_AGENT
        }

    def fetch_url(self, url: str) -> Optional[str]:
        """
        Fetches the raw HTML content from a URL.

        Args:
            url (str): The URL to fetch.

        Returns:
            Optional[str]: The raw HTML content, or None if the request failed.
        """
        try:
            logger.info(f"Fetching URL: {url}")
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

    def clean_content(self, html_content: str) -> str:
        """
        Cleans raw HTML content to extract meaningful text.
        Removes scripts, styles, and extra whitespace.

        Args:
            html_content (str): The raw HTML string.

        Returns:
            str: The cleaned text content.
        """
        if not html_content:
            return ""

        soup = BeautifulSoup(html_content, 'html.parser')

        # Remove script and style elements
        for script_or_style in soup(["script", "style", "header", "footer", "nav"]):
            script_or_style.decompose()

        # Get text
        text = soup.get_text()

        # Break into lines and remove leading/trailing space on each
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip()
                  for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)

        return text
