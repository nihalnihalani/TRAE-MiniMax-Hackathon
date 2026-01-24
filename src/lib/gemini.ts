import { GoogleGenerativeAI } from "@google/generative-ai";
import * as Sentry from "@sentry/nextjs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Using 'gemini-1.5-pro' as a stable "Pro" model. 
// In 2026 context, this might be 'gemini-3-pro', but using 1.5-pro ensures it works now.
const MODEL_NAME = "gemini-1.5-pro"; 

export const model = genAI.getGenerativeModel({ model: MODEL_NAME });

export async function analyzeCodeWithGemini(code: string, language: string) {
  return Sentry.startSpan({ name: "ai.analysis", op: "ai.pipeline" }, async (span) => {
    try {
      const prompt = `
Role: Senior Code Reviewer.
Input: ${language} Code.
Task: Analyze for:
1. Critical Bugs (Syntax errors missed, logic errors).
2. Time Complexity (Big O).
3. Code Smells.

Use reasoning to verify if the algorithm handles edge cases.

Output JSON only:
{
  "score": 1-10, // number
  "complexity": "O(n)", // string
  "issues": ["List of brief issue descriptions"], // string array
  "reasoning_trace": "Brief summary of thought process" // string
}

Code:
${code}
      `;

      span.setAttribute("ai.model_id", MODEL_NAME);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Attempt to parse JSON
      try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanText);
        return json;
      } catch (e) {
        console.error("Failed to parse Gemini response", text);
        return { 
          score: 0, 
          complexity: "Unknown", 
          issues: ["Failed to parse AI response"], 
          reasoning_trace: text 
        };
      }
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
}
