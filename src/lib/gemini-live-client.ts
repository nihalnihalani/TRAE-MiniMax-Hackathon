/**
 * Gemini Live Client v2
 * Enhanced WebSocket connection to Gemini Multimodal Live API
 * Features:
 * - Native audio model (gemini-2.0-flash-live)
 * - Voice Activity Detection (VAD) for natural turn-taking
 * - Interruption handling - stops when user speaks
 * - Proactive tool calling
 */

import { INTERVIEW_TOOLS } from "./gemini-tools";
import { getSystemInstruction } from "./interviewer-prompt";

// Audio sample rates per Gemini Live API spec
const INPUT_SAMPLE_RATE = 16000;  // Input MUST be 16kHz
const OUTPUT_SAMPLE_RATE = 24000; // Output is always 24kHz
const HOST = "generativelanguage.googleapis.com";
const VERSION = "v1alpha";

// Use the native audio model - update model name as Gemini releases new versions
const MODEL = "models/gemini-2.5-flash-native-audio-dialog";

// Interview mode type
export type InterviewMode = 'real' | 'practice';

// Problem context to send to Gemini directly at startup
export interface ProblemContext {
  title: string;
  difficulty: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  functionName: string;
  starterCode?: string;
  companyName?: string;
  tags?: string[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private interviewMode: InterviewMode = 'real';
  private problemContext: ProblemContext | null = null;

  // Audio Playback Queue
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private currentSource: AudioBufferSourceNode | null = null;
  private scheduledSources: AudioBufferSourceNode[] = []; // Track ALL scheduled sources

  // Callbacks
  public onStatusChange: (status: ConnectionStatus) => void = () => {};
  public onMessage: (message: string) => void = () => {};
  public onError: (error: Error) => void = () => {};
  public onToolsCall: (toolCalls: any[]) => Promise<any[]> = async () => [];
  public onVolume: (volume: number) => void = () => {};
  public onInterrupted: () => void = () => {};
  public onTurnEnd: () => void = () => {};
  public onModelSpeaking: (isSpeaking: boolean) => void = () => {};

  constructor(private apiKey: string, mode: InterviewMode = 'real') {
    this.interviewMode = mode;
  }

  /**
   * Set the interview mode (real or practice)
   */
  setInterviewMode(mode: InterviewMode) {
    this.interviewMode = mode;
  }

  /**
   * Get the current interview mode
   */
  getInterviewMode(): InterviewMode {
    return this.interviewMode;
  }

  /**
   * Set the problem context - MUST be called before connect()
   */
  setProblemContext(problem: ProblemContext) {
    this.problemContext = problem;
    console.log(`📋 Problem context set: ${problem.title}`);
  }

  async connect() {
    console.log("🚀 Starting Gemini Live connection...");
    this.onStatusChange('connecting');

    try {
      // Validate API key
      if (!this.apiKey || this.apiKey.length < 10) {
        throw new Error("Invalid or missing Gemini API key");
      }
      console.log("✅ API key validated");

      // Pre-check microphone permission before connecting
      try {
        const permissionStatus = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
        console.log("🎤 Microphone permission status:", permissionStatus?.state);
        if (permissionStatus?.state === 'denied') {
          throw new Error("Microphone permission denied. Please enable it in browser settings.");
        }
      } catch (permErr) {
        // permissions.query may not be supported, continue anyway
        console.log("Permission check not supported, continuing...");
      }

      const url = `wss://${HOST}/ws/google.ai.generativelanguage.${VERSION}.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      console.log("🔌 Connecting to WebSocket...");
      this.ws = new WebSocket(url);

      this.ws.onopen = async () => {
        console.log("🎙️ Gemini Live WebSocket Connected!");
        this.onStatusChange('connected');

        // Send initial setup message with VAD config
        console.log("📤 Sending setup message...");
        this.sendSetupMessage();

        // Start Audio Input
        console.log("🎤 Starting audio input...");
        await this.startAudioInput();
      };

      this.ws.onmessage = async (event) => {
        await this.handleMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.error("❌ WebSocket Error:", event);
        this.onStatusChange('error');
        this.onError(new Error("WebSocket connection error - check if API key is valid"));
      };

      this.ws.onclose = (event) => {
        console.log("🔌 Gemini Live WebSocket Closed:", event.code, event.reason);
        this.onStatusChange('disconnected');
        this.stopAudio();
      };

    } catch (error) {
      console.error("❌ Connection failed:", error);
      this.onStatusChange('error');
      this.onError(error instanceof Error ? error : new Error("Failed to connect"));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopAudio();
  }

  /**
   * Send text input (for wizard mode or manual input)
   */
  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send text: WebSocket not connected");
      return;
    }

    const clientContent = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(clientContent));
  }

  /**
   * Send code context update to Gemini (so it can see what the candidate is typing)
   * This sends the code as a system context message, not requiring a response
   */
  sendCodeContext(code: string, silent: boolean = true) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Truncate if too long
    const truncatedCode = code.length > 10000
      ? code.substring(0, 10000) + "\n... [code truncated]"
      : code;

    const contextMessage = silent
      ? `[CONTEXT UPDATE - Candidate's current code in editor]\n\`\`\`\n${truncatedCode}\n\`\`\`\n[End of code - React naturally. If they seem stuck, offer guidance. If they're making progress, encourage them. Don't repeat back the entire code.]`
      : `Here's my current code:\n\`\`\`\n${truncatedCode}\n\`\`\``;

    const clientContent = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text: contextMessage }]
          }
        ],
        turnComplete: true
      }
    };

    console.log("📝 Sending code context to Gemini (length:", code.length, ")");
    this.ws.send(JSON.stringify(clientContent));
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Clear audio queue and stop ALL playback immediately (called on interruption)
   */
  clearAudioQueue() {
    // Clear pending queue
    this.audioQueue = [];

    // Stop ALL scheduled audio sources immediately
    for (const source of this.scheduledSources) {
      try {
        source.stop(0); // Stop immediately
        source.disconnect();
      } catch (e) {
        // Already stopped
      }
    }
    this.scheduledSources = [];

    // Also stop current source if any
    if (this.currentSource) {
      try {
        this.currentSource.stop(0);
        this.currentSource.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this.nextPlayTime = 0;
    this.onModelSpeaking(false);
    this.onVolume(0);
    console.log("🔇 Audio stopped immediately (user interrupted)");
  }

  private sendSetupMessage() {
    if (!this.ws) return;

    // Build comprehensive system instruction with problem context
    let systemInstruction = getSystemInstruction(this.interviewMode);

    if (this.problemContext) {
      const problemSection = `

## CURRENT INTERVIEW PROBLEM

**Title:** ${this.problemContext.title}
**Difficulty:** ${this.problemContext.difficulty}
${this.problemContext.companyName ? `**Company Style:** ${this.problemContext.companyName}` : ''}
${this.problemContext.tags ? `**Tags:** ${this.problemContext.tags.join(', ')}` : ''}

**Problem Description:**
${this.problemContext.description}

**Examples:**
${this.problemContext.examples.map((ex, i) => `
Example ${i + 1}:
- Input: ${ex.input}
- Output: ${ex.output}${ex.explanation ? `
- Explanation: ${ex.explanation}` : ''}`).join('\n')}

**Constraints:**
${this.problemContext.constraints.map(c => `- ${c}`).join('\n')}

**Function to Implement:** \`${this.problemContext.functionName}\`

---

**START NOW:** Greet the candidate warmly (e.g., "Hey! I'm Alexis, nice to meet you!"), then present this problem in your own words. Don't read verbatim. Ask if they have questions before coding.
`;
      systemInstruction = systemInstruction + problemSection;
    }

    const setupMessage = {
      setup: {
        model: MODEL,
        tools: INTERVIEW_TOOLS,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Warm, professional voice
              }
            },
            // Enable affective dialog for natural responses
            languageCode: "en-US"
          }
        },
        // Voice Activity Detection - use defaults for reliable behavior
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false
          }
        }
      }
    };

    console.log(`🎙️ Gemini Live setup: ${this.interviewMode} mode, model: ${MODEL}`);
    console.log(`📋 Problem: ${this.problemContext?.title || 'none'}`);
    this.ws.send(JSON.stringify(setupMessage));
  }

  private async handleMessage(data: any) {
    let message;
    if (data instanceof Blob) {
      const text = await data.text();
      message = JSON.parse(text);
    } else {
      message = JSON.parse(data);
    }

    // Debug: Log all incoming messages
    console.log("📥 Received message:", Object.keys(message));

    // Handle setup complete
    if (message.setupComplete) {
      console.log("✅ Gemini Live setup complete - ready to talk!");
    }

    // Handle Server Content (Audio/Text)
    if (message.serverContent) {
      // Check for interruption - user started speaking while model was talking
      if (message.serverContent.interrupted === true) {
        console.log("🛑 Model interrupted by user");
        this.clearAudioQueue();
        this.onInterrupted();
      }

      // Check for turn complete
      if (message.serverContent.turnComplete === true) {
        console.log("✅ Model turn complete");
        this.onTurnEnd();
      }

      // Process model's turn content
      if (message.serverContent.modelTurn) {
        const parts = message.serverContent.modelTurn.parts || [];
        for (const part of parts) {
          // Handle audio output
          if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/")) {
            const audioData = this.base64ToFloat32Array(part.inlineData.data);
            this.enqueueAudio(audioData);
          }
          // Handle text output (transcript)
          if (part.text) {
            this.onMessage(part.text);
          }
        }
      }
    }

    // Handle Tool Calls
    if (message.toolCall) {
      const functionCalls = message.toolCall.functionCalls || [];
      console.log("🛠️ Tool Call Received:", functionCalls.map((f: any) => ({ name: f.name, id: f.id })));

      try {
        // Execute tools with timeout
        const responses = await Promise.race([
          this.onToolsCall(functionCalls),
          new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error("Tool execution timeout")), 30000)
          )
        ]);

        // Send Tool Response with function call IDs (required by Gemini)
        const toolResponse = {
          toolResponse: {
            functionResponses: responses.map((r: any) => ({
              id: r.id, // Include the function call ID from Gemini
              name: r.name,
              response: r.response
            }))
          }
        };

        console.log("📤 Sending tool responses:", toolResponse.toolResponse.functionResponses.map((r: any) => ({ name: r.name, id: r.id })));
        this.ws?.send(JSON.stringify(toolResponse));
      } catch (error) {
        console.error("❌ Tool execution failed:", error);
        // Send error response for all tools with their IDs
        const errorResponses = functionCalls.map((call: any) => ({
          id: call.id,
          name: call.name,
          response: { error: `Tool execution failed: ${error}` }
        }));

        this.ws?.send(JSON.stringify({
          toolResponse: { functionResponses: errorResponses }
        }));
      }
    }

    // Handle errors
    if (message.error) {
      console.error("❌ Gemini API Error:", message.error);
      this.onError(new Error(message.error.message || "Gemini API error"));
    }
  }

  // Audio Input Handling

  private async startAudioInput() {
    try {
      // Get microphone access with enhanced audio processing
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: INPUT_SAMPLE_RATE },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
      });

      // Create AudioContext after getting microphone permission
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported in this browser");
      }

      // Input AudioContext at 16kHz (required by Gemini Live API)
      this.audioContext = new AudioContextClass({
        sampleRate: INPUT_SAMPLE_RATE,
        latencyHint: 'interactive',
      });

      // Output AudioContext at 24kHz (Gemini outputs at 24kHz)
      this.outputAudioContext = new AudioContextClass({
        sampleRate: OUTPUT_SAMPLE_RATE,
        latencyHint: 'interactive',
      });

      // Resume audio contexts if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }

      if (!this.audioContext) {
        throw new Error("Failed to create AudioContext");
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Add a high-pass filter to remove low frequency noise/rumble
      const highPassFilter = this.audioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 80; // Cut frequencies below 80Hz

      // Add a low-pass filter to remove high frequency noise
      const lowPassFilter = this.audioContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = 8000; // Cut frequencies above 8kHz for voice

      // Connect filters: source -> highpass -> lowpass -> processor
      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);

      // Use ScriptProcessor with smaller buffer for lower latency
      const processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate input volume for visualization
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const inputVolume = Math.sqrt(sum / inputData.length);

        // Only emit volume if significant (avoid noise floor)
        if (inputVolume > 0.01) {
          this.onVolume(inputVolume);
        }

        // Convert to Int16 PCM Base64
        const pcmData = this.float32ToInt16Base64(inputData);

        // Send audio chunk
        const realtimeInput = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                data: pcmData
              }
            ]
          }
        };

        this.ws.send(JSON.stringify(realtimeInput));
      };

      // Connect filter output to processor
      lowPassFilter.connect(processor);
      processor.connect(this.audioContext.destination);

      // Store references for cleanup
      (this as any).processor = processor;
      (this as any).source = source;
      (this as any).highPassFilter = highPassFilter;
      (this as any).lowPassFilter = lowPassFilter;

      console.log("🎤 Microphone active at", INPUT_SAMPLE_RATE, "Hz with noise filtering");

    } catch (err: any) {
      console.error("Audio Input Error:", err);

      // Provide specific error messages
      let errorMessage = "Microphone access failed";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Microphone permission denied. Please allow microphone access and try again.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No microphone found. Please connect a microphone and try again.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Microphone is in use by another application.";
      } else if (err.message) {
        errorMessage = `Microphone error: ${err.message}`;
      }

      this.onError(new Error(errorMessage));
      this.onStatusChange('error');
    }
  }

  private stopAudio() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close().catch(() => {});
      this.outputAudioContext = null;
    }
    this.clearAudioQueue();
  }

  // Audio Output - Seamless playback with pre-scheduling

  private enqueueAudio(data: Float32Array) {
    this.audioQueue.push(data);
    this.onModelSpeaking(true);

    // Schedule audio immediately for seamless playback
    this.scheduleAudioPlayback();
  }

  private scheduleAudioPlayback() {
    const ctx = this.outputAudioContext;
    if (!ctx) return;

    // Schedule all queued chunks ahead of time for gapless playback
    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!;

      const buffer = ctx.createBuffer(1, chunk.length, OUTPUT_SAMPLE_RATE);
      buffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0);

      // Calculate output volume for visualization
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) {
        sum += chunk[i] * chunk[i];
      }
      const rms = Math.sqrt(sum / chunk.length);
      this.onVolume(rms * 2);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Get current time and ensure we schedule in the future
      const currentTime = ctx.currentTime;
      if (this.nextPlayTime < currentTime) {
        // Add small buffer (20ms) to prevent underruns
        this.nextPlayTime = currentTime + 0.02;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      // Track ALL scheduled sources for proper interruption handling
      this.scheduledSources.push(source);
      this.currentSource = source;

      // Mark as playing
      this.isPlaying = true;

      // Clean up finished sources from tracking array
      source.onended = () => {
        // Remove this source from tracking
        const idx = this.scheduledSources.indexOf(source);
        if (idx > -1) {
          this.scheduledSources.splice(idx, 1);
        }

        // Check if all audio is done
        if (this.scheduledSources.length === 0 && this.audioQueue.length === 0) {
          this.isPlaying = false;
          this.onModelSpeaking(false);
          this.onVolume(0);
          this.currentSource = null;
        }
      };
    }
  }

  // Data Conversion

  private float32ToInt16Base64(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    let binary = '';
    const bytes = new Uint8Array(int16Array.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToFloat32Array(base64: string): Float32Array<ArrayBuffer> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);

    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
  }
}
