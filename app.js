// LayaFlow - Mridangam & Konnakol Studio Core Logic

// ----------------------------------------------------
// 1. Audio Engine & Synthesizers
// ----------------------------------------------------

class LayaAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.sruti = 155.56; // D#2 default
    this.voicePitch = 135.0; // Male vocal base pitch
    this.mridangamEnabled = true;
    this.ttsEnabled = true;
    this.ttsMode = 'formant'; // 'formant' or 'speech-api'
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.connect(this.ctx.destination);
  }

  setSruti(hz) {
    this.sruti = hz;
    // Map voice pitch relative to sruti (normally within comfort vocal register)
    if (hz > 200) {
      this.voicePitch = hz * 0.9; // Female voice range
    } else {
      this.voicePitch = hz * 1.1; // Male voice range
    }
  }

  // A helper to create noise buffer for percussion clicks and sibilants
  getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return this.noiseBuffer;
  }

  // ----------------------------------------------------
  // Mridangam Web Audio Synthesizer
  // ----------------------------------------------------
  playMridangam(stroke, time) {
    if (!this.mridangamEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = time || this.ctx.currentTime;
    
    switch (stroke.toLowerCase()) {
      case 'thom': // Bass open resonant
        this.synthThom(now);
        break;
      case 'tha': 
      case 'ta':
      case 'ka':
      case 'ki': // Flat tap (Saatham / Thoppi)
        this.synthKa(now);
        break;
      case 'dhi':
      case 'dheem': // Treble harmonic ringing
        this.synthDheem(now);
        break;
      case 'nam':
      case 'na': // Treble rim ring
        this.synthNam(now);
        break;
      case 'tham': // Nam + Thom combined
        this.synthNam(now);
        this.synthThom(now);
        break;
      case 'cha':
      case 'chapu': // High bell ringing overtone
        this.synthChapu(now);
        break;
      case 'ka':
      case 'ki':
      case 'ta': // Treble fast flat tap
        this.synthKa(now);
        break;
      default:
        // Silent or unrecognized stroke
        break;
    }
  }

  // Synthesis details for each stroke
  synthThom(time) {
    // THOM: Deep bass from Thoppi (Left head) with 'Gumki' (Pitch bend)
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, time);
    masterGain.gain.linearRampToValueAtTime(1.2, time + 0.015);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    // Fundamental Bass Oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    
    // Pitch bending (Gumki effect): Glides down smoothly
    const baseFreq = this.sruti * 0.5; // One octave down
    osc.frequency.setValueAtTime(baseFreq * 1.1, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, time + 0.3);

    // Subtle harmonic overtone for skin texture
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2.0, time);
    
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.3, time);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(masterGain);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    masterGain.connect(this.analyser);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.65);
    osc2.stop(time + 0.2);
  }

  synthTha(time) {
    // THA: Flat, muted slap on the Thoppi (Left head)
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, time);
    masterGain.gain.linearRampToValueAtTime(1.0, time + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15); // Very short decay

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle'; // harsher tone
    osc.frequency.setValueAtTime(this.sruti * 0.6, time);

    // Noise burst for the slap impact
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(400, time);
    noiseFilter.Q.setValueAtTime(1.0, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(masterGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    masterGain.connect(this.analyser);

    osc.start(time);
    noise.start(time);
    osc.stop(time + 0.15);
    noise.stop(time + 0.1);
  }

  synthDheem(time) {
    // DHEEM / DHI: Resonant strike on the Saatham (Black center)
    // Produces pure integer harmonics due to mass-loading.
    const freqs = [1.0, 2.0, 3.0, 4.0, 5.0]; // Perfect harmonics
    const volumes = [1.0, 0.6, 0.3, 0.15, 0.05]; 
    const decays = [0.5, 0.35, 0.25, 0.15, 0.1];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, time);
    masterGain.gain.linearRampToValueAtTime(1.0, time + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.sruti * freqs[i], time);
      
      gainNode.gain.setValueAtTime(volumes[i], time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + decays[i]);

      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.6);
    }
    masterGain.connect(this.analyser);
  }

  synthNam(time) {
    // NAM: Ringing strike on the Meetu (Inner ring, right head)
    // Suppresses fundamental, emphasizes 2nd, 3rd, and 5th harmonics.
    const freqs = [2.0, 3.0, 5.0, 6.0]; 
    const volumes = [0.9, 0.7, 0.4, 0.2];
    const decays = [0.45, 0.3, 0.2, 0.1];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, time);
    masterGain.gain.linearRampToValueAtTime(1.0, time + 0.008);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.sruti * freqs[i], time);
      
      gainNode.gain.setValueAtTime(volumes[i], time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + decays[i]);

      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.55);
    }
    masterGain.connect(this.analyser);
  }

  synthChapu(time) {
    // CHAPU: Explosive, bright, complex metallic strike on the Vettu (Outer ring)
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, time);
    masterGain.gain.linearRampToValueAtTime(1.2, time + 0.003);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    // Harmonic ringing
    const freqs = [3.0, 4.0, 5.5, 7.0]; 
    const volumes = [0.8, 0.6, 0.4, 0.2];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.sruti * freqs[i], time);
      gainNode.gain.setValueAtTime(volumes[i], time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.3);
    }

    // High frequency noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2500, time);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    masterGain.connect(this.analyser);
    noise.start(time);
    noise.stop(time + 0.1);
  }

  synthKa(time) {
    // KA / TA / KI: Muted, flat stroke on the Saatham (Black center)
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, time);
    masterGain.gain.linearRampToValueAtTime(1.0, time + 0.002);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08); // Dead, muted sound

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.sruti * 2.0, time);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, time);
    noiseFilter.Q.setValueAtTime(0.5, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(masterGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    masterGain.connect(this.analyser);

    osc.start(time);
    noise.start(time);
    osc.stop(time + 0.1);
    noise.stop(time + 0.05);
  }




  // ----------------------------------------------------
  // Custom Formant-based Vocal Text-to-Speech Engine
  // ----------------------------------------------------
  vocalize(syllable, time) {
    if (!this.ttsEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = time || this.ctx.currentTime;
    
    // Choose custom formant engine or native Web Speech API
    if (this.ttsMode === 'speech-api') {
      this.playSpeechApi(syllable);
      return;
    }

    // Procedural Formant Vocal Synthesizer
    const cleanSyllable = syllable.toLowerCase().replace(/[^a-z-]/g, '');
    if (!cleanSyllable || cleanSyllable === '-') return;

    // Check if compound syllable like "tha-ki-ta" -> play them in rapid succession or handle first syllable
    if (cleanSyllable.includes('-')) {
      const parts = cleanSyllable.split('-');
      // For the scheduler, it already splits them. But in manual triggers, we play the first part
      this.synthFormantVowel(parts[0], now);
    } else {
      this.synthFormantVowel(cleanSyllable, now);
    }
  }

  synthFormantVowel(syllable, time) {
    // Identify vowel phonetics and consonants
    let vowel = 'a'; // default /a/
    if (syllable.match(/(dhi|ki|mi|gi|dee|key|mee|dheem|deem|dim|din)/)) vowel = 'i';
    else if (syllable.match(/(thom|jo|joh|oh)/)) vowel = 'o';
    else if (syllable.match(/(nu|ghu|oo|ru)/)) vowel = 'u';
    
    // Formant Frequencies (F1, F2, F3) & Gains (G1, G2, G3) based on IPA standards
    let formants = {
      f1: 800, f2: 1250, f3: 2500,
      g1: 1.0, g2: 0.55, g3: 0.25
    };

    if (vowel === 'i') {
      formants = {
        f1: 300, f2: 2200, f3: 3000,
        g1: 1.0, g2: 0.75, g3: 0.45
      };
    } else if (vowel === 'o') {
      formants = {
        f1: 520, f2: 880, f3: 2300,
        g1: 1.0, g2: 0.45, g3: 0.18
      };
    } else if (vowel === 'u') {
      formants = {
        f1: 340, f2: 780, f3: 2100,
        g1: 1.0, g2: 0.35, g3: 0.15
      };
    }

    // Set duration
    let duration = 0.18;
    if (syllable === 'thom' || syllable === 'dheem') {
      duration = 0.38;
    }

    // 1. Vocal cord generator (Sawtooth oscillator detuned for chorus/human feel)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const voiceGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(this.voicePitch, time);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(this.voicePitch * 1.015, time); // detune by 1.5%
    osc2.detune.setValueAtTime(10, time);

    // Apply rapid vibrato (LFO)
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(6.0, time); // 6 Hz vibrato
    vibratoGain.gain.setValueAtTime(this.voicePitch * 0.015, time); // depth
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc1.frequency);
    vibratoGain.connect(osc2.frequency);

    // Voice Envelope (Glottal Attack)
    voiceGain.gain.setValueAtTime(0.001, time);
    voiceGain.gain.linearRampToValueAtTime(0.42, time + 0.022); // soft glottal attack
    voiceGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // 2. Parallel Formant Biquad Filters
    const filter1 = this.ctx.createBiquadFilter();
    const filter2 = this.ctx.createBiquadFilter();
    const filter3 = this.ctx.createBiquadFilter();

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(formants.f1, time);
    filter1.Q.setValueAtTime(12.0, time); // high Q for narrow bandpass vowel formant

    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(formants.f2, time);
    filter2.Q.setValueAtTime(10.0, time);

    filter3.type = 'bandpass';
    filter3.frequency.setValueAtTime(formants.f3, time);
    filter3.Q.setValueAtTime(8.0, time);

    const fGain1 = this.ctx.createGain();
    const fGain2 = this.ctx.createGain();
    const fGain3 = this.ctx.createGain();

    fGain1.gain.setValueAtTime(formants.g1, time);
    fGain2.gain.setValueAtTime(formants.g2, time);
    fGain3.gain.setValueAtTime(formants.g3, time);

    // Connect voice to filters
    osc1.connect(voiceGain);
    osc2.connect(voiceGain);

    voiceGain.connect(filter1);
    voiceGain.connect(filter2);
    voiceGain.connect(filter3);

    filter1.connect(fGain1);
    filter2.connect(fGain2);
    filter3.connect(fGain3);

    const filterSum = this.ctx.createGain();
    fGain1.connect(filterSum);
    fGain2.connect(filterSum);
    fGain3.connect(filterSum);

    filterSum.connect(this.analyser);

    vibrato.start(time);
    osc1.start(time);
    osc2.start(time);
    
    vibrato.stop(time + duration + 0.05);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);

    // 3. Consonant Noise Generator (Explosive plosives / Sibilants)
    // "th", "k", "dh", "n"
    if (syllable.startsWith('th') || syllable.startsWith('t')) {
      // High frequency breath noise burst
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'highpass';
      nFilter.frequency.setValueAtTime(6500, time);
      
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.28, time);
      nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.analyser);
      noise.start(time);
      noise.stop(time + 0.04);
    } 
    else if (syllable.startsWith('k')) {
      // Crisp mid-high click
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(2200, time);
      nFilter.Q.setValueAtTime(6.0, time);
      
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.35, time);
      nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.analyser);
      noise.start(time);
      noise.stop(time + 0.03);
    } 
    else if (syllable.startsWith('dh') || syllable.startsWith('d')) {
      // Damped low frequency thud + minor noise
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(800, time);
      
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.2, time);
      nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      // Pitch glide for 'd' consonant
      osc1.frequency.setValueAtTime(this.voicePitch * 1.5, time);
      osc1.frequency.exponentialRampToValueAtTime(this.voicePitch, time + 0.038);
      osc2.frequency.setValueAtTime(this.voicePitch * 1.515, time);
      osc2.frequency.exponentialRampToValueAtTime(this.voicePitch * 1.015, time + 0.038);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.analyser);
      noise.start(time);
      noise.stop(time + 0.05);
    }
    else if (syllable.startsWith('n') || syllable.startsWith('m')) {
      // Nasal resonance (low-freq hum)
      const nasalOsc = this.ctx.createOscillator();
      nasalOsc.type = 'sine';
      nasalOsc.frequency.setValueAtTime(this.voicePitch * 1.8, time);
      
      const nasalGain = this.ctx.createGain();
      nasalGain.gain.setValueAtTime(0.12, time);
      nasalGain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);

      nasalOsc.connect(nasalGain);
      nasalGain.connect(this.analyser);
      nasalOsc.start(time);
      nasalOsc.stop(time + 0.08);
    }
  }

  // System Speech API Native fallback
  playSpeechApi(syllable) {
    if (!('speechSynthesis' in window)) return;
    
    // Map syllables phonetically for natural sound in English engines
    const phoneMap = {
      'tha': 'tah',
      'dhi': 'dhee',
      'thom': 'thome',
      'nam': 'nahmh',
      'naam': 'nahmh',
      'na': 'nahmh',
      'tham': 'thahm',
      'ka': 'kah',
      'ki': 'key',
      'ta': 'tah',
      'jo': 'joh',
      'nu': 'noo',
      'lan': 'lahn',
      'ghu': 'g-hoo',
      'dheem': 'dheem',
      'deem': 'dheem',
      'dhim': 'dheem',
      'dhin': 'dheem',
      'din': 'dheem',
      'dim': 'dheem',
      'jham': 'jahm',
      'chap': 'chahp',
      'chaap': 'chahp'
    };

    let utteranceText = phoneMap[syllable.toLowerCase()] || syllable;
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    
    // Attempt to set to Indian voice or standard neutral fast voice
    const voices = window.speechSynthesis.getVoices();
    const indVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India'));
    if (indVoice) utterance.voice = indVoice;
    
    utterance.rate = 1.6; // High rate to match rapid percussion speeds
    utterance.pitch = 1.0;
    utterance.volume = 0.85;

    window.speechSynthesis.speak(utterance);
  }
}

