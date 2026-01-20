import { NextRequest, NextResponse } from 'next/server';
import { generateAutoFix } from '@/lib/gemini';
import { daytonaService } from '@/lib/daytona';

export async function POST(req: NextRequest) {
  try {
    const { code, error, language, workspaceId } = await req.json();

    if (!code || !error) {
      return NextResponse.json({ error: 'Missing code or error' }, { status: 400 });
    }

    const result = await generateAutoFix(code, error, language || 'python');

    if (!result) {
        return NextResponse.json({ error: 'Failed to generate fix' }, { status: 500 });
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

    return NextResponse.json({ fixedCode, installedPackages });
  } catch (error) {
    console.error('AutoFix API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
