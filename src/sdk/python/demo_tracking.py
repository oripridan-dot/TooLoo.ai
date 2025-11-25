from tooloo import ToolooTracker
import random
import time

def train_model():
    # Initialize tracker
    tracker = ToolooTracker(experiment_name="demo-experiment")
    
    print("Starting training run...")
    with tracker.start_run(run_name="training-v1") as run:
        # Log parameters
        params = {
            "learning_rate": 0.01,
            "batch_size": 32,
            "epochs": 10
        }
        tracker.log_params(params)
        print(f"Logged params: {params}")
        
        # Simulate training loop
        for epoch in range(10):
            # Simulate metrics
            loss = 1.0 / (epoch + 1) + random.random() * 0.1
            accuracy = 0.1 * (epoch + 1) + random.random() * 0.05
            
            metrics = {
                "loss": loss,
                "accuracy": accuracy
            }
            tracker.log_metrics(metrics, step=epoch)
            print(f"Epoch {epoch}: loss={loss:.4f}, accuracy={accuracy:.4f}")
            time.sleep(0.1)
            
        print("Training complete.")

if __name__ == "__main__":
    train_model()
