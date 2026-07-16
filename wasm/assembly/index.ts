// A basic real-time audio classifier for Konnakol.

/**
 * Classifies an audio chunk given a pointer to a block of Float32 memory and its length.
 * Returns:
 * 0: Silence
 * 1: Bass / Resonant stroke (e.g. Thom, Dhi, Num)
 * 2: Treble / Noisy stroke (e.g. Tha, Ka, Cha)
 */
export function classifyAudioChunk(ptr: usize, length: i32): i32 {
  let energy: f32 = 0.0;
  let zcr: i32 = 0;
  let prevSign: i32 = 0;

  if (length == 0) return 0;

  for (let i = 0; i < length; i++) {
    // Read the 32-bit float audio sample from memory
    let val = load<f32>(ptr + (i << 2));
    
    // Calculate squared energy
    energy += val * val;
    
    // Calculate zero crossings
    let sign: i32 = val >= 0.0 ? 1 : -1;
    if (i > 0 && sign != prevSign) {
      zcr++;
    }
    prevSign = sign;
  }
  
  energy = energy / <f32>length;
  
  // 1. Threshold for Silence 
  if (energy < 0.005) {
    return 0; // Silence
  }
  
  // 2. Threshold for ZCR (Zero-Crossing Rate)
  let zcrRatio = <f32>zcr / <f32>length;
  
  if (zcrRatio > 0.15) {
    return 2; // Treble / Noisy
  }
  
  return 1; // Bass / Resonant
}
