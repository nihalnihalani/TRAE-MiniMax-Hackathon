import { daytonaService, CreateWorkspaceOptions } from '@/lib/daytona';
import { isValidLanguage, VALID_LANGUAGES } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { DEFAULT_AUTO_STOP_INTERVAL } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      language,
      networkAllowList,
      autoStopInterval,
      autoArchiveInterval,
      labels,
      envVars,
      installCodeRabbit,
      timeout,
    } = body;

    if (!language) {
      return errorResponse('Language is required', 400, 'MISSING_LANGUAGE');
    }

    if (!isValidLanguage(language)) {
      return errorResponse(
        `Invalid language. Must be one of: ${VALID_LANGUAGES.join(', ')}`,
        400,
        'INVALID_LANGUAGE'
      );
    }

    const options: CreateWorkspaceOptions = {
      language,
      networkAllowList,
      autoStopInterval: autoStopInterval ?? DEFAULT_AUTO_STOP_INTERVAL,
      autoArchiveInterval,
      labels,
      envVars,
      installCodeRabbit: installCodeRabbit !== false, // Default to true
      timeout,
    };

    const workspace = await daytonaService.createWorkspace(options);
    return successResponse(workspace);
  } catch (error) {
    return handleApiError(error, 'API Create Workspace Error');
  }
}
