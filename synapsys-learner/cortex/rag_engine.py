from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from memory.vector_store import KnowledgeBase
from config import Config
import logging

logger = logging.getLogger(__name__)


class RAGBrain:
    """
    The reasoning engine that connects retrieval with generation.
    """

    def __init__(self, knowledge_base: KnowledgeBase):
        self.knowledge_base = knowledge_base
        self.llm = ChatAnthropic(
            model=Config.LLM_MODEL,
            temperature=0,
            api_key=Config.ANTHROPIC_API_KEY
        )

        # Define the RAG prompt
        self.prompt = ChatPromptTemplate.from_template("""
        You are an intelligent assistant for the Synapsys architecture.
        Answer the question based ONLY on the following context. 
        If the answer is not in the context, say "I don't have enough information in my knowledge base to answer that."
        
        Context:
        {context}
        
        Question: 
        {question}
        """)

    def query_knowledge(self, query: str) -> str:
        """
        Retrieves context and generates an answer.

        Args:
            query (str): The user's question.

        Returns:
            str: The generated answer.
        """
        # 1. Retrieve relevant documents
        docs = self.knowledge_base.search(query)

        if not docs:
            return "I couldn't find any relevant information in my knowledge base."

        # 2. Format context
        context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])

        # 3. Generate response
        chain = self.prompt | self.llm | StrOutputParser()

        try:
            response = chain.invoke({
                "context": context_text,
                "question": query
            })
            return response
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return f"Error generating response: {str(e)}"
