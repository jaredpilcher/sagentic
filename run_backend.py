#!/usr/bin/env python3
import subprocess
import sys

if __name__ == "__main__":
    subprocess.run([
        "uvicorn",
        "src.api.server:app",
        "--host", "localhost",
        "--port", "3000"
    ])
