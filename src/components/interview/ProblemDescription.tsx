'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { PROBLEMS, Problem } from '@/data/problems';
import { useInterviewStore } from '@/lib/store';
import { ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";

export function ProblemDescription() {
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const { setCode, setCurrentProblemId } = useInterviewStore();

    const problem = PROBLEMS[currentProblemIndex];

    // Load first problem on mount
    React.useEffect(() => {
        setCode(PROBLEMS[0].starterCode);
        setCurrentProblemId(PROBLEMS[0].id);
    }, [setCode, setCurrentProblemId]);

    const handleNextProblem = () => {
        const nextIndex = (currentProblemIndex + 1) % PROBLEMS.length;
        setCurrentProblemIndex(nextIndex);
        setCode(PROBLEMS[nextIndex].starterCode);
        setCurrentProblemId(PROBLEMS[nextIndex].id);
    };

    const handlePrevProblem = () => {
        const prevIndex = (currentProblemIndex - 1 + PROBLEMS.length) % PROBLEMS.length;
        setCurrentProblemIndex(prevIndex);
        setCode(PROBLEMS[prevIndex].starterCode);
        setCurrentProblemId(PROBLEMS[prevIndex].id);
    };

    const handleReset = () => {
        setCode(problem.starterCode);
    };

    return (
        <Card className="h-full border-0 rounded-none overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        {problem.title}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                            {problem.difficulty}
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handlePrevProblem} className="h-8 w-8">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-12 text-center">
                            {currentProblemIndex + 1} / {PROBLEMS.length}
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleNextProblem} className="h-8 w-8">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                <CardDescription className="flex items-center justify-between">
                    <span>Select a problem to start.</span>
                    <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 text-xs gap-1">
                        <RefreshCw className="w-3 h-3" /> Reset Code
                    </Button>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto prose prose-invert prose-sm max-w-none p-4">
                <ReactMarkdown>{problem.description}</ReactMarkdown>

                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Examples</h3>
                    {problem.examples.map((ex, i) => (
                        <div key={i} className="mb-4 p-3 bg-muted/50 rounded-lg">
                            <p className="font-mono text-xs mb-1"><span className="text-muted-foreground">Input:</span> {ex.input}</p>
                            <p className="font-mono text-xs"><span className="text-muted-foreground">Output:</span> {ex.output}</p>
                            {ex.explanation && (
                                <p className="text-xs mt-2 text-muted-foreground"><span className="font-semibold">Explanation:</span> {ex.explanation}</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Constraints</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        {problem.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
