import * as Sentry from "@sentry/nextjs";
import { CoachingFeedback, DEFAULT_COACHING_FEEDBACK, calculateSkillLevel } from "./coaching";

const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MINIMAX_TTS_URL = "https://api.minimax.chat/v1/text_to_speech";
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || ""; 

// Using MiniMax-M2.1 for code generation and refactoring as requested
const MODEL_NAME = "MiniMax-M2.1";
export const CHAT_MODEL_NAME = "MiniMax-M2.1-lightning";

// ============================================================================
// Input Sanitization
// ============================================================================

function sanitizeForPrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const MAX_INPUT_LENGTH = 50000;
  return input.slice(0, MAX_INPUT_LENGTH);
}

function sanitizeCode(code: string): string {
  if (!code || typeof code !== 'string') return '';
  const MAX_CODE_LENGTH = 100000;
  return code.slice(0, MAX_CODE_LENGTH);
}

function sanitizeError(error: string): string {
  if (!error || typeof error !== 'string') return '';
  return error.slice(0, 5000);
}

// ============================================================================
// MiniMax API Client
// ============================================================================

interface MiniMaxMessage {
  sender_type: "USER" | "BOT";
  sender_name: string;
  text: string;
}

interface MiniMaxResponse {
  reply: string;
  choices?: { message: { content: string } }[];
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

export async function callMiniMax(messages: MiniMaxMessage[], temperature = 0.7, model = MODEL_NAME): Promise<string> {
  if (!MINIMAX_API_KEY) {
    console.warn("MINIMAX_API_KEY is not set");
  }

  const payload = {
    model: model,
    messages: messages,
    temperature: temperature,
    tokens_to_generate: 4096,
    stream: false,
  };

  const url = MINIMAX_GROUP_ID 
    ? `${MINIMAX_API_URL}?GroupId=${MINIMAX_GROUP_ID}`
    : MINIMAX_API_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as MiniMaxResponse;
  
  if (data.base_resp && data.base_resp.status_code !== 0) {
     throw new Error(`MiniMax API Error: ${data.base_resp.status_msg}`);
  }

  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  
  return data.reply || "";
}

export async function textToSpeech(text: string, voiceId = "male-qn-qingse"): Promise<ArrayBuffer> {
  if (!MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is not set");
  }

  const payload = {
    model: "speech-2.6-turbo", 
    voice_setting: {
      voice_id: voiceId,
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
    pronunciation_dict: {
      tone: [],
      phoneme: []
    },
    text: text,
  };
  
  const url = MINIMAX_GROUP_ID 
    ? `${MINIMAX_TTS_URL}?GroupId=${MINIMAX_GROUP_ID}`
    : MINIMAX_TTS_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
     const errorText = await response.text();
     throw new Error(`MiniMax TTS Error: ${errorText}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (data.base_resp && data.base_resp.status_code !== 0) {
          throw new Error(`MiniMax TTS API Error: ${data.base_resp.status_msg}`);
      }
  }
  
  return await response.arrayBuffer();
}

// ============================================================================
// Robust JSON Parsing
// ============================================================================

function parseJSON<T>(text: string, defaultValue: T): { success: boolean; data: T; rawText?: string } {
  if (!text) return { success: false, data: defaultValue, rawText: text };

  const cleanText = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return { success: true, data: JSON.parse(cleanText) };
  } catch {
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { success: true, data: JSON.parse(match[0]) };
      } catch {
         // Ignore
      }
    }
  }
  return { success: false, data: defaultValue, rawText: text };
}

// ============================================================================
// AutoFix Generation
// ============================================================================

export interface AutoFixResult {
  fixedCode: string;
  dependencies: string[];
}

export async function generateAutoFix(
  code: string,
  error: string,
  language: string
): Promise<AutoFixResult | null> {
  return Sentry.startSpan({ name: "ai.autofix", op: "ai.pipeline" }, async (span) => {
    try {
      const prompt = `
Role: Senior Software Engineer & Debugger.
Task: Fix the following code based on the error message.
Language: ${sanitizeForPrompt(language)}

Error:
${sanitizeError(error)}

Original Code:
${sanitizeCode(code)}

Instructions:
1. Analyze the error and the code.
2. Determine if any external libraries/packages are missing.
3. Provide the full fixed code block.
4. Provide a list of missing dependencies (e.g. ["numpy", "pandas"]) if any.
5. If imports are missing, add them to the code.
6. If syntax is wrong, fix it.

Output JSON only:
{
  "fixedCode": "Full fixed code string here",
  "dependencies": ["package_name1", "package_name2"]
}
      `;

      span.setAttribute("ai.model_id", MODEL_NAME);
      
      const responseText = await callMiniMax([
        { sender_type: "USER", sender_name: "User", text: prompt }
      ]);

      const parseResult = parseJSON<{ fixedCode?: string; dependencies?: string[] }>(
        responseText,
        { fixedCode: undefined, dependencies: [] }
      );

      if (!parseResult.success || !parseResult.data.fixedCode) {
        throw new Error("Failed to parse AutoFix response");
      }

      return {
        fixedCode: parseResult.data.fixedCode,
        dependencies: parseResult.data.dependencies || []
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error("AutoFix failed:", error);
      return null;
    }
  });
}

// ============================================================================
// Code Analysis
// ============================================================================

export interface CodeAnalysisResult {
  score: number;
  security_score: number;
  complexity: string;
  issues: string[];
  security_issues: string[];
  reasoning_trace: string;
}

const DEFAULT_ANALYSIS_RESULT: CodeAnalysisResult = {
  score: 0,
  security_score: 0,
  complexity: "Unknown",
  issues: ["Failed to analyze code"],
  security_issues: [],
  reasoning_trace: "Analysis failed"
};

export async function analyzeCodeWithMiniMax(
  code: string,
  language: string
): Promise<CodeAnalysisResult> {
  return Sentry.startSpan({ name: "ai.analysis", op: "ai.pipeline" }, async (span) => {
    try {
      const prompt = `
Role: Senior Code Reviewer & Security Researcher.
Input: ${sanitizeForPrompt(language)} Code.
Task: Perform a comprehensive analysis including:

1. Code Quality:
   - Critical Bugs.
   - Time Complexity (Big O).
   - Code Smells.

2. Security Audit:
   - Prompt Injection.
   - Resource Exhaustion.
   - Data Leakage.
   - Dangerous Operations.

Output JSON only:
{
  "score": 1-10,
  "security_score": 1-10,
  "complexity": "O(n)",
  "issues": ["List of brief issue descriptions"],
  "security_issues": ["List of security-specific vulnerabilities"],
  "reasoning_trace": "Brief summary of thought process"
}

Code:
${sanitizeCode(code)}
      `;

      span.setAttribute("ai.model_id", MODEL_NAME);

      const responseText = await callMiniMax([
        { sender_type: "USER", sender_name: "User", text: prompt }
      ]);

      const parseResult = parseJSON<CodeAnalysisResult>(responseText, DEFAULT_ANALYSIS_RESULT);
      return parseResult.data;
    } catch (error) {
      Sentry.captureException(error);
      return DEFAULT_ANALYSIS_RESULT;
    }
  });
}

// ============================================================================
// Interview Report Generation
// ============================================================================

export interface InterviewReportData {
  transcript: { timestamp: number; speaker: 'agent' | 'user'; message: string }[];
  code: string;
  language: string;
  testResults: any[];
  integrity: any;
  codeAnalysis?: any;
  coderabbitReview?: any;
  problemId?: string;
}

export interface StructuredInterviewReport {
  overallScore: number;
  hireRecommendation: 'HIRE' | 'NO HIRE' | 'STRONG HIRE' | 'LEAN HIRE' | 'LEAN NO HIRE';
  executiveSummary: string;
  technicalEvaluation: any;
  communicationEvaluation: any;
  problemSolvingEvaluation: any;
  finalFeedback: string;
}

export async function generateInterviewReport(
  data: InterviewReportData
): Promise<StructuredInterviewReport | null> {
    const sanitizedCode = sanitizeCode(data.code);
    const sanitizedLanguage = sanitizeForPrompt(data.language);
    
    // Format transcript
    const formattedTranscript = data.transcript.length > 0
      ? data.transcript.map(msg => {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          const speaker = msg.speaker === 'agent' ? 'Interviewer' : 'Candidate';
          return `[${time}] ${speaker}: ${msg.message}`;
        }).join('\n')
      : 'No conversation recorded.';

    const prompt = `
You are a senior technical interviewer. Generate a comprehensive interview evaluation report.

PROBLEM: ${data.problemId || 'Unknown'}
LANGUAGE: ${sanitizedLanguage}

TRANSCRIPT:
${formattedTranscript}

CODE:
${sanitizedCode}

OUTPUT JSON ONLY:
{
  "overallScore": <0-100>,
  "hireRecommendation": "<STRONG HIRE|HIRE|LEAN HIRE|LEAN NO HIRE|NO HIRE>",
  "executiveSummary": "Summary...",
  "technicalEvaluation": {
    "score": <0-10>,
    "summary": "...",
    "strengths": [],
    "weaknesses": []
  },
  "communicationEvaluation": {
    "score": <0-10>,
    "summary": "...",
    "strengths": [],
    "weaknesses": []
  },
  "problemSolvingEvaluation": {
    "score": <0-10>,
    "summary": "...",
    "strengths": [],
    "weaknesses": []
  },
  "finalFeedback": "Feedback..."
}
`;
  
  try {
     const responseText = await callMiniMax([{ sender_type: "USER", sender_name: "User", text: prompt }]);
     return parseJSON<StructuredInterviewReport>(responseText, {} as any).data;
  } catch (e) {
      console.error(e);
      return null;
  }
}

// ============================================================================
// Practice Interview Feedback
// ============================================================================

export interface PracticeInterviewData extends InterviewReportData {
  companyId?: string;
  companyName?: string;
}

export async function generatePracticeInterviewFeedback(
  data: PracticeInterviewData
): Promise<CoachingFeedback> {
  return Sentry.startSpan({ name: "ai.coaching_feedback", op: "ai.pipeline" }, async (span) => {
    try {
      const sanitizedCode = sanitizeCode(data.code);
      const sanitizedLanguage = sanitizeForPrompt(data.language);
      
      const formattedTranscript = data.transcript.length > 0
          ? data.transcript.map(msg => {
            const speaker = msg.speaker === 'agent' ? 'Coach' : 'Student';
            return `${speaker}: ${msg.message}`;
          }).join('\n')
          : 'No conversation.';

      const prompt = `
You are a coding coach. Provide ENCOURAGING feedback.

Context: ${data.companyName || 'General'}
Language: ${sanitizedLanguage}

Transcript:
${formattedTranscript}

Code:
${sanitizedCode}

Output JSON ONLY:
{
  "overallLevel": "Beginner" | "Developing" | "Proficient" | "Advanced" | "Expert",
  "overallScore": 1-10,
  "categories": {
    "problemSolving": { "level": "...", "score": 1-10, "description": "..." },
    "codeQuality": { "level": "...", "score": 1-10, "description": "..." },
    "communication": { "level": "...", "score": 1-10, "description": "..." },
    "optimization": { "level": "...", "score": 1-10, "description": "..." }
  },
  "strengths": ["...", "..."],
  "improvementPlan": [{ "priority": "High", "area": "...", "suggestion": "...", "resources": [] }],
  "recommendedProblems": [{ "title": "...", "difficulty": "Easy", "reason": "...", "tags": [] }],
  "encouragement": "..."
}`;

      span.setAttribute("ai.model_id", MODEL_NAME);
      const responseText = await callMiniMax([{ sender_type: "USER", sender_name: "User", text: prompt }]);

      const parseResult = parseJSON<CoachingFeedback>(responseText, DEFAULT_COACHING_FEEDBACK);
      
      if (!parseResult.success) return DEFAULT_COACHING_FEEDBACK;

      const feedback = parseResult.data;
      return {
        ...DEFAULT_COACHING_FEEDBACK,
        ...feedback,
        overallLevel: feedback.overallLevel || calculateSkillLevel(feedback.overallScore || 5)
      };

    } catch (error) {
      Sentry.captureException(error);
      return DEFAULT_COACHING_FEEDBACK;
    }
  });
}
