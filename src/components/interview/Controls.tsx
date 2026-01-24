import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";

interface ControlsProps {
  onRun: () => void;
  onAnalyze: () => void;
  isRunning: boolean;
  isAnalyzing: boolean;
}

export function Controls({ onRun, onAnalyze, isRunning, isAnalyzing }: ControlsProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Button 
        onClick={onRun} 
        disabled={isRunning}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        <Play className="w-4 h-4 mr-2" fill="currentColor" />
        {isRunning ? "Running..." : "Run Code"}
      </Button>
      
      <Button 
        onClick={onAnalyze} 
        disabled={isAnalyzing}
        variant="secondary"
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isAnalyzing ? "Analyzing..." : "Review Code"}
      </Button>
    </div>
  );
}
