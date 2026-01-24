import { NextResponse } from 'next/server';
import { daytonaService } from '@/lib/daytona';
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, code, language } = body;

    if (!workspaceId || !code) {
      return NextResponse.json({ error: 'Workspace ID and code are required' }, { status: 400 });
    }

    const result = await daytonaService.executeCode(workspaceId, code, language || 'python');
    
    // Sentry Monitoring for Runtime Errors
    if (result.exitCode !== 0 || result.stderr) {
        Sentry.withScope((scope) => {
            scope.setTag("section", "sandbox_execution");
            scope.setTag("language", language || 'python');
            scope.setExtra("workspaceId", workspaceId);
            scope.setExtra("stdout", result.stdout);
            
            // Capture the runtime error as an exception to appear in Sentry Issues
            Sentry.captureException(new Error(`Sandbox Runtime Error: ${result.stderr || 'Non-zero exit code'}`));
        });
    }

    return NextResponse.json({
        stdout: result.stdout,
        stderr: result.stderr,
        isError: result.exitCode !== 0
    });
  } catch (error) {
    console.error('API Execute Code Error:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to execute code' }, { status: 500 });
  }
}
