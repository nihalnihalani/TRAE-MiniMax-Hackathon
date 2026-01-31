import { NextRequest } from 'next/server';
import { errorResponse, handleApiError } from '@/lib/api-utils';
import { TTSRequestSchema, validateRequest } from '@/lib/schemas';
import { textToSpeech } from '@/lib/minimax';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request using Zod schema
    const validation = validateRequest(TTSRequestSchema, body);
    if (!validation.success) {
      return errorResponse(validation.error || 'Invalid request', 400, 'VALIDATION_ERROR');
    }

    const { text, voiceId, model } = validation.data!;

    if (!process.env.MINIMAX_API_KEY) {
      return errorResponse('MiniMax API key not configured', 500, 'MISSING_API_KEY');
    }

    // Use MiniMax TTS
    const audioBuffer = await textToSpeech(text, voiceId || undefined, model || undefined);
    const responseData = new Uint8Array(audioBuffer);

    return new Response(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(responseData.length),
      },
    });

  } catch (error) {
    return handleApiError(error, 'TTS Error');
  }
}
