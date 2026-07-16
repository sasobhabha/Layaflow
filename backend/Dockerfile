FROM python:3.11-slim

# Install system dependencies (ffmpeg for audio conversion)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py .

# Expose the port Fly.io will route to
EXPOSE 8000

# Start the server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
