# Phase 2: Daytona Sandbox Integration

## Goal
Establish a connection to the Daytona platform to provision coding environments and enable file system operations for the candidate.

## Implementation Plan

1.  **Daytona SDK/API Setup**
    *   Research/Verify Daytona API capability for programmatic workspace creation.
    *   Create a utility service `lib/daytona.ts` to manage workspace lifecycle.
    *   *Key Functions*:
        *   `createSession(language: string)`: Spins up a container/workspace.
        *   `getFile(path: string)`: Reads code from the sandbox.
        *   `updateFile(path: string, content: string)`: Writes code to the sandbox.
        *   `runCode(command: string)`: Executes the code (if needed for output capture).

2.  **Backend Routes for Sandbox Proxy**
    *   Since browsers can't directly access some sandbox internals securely or due to CORS, create Next.js API Routes (`app/api/sandbox/...`).
    *   Endpoint: `POST /api/sandbox/create`
    *   Endpoint: `POST /api/sandbox/execute`
    *   Endpoint: `POST /api/sandbox/save`

3.  **Editor Integration**
    *   Connect Monaco Editor `onChange` events to a debounced save function calling `updateFile`.
    *   *Optimization*: Use WebSocket or efficient polling if real-time observation is critical for the agent. For this MVP, debounced API calls are likely sufficient.

## Debug Plan

1.  **Verification Steps**
    *   Test `createSession` manually via an API testing tool (Postman/Curl) or a simple button in UI.
    *   Verify that a file written via `updateFile` can be read back via `getFile`.
    *   Verify execution logs are returned correctly.

2.  **Common Issues & Fixes**
    *   *Issue*: Daytona API authentication failure. *Fix*: Rotate API key, check permissions.
    *   *Issue*: Latency in typing. *Fix*: Adjust debounce timing (e.g., 1000ms) or switch to optimistic UI updates (local state first, sync later).
    *   *Issue*: CORS errors. *Fix*: Ensure API proxy in Next.js handles the request to Daytona.
