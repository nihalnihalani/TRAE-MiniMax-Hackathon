import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Wand2, Rabbit, FileDown } from "lucide-react";
import { useInterviewStore } from '@/lib/store';
import { reportGenerator } from '@/lib/reporting';

interface ControlsProps {
  onRun: () => void;
  onAnalyze: () => void;
  onCodeRabbit: () => void;
  onAutoFix?: () => void;
  isRunning: boolean;
  isAnalyzing: boolean;
  isCodeRabbitLoading: boolean;
  isFixing?: boolean;
  hasError?: boolean;
}

export function Controls({ 
    onRun, 
    onAnalyze, 
    onCodeRabbit, 
    onAutoFix, 
    isRunning, 
    isAnalyzing, 
    isCodeRabbitLoading,
    isFixing,
    hasError 
}: ControlsProps) {
  const { isWizardMode, toggleWizardMode, addLog } = useInterviewStore();

  const handleDownloadReport = () => {
    try {
      const report = reportGenerator.generateReport(45); // 45 min default duration
      reportGenerator.downloadReport(report);
      addLog('✅ Interview report generated and downloaded!');
    } catch (error) {
      console.error('Failed to generate report:', error);
      addLog('❌ Failed to generate report');
    }
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

      {hasError && onAutoFix && (
        <Button 
            onClick={onAutoFix} 
            disabled={isFixing} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
        >
            <Wand2 className="w-4 h-4 mr-2" />
            {isFixing ? "Agent Fixing..." : "Auto Fix with Agent"}
        </Button>
      )}

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
