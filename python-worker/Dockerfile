# Use Python 3.11 slim for smaller image size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including git, ffmpeg for audio processing
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (excluding sensitive files via .dockerignore)
COPY . .

# Create non-root user
RUN useradd -m -u 1000 worker

# Set up git configuration for the worker user
USER worker
RUN git config --global user.email "worker@gittldr.app" && \
    git config --global user.name "GitTLDR Worker" && \
    git config --global init.defaultBranch main

# Start the worker (no health check for background worker)
CMD ["python", "worker.py"]
