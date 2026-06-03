import { useCallback, useState } from 'react';

export function useElevenLabsTTS() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTTS = useCallback(async (text, voiceId, apiKey) => {
    setLoading(true);
    setError(null);

    // Standard ElevenLabs configuration values
    const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '21m00Tcm4TlvDq8ikWAM'}`; // Rachel Voice default

    try {
      if (!apiKey) {
        throw new Error("ElevenLabs API Key is missing. Please configure it in your interview settings.");
      }

      const response = await fetch(ELEVENLABS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs Synthesis Failed: ${response.status} - ${errText}`);
      }

      // Convert response payload directly to ArrayBuffer for Web Audio API consumption
      const arrayBuffer = await response.arrayBuffer();
      setLoading(false);
      return arrayBuffer;
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    fetchTTS,
    loading,
    error
  };
}