// ----------------------------------------------------
// 2. Playback Scheduler & Sequencer
// ----------------------------------------------------

class LayaSequencer {
  constructor(audioEngine) {
    this.engine = audioEngine;
    this.isPlaying = false;
    
    // Tempo and Time tracking
    this.bpm = 120;
    this.subdivisions = 4; // Notes per beat (e.g. 4 = Chatusra, 3 = Tisra)
    this.tala = 'adi'; // 'adi', 'rupaka', 'misra_chapu', 'khanda_chapu'
    
    // Script parsing
    this.script = []; // Flat list of steps { stroke: 'tha', syllable: 'tha' }
    this.scriptIndex = 0;
    
    // Accurate scheduler timers
    this.nextNoteTime = 0.0; // When the next subdivision is due
    this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (seconds)
    this.lookahead = 25.0; // How frequently to call scheduler (ms)
    this.timerId = null;
    
    // Visual tracking (passed back to UI)
    this.currentTalaBeat = 0; // Beat counter in the Tala cycle
    this.currentTalaSubstep = 0; // Substep within the beat
    
    // Callbacks
    this.onBeatTrigger = null; // (beatIndex, substepIndex, strokeName)
    this.onStop = null;
  }

  setBpm(val) {
    this.bpm = parseInt(val, 10);
  }

