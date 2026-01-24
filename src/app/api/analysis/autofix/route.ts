import { NextRequest, NextResponse } from 'next/server';
import { generateAutoFix } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { code, error, language } = await req.json();

    if (!code || !error) {
      return NextResponse.json({ error: 'Missing code or error' }, { status: 400 });
    }

    const fixedCode = await generateAutoFix(code, error, language || 'python');

    if (!fixedCode) {
        return NextResponse.json({ error: 'Failed to generate fix' }, { status: 500 });
    }

    return NextResponse.json({ fixedCode });
  } catch (error) {
    console.error('AutoFix API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
