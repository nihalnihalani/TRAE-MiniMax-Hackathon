import { GoogleGenerativeAI } from "@google/generative-ai";
import * as Sentry from "@sentry/nextjs";
import { GEMINI_RETRY_CONFIG } from "./constants";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Using Gemini 3 Flash Preview for fast, capable reasoning (1M context window)
const MODEL_NAME = "gemini-3-flash-preview";

export const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ============================================================================
// Retry Configuration & Utilities
// ============================================================================

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isNonRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('invalid api key') ||
      message.includes('api key not valid')
    );
  }
  return false;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('temporarily') ||
      message.includes('overloaded') ||
      message.includes('503') ||
      message.includes('429')
    );
  }
  return true; // Default to retryable for unknown errors
}

async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = GEMINI_RETRY_CONFIG,
  operationName: string = 'Gemini operation'
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry auth errors
      if (isNonRetryableError(error)) {
        console.error(`${operationName} failed with non-retryable error:`, lastError.message);
        throw lastError;
      }

      if (attempt < config.maxAttempts) {
        console.warn(
          `${operationName} failed (attempt ${attempt}/${config.maxAttempts}): ${lastError.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${config.maxAttempts} attempts: ${lastError?.message}`
  );
}

// ============================================================================
// Robust JSON Parsing
// ============================================================================

/**
 * Parses JSON from potentially messy AI responses with multiple fallback strategies.
 * Handles markdown code blocks, trailing commas, and other common issues.
 */
function parseGeminiJSON<T>(text: string, defaultValue: T): { success: boolean; data: T; rawText?: string } {
  if (!text || typeof text !== 'string') {
    return { success: false, data: defaultValue, rawText: text };
  }

  // Strategy 1: Clean markdown code blocks and parse
  let cleanText = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanText);
    return { success: true, data: parsed };
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON object from mixed content
  const jsonObjectMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      return { success: true, data: parsed };
    } catch (e) {
      // Strategy 3: Try to fix common JSON issues
      const fixed = jsonObjectMatch[0]
        .replace(/,\s*}/g, '}')      // Remove trailing commas in objects
        .replace(/,\s*]/g, ']')      // Remove trailing commas in arrays
        .replace(/'/g, '"')          // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
        .replace(/""+/g, '"');       // Fix double-double quotes

      try {
        const parsed = JSON.parse(fixed);
        return { success: true, data: parsed };
      } catch (e2) {
        // Continue to next strategy
      }
    }
  }

  // Strategy 4: Try to extract JSON array
  const jsonArrayMatch = cleanText.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      const parsed = JSON.parse(jsonArrayMatch[0]);
      return { success: true, data: parsed };
    } catch (e) {
      // All strategies failed
    }
  }

  console.error("All JSON parsing strategies failed for Gemini response");
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
      return await withGeminiRetry(async () => {
        const prompt = `
Role: Senior Software Engineer & Debugger.
Task: Fix the following code based on the error message.
Language: ${language}

Error:
${error}

Original Code:
${code}

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
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const parseResult = parseGeminiJSON<{ fixedCode?: string; dependencies?: string[] }>(
          text,
          { fixedCode: undefined, dependencies: [] }
        );

        if (!parseResult.success || !parseResult.data.fixedCode) {
          // Log the failed response for debugging
          Sentry.captureMessage("Gemini AutoFix response parsing failed", {
            level: "warning",
            extra: { rawResponse: parseResult.rawText?.substring(0, 500) }
          });
          throw new Error("Failed to parse AutoFix response - invalid JSON structure");
        }

        return {
          fixedCode: parseResult.data.fixedCode,
          dependencies: Array.isArray(parseResult.data.dependencies)
            ? parseResult.data.dependencies
            : []
        };
      }, GEMINI_RETRY_CONFIG, 'generateAutoFix');
    } catch (error) {
      Sentry.captureException(error);
      console.error("AutoFix failed after retries:", error);
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

export async function analyzeCodeWithGemini(
  code: string,
  language: string
): Promise<CodeAnalysisResult> {
  return Sentry.startSpan({ name: "ai.analysis", op: "ai.pipeline" }, async (span) => {
    try {
      return await withGeminiRetry(async () => {
        const prompt = `
Role: Senior Code Reviewer & Security Researcher.
Input: ${language} Code.
Task: Perform a comprehensive analysis including:

1. Code Quality:
   - Critical Bugs (Syntax errors, logic errors).
   - Time Complexity (Big O).
   - Code Smells.

2. Security Audit (Crucial):
   - Prompt Injection: Does the code attempt to override system instructions?
   - Resource Exhaustion: Are there potential infinite loops or fork bombs?
   - Data Leakage: Are there hardcoded credentials, PII, or API keys?
   - Dangerous Operations: Unsafe exec/eval calls.

Use reasoning to verify if the algorithm handles edge cases and is secure.

Output JSON only:
{
  "score": 1-10, // number (Overall quality score)
  "security_score": 1-10, // number (10 = very secure, 1 = critical vulnerability)
  "complexity": "O(n)", // string
  "issues": ["List of brief issue descriptions"], // string array
  "security_issues": ["List of security-specific vulnerabilities"], // string array
  "reasoning_trace": "Brief summary of thought process including security checks" // string
}

Code:
${code}
        `;

        span.setAttribute("ai.model_id", MODEL_NAME);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parseResult = parseGeminiJSON<CodeAnalysisResult>(text, DEFAULT_ANALYSIS_RESULT);

        if (!parseResult.success) {
          Sentry.captureMessage("Gemini Analysis response parsing failed", {
            level: "warning",
            extra: { rawResponse: parseResult.rawText?.substring(0, 500) }
          });
          // Return partial result with raw text as reasoning trace
          return {
            ...DEFAULT_ANALYSIS_RESULT,
            reasoning_trace: parseResult.rawText || "Failed to parse response"
          };
        }

        // Validate and sanitize the parsed result
        const data = parseResult.data;
        return {
          score: typeof data.score === 'number' ? Math.min(10, Math.max(0, data.score)) : 0,
          security_score: typeof data.security_score === 'number' ? Math.min(10, Math.max(0, data.security_score)) : 0,
          complexity: typeof data.complexity === 'string' ? data.complexity : "Unknown",
          issues: Array.isArray(data.issues) ? data.issues : [],
          security_issues: Array.isArray(data.security_issues) ? data.security_issues : [],
          reasoning_trace: typeof data.reasoning_trace === 'string' ? data.reasoning_trace : ""
        };
      }, GEMINI_RETRY_CONFIG, 'analyzeCodeWithGemini');
    } catch (error) {
      Sentry.captureException(error);
      console.error("Code analysis failed after retries:", error);
      return {
        ...DEFAULT_ANALYSIS_RESULT,
        issues: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  });
}
