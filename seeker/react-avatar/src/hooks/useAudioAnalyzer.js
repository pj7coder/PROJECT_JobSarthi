import { useRef, useCallback } from 'react';

export function useAudioAnalyzer() {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const currentSourceRef = useRef(null);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // Fix for browser autoplay policy: AudioContext must be initialized on user gesture
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256; // High frequency resolution for speech detection
      analyser.smoothingTimeConstant = 0.5; // Smooth transitions
      
      // Route analyser to speakers
      analyser.connect(audioContextRef.current.destination);
      analyserRef.current = analyser;
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const playAudioBuffer = useCallback(async (arrayBuffer, onStart, onEnd) => {
    initAudio();
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current;

    // Stop current playback if any
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
    }

    // Decode compressed audio (MP3 from ElevenLabs)
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      // Connect source to the analyser node
      source.connect(analyser);
      currentSourceRef.current = source;

      source.onended = () => {
        if (currentSourceRef.current === source) {
          onEnd();
          currentSourceRef.current = null;
        }
      };

      onStart();
      source.start(0);
    } catch (err) {
      console.error("Error decoding or playing audio buffer:", err);
      onEnd();
    }
  }, [initAudio]);

  const getRMSVolume = useCallback(() => {
    if (!analyserRef.current) return 0;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Fetch time-domain data (amplitude)
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      // Normalize range [0, 255] to [-1.0, 1.0]
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    
    const rms = Math.sqrt(sumSquares / bufferLength);
    return rms; // Returns a float value between 0.0 and 1.0 representing loudness
  }, []);

  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
  }, []);

  return {
    initAudio,
    playAudioBuffer,
    getRMSVolume,
    stopAudio,
    audioContext: audioContextRef.current
  };
}