  setSubdivisions(val) {
    this.subdivisions = parseInt(val, 10);
  }

  setTala(val) {
    this.tala = val;
    this.resetTalaCounters();
  }

  resetTalaCounters() {
    this.currentTalaBeat = 0;
    this.currentTalaSubstep = 0;
  }

  // Get total beats in the current Tala cycle
  getTalaBeatsCount() {
    switch (this.tala) {
      case 'adi': return 8;
      case 'rupaka': return 3;
      case 'rupaka_fast': return 3;
      case 'misra_chapu': return 7;
      case 'khanda_chapu': return 5;
      default: return 8;
    }
  }

  // Get Laghu/Dhrutam styling for beat node
  getBeatType(beatIndex) {
    // 0-indexed
    if (this.tala === 'adi') {
      return beatIndex < 4 ? 'laghu' : 'dhrutam';
    }
    if (this.tala === 'rupaka') {
      return beatIndex < 1 ? 'dhrutam' : 'laghu';
    }
    // Chapus are structural cycles, color all nodes as laghu for simplicity
    return 'laghu';
  }

  // Determine standard Carnatic hand gesture for visualizer
  getGestureText(beatIndex) {
    // 1-indexed for logical thinking
    const b = beatIndex + 1;
    if (this.tala === 'adi') {
      if (b === 1) return 'Clap (Laghu Start)';
      if (b === 2) return 'Little Finger Pinky';
      if (b === 3) return 'Ring Finger';
      if (b === 4) return 'Middle Finger';
      if (b === 5) return 'Clap (Dhrutam 1)';
      if (b === 6) return 'Wave (Palm Up)';
      if (b === 7) return 'Clap (Dhrutam 2)';
      if (b === 8) return 'Wave (Palm Up)';
    }
    if (this.tala === 'rupaka') {
      if (b === 1) return 'Clap';
      if (b === 2) return 'Clap';
      if (b === 3) return 'Wave (Palm Up)';
    }
    if (this.tala === 'misra_chapu') {
      // 3 + 2 + 2 structure
      if (b === 1) return 'Clap';
      if (b === 2) return 'Silence (Hold)';
      if (b === 3) return 'Clap';
      if (b === 4) return 'Silence (Hold)';
      if (b === 5) return 'Clap';
      if (b === 6) return 'Wave';
      if (b === 7) return 'Silence';
    }
    if (this.tala === 'khanda_chapu') {
      // 2 + 3 structure
      if (b === 1) return 'Clap';
      if (b === 2) return 'Silence';
      if (b === 3) return 'Clap';
      if (b === 4) return 'Clap';
      if (b === 5) return 'Wave';
    }
    return 'Keep Time (Tala)';
  }

