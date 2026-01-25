'use client';

import { useInterviewStore } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { StatusIndicator } from './StatusIndicator';
import { Visualizer } from './Visualizer';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Mic, MicOff, Wand2, GraduationCap } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { getAgentTools } from '@/lib/agent-tools';
import { WIZARD_SCRIPT, WIZARD_SHORTCUT } from '@/lib/constants';
import { GeminiLiveClient, ConnectionStatus, InterviewMode, ProblemContext } from '@/lib/gemini-live-client';
import { PROBLEMS } from '@/data/problems';
import { COMPANIES } from '@/data/company-problems';

export function InterviewAgent() {
    const { code, isWizardMode, workspaceId, interviewMode, currentProblemId, selectedCompanyId } = useInterviewStore();
    const [scriptIndex, setScriptIndex] = useState(0);
    const [isThinking, setIsThinking] = useState(false);
    const [currentAction, setCurrentAction] = useState<string>('');
    
    // Gemini Live Client State
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);
    const clientRef = useRef<GeminiLiveClient | null>(null);

    // Tools for Gemini
    const toolFunctions = useMemo(() => getAgentTools(workspaceId), [workspaceId]);

    const handleToolsCall = async (functionCalls: any[]) => {
        console.log("🛠️ Handling Tool Calls:", functionCalls);
        const responses = [];
        
        for (const call of functionCalls) {
            const name = call.name;
            const args = call.args;
            const fn = (toolFunctions as any)[name];
            
            if (fn) {
                setIsThinking(true);
                setCurrentAction(`Running ${name}...`);
                try {
                    const result = await fn(args);
                    responses.push({
                        name: name,
                        response: { result: result } 
                    });
                } catch (err) {
                    responses.push({
                        name: name,
                        response: { error: String(err) }
                    });
                }
                setIsThinking(false);
            } else {
                console.warn(`Tool ${name} not found`);
                responses.push({
                    name: name,
                    response: { error: "Tool not found" }
                });
            }
        }
        return responses;
    };

    // Initialize Client
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API Key missing");
            return;
        }

        // Create client with current interview mode (real or practice)
        const mode: InterviewMode = interviewMode === 'practice' ? 'practice' : 'real';
        const client = new GeminiLiveClient(apiKey, mode);

        client.onStatusChange = (s) => setStatus(s);
        client.onToolsCall = handleToolsCall;
        client.onVolume = (vol) => {
            setVolume(vol);
            setIsSpeaking(vol > 0.01);
        };
        client.onError = (err) => {
            console.error("Gemini Client Error:", err);
            // Optionally show toast
        };
        client.onMessage = (msg) => {
             // Optional: Handle text transcript updates from model
             useInterviewStore.getState().addTranscriptMessage('agent', msg, 'audio');
        };

        clientRef.current = client;
        console.log(`🎙️ Gemini Live client initialized in ${mode} mode`);

        return () => {
            client.disconnect();
        };
    }, [workspaceId, interviewMode]); // Re-init if workspace or interview mode changes

    // Helper to get current problem context for Gemini
    const getCurrentProblemContext = (): ProblemContext | null => {
        if (!currentProblemId) return null;

        // Try regular problems first
        const regularProblem = PROBLEMS.find(p => p.id === currentProblemId);
        if (regularProblem) {
            return {
                title: regularProblem.title,
                difficulty: regularProblem.difficulty,
                description: regularProblem.description,
                examples: regularProblem.examples,
                constraints: regularProblem.constraints,
                functionName: regularProblem.functionName,
                starterCode: regularProblem.starterCode,
            };
        }

        // Try company problems (practice mode)
        if (interviewMode === 'practice' && selectedCompanyId) {
            const company = COMPANIES.find(c => c.id === selectedCompanyId);
            const companyProblem = company?.problems.find(p => p.id === currentProblemId);
            if (companyProblem) {
                return {
                    title: companyProblem.title,
                    difficulty: companyProblem.difficulty,
                    description: companyProblem.description,
                    examples: companyProblem.examples,
                    constraints: companyProblem.constraints,
                    functionName: companyProblem.functionName,
                    starterCode: companyProblem.starterCode,
                    companyName: company?.name,
                    tags: companyProblem.tags,
                };
            }
        }

        return null;
    };

    const handleStart = async () => {
        if (clientRef.current) {
            // Set problem context BEFORE connecting so Gemini knows the problem
            const problemContext = getCurrentProblemContext();
            if (problemContext) {
                clientRef.current.setProblemContext(problemContext);
                console.log(`📋 Starting interview with problem: ${problemContext.title}`);
            } else {
                console.warn("⚠️ No problem selected - Gemini won't know what to interview about");
            }

            await clientRef.current.connect();
        }
    };

    const handleStop = () => {
        if (clientRef.current) {
            clientRef.current.disconnect();
        }
    };

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
        setScriptIndex(prev => prev + 1);

        try {
            setIsThinking(true);
            setCurrentAction("Alexis speaking...");

            // If connected to Gemini Live, speak through the active session
            if (clientRef.current?.isConnected()) {
                clientRef.current.sendText(text);
                // Audio will be played through the existing audio queue
                // Set a timeout to clear thinking state (audio playback is async)
                setTimeout(() => setIsThinking(false), 3000);
                return;
            }

            // Fallback to TTS API endpoint (using Gemini TTS)
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

    return (
        <div id="agent-container" className="flex flex-col gap-4">
            {/* Thinking Indicator */}
            {isThinking && (
                <ThinkingIndicator isThinking={isThinking} currentAction={currentAction} />
            )}

            <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
                <StatusIndicator status={status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected'} />

                <div className="flex-1 w-full min-w-0">
                    <Visualizer isSpeaking={isSpeaking} volume={volume} /> 
                </div>

                {status === 'connected' ? (
                    <Button variant="destructive" size="icon" onClick={handleStop}>
                        <MicOff className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        variant="default"
                        onClick={handleStart}
                        disabled={status === 'connecting'} // Allow starting even if workspaceId is null, though tools might fail
                        title={!workspaceId ? "Workspace not ready (Tools restricted)" : undefined}
                    >
                        {interviewMode === 'practice' ? (
                            <GraduationCap className="w-4 h-4 mr-2" />
                        ) : (
                            <Mic className="w-4 h-4 mr-2" />
                        )}
                        {status === 'connecting' ? "Connecting..." : 
                         interviewMode === 'practice' ? "Start Practice (Gemini)" : "Start Interview (Gemini)"}
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
