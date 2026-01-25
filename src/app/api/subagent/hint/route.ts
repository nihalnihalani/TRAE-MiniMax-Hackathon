import { GoogleGenerativeAI } from "@google/generative-ai";
import { successResponse, handleApiError } from '@/lib/api-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(request: Request) {
  try {
    const { code, query } = await request.json();

    if (!query) {
      return successResponse({ response: "What are you stuck on? I can provide a subtle hint." });
    }

    const prompt = `
You are a Hint Provider for a coding interview. Your role is to provide SUBTLE hints that guide the candidate towards the solution WITHOUT giving away the answer.

CANDIDATE'S CURRENT CODE:
\`\`\`python
${code || "# No code written yet"}
\`\`\`

WHAT THEY'RE STUCK ON:
${query}

YOUR TASK:
- Provide a SUBTLE hint that points them in the right direction
- Use Socratic questioning - ask them questions that make them think
- DO NOT give away the solution or algorithm directly
- Suggest data structures or patterns to consider WITHOUT showing implementation
- Be brief and encouraging (1-3 sentences)
- Examples of good hints:
  * "Have you considered what happens at the boundaries?"
  * "What data structure would let you look up values quickly?"
  * "Think about how you'd solve this with pen and paper first"

HINT:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return successResponse({ response });
  } catch (error) {
    return handleApiError(error, 'Hint Provider Subagent Error');
  }
}