  decomposeSyllableGroup(s) {
    const valid = ['chapu', 'chaap', 'dheem', 'dhin', 'dhim', 'tham', 'naam', 'jham', 'chap', 'deem', 'thom', 'din', 'dim', 'nam', 'tha', 'dhi', 'cha', 'lan', 'ghu', 'ta', 'ka', 'ki', 'ri', 'mi', 'gi', 'jo', 'nu', 'di', 'na'];
    let tokens = [];
    let remaining = s;
    while(remaining.length > 0) {
      let matched = false;
      for (let v of valid) {
        if (remaining.startsWith(v)) {
          tokens.push(v);
          remaining = remaining.substring(v.length);
          matched = true;
          break;
        }
      }
      if (!matched) {
        tokens.push(remaining);
        break;
      }
    }
    return tokens;
  }

  // Parse Editor Script Text into structured sound commands
  parseScript(scriptText) {
    this.script = [];
    
    // Clean text and split by spaces or linebreaks
    const tokens = scriptText
      .replace(/[\n\r]/g, ' ')
      .split(/\s+/)
      .filter(t => t.trim().length > 0);

    for (let token of tokens) {
      if (token === '|') continue;

      const s = token.toLowerCase().replace(/[^a-z0-9_.-]/g, '');

      // Custom Gap Identifiers
      if (s === '.') {
        this.script.push({ stroke: 'silent', syllable: '-', beatDuration: 0.25 });
        continue;
      } else if (s === '..') {
        this.script.push({ stroke: 'silent', syllable: '-', beatDuration: 0.5 });
        continue;
      } else if (s === '...') {
        this.script.push({ stroke: 'silent', syllable: '-', beatDuration: 1.0 });
        continue;
      }
      else if (s.includes('-')) {
        const parts = s.split('-');
        const ratio = 1.0 / parts.length;
        for (let part of parts) {
          const decomposed = this.decomposeSyllableGroup(part);
          const subRatio = ratio / decomposed.length;
          for (let subPart of decomposed) {
            this.script.push(this.mapSyllableToStroke(subPart, subRatio));
          }
        }
      } else {
        const decomposed = this.decomposeSyllableGroup(s);
        const ratio = 1.0 / decomposed.length;
        for (let part of decomposed) {
          this.script.push(this.mapSyllableToStroke(part, ratio));
        }
      }
    }

    if (this.script.length === 0) {
      this.script = [{ stroke: 'thom', syllable: 'thom', durationRatio: 1.0 }];
    }
  }

  // Maps spoken Konnakol words to the synthesized drum sound and cleaned voice syllable
  mapSyllableToStroke(syllable, ratio) {
    const s = syllable.toLowerCase().replace(/[^a-z_]/g, '');
    
    // Silence/Pauses
    if (s === '_' || s === 'pause' || s === 'silence' || s === '') {
      return { stroke: 'silent', syllable: '-', durationRatio: ratio };
    }

    // Stroke Mapping Dictionary
    const mapping = {
      'tha': 'tha',
      'thom': 'thom',
      'dhi': 'dhi',
      'dhim': 'dheem',
      'dhin': 'dheem',
      'dheem': 'dheem',
      'deem': 'dheem',
      'din': 'dheem',
      'dim': 'dheem',
      'jham': 'dheem',
      'di': 'dhi',
      'nam': 'nam',
      'naam': 'nam',
      'na': 'nam',
      'tham': 'tham',
      'cha': 'chapu',
      'chapu': 'chapu',
      'chap': 'chapu',
      'chaap': 'chapu',
      'ka': 'tha',
      'ki': 'tha',
      'ta': 'tha',
      'ri': 'tha',
      'mi': 'tha',
      'gi': 'tha',
      'jo': 'tha', // jo is played as a flat treble thud
      'nu': 'nam', // nu can be rim ring
      'lan': 'chapu',
      'ghu': 'thom' // ghu is bass ring
    };

    return {
      stroke: mapping[s] || 'ta', // fallback to treble click
      syllable: s,
      durationRatio: ratio
    };
  }

  // ----------------------------------------------------
  // Precise Scheduling Engine (Web Audio Metronome)
  // ----------------------------------------------------

  start() {
    if (this.isPlaying) return;
    this.engine.init();
    
    this.isPlaying = true;
    this.scriptIndex = 0;
    this.resetTalaCounters();
    
    this.nextNoteTime = this.engine.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearTimeout(this.timerId);
    
    if (this.onStop) this.onStop();
  }

  scheduler() {
    // While there are notes to play before the next lookahead window
    while (this.nextNoteTime < this.engine.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.scriptIndex, this.nextNoteTime);
      this.advanceNote();
    }
    // Loop scheduler
    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  scheduleNote(index, time) {
    const step = this.script[index % this.script.length];
    
    // 1. Trigger Synthesized Audio
    if (step.stroke !== 'silent') {
      this.engine.playMridangam(step.stroke, time);
    }
    
    if (step.syllable !== '-') {
      this.engine.vocalize(step.syllable, time);
    }

    // 2. Trigger Visual Callback in sync with audio context schedule time
    // We compute the exact difference to schedule drawing
    const delta = (time - this.engine.ctx.currentTime) * 1000;
    
    // Store current state variables to closure so callback draws correct beat indices
    const beat = this.currentTalaBeat;
    const substep = this.currentTalaSubstep;
    const stroke = step.stroke;
    
    setTimeout(() => {
      if (!this.isPlaying) return;
      if (this.onBeatTrigger) {
        this.onBeatTrigger(beat, substep, stroke, step.syllable);
      }
    }, Math.max(0, delta));
  }

  advanceNote() {
    // Get the duration multiplier of the current step
    const currentStep = this.script[this.scriptIndex % this.script.length];
    
    // Calculate base times
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPerSubdivision = secondsPerBeat / this.subdivisions;
    
    let floatSubstepIncrement = 0;
    
    if (currentStep.beatDuration) {
      // It's a fixed beat-gap (like ., .., ...)
      this.nextNoteTime += secondsPerBeat * currentStep.beatDuration;
      floatSubstepIncrement = currentStep.beatDuration * this.subdivisions;
    } else {
      // Standard syllable ratio relative to subdivision
      const ratio = currentStep.durationRatio || 1.0;
      this.nextNoteTime += secondsPerSubdivision * ratio;
      floatSubstepIncrement = ratio;
    }
    
    // Increment script pointer
    this.scriptIndex++;
    
    // Increment Tala grid positions with float accumulation
    this.currentTalaSubstep += floatSubstepIncrement;
    
    // Rounding safety for JS float math
    if (this.currentTalaSubstep >= this.subdivisions - 0.005) {
      this.currentTalaSubstep = 0; // Wrap around to start of next beat
      this.currentTalaBeat++;
      
      const maxBeats = this.getTalaBeatsCount();
      if (this.currentTalaBeat >= maxBeats) {
        this.currentTalaBeat = 0;
      }
    }
  }
}

