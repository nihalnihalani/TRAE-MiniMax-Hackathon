import { GoogleGenerativeAI } from "@google/generative-ai";
import { successResponse, handleApiError } from '@/lib/api-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(request: Request) {
  try {
    const { code, query } = await request.json();

    if (!query) {
      return successResponse({ response: "Please ask a question about your code." });
    }

    const prompt = `
You are an expert Code Reviewer assistant. The candidate is working on a coding interview problem.

CANDIDATE'S CURRENT CODE:
\`\`\`python
${code || "# No code written yet"}
\`\`\`

CANDIDATE'S QUESTION:
${query}

YOUR TASK:
- Review the code quality, structure, and best practices
- Answer their specific question about code review
- Suggest improvements but DO NOT give complete solutions
- Focus on: naming conventions, code organization, readability, edge cases, efficiency
- Be concise (2-4 sentences max)
- If they ask for the solution, politely redirect to hints about code quality instead

RESPONSE:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return successResponse({ response });
  } catch (error) {
    return handleApiError(error, 'Code Review Subagent Error');
  }
}
