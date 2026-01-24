'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useInterviewStore } from '@/lib/store';

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  onRun?: (code: string) => void;
  isRunning?: boolean;
}

export function CodeEditor({ 
  initialCode = "// Write your code here", 
  language = "javascript", 
  onChange,
  onRun,
  isRunning = false
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const { addBlurEvent, addPasteEvent } = useInterviewStore();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addBlurEvent();
        console.log("Tab focus lost - Integrity Check");
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [addBlurEvent]);

  const handleEditorChange = (value: string | undefined) => {
    // Basic paste detection heuristic: 
    // If change length is significantly large compared to typing speed, it might be a paste.
    // However, Monaco has specific onPaste events we can't easily hook into via this simple wrapper 
    // without using onMount. For now, we rely on the editor wrapper or assume changes > X chars are pastes 
    // if we wanted to be strict. 
    // But better: we will handle paste in onMount if we had it exposed. 
    // Since we don't have onMount exposed in props easily here without changing interface, 
    // let's try to detect sudden large text changes in onChange.
    
    if (value && code) {
        const diff = Math.abs(value.length - code.length);
        if (diff > 10) { // Arbitrary threshold for "fast typing" vs paste
             // This is a rough heuristic. Ideally use editor.onDidPaste
             addPasteEvent(diff);
        }
    }

    setCode(value || "");
    onChange?.(value);
  };

  const handleRun = () => {
    onRun?.(code);
  };

  return (
    <div className="flex flex-col h-full border rounded-md overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <span className="text-sm text-gray-400 font-mono">{language}</span>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleRun}
          disabled={isRunning}
          className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white border-0"
        >
          <Play className="w-3 h-3" fill="currentColor" />
          {isRunning ? "Running..." : "Run"}
        </Button>
      </div>
      <div className="flex-1 min-h-[400px]">
        <Editor
          height="100%"
          defaultLanguage={language}
          defaultValue={initialCode}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
