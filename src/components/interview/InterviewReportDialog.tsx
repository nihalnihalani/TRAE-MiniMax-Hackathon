'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, XCircle, Code, Brain, Loader2, FileDown } from "lucide-react";
import { useInterviewStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface InterviewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function calculateIntegrityScore(integrity: {
  blurCount: number;
  pasteCount: number;
  largePasteEvents: { timestamp: number; length: number }[];
}): number {
  // Diminishing penalty for blur events (first few are more suspicious)
  // Max penalty: 25 points
  const blurPenalty = Math.min(25, integrity.blurCount * 3 + Math.floor(integrity.blurCount / 3) * 2);

  // Small pastes have minor penalty, large pastes are weighted heavily
  // Max penalty: 40 points for regular pastes, plus additional for large pastes
  const smallPastePenalty = Math.min(20, (integrity.pasteCount - integrity.largePasteEvents.length) * 3);
  const largePastePenalty = Math.min(35, integrity.largePasteEvents.length * 15);

  // Calculate final score
  const totalPenalty = blurPenalty + smallPastePenalty + largePastePenalty;
  return Math.max(0, 100 - totalPenalty);
}

export function InterviewReportDialog({ open, onOpenChange }: InterviewReportDialogProps) {
  const {
    integrity,
    latestReview,
    coderabbitReview,
    code,
    transcript,
    testResults,
    currentProblemId
  } = useInterviewStore();

  const [aiReport, setAiReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const integrityScore = calculateIntegrityScore(integrity);
  const isIntegrityGood = integrityScore > 70;

  const codeQualityScore = latestReview ? latestReview.score : 0;
  const hireRecommendation = (integrityScore > 60 && codeQualityScore >= 7) ? "HIRE" : "NO HIRE";

  // Generate AI report when dialog opens
  useEffect(() => {
    if (open && !aiReport && !isGenerating) {
      generateReport();
    }
  }, [open]);

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          code,
          language: 'python',
          testResults,
          integrity,
          codeAnalysis: latestReview ? {
            score: latestReview.score,
            security_score: latestReview.security_score,
            complexity: latestReview.complexity,
            issues: latestReview.issues,
            security_issues: latestReview.security_issues || []
          } : undefined,
          coderabbitReview: coderabbitReview ? {
            summary: coderabbitReview.summary,
            issues: coderabbitReview.issues || []
          } : undefined,
          problemId: currentProblemId || 'Coding Challenge'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.friendlyMessage?.message || data.error || 'Failed to generate report');
      }

      setAiReport(data.data.report);
    } catch (err) {
      console.error('Failed to generate AI report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Interview Final Report
            <span className={`px-3 py-1 rounded-full text-xs text-white ${hireRecommendation === "HIRE" ? "bg-green-600" : "bg-red-600"}`}>
              {hireRecommendation}
            </span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive AI-powered analysis of the candidate's performance and integrity.
          </DialogDescription>
        </DialogHeader>

        {/* AI Generated Report */}
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating comprehensive interview report with Gemini...</p>
            <p className="text-sm text-muted-foreground">Analyzing conversation, code quality, and test results...</p>
          </div>
        ) : error ? (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500 mb-4">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Report Generation Failed</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={generateReport} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : aiReport ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{aiReport}</ReactMarkdown>
          </div>
        ) : null}

        {/* Quick Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
          {/* Integrity Section */}
          <Card className={`border-l-4 ${isIntegrityGood ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" /> Integrity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{integrityScore}%</div>
            </CardContent>
          </Card>

          {/* AI Score */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4" /> Code Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestReview ? `${latestReview.score}/10` : "N/A"}</div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Code className="w-4 h-4" /> Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {testResults.length > 0
                  ? `${testResults[testResults.length - 1].testsPassed}/${testResults[testResults.length - 1].testsTotal}`
                  : "0/0"
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()}>
            <FileDown className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
