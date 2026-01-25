import { daytonaService } from '@/lib/daytona';
import { isValidWorkspaceId, isValidPath } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, path } = body;

    if (!workspaceId || !path) {
      return errorResponse('Workspace ID and path are required', 400, 'MISSING_PARAMS');
    }

    if (!isValidWorkspaceId(workspaceId)) {
      return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
    }

    if (!isValidPath(path)) {
      return errorResponse(
        'Invalid path. Path must not contain directory traversal sequences',
        400,
        'INVALID_PATH'
      );
    }

    const content = await daytonaService.readFile(workspaceId, path);
    return successResponse({ content });
  } catch (error) {
    return handleApiError(error, 'API Read File Error');
  }
}
