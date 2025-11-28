#!/bin/bash
# Wrapper to run the Synapsys Learner with the correct environment

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Activate virtual environment if not already active
if [[ -z "$VIRTUAL_ENV" ]]; then
    if [[ -f "../.venv/bin/activate" ]]; then
        source "../.venv/bin/activate"
    else
        echo "Error: Virtual environment not found at ../.venv"
        exit 1
    fi
fi

# Run the CLI
python main.py "$@"
