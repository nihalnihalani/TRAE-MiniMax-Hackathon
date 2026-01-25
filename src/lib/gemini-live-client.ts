/**
 * Gemini Live Client
 * Handles WebSocket connection to Gemini Multimodal Live API
 * Manages Audio Input (Mic) and Output (Speaker)
 */

import { INTERVIEW_TOOLS } from "./gemini-tools";
import { getSystemInstruction } from "./interviewer-prompt";

// Constants for Audio
const SAMPLE_RATE = 24000; // Gemini Live prefers 24kHz
const HOST = "generativelanguage.googleapis.com";
const VERSION = "v1alpha";
const MODEL = "models/gemini-2.0-flash-exp";

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
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private interviewMode: InterviewMode = 'real';
  private problemContext: ProblemContext | null = null;

  // Audio Playback Queue
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;

  public onStatusChange: (status: ConnectionStatus) => void = () => {};
  public onMessage: (message: string) => void = () => {};
  public onError: (error: Error) => void = () => {};
  public onToolsCall: (toolCalls: any[]) => Promise<any[]> = async () => [];
  public onVolume: (volume: number) => void = () => {};

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
   * This sends the problem directly to Gemini so it knows what the candidate is solving
   */
  setProblemContext(problem: ProblemContext) {
    this.problemContext = problem;
    console.log(`📋 Problem context set: ${problem.title}`);
  }

  async connect() {
    this.onStatusChange('connecting');

    try {
      const url = `wss://${HOST}/ws/google.ai.generativelanguage.${VERSION}.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = async () => {
        console.log("Gemini Live WebSocket Connected");
        this.onStatusChange('connected');
        
        // Send initial setup message
        this.sendSetupMessage();
        
        // Start Audio Input
        await this.startAudioInput();
      };

      this.ws.onmessage = async (event) => {
        await this.handleMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.error("WebSocket Error:", event);
        this.onStatusChange('error');
        this.onError(new Error("WebSocket connection error"));
      };

      this.ws.onclose = () => {
        console.log("Gemini Live WebSocket Closed");
        this.onStatusChange('disconnected');
        this.stopAudio();
      };

    } catch (error) {
      console.error("Connection failed:", error);
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
   * Send text to be spoken by Gemini Live (for wizard mode)
   * The text will be processed and returned as audio
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
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private sendSetupMessage() {
    if (!this.ws) return;

    // Get the comprehensive interviewer system instruction based on mode
    let systemInstruction = getSystemInstruction(this.interviewMode);

    // CRITICAL: Include problem context directly so Gemini knows what the interview is about
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

**IMPORTANT:** You already know the problem above. Start the interview by greeting the candidate warmly, then immediately present this problem in your own words (don't read it verbatim). Ask if they have any clarifying questions before they start coding.
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
          responseModalities: ["AUDIO"], // We want audio back
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Professional, warm female voice
              }
            }
          }
        }
      }
    };

    console.log(`🎙️ Gemini Live setup with ${this.interviewMode} mode, problem: ${this.problemContext?.title || 'none'}`);
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

    // Handle Server Content (Audio)
    if (message.serverContent) {
      if (message.serverContent.modelTurn) {
        const parts = message.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith("audio/")) {
            // Decode Base64 audio
            const audioData = this.base64ToFloat32Array(part.inlineData.data);
            this.enqueueAudio(audioData);
          }
          if (part.text) {
             this.onMessage(part.text);
          }
        }
      }
    }

    // Handle Tool Calls
    if (message.toolCall) {
      console.log("Tool Call Received:", message.toolCall);
      const functionCalls = message.toolCall.functionCalls;
      const responses = await this.onToolsCall(functionCalls);
      
      // Send Tool Response
      const toolResponse = {
        toolResponse: {
          functionResponses: responses
        }
      };
      this.ws?.send(JSON.stringify(toolResponse));
    }
  }

  // Audio Handling

  private async startAudioInput() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Simple ScriptProcessor for now (AudioWorklet is better but harder to inject without a file)
      // Buffer size 2048, 1 input channel, 1 output channel
      const processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 [-1, 1] to Int16 PCM Base64
        const pcmData = this.float32ToInt16Base64(inputData);
        
        // Send Realtime Input
        const realTimeInput = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=24000",
                data: pcmData
              }
            ]
          }
        };
        
        this.ws.send(JSON.stringify(realTimeInput));
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination); // Needed for Chrome to activate

      // Keep references to prevent GC
      (this as any).processor = processor;
      (this as any).source = source;

    } catch (err) {
      console.error("Audio Input Error:", err);
      this.onError(new Error("Microphone access failed"));
    }
  }

  private stopAudio() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  // Audio Output Utilities

  private enqueueAudio(data: Float32Array) {
    this.audioQueue.push(data);
    if (!this.isPlaying) {
      this.playQueue();
    }
  }

  private async playQueue() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;

    const buffer = this.audioContext.createBuffer(1, chunk.length, SAMPLE_RATE);
    // Type assertion needed due to TypeScript's strict ArrayBuffer typing
    buffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0);

    // Calculate RMS volume for visualization
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) {
      sum += chunk[i] * chunk[i];
    }
    const rms = Math.sqrt(sum / chunk.length);
    this.onVolume(rms); // Emit volume level (0-1 typically, but can spike higher)

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    // Simple scheduling
    const currentTime = this.audioContext.currentTime;
    // If nextPlayTime is in the past, reset it
    if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
    }
    
    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
    
    source.onended = () => {
      this.playQueue();
    };
  }

  // Data Conversion Utilities

  private float32ToInt16Base64(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to binary string
    let binary = '';
    const bytes = new Uint8Array(int16Array.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
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

    // Copy to ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);

    // Assuming PCM 16-bit LE
    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
  }
}
