import asyncio
import io
import wave
import json
import os
import tempfile
import subprocess
from pathlib import Path
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

app = FastAPI()

# Serve the built Vite frontend from /static
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    # Serve other static files (classifier.wasm, etc.)
    for f in STATIC_DIR.iterdir():
        if f.is_file() and f.name != "index.html":
            pass  # handled by the catch-all mount below

# Global models
whisperx_model = None
vosk_model = None

# Initialize WhisperX
try:
    import whisperx
    device = "cpu" # Defaulting to CPU for Mac compatibility, change to "mps" if preferred and working
    compute_type = "int8"
    print("Loading WhisperX model (this may take a moment)...")
    whisperx_model = whisperx.load_model("base", device, compute_type=compute_type)
    print("WhisperX loaded successfully.")
except Exception as e:
    print(f"Failed to load WhisperX: {e}")

# Initialize Vosk
try:
    from vosk import Model, KaldiRecognizer
    print("Loading Vosk fallback model...")
    vosk_model = Model(lang="en-us")
    print("Vosk loaded successfully.")
except Exception as e:
    print(f"Failed to load Vosk: {e}. (Ensure vosk model is downloaded if needed)")

@app.websocket("/ws/speech")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected to speech websocket")
    
    audio_buffer = bytearray()
    
    try:
        while True:
            message = await websocket.receive()
            
            if message.get("type") == "websocket.disconnect":
                print("Client disconnected")
                break
                
            if message.get("text") == "END_OF_SPEECH":
                print(f"Received END_OF_SPEECH. Total bytes: {len(audio_buffer)}")
                if len(audio_buffer) == 0:
                    await websocket.send_text(json.dumps({"text": "", "engine": "none"}))
                    continue
                    
                # Save received WebM/Opus data to temp file
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_webm:
                    tmp_webm.write(audio_buffer)
                    webm_filename = tmp_webm.name

                wav_filename = webm_filename + ".wav"

                # Convert WebM to 16kHz PCM WAV for processing
                subprocess.run([
                    "ffmpeg", "-y", "-i", webm_filename, 
                    "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav_filename
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                text_result = ""
                engine_used = "none"

                # 1. Try WhisperX
                if whisperx_model is not None:
                    try:
                        print("Processing with WhisperX...")
                        audio = whisperx.load_audio(wav_filename)
                        result = whisperx_model.transcribe(audio, batch_size=4)
                        text_result = " ".join([seg['text'] for seg in result['segments']]).strip()
                        engine_used = "whisperx"
                    except Exception as e:
                        print(f"WhisperX error: {e}")
                
                # 2. Fallback to Vosk
                if engine_used == "none" and vosk_model is not None:
                    try:
                        print("Processing with Vosk fallback...")
                        rec = KaldiRecognizer(vosk_model, 16000)
                        with wave.open(wav_filename, "rb") as wf:
                            while True:
                                chunk = wf.readframes(4000)
                                if len(chunk) == 0:
                                    break
                                rec.AcceptWaveform(chunk)
                        
                        res = json.loads(rec.FinalResult())
                        text_result = res.get("text", "")
                        engine_used = "vosk"
                    except Exception as e:
                        print(f"Vosk error: {e}")

                # Cleanup temps
                try:
                    os.remove(webm_filename)
                    os.remove(wav_filename)
                except:
                    pass

                audio_buffer = bytearray() # reset buffer

                print(f"Transcription: {text_result} (via {engine_used})")
                await websocket.send_text(json.dumps({
                    "text": text_result,
                    "engine": engine_used
                }))
                
            elif message.get("bytes"):
                audio_buffer.extend(message["bytes"])
                
    except Exception as e:
        print(f"WebSocket closed or error: {e}")

# Serve frontend static files (must be after all API/WebSocket routes)
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
