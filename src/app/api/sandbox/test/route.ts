import { daytonaService } from '@/lib/daytona';
import * as Sentry from "@sentry/nextjs";
import { isValidWorkspaceId, isValidCode, MAX_CODE_SIZE } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, testCode, language } = body;

    if (!workspaceId || !testCode) {
      return errorResponse('Workspace ID and test code are required', 400, 'MISSING_PARAMS');
    }

    if (!isValidWorkspaceId(workspaceId)) {
      return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
    }

    if (!isValidCode(testCode)) {
      return errorResponse(
        `Invalid test code. Must be non-empty and less than ${MAX_CODE_SIZE / 1024}KB`,
        400,
        'INVALID_CODE'
      );
    }

    // Use codeRun for direct execution (no file needed for tests)
    // This is cleaner and doesn't leave test files behind
    const result = await daytonaService.executeCode(
      workspaceId,
      testCode,
      language || 'python',
      60000 // 60 second timeout for tests
    );

    // We don't treat non-zero exit code as a server error here,
    // as it might just mean tests failed.
    return successResponse({
      stdout: result.stdout,
      stderr: result.stderr,
      isError: result.exitCode !== 0,
    });
  } catch (error) {
    Sentry.captureException(error);
    return handleApiError(error, 'API Agent Test Error');
  }
}
