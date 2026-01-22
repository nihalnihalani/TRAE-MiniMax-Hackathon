import { daytonaService } from '@/lib/daytona';
import * as Sentry from "@sentry/nextjs";
import { isValidWorkspaceId, isValidPackageName, isValidManager, VALID_MANAGERS } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, packageName, manager } = body;

    if (!workspaceId || !packageName || !manager) {
      return errorResponse('Workspace ID, package name, and manager are required', 400, 'MISSING_PARAMS');
    }

    if (!isValidWorkspaceId(workspaceId)) {
      return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
    }

    if (!isValidPackageName(packageName)) {
      return errorResponse(
        'Invalid package name. Only alphanumeric characters, @, /, -, _, and . are allowed',
        400,
        'INVALID_PACKAGE_NAME'
      );
    }

    if (!isValidManager(manager)) {
      return errorResponse(
        `Invalid package manager. Must be one of: ${VALID_MANAGERS.join(', ')}`,
        400,
        'INVALID_MANAGER'
      );
    }

    const result = await daytonaService.installPackage(workspaceId, packageName, manager);

    if (result.exitCode !== 0) {
        console.error(`Package installation failed: ${result.stderr}`);
    }

    return successResponse({
        stdout: result.stdout,
        stderr: result.stderr,
        isError: result.exitCode !== 0
    });
  } catch (error) {
    Sentry.captureException(error);
    return handleApiError(error, 'API Install Package Error');
  }
}
