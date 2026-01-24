'use client';

import { FolderGit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { InterviewAgent } from "@/components/agent/InterviewAgent";
import { useInterviewStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const { setCode } = useInterviewStore();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Initialize workspace on load
  useEffect(() => {
    async function initWorkspace() {
      try {
        const res = await fetch('/api/sandbox/create', {
          method: 'POST',
          body: JSON.stringify({ language: 'python' }),
        });
        const data = await res.json();
        setWorkspaceId(data.id);
      } catch (err) {
        console.error("Failed to init workspace", err);
      }
    }
    initWorkspace();
  }, []);

  const handleRun = async (code: string) => {
    if (!workspaceId) return;
    setIsRunning(true);
    setOutput("Running...");
    
    try {
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          code,
          language: 'python'
        }),
      });
      const data = await res.json();
      setOutput(data.stdout || data.stderr || "No output");
    } catch (err) {
        setOutput(`Error: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
  };

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FolderGit2 className="w-8 h-8" />
        Phase 3: ElevenLabs & Daytona Integration
      </h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Interview Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <InterviewAgent />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Python Editor (Workspace: {workspaceId || "Initializing..."})</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] p-0 overflow-hidden rounded-b-xl">
             <CodeEditor 
               language="python"
               initialCode="print('Hello from Daytona Sandbox!')"
               onRun={handleRun}
               onChange={handleEditorChange}
               isRunning={isRunning}
             />
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle>Execution Output</CardTitle>
           </CardHeader>
           <CardContent>
             <pre className="bg-black/90 text-green-400 p-4 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap">
               {output || "Ready to execute..."}
             </pre>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
