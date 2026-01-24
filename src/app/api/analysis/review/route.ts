import { NextResponse } from 'next/server';
import { analyzeCodeWithGemini } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, language } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const analysis = await analyzeCodeWithGemini(code, language || 'python');
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ error: 'Failed to analyze code' }, { status: 500 });
  }
}
