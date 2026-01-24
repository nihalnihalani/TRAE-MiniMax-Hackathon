'use client';

import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable"; // We need to add this component first
import { ProblemDescription } from "@/components/interview/ProblemDescription";
import { ConsolePanel } from "@/components/interview/ConsolePanel";
import { Controls } from "@/components/interview/Controls";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { InterviewAgent } from "@/components/agent/InterviewAgent";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { useInterviewStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function InterviewPage() {
  const [mounted, setMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  const { 
    code, 
    setCode, 
    consoleOutput, 
    addLog, 
    clearLogs,
    latestReview,
    setReview
  } = useInterviewStore();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Initialize workspace
  useEffect(() => {
    async function initWorkspace() {
      try {
        const res = await fetch('/api/sandbox/create', {
          method: 'POST',
          body: JSON.stringify({ language: 'python' }),
        });
        const data = await res.json();
        setWorkspaceId(data.id);
        addLog(`Workspace initialized: ${data.id}`);
      } catch (err) {
        console.error("Failed to init workspace", err);
        addLog("Failed to initialize workspace.");
      }
    }
    initWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  const handleRun = async (codeToRun: string) => {
    if (!workspaceId) {
        addLog("Error: Workspace not ready.");
        return;
    }
    setIsRunning(true);
    clearLogs();
    addLog("Running...");
    
    try {
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          code: codeToRun,
          language: 'python'
        }),
      });
      const data = await res.json();
      
      if (data.stdout) addLog(data.stdout);
      if (data.stderr) addLog(`Error:\n${data.stderr}`);
      if (!data.stdout && !data.stderr) addLog("No output returned.");

    } catch (err) {
        addLog(`System Error: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setReview(null);
    try {
      const res = await fetch('/api/analysis/review', {
        method: 'POST',
        body: JSON.stringify({ code, language: 'python' }),
      });
      const data = await res.json();
      setReview(data);
    } catch (err) {
      console.error(err);
      addLog("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-screen w-full bg-background overflow-hidden flex flex-col">
       <header className="h-12 border-b flex items-center px-4 justify-between bg-card z-10">
          <div className="font-bold">Daytona Interview Sandbox</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {workspaceId ? (
                <span className="text-green-500">● Workspace Ready</span>
            ) : (
                <span className="text-yellow-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Initializing
                </span>
            )}
          </div>
       </header>

       <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
            {/* Left Panel: Problem Description */}
            <ResizablePanel defaultSize={25} minSize={20}>
                <ProblemDescription />
            </ResizablePanel>
            
            <ResizableHandle />

            {/* Center Panel: Editor & Console */}
            <ResizablePanel defaultSize={50} minSize={30}>
                <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={70}>
                        <CodeEditor 
                            language="python"
                            initialCode={code}
                            onChange={(val) => setCode(val || "")}
                            onRun={() => handleRun(code)}
                            isRunning={isRunning}
                        />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={30} minSize={10}>
                        <ConsolePanel output={consoleOutput} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Panel: Agent & Controls */}
            <ResizablePanel defaultSize={25} minSize={20} className="bg-card border-l">
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b">
                        <InterviewAgent />
                    </div>
                    
                    <Controls 
                        onRun={() => handleRun(code)} 
                        onAnalyze={handleAnalyze}
                        isRunning={isRunning}
                        isAnalyzing={isAnalyzing}
                    />

                    <div className="flex-1 overflow-y-auto p-4">
                        <AnalysisPanel result={latestReview} isLoading={isAnalyzing} />
                    </div>
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
       </div>
    </div>
  );
}
