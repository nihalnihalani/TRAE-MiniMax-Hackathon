import { NextRequest, NextResponse } from 'next/server';
import { isValidTTSText, MAX_TTS_LENGTH } from '@/lib/validation';
import { errorResponse, handleApiError } from '@/lib/api-utils';
import { DEFAULT_VOICE_ID } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return errorResponse('Text is required', 400, 'MISSING_TEXT');
    }

    if (!isValidTTSText(text)) {
      return errorResponse(
        `Invalid text. Must be non-empty and no more than ${MAX_TTS_LENGTH} characters`,
        400,
        'INVALID_TEXT'
      );
    }

    const voiceId = DEFAULT_VOICE_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return errorResponse('API key not configured', 500, 'MISSING_API_KEY');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return errorResponse(errorText, response.status, 'TTS_API_ERROR');
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    return handleApiError(error, 'TTS Error');
  }
}
