from typing import List, Dict, Any, Optional
import os
import json
import sqlite3
import numpy as np

class VectorDBConnector:
    def __init__(self, provider: str = "local", config: Optional[Dict[str, Any]] = None):
        self.provider = provider
        self.config = config or {}
        self.client = self._initialize_client()

    def _initialize_client(self):
        if self.provider == "pinecone":
            try:
                from pinecone import Pinecone
                api_key = self.config.get("api_key") or os.getenv("PINECONE_API_KEY")
                if not api_key:
                    print("Warning: PINECONE_API_KEY not found. Using simulation.")
                    return "pinecone_simulated"
                return Pinecone(api_key=api_key)
            except ImportError:
                print("Pinecone library not installed. Using simulation.")
                return "pinecone_simulated"
        
        elif self.provider == "weaviate":
            try:
                import weaviate
                url = self.config.get("url")
                api_key = self.config.get("api_key")
                if not url:
                    print("Warning: Weaviate URL not provided. Using simulation.")
                    return "weaviate_simulated"
                return weaviate.Client(url=url, auth_client_secret=weaviate.AuthApiKey(api_key=api_key) if api_key else None)
            except ImportError:
                print("Weaviate library not installed. Using simulation.")
                return "weaviate_simulated"
        
        else:
            # Local SQLite + Numpy implementation
            db_path = self.config.get("db_path", "./vectordb.sqlite")
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute('''CREATE TABLE IF NOT EXISTS vectors
                         (collection TEXT, id TEXT, vector BLOB, metadata TEXT,
                          PRIMARY KEY (collection, id))''')
            conn.commit()
            return conn

    def upsert(self, collection_name: str, vectors: List[Dict[str, Any]]):
        """
        Upsert vectors into the database.
        vectors: List of dicts with 'id', 'values', 'metadata'
        """
        if self.provider == "local":
            c = self.client.cursor()
            for vec in vectors:
                vector_blob = np.array(vec['values'], dtype=np.float32).tobytes()
                metadata_json = json.dumps(vec.get('metadata', {}))
                c.execute("INSERT OR REPLACE INTO vectors (collection, id, vector, metadata) VALUES (?, ?, ?, ?)",
                          (collection_name, vec['id'], vector_blob, metadata_json))
            self.client.commit()
            print(f"Upserted {len(vectors)} vectors locally.")
            return True
        
        elif self.provider == "pinecone" and self.client != "pinecone_simulated":
            index = self.client.Index(collection_name)
            index.upsert(vectors=[(v['id'], v['values'], v.get('metadata')) for v in vectors])
            return True

        print(f"Upserting {len(vectors)} vectors into collection '{collection_name}' using {self.provider} (simulated)")
        return True

    def query(self, collection_name: str, vector: List[float], top_k: int = 5):
        """
        Query the database for similar vectors.
        """
        if self.provider == "local":
            c = self.client.cursor()
            c.execute("SELECT id, vector, metadata FROM vectors WHERE collection=?", (collection_name,))
            rows = c.fetchall()
            
            query_vec = np.array(vector, dtype=np.float32)
            results = []
            
            for row in rows:
                vec_id = row[0]
                vec_blob = row[1]
                metadata = json.loads(row[2])
                
                db_vec = np.frombuffer(vec_blob, dtype=np.float32)
                
                # Cosine similarity
                score = np.dot(query_vec, db_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(db_vec))
                results.append({"id": vec_id, "score": float(score), "metadata": metadata})
            
            # Sort by score descending
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[:top_k]

        elif self.provider == "pinecone" and self.client != "pinecone_simulated":
            index = self.client.Index(collection_name)
            return index.query(vector=vector, top_k=top_k, include_metadata=True)

        print(f"Querying collection '{collection_name}' with top_k={top_k} using {self.provider} (simulated)")
        return [{"id": "simulated_match", "score": 0.95, "metadata": {"text": "Simulated result"}}]