// ----------------------------------------------------
// 3. Phonetic Speech Recognition (Speech-to-Text)
// ----------------------------------------------------

class LayaSpeechRecognizer {
  constructor() {
    this.isListening = false;
    this.onResult = null; // Callback (transcriptText, mappedSyllablesText)
    this.onStatusChange = null; // Callback (statusText, isListening)
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.ws = null;
  }

  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      if (this.onStatusChange) this.onStatusChange("Connecting to Backend...", false);
      const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
      this.ws = new WebSocket(`${wsProtocol}://${location.host}/ws/speech`);
      
      this.ws.onopen = () => {
        console.log("Connected to WhisperX Backend");
        resolve();
      };
      
      this.ws.onerror = (e) => {
        console.error("WebSocket Error:", e);
        if (this.onStatusChange) this.onStatusChange("Backend Connection Failed. Is the Python server running?", false);
        reject(e);
      };

      this.ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          const transcript = res.text.toLowerCase();
          console.log(`[${res.engine.toUpperCase()}] Transcript:`, transcript);
          
          if (transcript.length > 0) {
            // Rough mapping from english phonetic words back to Konnakol
            // E.g. "taco" -> "ta ka", "tea" -> "dhi", "tom" -> "thom"
            let syllables = transcript
              .replace(/taco|talk/g, 'tha ka')
              .replace(/tea|the|dee/g, 'dhi')
              .replace(/tom|dome|thumb/g, 'thom')
              .replace(/none|num|mom/g, 'nam')
              .replace(/chop|chap/g, 'chapu')
              .replace(/key/g, 'ki')
              .replace(/tar/g, 'ta');
              
            if (this.onResult) this.onResult(transcript, syllables);
          }
          
          if (this.onStatusChange) this.onStatusChange("Ready", false);
        } catch (e) {
          console.error("Error parsing STT result:", e);
        }
      };
    });
  }

  async toggleListening() {
    if (this.isListening) {
      // STOP Listening
      this.isListening = false;
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
      if (this.onStatusChange) this.onStatusChange("Processing speech via WhisperX...", false);
    } else {
      // START Listening
      try {
        await this.connectWebSocket();
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(e.data); // Send blob chunk
          }
        };
        
        this.mediaRecorder.onstop = () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send("END_OF_SPEECH");
          }
          // Cleanup tracks to release mic
          stream.getTracks().forEach(track => track.stop());
        };
        
        // Request chunks frequently for streaming
        this.mediaRecorder.start(250);
        this.isListening = true;
        
        if (this.onStatusChange) this.onStatusChange("Listening... Speak Konnakol syllables", true);
        
      } catch (err) {
        console.error("Microphone error:", err);
        if (this.onStatusChange) this.onStatusChange("Microphone access denied", false);
      }
    }
  }
}

// ----------------------------------------------------
// 4. UI Visualizers & Event Controllers
// ----------------------------------------------------

class LayaVisualizers {
  constructor(audioEngine) {
    this.engine = audioEngine;
    
    // Waveform canvas
    this.waveCanvas = document.getElementById('waveform-canvas');
    this.waveCtx = this.waveCanvas.getContext('2d');
    
    // Particle background canvas
    this.bgCanvas = document.getElementById('bg-canvas');
    this.bgCtx = this.bgCanvas.getContext('2d');
    this.particles = [];
    
    // Visualizer running flags
    this.waveAnimId = null;
    this.bgAnimId = null;

    this.initWaveformCanvas();
    this.initBgCanvas();
    this.resizeBgCanvas();
    window.addEventListener('resize', () => this.resizeBgCanvas());
  }

  initWaveformCanvas() {
    this.waveCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    this.waveCtx.fillRect(0, 0, this.waveCanvas.width, this.waveCanvas.height);
  }

