import { NextResponse } from 'next/server';
import { codeRabbitService } from '@/lib/coderabbit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, language } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const review = await codeRabbitService.analyzeCode(code, language || 'python');
    return NextResponse.json(review);
  } catch (error) {
    console.error('CodeRabbit Analysis Error:', error);
    return NextResponse.json({ error: 'Failed to analyze code with CodeRabbit' }, { status: 500 });
  }
}
