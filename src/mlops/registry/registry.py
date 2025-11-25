import os
import json
import shutil
import sqlite3
from typing import Optional, Dict, Any, List
from datetime import datetime

class ModelRegistry:
    def __init__(self, registry_path: Optional[str] = None):
        self.registry_path = registry_path or os.getenv("TOOLOO_MODEL_REGISTRY", "./model_registry")
        os.makedirs(self.registry_path, exist_ok=True)
        self.db_path = os.path.join(self.registry_path, "registry.db")
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        # Create models table
        c.execute('''CREATE TABLE IF NOT EXISTS models
                     (name TEXT PRIMARY KEY, description TEXT, created_at TEXT)''')
        # Create versions table
        c.execute('''CREATE TABLE IF NOT EXISTS versions
                     (model_name TEXT, version TEXT, path TEXT, timestamp TEXT, metadata TEXT,
                      PRIMARY KEY (model_name, version),
                      FOREIGN KEY (model_name) REFERENCES models (name))''')
        conn.commit()
        conn.close()

    def register_model(self, model_name: str, model_path: str, version: str, metadata: Dict[str, Any] = None):
        """
        Register a model version.
        """
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()

        # Ensure model exists
        c.execute("INSERT OR IGNORE INTO models (name, created_at) VALUES (?, ?)", 
                  (model_name, datetime.now().isoformat()))
        
        # Create version directory
        version_dir = os.path.join(self.registry_path, model_name, version)
        os.makedirs(version_dir, exist_ok=True)
        
        # Copy model artifacts
        if os.path.isdir(model_path):
            shutil.copytree(model_path, os.path.join(version_dir, "artifacts"), dirs_exist_ok=True)
        else:
            shutil.copy2(model_path, os.path.join(version_dir, "artifacts"))

        # Insert version
        try:
            c.execute("INSERT INTO versions (model_name, version, path, timestamp, metadata) VALUES (?, ?, ?, ?, ?)",
                      (model_name, version, version_dir, datetime.now().isoformat(), json.dumps(metadata or {})))
            conn.commit()
            print(f"Model {model_name} version {version} registered successfully.")
        except sqlite3.IntegrityError:
            print(f"Error: Model {model_name} version {version} already exists.")
        finally:
            conn.close()

    def get_model(self, model_name: str, version: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve model metadata.
        """
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT version, path, timestamp, metadata FROM versions WHERE model_name=? AND version=?", (model_name, version))
        row = c.fetchone()
        conn.close()

        if row:
            return {
                "model_name": model_name,
                "version": row[0],
                "path": row[1],
                "timestamp": row[2],
                "metadata": json.loads(row[3])
            }
        return None

    def list_models(self) -> List[str]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT name FROM models")
        models = [row[0] for row in c.fetchall()]
        conn.close()
        return models
