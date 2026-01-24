import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Wand2, Rabbit } from "lucide-react";
import { useInterviewStore } from '@/lib/store';

interface ControlsProps {
  onRun: () => void;
  onAnalyze: () => void;
  onCodeRabbit: () => void;
  isRunning: boolean;
  isAnalyzing: boolean;
  isCodeRabbitLoading: boolean;
}

export function Controls({ onRun, onAnalyze, onCodeRabbit, isRunning, isAnalyzing, isCodeRabbitLoading }: ControlsProps) {
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
      
      <div className="grid grid-cols-2 gap-2">
        <Button 
            onClick={onAnalyze} 
            disabled={isAnalyzing}
            variant="secondary"
            className="w-full"
        >
            <Sparkles className="w-4 h-4 mr-2" />
            {isAnalyzing ? "Gemini..." : "Quick Review"}
        </Button>

        <Button 
            onClick={onCodeRabbit} 
            disabled={isCodeRabbitLoading}
            variant="outline"
            className="w-full border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400"
        >
            <Rabbit className="w-4 h-4 mr-2" />
            {isCodeRabbitLoading ? "CodeRabbit..." : "CodeRabbit Review"}
        </Button>
      </div>

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
