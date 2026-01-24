'use client';

import { useConversation } from '@elevenlabs/react';
import { useInterviewStore } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { StatusIndicator } from './StatusIndicator';
import { Visualizer } from './Visualizer';
import { Mic, MicOff, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const WIZARD_SCRIPT = [
  "Hi there! I'm Alex. Today we're going to work on reversing a linked list. Can you start by defining the Node class?",
  "Great start. Now, how would you handle the prev pointer in the reversal function?",
  "Hmm, take a look at line 15. Are we updating the head reference correctly?",
  "Excellent work. You nailed the pointer manipulation."
];

export function InterviewAgent() {
  const { code, isWizardMode } = useInterviewStore();
  const [scriptIndex, setScriptIndex] = useState(0);

  const conversation = useConversation({
    onConnect: () => console.log("Connected to ElevenLabs"),
    onMessage: (message: any) => console.log("Agent:", message),
    onError: (err: any) => console.error("Voice Error", err),
    clientTools: {
      read_candidate_code: async () => {
        console.log("Agent requested code:", code);
        return code; 
      }
    }
  });

  const { status, isSpeaking, startConversation, endConversation } = conversation;

  // Keyboard shortcut for Wizard Mode Next Line
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
         if (isWizardMode) {
             triggerWizardLine();
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWizardMode, scriptIndex]);

  const triggerWizardLine = async () => {
     const text = WIZARD_SCRIPT[scriptIndex % WIZARD_SCRIPT.length];
     console.log("Wizard Mode Triggered:", text);
     
     // NOTE: ElevenLabs SDK doesn't expose a direct "speak this text" function easily 
     // when in conversation mode without sending it as a hidden user message or similar hack.
     // For this demo, we might just log it or assume we'd use a separate TTS call if strictly needed.
     // However, a simpler approach for "Wizard" in a real interview app is often just 
     // having the interviewer type into a chat box that speaks.
     
     // Since the SDK is 'conversational', we can't easily force the agent to say X 
     // without sending a prompt like "Say exactly this: X".
     
     // For now, we will just advance the index and log it, assuming the user might 
     // be simulating the "Happy Path" naturally.
     
     setScriptIndex(prev => prev + 1);
  };

  const handleStart = async () => {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        await startConversation({
            agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "replace-with-agent-id",
            overrides: {
               agent: {
                  language: "en",
                  prompt: {
                     firstMessage: isWizardMode 
                       ? WIZARD_SCRIPT[0] // Force first script line
                       : "Hello! I'm Alex. Ready to code?"
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
    <div className="flex flex-col gap-4">
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
        
        {isWizardMode && (
            <div className="text-xs text-purple-400 bg-purple-900/20 p-2 rounded border border-purple-500/30 flex items-center gap-2">
                <Wand2 className="w-3 h-3" />
                Wizard Mode Active. Next: "{WIZARD_SCRIPT[scriptIndex % WIZARD_SCRIPT.length]}"
            </div>
        )}
    </div>
  );
}
