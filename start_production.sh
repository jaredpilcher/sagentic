#!/bin/bash
# Start backend on port 3000 (accessible externally on VM)
uvicorn src.api.server:app --host 0.0.0.0 --port 3000 &

# Start frontend preview server on port 5000
cd frontend
vite preview --host 0.0.0.0 --port 5000 --strictPort
