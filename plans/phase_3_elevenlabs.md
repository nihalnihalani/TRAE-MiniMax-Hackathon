# Phase 3: ElevenLabs Conversational Agent

## Goal
Integrate the ElevenLabs Conversational AI agent to act as the interviewer, providing voice instructions and responding to candidate actions.

## Implementation Plan

1.  **Agent Configuration (ElevenLabs Dashboard)**
    *   *Pre-requisite*: Create an Agent in ElevenLabs with a system prompt defining the persona: "Senior Software Engineer Interviewer".
    *   Define knowledge base (optional, maybe general coding guidelines).
    *   Set tools/functions the agent can call (e.g., `check_code_status`, `get_current_file_content`). *Crucial*: The agent needs context.

2.  **Frontend Voice Client**
    *   Use ElevenLabs Conversational AI React SDK or WebSocket API.
    *   Create `InterviewAgent` component.
    *   Implement "Start Interview" / "Stop Interview" controls.
    *   Visualizer: Add a simple audio visualizer (bars/wave) to show when the agent is speaking or listening.

3.  **Context Injection (The "Watching" Part)**
    *   This is the demo hook. The agent needs to know what's happening.
    *   *Strategy*: The agent's system prompt needs dynamic context, OR the agent uses a tool to "look" at the code.
    *   Implement a tool definition for the ElevenLabs Agent: `read_candidate_code()`.
    *   When the agent receives a user query or after a silence timeout, it can query this tool (which hits our `lib/daytona.ts` -> `getFile`) to see the current code state.

4.  **Conversation Flow**
    *   Initial greeting.
    *   Present the problem (text display + voice description).
    *   Q&A loop.

## Debug Plan

1.  **Verification Steps**
    *   Test microphone permissions and audio output in the browser.
    *   Verify connection to ElevenLabs WebSocket.
    *   Test if the agent can "see" the code: Have the agent say "I see you defined function X" after writing it.

2.  **Common Issues & Fixes**
    *   *Issue*: Audio feedback/echo. *Fix*: Implement echo cancellation or recommend headphones.
    *   *Issue*: Agent hallucinating code state. *Fix*: Ensure the `read_candidate_code` tool returns the *exact* recent content.
    *   *Issue*: Latency in voice response. *Fix*: Use streaming responses (standard in ElevenLabs).
