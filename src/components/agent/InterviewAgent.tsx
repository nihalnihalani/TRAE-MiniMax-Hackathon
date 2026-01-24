'use client';

import { useConversation } from '@elevenlabs/react';
import { useInterviewStore } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { StatusIndicator } from './StatusIndicator';
import { Visualizer } from './Visualizer';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Mic, MicOff, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { agentReasoning } from '@/lib/agent-reasoning';
import { getAgentTools } from '@/lib/agent-tools';
import { WIZARD_SCRIPT, WIZARD_SHORTCUT } from '@/lib/constants';

export function InterviewAgent() {
    const { code, isWizardMode, workspaceId } = useInterviewStore();
    const [scriptIndex, setScriptIndex] = useState(0);
    const [isThinking, setIsThinking] = useState(false);
    const [currentAction, setCurrentAction] = useState<string>('');

    // Memoize tools once - they access the latest state via logic inside getAgentTools
    const tools = useMemo(() => getAgentTools(null), []);

    const conversation = useConversation({
        onConnect: () => {
            console.log("✅ Connected to ElevenLabs");
        },
        onDisconnect: () => {
            console.log("❌ Disconnected from ElevenLabs");
        },
        onMessage: (message: any) => {
            console.log("📩 Agent message:", message);
            console.log("Message type:", message.type);
            console.log("Message content:", message.message || message.text || message);

            // Store agent messages in transcript
            const messageText = message.message || message.text || JSON.stringify(message);
            if (messageText && typeof messageText === 'string') {
                useInterviewStore.getState().addTranscriptMessage('agent', messageText, 'audio');
            }
        },
        onError: (err: any) => {
            console.error("❌ Voice Error:", err);
            console.error("Error details:", JSON.stringify(err, null, 2));
            console.error("Error type:", typeof err);
            console.error("Error message:", err?.message);
            console.error("Error code:", err?.code);
        },
        onStatusChange: (status: any) => {
            console.log("🔄 Status changed to:", status);
        },
        onModeChange: (mode: any) => {
            console.log("🎭 Mode changed to:", mode);
        },
        clientTools: tools
    });

    const { status, isSpeaking, startSession, endSession } = conversation;

    // Keyboard shortcut for Wizard Mode Next Line
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey === WIZARD_SHORTCUT.ctrl && e.shiftKey === WIZARD_SHORTCUT.shift && e.key === WIZARD_SHORTCUT.key) {
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

        // Advance index immediately
        setScriptIndex(prev => prev + 1);

        try {
            // Force "Thinking" state visually
            setIsThinking(true);
            setCurrentAction("Wizard speaking...");

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error("TTS failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audio.onended = () => {
                setIsThinking(false);
                URL.revokeObjectURL(url);
            };

            await audio.play();

        } catch (err) {
            console.error("Wizard Audio Error:", err);
            setIsThinking(false);
        }
    };

    const handleStart = async () => {
        console.log("🎯 Starting interview session...");
        console.log("WorkspaceId:", workspaceId);
        console.log("Agent ID:", process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);

        try {
            console.log("📱 Requesting microphone access...");
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("✅ Microphone access granted");

            const sessionOptions = {
                agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "replace-with-agent-id",
                // NOTE: Removed overrides - agent config should be set on ElevenLabs platform
                // The overrides were causing immediate disconnection
            };

            console.log("🚀 Starting ElevenLabs session with options:", sessionOptions);

            // ElevenLabs SDK session options - using type assertion via unknown
            await (startSession as unknown as (options: Record<string, unknown>) => Promise<void>)(sessionOptions);

            console.log("✅ Session started successfully");
        } catch (err) {
            console.error("❌ Failed to start conversation:", err);
            console.error("Error stack:", (err as Error).stack);
            alert("Microphone access failed or Agent ID missing. Please check your browser permissions and .env settings.");
        }
    };

    const handleStop = async () => {
        try {
            await endSession();
        } catch (err) {
            console.error("Failed to end session:", err);
        }
    };

    return (
        <div id="agent-container" className="flex flex-col gap-4">
            {/* Thinking Indicator */}
            {isThinking && (
                <ThinkingIndicator isThinking={isThinking} currentAction={currentAction} />
            )}

            <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
                <StatusIndicator status={status} />

                <div className="flex-1 w-full min-w-0">
                    <Visualizer isSpeaking={isSpeaking} />
                </div>

                {status === 'connected' ? (
                    <Button variant="destructive" size="icon" onClick={handleStop}>
                        <MicOff className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        variant="default"
                        onClick={handleStart}
                        disabled={status === 'connecting' || !workspaceId}
                        title={!workspaceId ? "Waiting for workspace..." : undefined}
                    >
                        <Mic className="w-4 h-4 mr-2" />
                        {!workspaceId ? "Initializing..." : "Start Interview"}
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
