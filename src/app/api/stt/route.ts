import { NextRequest, NextResponse } from 'next/server';

const DEEPGRAM_API_KEY = (process.env.DEEPGRAM_API_KEY || '').trim();

let keyWarningLogged = false;

// Preflight check: is STT available?
export async function GET() {
  return NextResponse.json({ available: !!DEEPGRAM_API_KEY });
}

export async function POST(req: NextRequest) {
  if (!DEEPGRAM_API_KEY) {
    if (!keyWarningLogged) {
      console.warn('⚠️ DEEPGRAM_API_KEY is not set — STT requests will fail. Add it to .env.local');
      keyWarningLogged = true;
    }
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY is not set. Add it to your .env.local file.' },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    console.log(`🎤 STT: Transcribing ${(audioBuffer.byteLength / 1024).toFixed(1)}KB of audio...`);

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': audioFile.type || 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram API Error:', errorText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const data = await response.json();
    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    console.log(`🎤 STT Result: "${transcript}"`);

    return NextResponse.json({ text: transcript });
  } catch (error) {
    console.error('STT Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
