import argparse
import sys
import logging
from ingestion.scraper import WebScraper
from memory.vector_store import KnowledgeBase
from cortex.rag_engine import RAGBrain
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("SynapsysLearner")


def main():
    parser = argparse.ArgumentParser(description="Synapsys Learner CLI")
    subparsers = parser.add_subparsers(
        dest="command", help="Available commands")

    # Command: learn
    learn_parser = subparsers.add_parser(
        "learn", help="Ingest knowledge from a URL")
    learn_parser.add_argument("--url", required=True,
                              help="The URL to scrape and learn from")

    # Command: ask
    ask_parser = subparsers.add_parser(
        "ask", help="Ask a question based on learned knowledge")
    ask_parser.add_argument("--query", required=True,
                            help="The question to ask")

    # Command: list
    subparsers.add_parser("list", help="List all ingested sources")

    args = parser.parse_args()

    # Validate Config
    try:
        Config.validate()
    except ValueError as e:
        logger.error(f"Configuration Error: {e}")
        sys.exit(1)

    # Initialize Components
    # Note: We initialize these lazily or globally depending on need,
    # but for CLI it's fine to init what we need.

    if args.command == "learn":
        logger.info(f"Starting ingestion for: {args.url}")

        scraper = WebScraper()
        html = scraper.fetch_url(args.url)

        if html:
            clean_text = scraper.clean_content(html)
            logger.info(
                f"Content cleaned. Size: {len(clean_text)} characters.")

            kb = KnowledgeBase()
            chunks_added = kb.add_documents(clean_text, args.url)

            print(f"\n✅ Successfully ingested {args.url}")
            print(f"📚 Added {chunks_added} chunks to the Knowledge Base.")
        else:
            logger.error("Failed to fetch content.")
            sys.exit(1)

    elif args.command == "ask":
        logger.info(f"Processing query: {args.query}")

        kb = KnowledgeBase()
        brain = RAGBrain(kb)

        response = brain.query_knowledge(args.query)

        print("\n🤖 Synapsys Answer:")
        print("-" * 40)
        print(response)
        print("-" * 40)

    elif args.command == "list":
        kb = KnowledgeBase()
        sources = kb.get_all_sources()

        if sources:
            import json
            print(json.dumps({"sources": sources}))
        else:
            print('{"sources": []}')

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
