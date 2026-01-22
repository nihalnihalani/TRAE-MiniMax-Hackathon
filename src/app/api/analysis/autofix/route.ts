import { NextRequest } from 'next/server';
import { generateAutoFix } from '@/lib/gemini';
import { daytonaService } from '@/lib/daytona';
import { isValidCode, isValidLanguage, VALID_LANGUAGES, MAX_CODE_SIZE } from '@/lib/validation';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const { code, error, language, workspaceId } = await req.json();

    if (!code || !error) {
      return errorResponse('Missing code or error', 400, 'MISSING_PARAMS');
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

    const result = await generateAutoFix(code, error, language || 'python');

    if (!result) {
        return errorResponse('Failed to generate fix', 500, 'FIX_GENERATION_FAILED');
    }

    const { fixedCode, dependencies } = result;
    const installedPackages: string[] = [];

    if (dependencies && dependencies.length > 0 && workspaceId) {
        // Determine package manager based on language
        const manager = (language === 'javascript' || language === 'typescript') ? 'npm' : 'pip';

        for (const dep of dependencies) {
            console.log(`Auto-installing dependency: ${dep}`);
            await daytonaService.installPackage(workspaceId, dep, manager);
            installedPackages.push(dep);
        }
    }

    return successResponse({ fixedCode, installedPackages });
  } catch (error) {
    return handleApiError(error, 'AutoFix API Error');
  }
}
