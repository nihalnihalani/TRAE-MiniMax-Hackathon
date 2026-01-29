'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Wand2, FileDown } from "lucide-react";

interface ControlsProps {
  onRun: () => void;
  onAutoFix?: () => void;
  onEndInterview: () => void;
  isRunning: boolean;
  isFixing?: boolean;
  hasError?: boolean;
}

export function Controls({
    onRun,
    onAutoFix,
    onEndInterview,
    isRunning,
    isFixing,
    hasError
}: ControlsProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Button
        onClick={onRun}
        disabled={isRunning}
        aria-busy={isRunning}
        aria-label={isRunning ? "Running code" : "Run code"}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        <Play className="w-4 h-4 mr-2" fill="currentColor" aria-hidden="true" />
        {isRunning ? "Running..." : "Run Code"}
      </Button>

      {hasError && onAutoFix && (
        <Button
            onClick={onAutoFix}
            disabled={isFixing}
            aria-busy={isFixing}
            aria-label={isFixing ? "Agent is fixing code" : "Auto fix code with agent"}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
        >
            <Wand2 className="w-4 h-4 mr-2" aria-hidden="true" />
            {isFixing ? "Agent Fixing..." : "Auto Fix with Agent"}
        </Button>
      )}

      <Button
        variant="destructive"
        className="w-full mt-4"
        onClick={onEndInterview}
        aria-label="End interview and download report"
      >
        <FileDown className="w-4 h-4 mr-2" aria-hidden="true" />
        End Interview
      </Button>
    </div>
  );
}
