import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Wand2, Rabbit, FileDown } from "lucide-react";
import { useInterviewStore } from '@/lib/store';
import { generateInterviewReport } from '@/lib/reporting';

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

  const handleDownloadReport = () => {
    const report = generateInterviewReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

      <Button 
        variant="outline" 
        className="w-full border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
        onClick={handleDownloadReport}
      >
        <FileDown className="w-4 h-4 mr-2" />
        End Interview & Report
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
