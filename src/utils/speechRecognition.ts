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
    if (options.onInterimResult) {
      options.onInterimResult(finalTranscript + interim);
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech') return; // not a real error
    options.onError(event.error || 'Speech recognition error');
  };

  recognition.onend = () => {
    if (finalTranscript.trim()) {
      options.onFinalResult(finalTranscript.trim());
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
