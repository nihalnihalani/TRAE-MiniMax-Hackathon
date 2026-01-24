import { daytonaService } from '@/lib/daytona';
import { isValidWorkspaceId, isValidPath } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

// GET - List files in a directory
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const path = searchParams.get('path') || '.';

    if (!workspaceId) {
      return errorResponse('Workspace ID is required', 400, 'MISSING_WORKSPACE_ID');
    }

    if (!isValidWorkspaceId(workspaceId)) {
      return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
    }

    if (!isValidPath(path)) {
      return errorResponse('Invalid path', 400, 'INVALID_PATH');
    }

    const files = await daytonaService.listFiles(workspaceId, path);
    return successResponse({ files });
  } catch (error) {
    return handleApiError(error, 'API List Files Error');
  }
}

// POST - Create directory or perform other file operations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, path, mode, operation } = body;

    if (!workspaceId || !path) {
      return errorResponse('Workspace ID and path are required', 400, 'MISSING_PARAMS');
    }

    if (!isValidWorkspaceId(workspaceId)) {
      return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
    }

    if (!isValidPath(path)) {
      return errorResponse('Invalid path', 400, 'INVALID_PATH');
    }

    // Default operation is createDirectory
    const op = operation || 'createDirectory';

    switch (op) {
      case 'createDirectory':
        await daytonaService.createDirectory(workspaceId, path, mode || '755');
        return successResponse({ created: true, path });

      case 'delete':
        const recursive = body.recursive === true;
        await daytonaService.deleteFile(workspaceId, path, recursive);
        return successResponse({ deleted: true, path });

      default:
        return errorResponse(
          `Invalid operation. Must be one of: createDirectory, delete`,
          400,
          'INVALID_OPERATION'
        );
    }
  } catch (error) {
    return handleApiError(error, 'API File Operation Error');
  }
}
