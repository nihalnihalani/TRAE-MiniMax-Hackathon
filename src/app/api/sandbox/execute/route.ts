import { NextResponse } from 'next/server';
import { daytonaService } from '@/lib/daytona';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, code, language } = body;

    if (!workspaceId || !code) {
      return NextResponse.json({ error: 'Workspace ID and code are required' }, { status: 400 });
    }

    const result = await daytonaService.executeCode(workspaceId, code, language || 'python');
    return NextResponse.json({
        stdout: result.stdout,
        stderr: result.stderr,
        isError: result.exitCode !== 0
    });
  } catch (error) {
    console.error('API Execute Code Error:', error);
    return NextResponse.json({ error: 'Failed to execute code' }, { status: 500 });
  }
}
