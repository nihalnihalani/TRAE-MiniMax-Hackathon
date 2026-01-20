import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, BrainCircuit } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AnalysisResult {
  score: number;
  complexity: string;
  issues: string[];
  reasoning_trace: string;
}

export function AnalysisPanel({ result, isLoading }: { result: AnalysisResult | null, isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400 animate-pulse">
        <BrainCircuit className="w-8 h-8 mb-2 animate-spin-slow" />
        <p>Gemini is analyzing your code...</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Score</div>
          <div className={cn("text-2xl font-bold", 
            result.score >= 8 ? "text-green-500" : 
            result.score >= 5 ? "text-yellow-500" : "text-red-500"
          )}>
            {result.score}/10
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Complexity</div>
          <div className="text-2xl font-bold text-blue-400">{result.complexity}</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Issues Detected
        </h4>
        <ul className="space-y-2">
          {result.issues.length === 0 ? (
            <li className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" /> No major issues found.
            </li>
          ) : (
            result.issues.map((issue, i) => (
              <li key={i} className="text-sm text-gray-300 bg-red-900/20 p-2 rounded border border-red-900/50">
                • {issue}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-300 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" /> AI Reasoning
        </h4>
        <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-lg border border-gray-800 italic">
          "{result.reasoning_trace}"
        </div>
      </div>
    </div>
  );
}
