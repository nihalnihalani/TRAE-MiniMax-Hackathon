/**
 * MiniMax Live Client
 * Replaces GeminiLiveClient using MiniMax REST API (LLM + TTS) and Browser STT.
 */

export type InterviewMode = 'real' | 'practice';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ProblemContext {
  title: string;
  difficulty: string;
  description: string;
  constraints: string[];
  functionName: string;
  examples: any[]; // Added to match interface
  starterCode?: string;
  companyName?: string;
  tags?: string[];
}

export class MiniMaxLiveClient {
  private recognition: any = null; // SpeechRecognition
  private audioContext: AudioContext | null = null;
  private isListening = false;
  private interviewMode: InterviewMode = 'real';
  private problemContext: ProblemContext | null = null;
  private history: { role: 'user' | 'model'; content: string }[] = [];
  private lastCodeContext = "";

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
      return this.isListening || (this.recognition !== null);
  }

  async connect() {
    this.onStatusChange('connecting');
    try {
      // Initialize AudioContext for playback
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Speech Recognition not supported in this browser (try Chrome)");
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Turn-based
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        console.log("🎤 Listening...");
      };

      this.recognition.onresult = async (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           this.handleUserMessage(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
           this.onError(new Error("Microphone permission denied"));
        }
      };
      
      this.recognition.onend = () => {
          if (this.isListening) {
              try {
                  this.recognition.start();
              } catch {
                  // ignore
              }
          }
      };

      this.startListening();
      this.onStatusChange('connected');
      
      // Initial Greeting
      setTimeout(() => {
          this.handleUserMessage("Hello, I'm ready for the interview.", true);
      }, 1000);

    } catch (error) {
      console.error("Connection failed:", error);
      this.onStatusChange('error');
      this.onError(error instanceof Error ? error : new Error("Failed to connect"));
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        // Already started
      }
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  async handleUserMessage(text: string, silent = false) {
    // Stop listening while processing to avoid hearing self
    this.stopListening();
    this.onModelSpeaking(true);

    try {
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          history: this.history,
          context: this.lastCodeContext
        })
      });

      if (!response.ok) throw new Error("Chat API failed");

      const data = await response.json();
      
      if (!silent) {
        this.history.push({ role: 'user', content: text });
      }
      this.history.push({ role: 'model', content: data.text });

      this.onMessage(data.text);

      if (data.audio) {
        await this.playAudio(data.audio);
      }
      
      this.onTurnEnd();

    } catch (error) {
      console.error("Chat error:", error);
      this.onError(error instanceof Error ? error : new Error("Chat failed"));
    } finally {
      this.onModelSpeaking(false);
      this.startListening(); 
    }
  }

  async playAudio(base64Audio: string) {
    if (!this.audioContext) return;
    
    try {
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      // Visualize volume
      // Simplified visualization for now
      this.onVolume(0.5); 
      
      return new Promise<void>((resolve) => {
        source.onended = () => {
            this.onVolume(0);
            resolve();
        };
      });
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  disconnect() {
    this.stopListening();
    this.recognition = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onStatusChange('disconnected');
  }

  sendText(text: string) {
    this.handleUserMessage(text);
  }

  sendCodeContext(code: string, silent = true) {
    this.lastCodeContext = code;
  }

  promptToSpeak() {
      // Not implemented
  }

  clearAudioQueue() {
    if (this.audioContext) {
        this.audioContext.suspend();
        this.audioContext.resume();
    }
  }
}

