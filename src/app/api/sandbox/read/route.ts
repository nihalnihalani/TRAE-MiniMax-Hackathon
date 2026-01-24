import { NextResponse } from 'next/server';
import { daytonaService } from '@/lib/daytona';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, path } = body;

    if (!workspaceId || !path) {
      return NextResponse.json({ error: 'Workspace ID and path are required' }, { status: 400 });
    }

    const content = await daytonaService.readFile(workspaceId, path);
    return NextResponse.json({ content });
  } catch (error) {
    console.error('API Read File Error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
