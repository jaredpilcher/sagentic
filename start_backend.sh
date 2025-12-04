#!/bin/bash
cd /home/runner/workspace
exec uvicorn src.api.server:app --host localhost --port 3000
