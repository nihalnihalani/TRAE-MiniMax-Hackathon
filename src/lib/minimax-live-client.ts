/**
 * MiniMax Live Client
 * Voice interview client using MediaRecorder + server-side STT (Deepgram)
 * and MiniMax REST API (LLM + TTS) for responses.
 */

export type InterviewMode = 'real' | 'practice';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ProblemContext {
  title: string;
  difficulty: string;
  description: string;
  constraints: string[];
  functionName: string;
  examples: any[];
  starterCode?: string;
  companyName?: string;
  tags?: string[];
}

export class MiniMaxLiveClient {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private analyserNode: AnalyserNode | null = null;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;
  private audioChunks: Blob[] = [];
  private isListening = false;
  private isSpeechDetected = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private animFrameId: number | null = null;
  private interviewMode: InterviewMode = 'real';
  private problemContext: ProblemContext | null = null;
  private history: { role: 'user' | 'model'; content: string }[] = [];
  private lastCodeContext = "";
  private sttDisabled = false; // Set true when server reports missing API key
  private abortController: AbortController | null = null;
  private _isModelSpeaking = false;

  // Callbacks
  public onStatusChange: (status: ConnectionStatus) => void = () => {};
  public onMessage: (message: string) => void = () => {};
  public onError: (error: Error) => void = () => {};
  public onToolsCall: (toolCalls: any[]) => Promise<any[]> = async () => [];
  public onVolume: (volume: number) => void = () => {};
  public onInterrupted: () => void = () => {};
  public onTurnEnd: () => void = () => {};
  public onModelSpeaking: (isSpeaking: boolean) => void = () => {};
  public onNoResponse: () => void = () => {};

  // Silence detection tuning
  private readonly SPEECH_THRESHOLD = 0.04;
  private readonly SILENCE_DURATION = 1500; // 1.5s silence = end of utterance
  private readonly MIN_AUDIO_SIZE = 4000;   // Skip tiny blobs (noise/cough)

  constructor(private apiKey: string, mode: InterviewMode = 'real') {
    this.interviewMode = mode;
  }

  setInterviewMode(mode: InterviewMode) {
    this.interviewMode = mode;
  }

  getInterviewMode() {
    return this.interviewMode;
  }

  setProblemContext(problem: ProblemContext) {
    this.problemContext = problem;
  }

  isConnected() {
    return this.isListening || this.mediaStream !== null;
  }

  // ──────────────────────────────────────────────
  // Connection lifecycle
  // ──────────────────────────────────────────────

