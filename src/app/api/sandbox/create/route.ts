import { NextResponse } from 'next/server';
import { daytonaService } from '@/lib/daytona';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language } = body;

    if (!language) {
      return NextResponse.json({ error: 'Language is required' }, { status: 400 });
    }

    const workspace = await daytonaService.createWorkspace(language);
    return NextResponse.json(workspace);
  } catch (error) {
    console.error('API Create Workspace Error:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
