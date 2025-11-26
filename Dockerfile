# Stage 1: Build Frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY src/ ./src/
COPY seed_data.py .

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./static

# Environment variables
ENV PYTHONPATH=/app
ENV PORT=3000

# Expose port
EXPOSE 3000

# Command to run
CMD ["uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "3000"]
