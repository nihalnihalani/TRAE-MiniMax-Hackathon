import { NextResponse } from 'next/server';
import { daytonaService } from '@/lib/daytona';
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, testCode } = body;

    if (!workspaceId || !testCode) {
      return NextResponse.json({ error: 'Workspace ID and test code are required' }, { status: 400 });
    }

    // 1. Save the test code to a hidden file
    const testFileName = '_agent_test.py';
    await daytonaService.saveFile(workspaceId, testFileName, testCode);

    // 2. Execute the test file
    const result = await daytonaService.executeCommand(workspaceId, `python ${testFileName}`);
    
    // We don't necessarily treat non-zero exit code as a server error here, 
    // as it might just mean tests failed.
    
    return NextResponse.json({
        stdout: result.stdout,
        stderr: result.stderr,
        isError: result.exitCode !== 0
    });
  } catch (error) {
    console.error('API Agent Test Error:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to run agent test' }, { status: 500 });
  }
}
