import { daytonaService } from '@/lib/daytona';
import * as Sentry from "@sentry/nextjs";
import { isValidWorkspaceId, isValidCode, isValidLanguage, VALID_LANGUAGES, MAX_CODE_SIZE } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { DEFAULT_EXECUTION_TIMEOUT } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      code,
      language,
      timeout,
      useFile, // Optional: force file-based execution
    } = body;

    if (!workspaceId || !code) {
      return errorResponse('Workspace ID and code are required', 400, 'MISSING_PARAMS');
    }

    if (!isValidWorkspaceId(workspaceId)) {
      return errorResponse('Invalid workspace ID', 400, 'INVALID_WORKSPACE_ID');
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

    const lang = language || 'python';
    const timeoutMs = timeout || DEFAULT_EXECUTION_TIMEOUT;

    // Use codeRun by default (faster), fall back to file-based if requested
    const result = useFile
      ? await daytonaService.executeCodeWithFile(workspaceId, code, lang, undefined, timeoutMs)
      : await daytonaService.executeCode(workspaceId, code, lang, timeoutMs);

    // Sentry Monitoring for Runtime Errors
    if (result.exitCode !== 0 || result.stderr) {
      Sentry.withScope((scope) => {
        scope.setTag("section", "sandbox_execution");
        scope.setTag("language", lang);
        scope.setExtra("workspaceId", workspaceId);
        scope.setExtra("stdout", result.stdout);
        scope.setExtra("stderr", result.stderr);
        Sentry.captureException(new Error(`Sandbox Runtime Error: ${result.stderr || 'Non-zero exit code'}`));
      });
    }

    return successResponse({
      stdout: result.stdout,
      stderr: result.stderr,
      isError: result.exitCode !== 0,
      artifacts: result.artifacts,
    });
  } catch (error) {
    Sentry.captureException(error);
    return handleApiError(error, 'API Execute Code Error');
  }
}
