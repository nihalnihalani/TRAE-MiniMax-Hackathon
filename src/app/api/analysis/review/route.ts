import { analyzeCodeWithGemini } from '@/lib/gemini';
import { isValidCode, isValidLanguage, VALID_LANGUAGES, MAX_CODE_SIZE } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, language } = body;

    if (!code) {
      return errorResponse('Code is required', 400, 'MISSING_CODE');
    }

    if (!isValidCode(code)) {
      return errorResponse(
        `Invalid code. Must be non-empty and less than ${MAX_CODE_SIZE / 1024}KB`,
        400,
        'INVALID_CODE'
      );
    }

    if (language && !isValidLanguage(language)) {
      return errorResponse(
        `Invalid language. Must be one of: ${VALID_LANGUAGES.join(', ')}`,
        400,
        'INVALID_LANGUAGE'
      );
    }

    const analysis = await analyzeCodeWithGemini(code, language || 'python');
    return successResponse(analysis);
  } catch (error) {
    return handleApiError(error, 'Analysis Error');
  }
}
