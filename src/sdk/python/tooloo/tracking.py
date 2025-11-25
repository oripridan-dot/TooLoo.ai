import mlflow
import os
from typing import Optional, Dict, Any

class ToolooTracker:
    def __init__(self, experiment_name: str, tracking_uri: Optional[str] = None):
        """
        Initialize the Tooloo Experiment Tracker.
        
        Args:
            experiment_name: Name of the experiment to track.
            tracking_uri: URI for the MLflow tracking server. Defaults to local ./mlruns
        """
        self.experiment_name = experiment_name
        self.tracking_uri = tracking_uri or os.getenv("TOOLOO_TRACKING_URI", "./mlruns")
        
        mlflow.set_tracking_uri(self.tracking_uri)
        mlflow.set_experiment(self.experiment_name)
        
    def start_run(self, run_name: Optional[str] = None):
        """Start a new tracking run."""
        return mlflow.start_run(run_name=run_name)
        
    def log_params(self, params: Dict[str, Any]):
        """Log parameters to the current run."""
        mlflow.log_params(params)
        
    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None):
        """Log metrics to the current run."""
        mlflow.log_metrics(metrics, step=step)
        
    def log_artifact(self, local_path: str, artifact_path: Optional[str] = None):
        """Log a local file or directory as an artifact."""
        mlflow.log_artifact(local_path, artifact_path)
        
    def autolog(self):
        """Enable automatic logging for supported frameworks."""
        mlflow.autolog()

    def end_run(self):
        """End the current run."""
        mlflow.end_run()
