import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, callMiniMax, CHAT_MODEL_NAME } from '@/lib/minimax';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  try {
    const { text, history, context } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // 1. Construct messages for LLM
    // System prompt + history + user message
    const messages: any[] = [];
    
    // Add system prompt if provided or default
    const systemPrompt = "You are Alexis, a friendly but rigorous technical interviewer. Keep responses concise and conversational.";
    messages.push({ sender_type: "USER", sender_name: "System", text: systemPrompt });

    // Add context (code)
    if (context) {
       messages.push({ sender_type: "USER", sender_name: "System", text: `Current Code Context:\n${context}` });
    }

    // Add history (simplified)
    if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
            messages.push({ 
                sender_type: msg.role === 'user' ? "USER" : "BOT", 
                sender_name: msg.role === 'user' ? "User" : "Alexis", 
                text: msg.content 
            });
        });
    }

    // Add current user message
    messages.push({ sender_type: "USER", sender_name: "User", text: text });

    // 2. Call MiniMax LLM
    console.log("🤖 Calling MiniMax LLM...");
    const aiResponseText = await callMiniMax(messages, 0.7, CHAT_MODEL_NAME);
    console.log("🤖 AI Response:", aiResponseText);

    // 3. Call MiniMax TTS
    console.log("🔊 Calling MiniMax TTS...");
    const audioBuffer = await textToSpeech(aiResponseText);
    
    // Convert ArrayBuffer to Base64
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({
      text: aiResponseText,
      audio: audioBase64
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
