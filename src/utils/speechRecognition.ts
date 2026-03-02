/** Thin wrapper around the Web Speech API (SpeechRecognition). */

// Browser prefixed APIs
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function isSpeechRecognitionSupported(): boolean {
  return SpeechRecognitionAPI != null;
}

export interface SpeechSession {
  stop: () => void;
}

interface SpeechOptions {
  lang?: string;
  onInterimResult?: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
}

export function startSpeechRecognition(options: SpeechOptions): SpeechSession {
  if (!SpeechRecognitionAPI) {
    options.onError('Speech recognition not supported in this browser');
    return { stop: () => {} };
  }

  const recognition = new SpeechRecognitionAPI();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.lang || 'en-US';

  let finalTranscript = '';
  let lastInterim = '';

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }
    lastInterim = finalTranscript + interim;
    if (options.onInterimResult) {
      options.onInterimResult(lastInterim);
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech') return; // not a real error
    options.onError(event.error || 'Speech recognition error');
  };

  recognition.onend = () => {
    // Chrome often skips converting interim→final on stop(), so fall back
    // to the last interim text if no final transcript was produced.
    const text = finalTranscript.trim() || lastInterim.trim();
    if (text) {
      options.onFinalResult(text);
    }
    options.onEnd?.();
  };

  recognition.start();

  return {
    stop: () => {
      try { recognition.stop(); } catch {}
    },
  };
}