  async connect() {
    this.onStatusChange('connecting');
    try {
      // Request microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // AudioContext for playback + analysis
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AC();

      // AnalyserNode for volume meter + silence detection
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);

      this.onStatusChange('connected');

      // Preflight check: is STT available?
      try {
        const sttCheck = await fetch('/api/stt');
        const sttStatus = await sttCheck.json();
        if (!sttStatus.available) {
          this.sttDisabled = true;
          console.warn("🔇 STT not available — DEEPGRAM_API_KEY not configured. Voice input disabled.");
        }
      } catch {
        // If preflight fails, we'll discover STT status on first POST
      }

      // Begin capturing audio (if STT is available)
      if (!this.sttDisabled) {
        this.startListening();
      }

      // Kick off the interview — tell the AI to read the full coding problem
      setTimeout(() => {
        this.handleUserMessage(
          "Start the interview. Read the COMPLETE coding problem description out loud — include the full description, walk through an example with specific numbers, and mention the constraints. Then ask if I have any questions before coding.",
          true,
        );
      }, 1000);
    } catch (error) {
      console.error("Connection failed:", error);
      this.onStatusChange('error');
      this.onError(
        error instanceof Error ? error : new Error("Failed to connect"),
      );
    }
  }

  disconnect() {
    // Abort any in-flight stream
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.stopListening();
    this.clearAudioQueue();
    this._isModelSpeaking = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.mediaRecorder = null;
    this.analyserNode = null;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onStatusChange('disconnected');
  }

  // ──────────────────────────────────────────────
  // Audio capture & silence detection
  // ──────────────────────────────────────────────

  startListening() {
    if (!this.mediaStream || this.isListening) return;
    this.isListening = true;
    this.beginRecording();
    this.runSilenceDetection();
  }

  stopListening() {
    this.isListening = false;
    this.audioChunks = []; // discard partial recording

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaRecorder?.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch { /* ignore */ }
    }
  }

  private beginRecording() {
    if (!this.mediaStream) return;

    this.audioChunks = [];
    this.isSpeechDetected = false;

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      this.mediaRecorder = new MediaRecorder(
        this.mediaStream,
        mimeType ? { mimeType } : undefined,
      );

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.start(100); // chunk every 100 ms
    } catch (err) {
      console.error("MediaRecorder start failed:", err);
    }
  }

  private runSilenceDetection() {
    if (!this.analyserNode || !this.isListening) return;

    const buf = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buf);
    const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
    const vol = avg / 255;

    this.onVolume(vol);

    if (vol > this.SPEECH_THRESHOLD) {
      // Audible speech
      if (this._isModelSpeaking && !this.isSpeechDetected) {
        console.log("🤫 Interruption detected!");
        if (this.abortController) {
          this.abortController.abort();
        }
        this.clearAudioQueue();
        this.onInterrupted();
      }

      this.isSpeechDetected = true;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.isSpeechDetected && !this.silenceTimer) {
      // Speech just ended — wait SILENCE_DURATION before finalizing
      this.silenceTimer = setTimeout(() => {
        this.silenceTimer = null;
        if (this.mediaRecorder?.state === 'recording' && this.isSpeechDetected) {
          this.isSpeechDetected = false;
          this.mediaRecorder.stop(); // triggers processRecording()
        }
      }, this.SILENCE_DURATION);
    }

    this.animFrameId = requestAnimationFrame(() => this.runSilenceDetection());
  }

  // ──────────────────────────────────────────────
  // Transcription (server-side via Deepgram)
  // ──────────────────────────────────────────────

  private async processRecording() {
    if (this.audioChunks.length === 0 || this.sttDisabled) {
      if (this.isListening && !this.sttDisabled) this.beginRecording();
      return;
    }

    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = [];

    if (blob.size < this.MIN_AUDIO_SIZE) {
      if (this.isListening) this.beginRecording();
      return;
    }

    try {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/stt', { method: 'POST', body: fd });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'STT failed' }));
        const errMsg = errData.error || 'STT failed';
        // If the server says the API key is missing, stop all future STT attempts
        if (errMsg.includes('not set') || errMsg.includes('API_KEY')) {
          console.warn("🔇 STT disabled — API key not configured. Voice input unavailable.");
          this.sttDisabled = true;
          this.onError(new Error("Speech-to-text API key not configured. Add DEEPGRAM_API_KEY to .env.local"));
          return;
        }
        throw new Error(errMsg);
      }

      const { text } = await res.json();

      if (text && text.trim()) {
        console.log("🗣️ You said:", text.trim());
        await this.handleUserMessage(text.trim());
        return; // handleUserMessage restarts listening in finally
      }
    } catch (err) {
      console.error("Transcription error:", err);
    }

    // Restart recording if we didn't enter handleUserMessage
    if (this.isListening && !this.sttDisabled) this.beginRecording();
  }

  // ──────────────────────────────────────────────
  // Chat turn (LLM + TTS via MiniMax Streaming)
  // ──────────────────────────────────────────────

  async handleUserMessage(text: string, silent = false) {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.stopListening();
    this.clearAudioQueue();
    this._isModelSpeaking = true;
    this.onModelSpeaking(true);

    let fullAIResponse = "";

    try {
      const response = await fetch('/api/interview/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          history: this.history,
          context: this.lastCodeContext,
          interviewMode: this.interviewMode,
          problemContext: this.problemContext,
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) throw new Error("Chat Stream API failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to read stream");

      const decoder = new TextDecoder();
      let buffer = "";

      if (!silent) {
        this.history.push({ role: 'user', content: text });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(cleanLine.substring(6));
            if (data.audio) {
              // Play chunk immediately and keep track of timing
              await this.queueAudioChunk(data.audio);
            }
            if (data.text) {
              fullAIResponse += data.text;
              this.onMessage(fullAIResponse);
            }
          } catch (e) {
            console.error("Error parsing stream chunk", e);
          }
        }
      }

      this.history.push({ role: 'model', content: fullAIResponse });
      this.onTurnEnd();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Stream aborted");
      } else {
        console.error("Chat error:", error);
        this.onError(error instanceof Error ? error : new Error("Chat failed"));
      }
    } finally {
      this._isModelSpeaking = false;
      this.onModelSpeaking(false);
      this.startListening();
      this.abortController = null;
    }
  }

  // ──────────────────────────────────────────────
  // Audio playback (Gapless Streaming)
  // ──────────────────────────────────────────────

  private async queueAudioChunk(base64Audio: string) {
    if (!this.audioContext) return;

    try {
      const bin = window.atob(base64Audio);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      // Manually decode PCM (16-bit, 32kHz, Mono) to avoid browser decoding errors with partial chunks
      let pcmData = bytes;
      if (pcmData.length % 2 !== 0) {
          console.warn("Received odd byte length for 16-bit PCM, trimming one byte.");
          pcmData = pcmData.slice(0, pcmData.length - 1);
      }
      
      const int16 = new Int16Array(pcmData.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 32000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect ONLY through gainNode (not directly to destination — that causes double audio / distortion)
      const gainNode = this.audioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Track this source so clearAudioQueue() can stop it
      this.scheduledSources.push(source);

      // Start time logic for gapless playback
      const now = this.audioContext.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.05; // Small buffer for first chunk
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.onVolume(0.5);

      source.onended = () => {
        // Remove from tracked sources
        const idx = this.scheduledSources.indexOf(source);
        if (idx !== -1) this.scheduledSources.splice(idx, 1);

        // Only reset volume if no more sources are scheduled
        if (this.scheduledSources.length === 0) {
          this.onVolume(0);
        }
      };
    } catch (e) {
      console.error("Audio chunk playback error:", e);
    }
  }

  async playAudio(base64Audio: string) {
    // Legacy support for non-streaming calls
    return this.queueAudioChunk(base64Audio);
  }

  // ──────────────────────────────────────────────
  // Public helpers
  // ──────────────────────────────────────────────

  sendText(text: string) {
    this.handleUserMessage(text);
  }

  sendCodeContext(code: string) {
    this.lastCodeContext = code;
  }

  promptToSpeak() {
    if (!this.isListening && this.mediaStream) {
      this.startListening();
    }
  }

  clearAudioQueue() {
    // Stop ALL scheduled audio sources
    for (const src of this.scheduledSources) {
      try { src.stop(); } catch { /* may be already stopped */ }
    }
    this.scheduledSources = [];
    this.nextStartTime = 0;
    this.onVolume(0);
  }
}

// Export as GeminiLiveClient alias for compatibility
export { MiniMaxLiveClient as GeminiLiveClient };
