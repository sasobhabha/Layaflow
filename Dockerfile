# ---- Stage 1: Build the Vite frontend ----
FROM node:20-slim AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html styles.css app.js postcss.config.js ./
COPY public/ ./public/
COPY wasm/ ./wasm/
RUN npm run build

# ---- Stage 2: Python backend + serve frontend ----
FROM python:3.11-slim

# Install system dependencies (ffmpeg for audio conversion)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/server.py .

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist ./static

EXPOSE 7860

ENV PORT=7860

CMD uvicorn server:app --host 0.0.0.0 --port $PORT