  initBgCanvas() {
    // Generate initial particle system
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 3.5 + 0.5,
        color: Math.random() > 0.6 ? 'rgba(255, 117, 48, 0.25)' : 'rgba(212, 175, 55, 0.15)',
        pulseRate: Math.random() * 0.02 + 0.005,
        pulseVal: Math.random()
      });
    }
  }

  resizeBgCanvas() {
    this.bgCanvas.width = window.innerWidth;
    this.bgCanvas.height = window.innerHeight;
  }

  // 1. Draw Output Waveform from Analyser Node
  startWaveformDraw() {
    const draw = () => {
      this.waveAnimId = requestAnimationFrame(draw);
      
      const width = this.waveCanvas.width;
      const height = this.waveCanvas.height;
      
      this.waveCtx.fillStyle = 'rgba(13, 11, 10, 0.25)'; // trail blur effect
      this.waveCtx.fillRect(0, 0, width, height);
      
      if (!this.engine.analyser || !this.engine.ctx) return;
      
      const bufferLength = this.engine.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      this.engine.analyser.getByteTimeDomainData(dataArray);
      
      this.waveCtx.lineWidth = 2;
      
      // Gradient line based on saffron and gold
      const grad = this.waveCtx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#ff7530');
      grad.addColorStop(0.5, '#d4af37');
      grad.addColorStop(1, '#ff7530');
      this.waveCtx.strokeStyle = grad;
      
      this.waveCtx.beginPath();
      
      const sliceWidth = width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (height / 2);
        
        if (i === 0) {
          this.waveCtx.moveTo(x, y);
        } else {
          this.waveCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      this.waveCtx.lineTo(width, height / 2);
      this.waveCtx.stroke();
    };
    
    draw();
  }

  stopWaveformDraw() {
    cancelAnimationFrame(this.waveAnimId);
    this.initWaveformCanvas();
  }

  // 2. Draw Elegant Sabha Particle Background
  startBgAnimation() {
    let lastBeatPulse = 0;

    const animate = () => {
      this.bgAnimId = requestAnimationFrame(animate);
      
      const width = this.bgCanvas.width;
      const height = this.bgCanvas.height;
      
      // Velvet deep background color gradient
      const gradient = this.bgCtx.createRadialGradient(
        width / 2, height / 2, 50, 
        width / 2, height / 2, Math.max(width, height)
      );
      gradient.addColorStop(0, '#1d1714'); // warm center wood glow
      gradient.addColorStop(0.6, '#0d0b0a'); // deep boundary dark
      gradient.addColorStop(1, '#050404');
      
      this.bgCtx.fillStyle = gradient;
      this.bgCtx.fillRect(0, 0, width, height);

      // Draw particle nodes
      this.particles.forEach(p => {
        // Move
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce bounds
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        // Sine wave opacity pulsing
        p.pulseVal += p.pulseRate;
        const currentOpacity = Math.abs(Math.sin(p.pulseVal));
        
        this.bgCtx.beginPath();
        this.bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Color modification with glow
        const baseColor = p.color.substring(0, p.color.lastIndexOf(',')) + `, ${currentOpacity * 0.35})`;
        this.bgCtx.fillStyle = baseColor;
        this.bgCtx.shadowBlur = 10;
        this.bgCtx.shadowColor = 'rgba(255, 117, 48, 0.05)';
        this.bgCtx.fill();
        this.bgCtx.shadowBlur = 0; // reset
      });
      
      // Connect nearby particles with thin web lines (constellation style)
      this.bgCtx.strokeStyle = 'rgba(255, 127, 63, 0.015)';
      this.bgCtx.lineWidth = 0.5;
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 130) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(this.particles[i].x, this.particles[i].y);
            this.bgCtx.lineTo(this.particles[j].x, this.particles[j].y);
            this.bgCtx.stroke();
          }
        }
      }
    };
    
    animate();
  }

  // Triggered externally on beats to spike particle motions
  pulseBgOnBeat() {
    this.particles.forEach(p => {
      // Speed up temporarily
      p.vx *= 2.5;
      p.vy *= 2.5;
      
      // Clamp velocity
      const maxV = 1.8;
      if (Math.abs(p.vx) > maxV) p.vx = p.vx > 0 ? maxV : -maxV;
      if (Math.abs(p.vy) > maxV) p.vy = p.vy > 0 ? maxV : -maxV;
      
      // Decelerate back to drift speed slowly
      setTimeout(() => {
        p.vx *= 0.4;
        p.vy *= 0.4;
      }, 100);
    });
  }
}

