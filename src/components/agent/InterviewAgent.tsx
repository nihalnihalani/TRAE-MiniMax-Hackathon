'use client';

import { useConversation } from '@elevenlabs/react';
import { useInterviewStore } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { StatusIndicator } from './StatusIndicator';
import { Visualizer } from './Visualizer';
import { Mic, MicOff } from 'lucide-react';
import { useCallback } from 'react';

export function InterviewAgent() {
  const conversation = useConversation({
    onConnect: () => console.log("Connected to ElevenLabs"),
    onMessage: (message: any) => console.log("Agent:", message),
    onError: (err: any) => console.error("Voice Error", err),
    clientTools: {
      read_candidate_code: async () => {
        const code = useInterviewStore.getState().code;
        console.log("Agent requested code:", code);
        return code; // Return string directly
      }
    }
  });

  const { status, isSpeaking, startConversation, endConversation } = conversation;

  const handleStart = async () => {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        await startConversation({
            agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "replace-with-agent-id",
            overrides: {
               agent: {
                  language: "en",
                  prompt: {
                     firstMessage: "Hello! I'm Alex. Ready to code?"
                  }
               }
            }
        });
    } catch (err) {
        console.error("Failed to start conversation:", err);
        alert("Microphone access failed or Agent ID missing.");
    }
  };

  const handleStop = async () => {
      await endConversation();
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
      <StatusIndicator status={status} />
      
      <div className="flex-1 flex justify-center">
        <Visualizer isSpeaking={isSpeaking} />
      </div>

      {status === 'connected' ? (
        <Button variant="destructive" size="icon" onClick={handleStop}>
          <MicOff className="w-4 h-4" />
        </Button>
      ) : (
        <Button variant="default" onClick={handleStart} disabled={status === 'connecting'}>
          <Mic className="w-4 h-4 mr-2" />
          Start Interview
        </Button>
      )}
    </div>
  );
}
