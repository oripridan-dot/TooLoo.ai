import os
from typing import List, Dict
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from config import Config
import logging

logger = logging.getLogger(__name__)


class KnowledgeBase:
    """
    Manages the vector store for storing and retrieving knowledge chunks.
    """

    def __init__(self):
        self.embedding_function = HuggingFaceEmbeddings(
            model_name=Config.EMBEDDING_MODEL
        )

        # Ensure the DB directory exists
        os.makedirs(Config.DB_PATH, exist_ok=True)

        self.vector_store = Chroma(
            persist_directory=Config.DB_PATH,
            embedding_function=self.embedding_function
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=Config.CHUNK_SIZE,
            chunk_overlap=Config.CHUNK_OVERLAP
        )

    def add_documents(self, text_content: str, source_url: str) -> int:
        """
        Splits text into chunks and adds them to the vector store.

        Args:
            text_content (str): The clean text to add.
            source_url (str): The source URL for metadata.

        Returns:
            int: The number of chunks added.
        """
        if not text_content:
            logger.warning("No content to add.")
            return 0

        # Create Document object
        doc = Document(page_content=text_content,
                       metadata={"source": source_url})

        # Split into chunks
        chunks = self.text_splitter.split_documents([doc])

        if not chunks:
            logger.warning("No chunks created from content.")
            return 0

        logger.info(f"Adding {len(chunks)} chunks to vector store...")
        self.vector_store.add_documents(chunks)
        # Chroma persists automatically in newer versions, but explicit persist call
        # might be needed depending on version. For langchain-chroma it's auto.

        return len(chunks)

    def search(self, query: str, k: int = 5) -> List[Document]:
        """
        Searches the vector store for relevant documents.

        Args:
            query (str): The search query.
            k (int): Number of results to return.

        Returns:
            List[Document]: List of relevant documents.
        """
        logger.info(f"Searching for: {query}")
        return self.vector_store.similarity_search(query, k=k)

    def get_all_sources(self) -> List[str]:
        """
        Retrieves all unique source URLs from the vector store.
        """
        # This is a bit of a hack for Chroma, as it doesn't support distinct queries easily.
        # We fetch all metadata and filter.
        try:
            data = self.vector_store.get()
            metadatas = data.get("metadatas", [])
            sources = set()
            for m in metadatas:
                if m and "source" in m:
                    sources.add(m["source"])
            return list(sources)
        except Exception as e:
            logger.error(f"Error fetching sources: {e}")
            return []
