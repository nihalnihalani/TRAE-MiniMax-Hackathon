'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, XCircle, Code, Brain } from "lucide-react";
import { useInterviewStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const { integrity, latestReview, coderabbitReview } = useInterviewStore();

  const integrityScore = calculateIntegrityScore(integrity);
  const isIntegrityGood = integrityScore > 70;

  const codeQualityScore = latestReview ? latestReview.score : 0;
  const hireRecommendation = (integrityScore > 60 && codeQualityScore >= 7) ? "HIRE" : "NO HIRE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Interview Final Report
            <span className={`px-3 py-1 rounded-full text-xs text-white ${hireRecommendation === "HIRE" ? "bg-green-600" : "bg-red-600"}`}>
              {hireRecommendation}
            </span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive analysis of the candidate's performance and integrity.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Integrity Section */}
          <Card className={`border-l-4 ${isIntegrityGood ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" /> Integrity Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{integrityScore}%</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Tab Focus Lost:</span>
                  <span className={integrity.blurCount > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                    {integrity.blurCount} times
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Small Pastes:</span>
                  <span className={integrity.pasteCount - integrity.largePasteEvents.length > 0 ? "text-yellow-500" : "text-green-500"}>
                    {integrity.pasteCount - integrity.largePasteEvents.length} detected
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Large Pastes (high risk):</span>
                  <span className={integrity.largePasteEvents.length > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                    {integrity.largePasteEvents.length} detected
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Score */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5" /> AI Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{latestReview ? `${latestReview.score}/10` : "N/A"}</div>
              <p className="text-sm text-muted-foreground">
                {latestReview ? latestReview.complexity : "No analysis run yet."}
              </p>
            </CardContent>
          </Card>

          {/* Issues Found */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code className="w-5 h-5" /> Key Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestReview?.issues && latestReview.issues.length > 0 ? (
                <ul className="space-y-2">
                  {latestReview.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No critical issues flagged.</p>
              )}
            </CardContent>
          </Card>
          
          {/* CodeRabbit Summary */}
           {coderabbitReview && (
             <Card className="col-span-1 md:col-span-2 border-l-4 border-l-orange-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        CodeRabbit Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {coderabbitReview.summary}
                </CardContent>
             </Card>
           )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()}>Print Report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
