# Phase 3: ElevenLabs Conversational Agent (Multimodal Update)

## Goal
Integrate the ElevenLabs Conversational AI agent (v0.13+) to act as the interviewer. We leverage the new **Multimodal** capabilities (simultaneous text/speech) and **Conversation Overrides** for dynamic persona adjustments.

## Detailed Implementation Steps

### 1. Agent Configuration (ElevenLabs Dashboard)
*   **Name**: "Alex - Senior Engineer (Gemini Powered)"
*   **System Prompt** (Update to explicitly reference reasoning):
    > "You are Alex, a senior software engineer conducting a technical interview. You are powered by **Gemini 3 Pro**, so use your advanced reasoning capabilities to catch subtle logical errors, not just syntax issues.
    >
    > You have access to a tool called `read_candidate_code`. Use it to see what the candidate is writing.
    >
    > Guidelines:
    > 1. Be encouraging but professional.
    > 2. If the candidate is silent for too long, ask them to explain their thought process.
    > 3. If you see them writing inefficient code (e.g., O(n^2) nested loops), gently guide them.
    > 4. Use the `spelling_patience` feature if they start spelling out variable names."

*   **Tool Definition (`read_candidate_code`)**:
    *   **Description**: "Reads the current code in the candidate's editor."
    *   **Return**: Returns the raw string content of the code.

### 2. Client-Side Integration (`src/components/agent/InterviewAgent.tsx`)
Use the updated `useConversation` hook with client tools.

```typescript
import { useConversation } from '@elevenlabs/react';

export function InterviewAgent() {
  const { status, startConversation, stopConversation } = useConversation({
    onConnect: () => console.log("Connected"),
    onMessage: (message) => console.log("Agent:", message),
    onError: (err) => console.error("Voice Error", err),
    // The client tool callback
    clientTools: {
      read_candidate_code: async () => {
        // Retrieve code from Zustand store
        const code = useInterviewStore.getState().code;
        return code;
      }
    }
  });

  const handleStart = async () => {
     await startConversation({
        // New in v0.13: Overrides
        overrides: {
           agent: {
              language: "en",
              prompt: {
                 // Dynamic injection if needed
                 firstMessage: "Hello! I'm Alex. Ready to code?"
              }
           }
        }
     });
  };

  return (
    <div>
      <StatusIndicator status={status} /> {/* connected, connecting, disconnected */}
      <Visualizer />
      <Button onClick={handleStart}>Start Interview</Button>
    </div>
  );
}
```

### 3. Visualizer & Feedback
*   Implement a simple canvas-based visualizer.
*   **Latency Check**: Ensure the "Listening" state triggers immediately when the user speaks (WebRTC benefit).

## Debugging & Verification

### Step 1: Tool Invocation Log
*   Add a `console.log("Agent requested code!")` inside the `read_candidate_code` callback.
*   Start the interview and say "Can you check my code?".
*   **Check**: Verify the log appears in the browser console.

### Step 2: Interruptibility Test
*   While the agent is speaking a long sentence, start talking.
*   **Expected**: The agent should stop speaking immediately (Echo cancellation + VAD working).

### Step 3: Audio Permissions
*   Ensure browser asks for Microphone permission immediately upon clicking "Start".
*   **Fix**: If blocked, show a clear "Please enable microphone" UI dialog.
