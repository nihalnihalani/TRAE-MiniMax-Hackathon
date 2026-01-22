import { codeRabbitService } from '@/lib/coderabbit';
import { isValidCode, isValidLanguage, isValidWorkspaceId, VALID_LANGUAGES, MAX_CODE_SIZE } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, language, workspaceId } = body;

    if (workspaceId) {
        if (!isValidWorkspaceId(workspaceId)) {
          return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
        }
        // Run analysis inside the sandbox
        const review = await codeRabbitService.analyzeSandbox(workspaceId);
        return successResponse(review);
    }

    if (!code) {
      return errorResponse('Code is required if workspaceId is not provided', 400, 'MISSING_CODE');
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

    const review = await codeRabbitService.analyzeCode(code, language || 'python');
    return successResponse(review);
  } catch (error) {
    return handleApiError(error, 'CodeRabbit Analysis Error');
  }
}
