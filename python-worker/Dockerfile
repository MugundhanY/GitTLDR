# Use Python 3.11 slim for smaller image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
# Use lightweight requirements for Render free tier (512MB limit)
COPY requirements-light.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port (API server runs on PORT env var, defaults to 8001)
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8001}/health || exit 1

# Run both API server and background worker
# Now lightweight: uses AssemblyAI for transcription, Gemini for embeddings
CMD ["python", "main.py"]
