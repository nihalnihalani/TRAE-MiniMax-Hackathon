# Phase 3: ElevenLabs Conversational Agent

## Goal
Configure and integrate the "Interviewer" persona. The key differentiator is the **Custom Tool** that allows the agent to read the code currently in the editor, enabling context-aware feedback.

## Detailed Implementation Steps

### 1. Agent Configuration (ElevenLabs Dashboard)
*   **Name**: "Alex - Senior Engineer"
*   **System Prompt** (Copy this exact text):
    > "You are Alex, a senior software engineer conducting a technical interview. Your goal is to assess the candidate's problem-solving skills, not just their syntax.
    >
    > You have access to a tool called `read_candidate_code`. Use it periodically to see what the candidate is writing.
    >
    > Guidelines:
    > 1. Be encouraging but professional.
    > 2. If the candidate is silent for too long, ask them to explain their thought process.
    > 3. If you see them writing inefficient code (e.g., O(n^2) nested loops for a sorted array), gently ask: 'I notice you're using a nested loop. Is there a way to optimize this given the data is sorted?'
    > 4. Do NOT give the answer directly. Guide them."

*   **Tool Definition (`read_candidate_code`)**:
    *   **Description**: "Reads the current code in the candidate's editor."
    *   **Parameters**: `{}` (None required, or maybe `filename`).
    *   **Return**: Returns the raw string content of the code.

### 2. Client-Side Integration (`src/components/agent/InterviewAgent.tsx`)
Use the `useConversation` hook from `@elevenlabs/react`.

```typescript
import { useConversation } from '@elevenlabs/react';

export function InterviewAgent() {
  const { status, startConversation, stopConversation } = useConversation({
    onConnect: () => console.log("Connected"),
    onMessage: (message) => console.log("Agent:", message),
    // The client tool callback
    clientTools: {
      read_candidate_code: async () => {
        // Retrieve code from Zustand store
        const code = useInterviewStore.getState().code;
        return code;
      }
    }
  });

  return (
    <div>
      <StatusIndicator status={status} /> {/* connected, connecting, disconnected */}
      <Visualizer />
      <Button onClick={startConversation}>Start Interview</Button>
    </div>
  );
}
```

### 3. Visualizer
*   Implement a simple canvas-based visualizer using the `analyserNode` from the web audio context provided by the SDK (if available) or simple CSS animations based on `status === 'speaking'`.

## Debugging & Verification

### Step 1: Text-Only Test
Before hooking up voice:
*   Use the "Test" feature in the ElevenLabs dashboard with the defined tool.
*   Simulate the tool return value.
*   **Check**: Does the agent respond correctly to the simulated code?

### Step 2: Tool Invocation Log
*   Add a `console.log("Agent requested code!")` inside the `read_candidate_code` callback.
*   Start the interview and say "Can you check my code?".
*   **Check**: Verify the log appears in the browser console. This confirms the agent successfully triggered the client-side tool.

### Step 3: Audio Permissions
*   Ensure browser asks for Microphone permission immediately upon clicking "Start".
*   **Fix**: If blocked, show a clear "Please enable microphone" UI dialog.
