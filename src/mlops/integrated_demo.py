from tooloo import ToolooTracker
from src.mlops.registry import ModelRegistry
from src.mlops.vectordb import VectorDBConnector
import os
import json

def main():
    print("--- Starting Integrated MLOps Workflow ---")

    # 1. Experiment Tracking
    print("\n[1] Running Experiment...")
    tracker = ToolooTracker(experiment_name="integrated-demo")
    with tracker.start_run(run_name="run-integration-01"):
        tracker.log_params({"model_type": "transformer", "embedding_dim": 768})
        tracker.log_metrics({"accuracy": 0.92, "latency_ms": 45})
        
        # Create a dummy model artifact
        os.makedirs("temp_model", exist_ok=True)
        with open("temp_model/model.bin", "w") as f:
            f.write("dummy model content")
        
        tracker.log_artifact("temp_model")
        print("Experiment logged.")

    # 2. Model Registry
    print("\n[2] Registering Model...")
    registry = ModelRegistry()
    registry.register_model(
        model_name="demo-transformer",
        model_path="temp_model",
        version="v1.0.0",
        metadata={"accuracy": 0.92, "author": "tooloo-ai"}
    )

    # 3. Vector DB Interaction
    print("\n[3] Vector Database Operation...")
    # Use local provider for real persistence demo
    vdb = VectorDBConnector(provider="local", config={"db_path": "./demo_vectordb.sqlite"})
    
    # Simulate embeddings
    vectors = [
        {"id": "vec1", "values": [0.1, 0.2, 0.3], "metadata": {"text": "hello world"}},
        {"id": "vec2", "values": [0.4, 0.5, 0.6], "metadata": {"text": "tooloo ai"}}
    ]
    vdb.upsert("demo-collection", vectors)
    
    results = vdb.query("demo-collection", [0.1, 0.2, 0.3])
    print(f"Query Results: {json.dumps(results, indent=2)}")

    print("\n--- Workflow Complete ---")

if __name__ == "__main__":
    main()
