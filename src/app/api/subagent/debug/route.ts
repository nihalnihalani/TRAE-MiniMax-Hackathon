import { GoogleGenerativeAI } from "@google/generative-ai";
import { successResponse, handleApiError } from '@/lib/api-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(request: Request) {
  try {
    const { code, query } = await request.json();

    if (!query) {
      return successResponse({ response: "Please describe the bug or issue you're experiencing." });
    }

    const prompt = `
You are an expert Debug Assistant. The candidate is working on a coding interview problem and needs help debugging.

CANDIDATE'S CURRENT CODE:
\`\`\`python
${code || "# No code written yet"}
\`\`\`

CANDIDATE'S BUG DESCRIPTION:
${query}

YOUR TASK:
- Help identify the bug or issue in their code
- Explain WHY the bug occurs (root cause)
- Give a HINT about how to fix it, but DO NOT provide the complete fix
- Guide them towards debugging strategies (print statements, checking edge cases, etc.)
- Be concise (2-4 sentences max)
- If they ask for the solution, guide them to think about the problem themselves

RESPONSE:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return successResponse({ response });
  } catch (error) {
    return handleApiError(error, 'Debug Assistant Subagent Error');
  }
}
