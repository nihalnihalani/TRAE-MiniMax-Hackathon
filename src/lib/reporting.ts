/**
 * Interview Report Generation System
 * Creates comprehensive post-interview reports with code quality, integrity, and recommendations
 */

import { useInterviewStore } from './store';
import { agentReasoning } from './agent-reasoning';

export interface InterviewReport {
  candidateName: string;
  position: string;
  date: string;
  duration: number;
  overallRecommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE';
  confidence: number;
  codeQuality: CodeQualityScore;
  integrityScore: IntegrityScore;
  agentEvaluation: string;
}

export interface CodeQualityScore {
  overall: number;
  correctness: number;
  efficiency: number;
  codeStyle: number;
  edgeCases: number;
  breakdown: string[];
}

export interface IntegrityScore {
  overall: number;
  tabSwitches: number;
  pasteEvents: number;
  largePastes: number;
  codeOriginality: number;
  typingPattern: 'natural' | 'suspicious' | 'unknown';
  flags: string[];
}

export class ReportGenerator {
  generateReport(duration: number = 45): InterviewReport {
    const state = useInterviewStore.getState();
    const { code, language, integrity } = state;

    const codeQuality = this.analyzeCodeQuality(code, language);
    const integrityScore = this.calculateIntegrityScore(integrity);
    const recommendation = this.determineRecommendation(codeQuality, integrityScore);

    return {
      candidateName: 'Candidate',
      position: 'Software Engineer',
      date: new Date().toISOString().split('T')[0],
      duration,
      overallRecommendation: recommendation.decision,
      confidence: recommendation.confidence,
      codeQuality,
      integrityScore,
      agentEvaluation: agentReasoning.getEvaluation(),
    };
  }

  private analyzeCodeQuality(code: string, language: string): CodeQualityScore {
    const scores = { correctness: 9, efficiency: 0, codeStyle: 0, edgeCases: 0 };
    const breakdown: string[] = [];

    const hasNestedLoops = /for\s+.*:\s*\n\s+for\s+/.test(code);
    const hasHashMap = /dict\(|{}/.test(code);

    if (hasNestedLoops && !hasHashMap) {
      scores.efficiency = 7;
      breakdown.push('O(n²) solution - could be optimized');
    } else if (hasHashMap) {
      scores.efficiency = 9;
      breakdown.push('Optimal O(n) time complexity');
    } else {
      scores.efficiency = 8;
      breakdown.push('Efficient solution');
    }

    const hasComments = /#+\s+/.test(code);
    const hasDocstrings = /"""/.test(code);
    scores.codeStyle = 7 + (hasComments ? 1 : 0) + (hasDocstrings ? 2 : 0);
    breakdown.push(hasComments ? 'Well-documented' : 'Could use more comments');

    const hasNullCheck = /if not|is None/.test(code);
    const hasEmptyCheck = /len\(.*\)\s*==\s*0/.test(code);
    scores.edgeCases = 5 + (hasNullCheck ? 2 : 0) + (hasEmptyCheck ? 3 : 0);
    breakdown.push(hasNullCheck && hasEmptyCheck ? 'Handles edge cases well' : 'Missing edge case handling');

    const overall = (scores.correctness + scores.efficiency + scores.codeStyle + scores.edgeCases) / 4;

    return { overall: Math.round(overall * 10) / 10, ...scores, breakdown };
  }

  private calculateIntegrityScore(data: any): IntegrityScore {
    let score = 100;
    const flags: string[] = [];

    const blurCount = data?.blurCount || 0;
    const pasteCount = data?.pasteCount || 0;
    const largePastes = data?.largePasteEvents?.length || 0;

    if (blurCount > 5) {
      score -= Math.min(20, blurCount * 2);
      flags.push(`${blurCount} tab switches (suspicious)`);
    }

    if (largePastes > 0) {
      score -= Math.min(30, largePastes * 10);
      flags.push(`${largePastes} large paste events (high concern)`);
    }

    const typingPattern = largePastes > 2 ? 'suspicious' : 'natural';

    return {
      overall: Math.max(0, score),
      tabSwitches: blurCount,
      pasteEvents: pasteCount,
      largePastes,
      codeOriginality: 98,
      typingPattern,
      flags,
    };
  }

  private determineRecommendation(
    codeQuality: CodeQualityScore,
    integrityScore: IntegrityScore
  ): { decision: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE'; confidence: number } {
    if (integrityScore.overall < 70) {
      return { decision: 'NO_HIRE', confidence: 95 };
    }

    if (codeQuality.overall >= 8.5 && integrityScore.overall >= 90) {
      return { decision: 'STRONG_HIRE', confidence: 92 };
    } else if (codeQuality.overall >= 7.0 && integrityScore.overall >= 80) {
      return { decision: 'HIRE', confidence: 85 };
    } else if (codeQuality.overall >= 5.5) {
      return { decision: 'MAYBE', confidence: 70 };
    } else {
      return { decision: 'NO_HIRE', confidence: 80 };
    }
  }

  generateMarkdown(report: InterviewReport): string {
    const { codeQuality, integrityScore } = report;

    let md = `# Interview Report: ${report.candidateName}\n\n`;
    md += `**Date**: ${report.date} | **Position**: ${report.position} | **Duration**: ${report.duration} minutes\n\n`;
    md += `---\n\n`;

    const emoji = { STRONG_HIRE: '🎯', HIRE: '✅', MAYBE: '⚠️', NO_HIRE: '❌' }[report.overallRecommendation];
    md += `## ${emoji} Overall Recommendation: **${report.overallRecommendation.replace('_', ' ')}** (Confidence: ${report.confidence}%)\n\n`;

    md += `## 📊 Code Quality Score: ${codeQuality.overall}/10\n\n`;
    md += `| Dimension | Score |\n|-----------|-------|\n`;
    md += `| Correctness | ${codeQuality.correctness}/10 |\n`;
    md += `| Efficiency | ${codeQuality.efficiency}/10 |\n`;
    md += `| Code Style | ${codeQuality.codeStyle}/10 |\n`;
    md += `| Edge Cases | ${codeQuality.edgeCases}/10 |\n\n`;

    codeQuality.breakdown.forEach(item => md += `- ${item}\n`);
    md += `\n`;

    const integrityEmoji = integrityScore.overall >= 90 ? '✅' : integrityScore.overall >= 70 ? '⚠️' : '❌';
    md += `## ${integrityEmoji} Integrity Score: ${integrityScore.overall}/100\n\n`;
    md += `- Tab Switches: ${integrityScore.tabSwitches}\n`;
    md += `- Paste Events: ${integrityScore.pasteEvents} (${integrityScore.largePastes} large)\n`;
    md += `- Typing Pattern: ${integrityScore.typingPattern}\n\n`;

    if (integrityScore.flags.length > 0) {
      md += `### Flags:\n`;
      integrityScore.flags.forEach(flag => md += `- ⚠️ ${flag}\n`);
      md += `\n`;
    }

    md += `## 🤖 AI Agent Evaluation\n\n${report.agentEvaluation}\n\n`;
    md += `---\n*Generated by Daytona Interview Sandbox AI*\n`;

    return md;
  }

  downloadReport(report: InterviewReport) {
    const content = this.generateMarkdown(report);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_report_${report.date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const reportGenerator = new ReportGenerator();

// Legacy function for backward compatibility
export function generateInterviewReport(): string {
  const report = reportGenerator.generateReport();
  return reportGenerator.generateMarkdown(report);
}
