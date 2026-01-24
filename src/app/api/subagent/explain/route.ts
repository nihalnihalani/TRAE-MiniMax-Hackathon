import { GoogleGenerativeAI } from "@google/generative-ai";
import { successResponse, handleApiError } from '@/lib/api-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(request: Request) {
  try {
    const { code, query } = await request.json();

    if (!query) {
      return successResponse({ response: "What concept or pattern would you like me to explain?" });
    }

    const prompt = `
You are a Code Explainer assistant for a coding interview. Your role is to explain programming concepts, patterns, and code behavior.

CANDIDATE'S CURRENT CODE:
\`\`\`python
${code || "# No code written yet"}
\`\`\`

WHAT THEY WANT EXPLAINED:
${query}

YOUR TASK:
- Explain the concept, pattern, or code behavior they're asking about
- Use simple, clear language
- Give a brief example if helpful
- Relate it to their current code if relevant
- Be educational but concise (2-4 sentences)
- DO NOT solve their problem for them - just explain concepts
- If they're asking about a specific algorithm, explain the general approach without implementing it

EXPLANATION:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return successResponse({ response });
  } catch (error) {
    return handleApiError(error, 'Code Explainer Subagent Error');
  }
}
