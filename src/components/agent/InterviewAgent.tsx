'use client';

import { useConversation } from '@elevenlabs/react';
import { useInterviewStore } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { StatusIndicator } from './StatusIndicator';
import { Visualizer } from './Visualizer';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Mic, MicOff, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { agentReasoning } from '@/lib/agent-reasoning';

const WIZARD_SCRIPT = [
    "Hi there! I'm Alex. Today we're going to work on reversing a linked list. Can you start by defining the Node class?",
    "Great start. Now, how would you handle the prev pointer in the reversal function?",
    "Hmm, take a look at line 15. Are we updating the head reference correctly?",
    "Excellent work. You nailed the pointer manipulation."
];

export function InterviewAgent() {
    const { code, isWizardMode, workspaceId } = useInterviewStore();
    const [scriptIndex, setScriptIndex] = useState(0);
    const [isThinking, setIsThinking] = useState(false);
    const [currentAction, setCurrentAction] = useState<string>('');

    const conversation = useConversation({
        onConnect: () => console.log("Connected to ElevenLabs"),
        onMessage: (message: any) => console.log("Agent:", message),
        onError: (err: any) => console.error("Voice Error", err),
        clientTools: {
            read_candidate_code: async () => {
                console.log("Agent requested code read");
                // Retrieve code from Zustand store state directly to ensure freshness
                const currentCode = useInterviewStore.getState().code;
                return currentCode || "No code written yet.";
            },
            read_sandbox_file: async ({ path }: { path: string }) => {
                console.log("Agent requested file read:", path);
                if (!workspaceId) return "No active workspace.";

                try {
                    const response = await fetch('/api/sandbox/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workspaceId, path })
                    });
                    const data = await response.json();
                    return data.content || "File not found or empty.";
                } catch (e) {
                    console.error(e);
                    return "Error reading file.";
                }
            },
            run_coderabbit_analysis: async () => {
                console.log("Agent requested CodeRabbit analysis");
                if (!workspaceId) return "No active workspace.";

                try {
                    const response = await fetch('/api/analysis/coderabbit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workspaceId }) // CodeRabbit CLI reads from FS directly
                    });
                    const data = await response.json();
                    return JSON.stringify(data);
                } catch (e) {
                    console.error(e);
                    return "Error running analysis.";
                }
            },
            run_code: async () => {
                console.log("Agent requested code execution");
                if (!workspaceId) return "No active workspace.";
                // Trigger execution via API
                // Note: This duplicates the "Run" button logic but gives Agent control
                try {
                    const response = await fetch('/api/sandbox/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workspaceId, code, language: 'python' }) // default to python for now
                    });
                    const result = await response.json();
                    return `Exit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
                } catch (e) {
                    return "Error executing code.";
                }
            },
            install_dependency: async ({ packageName, manager }: { packageName: string, manager: string }) => {
                console.log(`Agent requested install: ${packageName} via ${manager}`);
                if (!workspaceId) return "No active workspace.";
                try {
                    const response = await fetch('/api/sandbox/install', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workspaceId, packageName, manager })
                    });
                    const result = await response.json();
                    if (result.isError) {
                        return `Failed to install ${packageName}: ${result.stderr}`;
                    }
                    return `Successfully installed ${packageName}. stdout: ${result.stdout}`;
                } catch (e) {
                    console.error(e);
                    return "Error installing dependency.";
                }
            },
            run_hidden_test: async ({ testCode }: { testCode: string }) => {
                console.log("Agent requested hidden test execution");
                if (!workspaceId) return "No active workspace.";
                try {
                    const response = await fetch('/api/sandbox/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workspaceId, testCode })
                    });
                    const result = await response.json();
                    return `Test Execution Result:\nExit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
                } catch (e) {
                    console.error(e);
                    return "Error executing hidden test.";
                }
            },
            get_integrity_status: async () => {
                const store = useInterviewStore.getState();
                // Check if integrity slice exists (it will be added next)
                // @ts-ignore
                if (store.getIntegrityReport) {
                    // @ts-ignore
                    return store.getIntegrityReport();
                }
                return "Integrity monitoring not available.";
            }
        }
    });

    const { status, isSpeaking, startSession, endSession } = conversation;

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
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // @ts-ignore
            await startSession({
                agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "replace-with-agent-id",
                overrides: {
                    agent: {
                        language: "en",
                        firstMessage: isWizardMode
                            ? WIZARD_SCRIPT[0] // Force first script line
                            : "Hello! I'm Alex. Ready to code?",
                        prompt: {
                            prompt: "You are a helpful interviewer."
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Failed to start conversation:", err);
            alert("Microphone access failed or Agent ID missing. Please check your browser permissions and .env settings.");
        }
    };

    const handleStop = async () => {
        await endSession();
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Thinking Indicator */}
            {isThinking && (
                <ThinkingIndicator isThinking={isThinking} currentAction={currentAction} />
            )}

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
