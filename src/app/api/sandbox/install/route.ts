import { NextResponse } from 'next/server';
import { daytonaService } from '@/lib/daytona';
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, packageName, manager } = body;

    if (!workspaceId || !packageName || !manager) {
      return NextResponse.json({ error: 'Workspace ID, package name, and manager are required' }, { status: 400 });
    }

    const result = await daytonaService.installPackage(workspaceId, packageName, manager);
    
    if (result.exitCode !== 0) {
        console.error(`Package installation failed: ${result.stderr}`);
    }

    return NextResponse.json({
        stdout: result.stdout,
        stderr: result.stderr,
        isError: result.exitCode !== 0
    });
  } catch (error) {
    console.error('API Install Package Error:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to install package' }, { status: 500 });
  }
}
