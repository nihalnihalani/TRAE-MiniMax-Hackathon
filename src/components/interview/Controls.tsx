import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Wand2 } from "lucide-react";
import { useInterviewStore } from '@/lib/store';

interface ControlsProps {
  onRun: () => void;
  onAnalyze: () => void;
  isRunning: boolean;
  isAnalyzing: boolean;
}

export function Controls({ onRun, onAnalyze, isRunning, isAnalyzing }: ControlsProps) {
  const { isWizardMode, toggleWizardMode } = useInterviewStore();

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

      <div className="pt-4 border-t border-gray-800 mt-2">
         <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleWizardMode}
            className={`w-full text-xs ${isWizardMode ? 'text-purple-400 bg-purple-900/10' : 'text-gray-500'}`}
         >
            <Wand2 className="w-3 h-3 mr-2" />
            {isWizardMode ? "Disable Wizard Mode" : "Enable Wizard Mode"}
         </Button>
      </div>
    </div>
  );
}
