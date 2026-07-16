# LayaFlow: Interactive Mridangam & Konnakol Rhythmic Studio

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/sasobhabha/Layaflow)

An advanced, premium-design web application that connects **Konnakol** (the South Indian oral art of vocal percussion) with the **Mridangam** (the primary percussion instrument in Carnatic music). 

The app features a **custom real-time Web Audio API synthesizer** that simulates both the physical drum strokes and the human vocalizations, and utilizes a **Speech-to-Text (STT) parsing engine** to turn spoken rhythms into written script.

---

## 🌟 Key Features

1. **Mridangam Synthesizer Engine**
   - Synthesizes the metallic ring, bass slide, and dampened thuds of the traditional Mridangam drum purely using Web Audio API nodes (oscillators, biquad filters, and noise modulators).
   - Simulates physical strokes: **Thom** (bass open), **Tha** (bass flat), **Dheem** (treble harmonic ring), **Nam** (treble rim ring), **Chapu** (treble bell stroke), and **Ka/Ki/Ta** (treble flat taps).
   - Adjusts to the exact **Sruti** (fundamental tuning frequency, e.g., C2 to D3) in real-time, recalculating the entire overtone series of the drum heads.

2. **Custom Text-to-Speech (TTS) Formant Vocalizer**
   - Uses a procedural **Glottal Formant Synthesizer** (modeling F1, F2, and F3 vocal tract filter bands) to speak syllables like *Tha*, *Ka*, *Dhi*, *Mi*, *Thom*, *Nam* in perfect sample-accurate sync with the drum.
   - Provides a fallback toggle to the browser's native **SpeechSynthesis API** with phonetic respellings for international accents.

3. **Phonetic Speech-to-Text (STT) Transcriber**
   - Integrates `webkitSpeechRecognition` to capture live microphone input.
   - Translates spoken phrases (which browsers transcribe into English homophones like "taco", "tea", "tom", "day") back into classical Konnakol syllables using a **phonetic dictionary mapping** and a **Levenshtein Distance string matching** fallback.

4. **Tala visualizer (Carnatic Time Tracker)**
   - Visualizes beats and subdivisions (Gati) based on standard Carnatic rhythm cycles (**Adi Tala**, **Rupaka Tala**, **Misra Chapu**, and **Khanda Chapu**).
   - Animates beat nodes and displays corresponding traditional hand gestures (Claps, Finger counts, and Waves).

5. **Audio Visualizers & Premium Aesthetics**
   - Live canvas oscilloscope displaying real-time audio waveform outputs.
   - Deep mahogany, gold, and vibrant saffron styling with floating background particles that react and accelerate on beats.
   - Fully interactive drumheads that scale, vibrate, and ripple on hit.

---

## 🛠️ Architecture & Files

- **`index.html`** - Responsive single-page application structure. Contains layouts for controls, interactive drumheads (Thoppi & Valai), and composition script composer.
- **`styles.css`** - Custom dark mode skin utilizing glassmorphism, responsive grid alignments, styled range controls, and CSS animations representing physical drum head vibrations.
- **`app.js`** - Modulate code logic containing:
  - `LayaAudioEngine` - Synthesizers for Mridangam overtones and formant filter vowel vocalizations.
  - `LayaSequencer` - Accurate timer loop scheduler for audio playbacks in sync with metronome clicks.
  - `LayaSpeechRecognizer` - Phonetic distance matcher resolving spoken words to Konnakol blocks.
  - `LayaVisualizers` - Waveform oscilloscope drawing and particle background simulator.
- **`package.json`** - Development server environment setting up Vite.

---

## 🚀 Running the Studio Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- Google Chrome or Microsoft Edge (recommended for Web Speech API recognition support)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open the local address in your browser:
   ```
   http://localhost:5173
   ```

4. Click **Initialize Audio Engine** and start playing!

---

## ☁️ Deployment

### One-Click Deploy (Recommended)

Click the button below to deploy both the frontend and the WhisperX/Vosk backend to **Render** in one step:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/sasobhabha/Layaflow)

This uses the [`render.yaml`](render.yaml) Blueprint to automatically provision:
- A **static site** for the Vite frontend
- A **web service** (Docker) for the Python STT backend with ffmpeg

### Manual Deploy (Cloudflare Pages + Fly.io)

See the [deployment guide](docs/DEPLOY.md) for instructions on deploying the frontend to Cloudflare Pages and the backend to Fly.io separately.

