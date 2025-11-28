# architecture_guide.py
# Reference logic for Synapsys RAG System

import os
from typing import List, Dict
import requests
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# 1. Configuration


class Config:
    CHROMA_PATH = "./chroma_db"
    EMBED_MODEL = "text-embedding-3-small"
    LLM_MODEL = "gpt-4-turbo"

# 2. Logic Flow


def orchestration_logic():
    """
    This is pseudocode for Copilot to understand the desired flow.
    """
    # INGESTION
    # raw_html = requests.get(target_url, headers=headers).text
    # clean_text = BeautifulSoup(raw_html).get_text()

    # CHUNKING
    # splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    # chunks = splitter.create_documents([clean_text], metadatas=[{"source": target_url}])

    # STORAGE
    # db = Chroma(persist_directory=Config.CHROMA_PATH, embedding_function=OpenAIEmbeddings())
    # db.add_documents(chunks)

    # RETRIEVAL
    # results = db.similarity_search(user_query, k=5)
    # context_text = "\n\n".join([doc.page_content for doc in results])

    # GENERATION
    # prompt = f"Context: {context_text} \n\n Question: {user_query}"
    # response = OpenAI_Client.chat.completions.create(model=Config.LLM_MODEL, messages=[...])
    pass
