/**
 * Gemini Live Client
 * Handles WebSocket connection to Gemini Multimodal Live API
 * Manages Audio Input (Mic) and Output (Speaker)
 */

import { INTERVIEW_TOOLS } from "./gemini-tools";

// Constants for Audio
const SAMPLE_RATE = 24000; // Gemini Live prefers 24kHz
const HOST = "generativelanguage.googleapis.com";
const VERSION = "v1alpha";
const MODEL = "models/gemini-2.0-flash-exp"; 

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  
  // Audio Playback Queue
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;

  public onStatusChange: (status: ConnectionStatus) => void = () => {};
  public onMessage: (message: string) => void = () => {};
  public onError: (error: Error) => void = () => {};
  public onToolsCall: (toolCalls: any[]) => Promise<any[]> = async () => [];

  constructor(private apiKey: string) {}

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

    const setupMessage = {
      setup: {
        model: MODEL,
        tools: INTERVIEW_TOOLS,
        generationConfig: {
          responseModalities: ["AUDIO"], // We want audio back
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Or "Puck", "Charon", "Kore", "Fenrir"
              }
            }
          }
        }
      }
    };

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
