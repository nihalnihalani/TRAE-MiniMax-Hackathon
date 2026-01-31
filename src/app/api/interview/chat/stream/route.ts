import { NextRequest } from 'next/server';
import { callMiniMaxStream, textToSpeechStreamV2 } from '@/lib/minimax';
import { VOICE_BY_MODE, DEFAULT_MINIMAX_VOICE, FAST_TTS_MODEL } from '@/lib/constants';
import { getSystemInstruction } from '@/lib/interviewer-prompt';
import * as Sentry from "@sentry/nextjs";

export const runtime = 'nodejs'; // Required for 'ws' package in minimax.ts

export async function POST(req: NextRequest) {
  try {
    const { text, history, context, interviewMode, problemContext } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Text required" }), { status: 400 });
    }

    // 1. Construct messages for LLM
    const messages: any[] = [];
    const systemPrompt = getSystemInstruction(
      interviewMode as 'real' | 'practice',
      problemContext,
      context
    );

    messages.push({ sender_type: "USER", sender_name: "System", text: systemPrompt });

    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({
          sender_type: msg.role === 'user' ? "USER" : "BOT",
          sender_name: msg.role === 'user' ? "User" : "Alexis",
          text: msg.content
        });
      });
    }

    messages.push({ sender_type: "USER", sender_name: "User", text: text });

    // 2. Setup streaming pipeline
    console.log("🤖 Starting MiniMax Streaming Pipeline...");
    const voiceId = VOICE_BY_MODE[interviewMode as keyof typeof VOICE_BY_MODE] || DEFAULT_MINIMAX_VOICE;

    const textStream = callMiniMaxStream(messages, 0.7);
    
    // We want to return a stream of both text and audio chunks
    const encoder = new TextEncoder();
    
    // Create a new stream that will pipe text and audio
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use a T-junction or just iterate over text stream once and feed it to TTS
          // We'll manually iterate so we can send text chunks and then audio chunks
          const textBuffer: string[] = [];
          
          // Helper to stream text to client
          const pushText = (text: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          };

          // Wrap the textStream to also push to client
          async function* textStreamWithPush() {
            for await (const chunk of textStream) {
              pushText(chunk);
              yield chunk;
            }
          }

          const audioStream = textToSpeechStreamV2(textStreamWithPush(), voiceId, FAST_TTS_MODEL);

          for await (const audioChunk of audioStream) {
            const base64 = Buffer.from(audioChunk).toString('base64');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ audio: base64 })}\n\n`));
          }
          
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          // Don't kill the whole stream if possible, but we must report error
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Chat Stream API Error:", error);
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: "Internal Error" }), { status: 500 });
  }
}
