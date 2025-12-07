#!/bin/bash
# backend on port 3000
uvicorn src.api.server:app --host 0.0.0.0 --port 3000 &

# frontend preview usually on 5000
cd frontend
vite preview --host 0.0.0.0 --port 5000 --strictPort
