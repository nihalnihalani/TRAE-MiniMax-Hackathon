import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from 'lucide-react';

export function ConsolePanel({ output }: { output: string[] }) {
  return (
    <div className="flex flex-col h-[200px] bg-black border-t border-gray-800">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs font-mono text-gray-400">
        <Terminal className="w-3 h-3" />
        Console
      </div>
      <div className="flex-1 p-4 overflow-auto font-mono text-xs text-gray-300 space-y-1">
        {output.length === 0 ? (
          <span className="text-gray-600 italic">No output...</span>
        ) : (
          output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap border-b border-white/5 pb-1 mb-1 last:border-0">
                {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