// ----------------------------------------------------
// 5. Main Application Controller
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Engines
  const audio = new LayaAudioEngine();
  const sequencer = new LayaSequencer(audio);
  const speech = new LayaSpeechRecognizer();
  const visualizers = new LayaVisualizers(audio);
  
  visualizers.startBgAnimation();

  // ----------------------------------------------------
  // Compositions & Presets Database
  // ----------------------------------------------------
  const presets = {
    sarva_laghu: "tha ka dhi mi | tha ka jo nu |\ntha ka dhi mi | tha ka jo nu |\ntha ka dhi mi | tha ka jo nu |\ntha ka dhi mi | tha ka jo nu |",
    
    sarva_laghu_2: "tha-ka-dhi-mi tha-ka-jo-nu | tha-ka-dhi-mi tha-ka-jo-nu |\ntha-ka-dhi-mi tha-ka-jo-nu | tha-ka-dhi-mi tha-ka-jo-nu |\ntha-ka-dhi-mi tha-ka-jo-nu | tha-ka-dhi-mi tha-ka-jo-nu |\ntha-ka-dhi-mi tha-ka-jo-nu | tha-ka-dhi-mi tha-ka-jo-nu |",
    
    tisra_gati: "tha-ki-ta tha-ki-ta | tha-ki-ta tha-ki-ta |\ntha-ki-ta tha-ki-ta | tha-ki-ta tha-ki-ta |\ntha-ki-ta tha-ki-ta | tha-ki-ta tha-ki-ta |\ntha-ki-ta tha-ki-ta | tha-ki-ta tha-ki-ta |",
    
    mohra: "tha - - - tha ka dhi mi | tha - tha - tha ka dhi mi |\ntha - tha ka tha-di-gi-na-thom | - tha tha ka tha-di-gi-na-thom |\n- - tha tha ka tha-di-gi-na-thom | _ _ _ _ |",
    
    korvai: "tha-ki-ta tha-ka-dhi-mi tha-di-gi-na-thom |\ntha-ki-ta tha-ka-dhi-mi tha-di-gi-na-thom |\ntha-ki-ta tha-ka-dhi-mi tha-di-gi-na-thom |\n_ _ _ _ | _ _ _ _ |\ntha-di-gi-na-thom - tha-di-gi-na-thom - |\ntha-di-gi-na-thom | _ _ _ _ |",

    misra_chapu_pattern: "dhi - thom | dhi dhi thom | dhi dhi dhi thom |\ndhi - thom | dhi dhi thom | dhi dhi dhi thom |",

    khanda_chapu_pattern: "tha - ki - ta | tha - ki - ta | tha - ki - ta |\ntha-ki-ta tha-ki-ta | tha-ki-ta tha-ki-ta |"
  };

  // ----------------------------------------------------
  // DOM Elements
  // ----------------------------------------------------
  const srutiSelect = document.getElementById('sruti-select');
  const srutiHzDisplay = document.getElementById('sruti-hz-display');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmValue = document.getElementById('bpm-value');
  const talaSelect = document.getElementById('tala-select');
  const subdivisionSelect = document.getElementById('subdivision-select');
  
  const metronomeToggle = document.getElementById('metronome-toggle');
  const mridangamToggle = document.getElementById('mridangam-toggle');
  const ttsToggle = document.getElementById('tts-toggle');
  const ttsVoiceType = document.getElementById('tts-voice-type');
  
  const thoppiHead = document.getElementById('thoppi-head');
  const valaiHead = document.getElementById('valai-head');
  const talaBeatsGrid = document.getElementById('tala-beats-grid');
  const currentGestureText = document.getElementById('current-gesture-text');
  
  const presetSelect = document.getElementById('preset-select');
  const konnakolEditor = document.getElementById('konnakol-editor');
  
  const micBtn = document.getElementById('mic-btn');
  const sttStatus = document.getElementById('stt-status');
  const heardSpeechText = document.getElementById('heard-speech-text');
  const mappedSyllablesText = document.getElementById('mapped-syllables-text');
  
  const playBtn = document.getElementById('play-btn');
  const stopBtn = document.getElementById('stop-btn');
  const clearBtn = document.getElementById('clear-btn');

  // ----------------------------------------------------
  // Dynamic Grid Builder: Tala visualizer
  // ----------------------------------------------------
  function rebuildTalaGrid() {
    talaBeatsGrid.innerHTML = '';
    const beatCount = sequencer.getTalaBeatsCount();
    const subs = sequencer.subdivisions;
    
    for (let i = 0; i < beatCount; i++) {
      const beatNode = document.createElement('div');
      beatNode.className = `beat-node ${sequencer.getBeatType(i)}`;
      beatNode.id = `beat-node-${i}`;
      
      const beatNum = document.createElement('div');
      beatNum.className = 'beat-number';
      beatNum.innerText = i + 1;
      beatNode.appendChild(beatNum);
      
      const indicators = document.createElement('div');
      indicators.className = 'beat-indicators';
      
      for (let j = 0; j < subs; j++) {
        const sub = document.createElement('div');
        sub.className = 'beat-substep';
        sub.id = `beat-${i}-sub-${j}`;
        indicators.appendChild(sub);
      }
      
      beatNode.appendChild(indicators);
      talaBeatsGrid.appendChild(beatNode);
    }
  }

  // Initial draw
  rebuildTalaGrid();

  // ----------------------------------------------------
  // Config Controls Events
  // ----------------------------------------------------
  srutiSelect.addEventListener('change', (e) => {
    const hz = parseFloat(e.target.value);
    audio.setSruti(hz);
    srutiHzDisplay.innerText = `${hz.toFixed(1)} Hz`;
  });

  bpmSlider.addEventListener('input', (e) => {
    const bpm = e.target.value;
    bpmValue.innerText = bpm;
    sequencer.setBpm(bpm);
  });

  talaSelect.addEventListener('change', (e) => {
    sequencer.setTala(e.target.value);
    rebuildTalaGrid();
  });

  subdivisionSelect.addEventListener('change', (e) => {
    const sub = parseInt(e.target.value, 10);
    sequencer.setSubdivisions(sub);
    rebuildTalaGrid();
  });

  mridangamToggle.addEventListener('change', (e) => {
    audio.mridangamEnabled = e.target.checked;
  });

  ttsToggle.addEventListener('change', (e) => {
    audio.ttsEnabled = e.target.checked;
  });

  ttsVoiceType.addEventListener('change', (e) => {
    audio.ttsMode = e.target.value;
  });

  // ----------------------------------------------------
  // Drumheads Click Interaction
  // ----------------------------------------------------
  // Manual trigger mapping
  const strokeToHeadMapping = {
    'thom': { head: 'thoppi', animation: 'active-stroke-thom' },
    'tha': { head: 'thoppi', animation: 'active-stroke-tha' },
    'dhi': { head: 'valai', animation: 'active-stroke-dhi' },
    'nam': { head: 'valai', animation: 'active-stroke-nam' },
    'cha': { head: 'valai', animation: 'active-stroke-cha' },
    'ka': { head: 'valai', animation: 'active-stroke-ka' }
  };

  function animateDrumStroke(stroke) {
    let strokeClass = stroke.toLowerCase();
    
    if (strokeClass === 'tham') {
      animateDrumStroke('nam');
      animateDrumStroke('thom');
      return;
    }

    if (strokeClass === 'dheem') strokeClass = 'dhi';
    if (strokeClass === 'chapu') strokeClass = 'cha';
    if (strokeClass === 'ki' || strokeClass === 'ta') strokeClass = 'ka';

    const map = strokeToHeadMapping[strokeClass];
    if (!map) return;

    // Toggle container scale playing classes
    const headEl = map.head === 'thoppi' ? thoppiHead : valaiHead;
    headEl.classList.add('playing');
    setTimeout(() => headEl.classList.remove('playing'), 60);

    // Find specific component clicked and apply animation class
    const strokeEl = document.querySelector(`[data-stroke="${strokeClass}"]`);
    if (strokeEl) {
      strokeEl.classList.add(map.animation);
      // Remove class once animation sequence completes
      setTimeout(() => strokeEl.classList.remove(map.animation), 400);
    }
  }

  // Bind clicks on SVG elements of heads
  document.querySelectorAll('[data-stroke]').forEach(elem => {
    elem.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      audio.init(); // safety unlock
      const stroke = e.currentTarget.getAttribute('data-stroke');
      
      // Play Synthesized sound
      audio.playMridangam(stroke);
      
      // Vocalize if vocal toggle is on
      if (ttsToggle.checked) {
        // Map stroke name back to default spoken syllables
        const vocalMap = {
          'tha': 'tha', 'thom': 'thom', 'dhi': 'dhi', 'nam': 'nam', 'cha': 'chapu', 'ka': 'ka'
        };
        audio.vocalize(vocalMap[stroke] || stroke);
      }

      // Trigger animations
      animateDrumStroke(stroke);
    });
  });

  // Bind Quick Pad buttons
  document.querySelectorAll('.pad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      audio.init();
      const stroke = e.currentTarget.getAttribute('data-stroke');
      audio.playMridangam(stroke);
      
      if (ttsToggle.checked) {
        const vocalMap = {
          'tha': 'tha', 'thom': 'thom', 'dhi': 'dheem', 'nam': 'nam', 'cha': 'chapu', 'ka': 'ka'
        };
        audio.vocalize(vocalMap[stroke] || stroke);
      }
      
      animateDrumStroke(stroke);
    });
  });

  // ----------------------------------------------------
  // Sequencer Visual Callbacks & Animation Link
  // ----------------------------------------------------
  
  sequencer.onBeatTrigger = (beatIndex, substepIndex, stroke, syllable) => {
    // 1. Refresh visual Tala grid nodes
    // Remove active class from all beats
    document.querySelectorAll('.beat-node').forEach(b => {
      b.classList.remove('active-beat');
    });
    
    // Remove active class from all substeps
    document.querySelectorAll('.beat-substep').forEach(s => {
      s.classList.remove('active-substep');
    });
    
    // Add active styling to current nodes
    const activeBeatNode = document.getElementById(`beat-node-${beatIndex}`);
    if (activeBeatNode) {
      activeBeatNode.classList.add('active-beat');
    }
    
    const activeSubstepNode = document.getElementById(`beat-${beatIndex}-sub-${substepIndex}`);
    if (activeSubstepNode) {
      activeSubstepNode.classList.add('active-substep');
    }
    
    // 2. Play metronome tick sound if enabled and it's the start of a beat
    if (metronomeToggle.checked && substepIndex === 0 && audio.ctx) {
      const isFirstBeat = (beatIndex === 0);
      const tickOsc = audio.ctx.createOscillator();
      const tickGain = audio.ctx.createGain();
      
      tickOsc.frequency.setValueAtTime(isFirstBeat ? 1000 : 700, audio.ctx.currentTime);
      tickGain.gain.setValueAtTime(0.12, audio.ctx.currentTime);
      tickGain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.05);
      
      tickOsc.connect(tickGain);
      tickGain.connect(audio.ctx.destination);
      tickOsc.start();
      tickOsc.stop(audio.ctx.currentTime + 0.06);
    }
    
    // 3. Trigger drum animation
    if (stroke !== 'silent') {
      animateDrumStroke(stroke);
    }

    // 4. Update gesture text
    if (substepIndex === 0) {
      currentGestureText.innerText = sequencer.getGestureText(beatIndex);
    }
    
    // 5. Pulse background particles to rhythm beats
    if (substepIndex === 0) {
      visualizers.pulseBgOnBeat();
    }
  };

  sequencer.onStop = () => {
    playBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Reset visual nodes
    document.querySelectorAll('.beat-node').forEach(b => b.classList.remove('active-beat'));
    document.querySelectorAll('.beat-substep').forEach(s => s.classList.remove('active-substep'));
    currentGestureText.innerText = '-';
    visualizers.stopWaveformDraw();
  };

  // ----------------------------------------------------
  // Studio Play / Stop Buttons
  // ----------------------------------------------------
  
  playBtn.addEventListener('click', () => {
    audio.init(); // initialize/unlock audio context
    
    // Parse editor content
    const text = konnakolEditor.value;
    sequencer.parseScript(text);
    
    // Config properties update
    sequencer.setBpm(bpmSlider.value);
    sequencer.setSubdivisions(subdivisionSelect.value);
    sequencer.setTala(talaSelect.value);
    
    sequencer.start();
    visualizers.startWaveformDraw();
    
    playBtn.disabled = true;
    stopBtn.disabled = false;
  });

  stopBtn.addEventListener('click', () => {
    sequencer.stop();
  });

  clearBtn.addEventListener('click', () => {
    konnakolEditor.value = '';
  });

  // ----------------------------------------------------
  // Presets Select
  // ----------------------------------------------------
  presetSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (presets[val]) {
      konnakolEditor.value = presets[val];
      
      // Auto-set optimal Tala/Gati for preset
      if (val === 'tisra_gati') {
        talaSelect.value = 'adi';
        subdivisionSelect.value = '3';
      } else if (val === 'misra_chapu_pattern') {
        talaSelect.value = 'misra_chapu';
        subdivisionSelect.value = '4';
      } else if (val === 'khanda_chapu_pattern') {
        talaSelect.value = 'khanda_chapu';
        subdivisionSelect.value = '4';
      } else {
        talaSelect.value = 'adi';
        subdivisionSelect.value = '4';
      }
      
      // Trigger changes
      sequencer.setTala(talaSelect.value);
      sequencer.setSubdivisions(subdivisionSelect.value);
      rebuildTalaGrid();
    }
  });

  // ----------------------------------------------------
  // Speech Recognition (Speech-to-Text) Web Speech API
  // ----------------------------------------------------
  
  speech.onStatusChange = (statusText, isListening) => {
    sttStatus.innerText = statusText;
    if (isListening) {
      micBtn.classList.add('recording');
      micBtn.innerHTML = '<span class="mic-icon">🔴</span> Stop Recording... Speak Now';
      sttStatus.className = 'stt-status listening';
    } else {
      micBtn.classList.remove('recording');
      micBtn.innerHTML = '<span class="mic-icon">🎙️</span> Start Recording Vocalizations';
      sttStatus.className = 'stt-status idle';
    }
  };

  speech.onResult = (transcript, mappedSyllables) => {
    heardSpeechText.innerText = `"${transcript}"`;
    mappedSyllablesText.innerText = mappedSyllables;
    
    // Append mapped syllables to editor
    if (mappedSyllables.trim().length > 0) {
      // Determine if editor is empty or ends with space
      const currentText = konnakolEditor.value.trim();
      
      // Add bar separators if we have long strings or periodically to organize
      let separator = ' ';
      if (currentText.length > 0) {
        // If current text ends with a bar separator, don't append space
        if (currentText.endsWith('|')) separator = ' ';
        else if (currentText.split(' ').length % 8 === 0) separator = ' | ';
      }
      
      konnakolEditor.value = currentText + (currentText.length > 0 ? separator : '') + mappedSyllables + ' ';
    }
  };

  micBtn.addEventListener('click', () => {
    speech.toggleListening();
  });
});
