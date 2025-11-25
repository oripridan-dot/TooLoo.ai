import sys
import platform

def check_environment():
    print(f"Python Version: {sys.version}")
    print(f"Platform: {platform.platform()}")
    
    try:
        import mlflow
        print(f"MLflow Version: {mlflow.__version__}")
    except ImportError:
        print("MLflow not installed")

    try:
        import torch
        print(f"PyTorch Version: {torch.__version__}")
    except ImportError:
        print("PyTorch not installed")

    try:
        import tensorflow as tf
        print(f"TensorFlow Version: {tf.__version__}")
    except ImportError:
        print("TensorFlow not installed")

if __name__ == "__main__":
    check_environment()
