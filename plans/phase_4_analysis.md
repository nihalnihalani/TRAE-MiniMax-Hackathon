# Phase 4: Monitoring & Analysis (Sentry & Code Analysis)

## Goal
Implement the "passive observer" systems. Sentry catches runtime crashes (the "red squigglies" of runtime), while the Analysis Agent (LLM) catches "smells" (bad practices).

## Detailed Implementation Steps

### 1. Sentry for Runtime Errors
*   **Frontend**: Standard `@sentry/nextjs` config.
*   **Sandbox Errors**:
    *   In `/api/sandbox/execute`, capture the `stderr` from the execution result.
    *   If `exitCode !== 0`, explicitly send to Sentry:
    ```typescript
    import * as Sentry from "@sentry/nextjs";

    if (result.exitCode !== 0) {
      Sentry.captureException(new Error(`Sandbox Runtime Error: ${result.stderr}`), {
        tags: {
          component: "sandbox_execution",
          language: body.language,
          candidate_id: "session_123"
        },
        extra: {
          code_snippet: body.code.substring(0, 100) // Context
        }
      });
    }
    ```

### 2. "CodeRabbit" Analysis Proxy
Create a background function that runs when code is executed successfully.

**Prompt for LLM (OpenAI/Anthropic)**:
```text
Role: Senior Code Reviewer.
Input: Python Code.
Task: Analyze for:
1. Critical Bugs (Syntax errors missed, logic errors).
2. Time Complexity (Big O).
3. Code Smells (Global variables, bad naming).

Output JSON:
{
  "score": 1-10,
  "complexity": "O(n)",
  "issues": ["List of brief issue descriptions"]
}
```

**Route: `src/app/api/analysis/review/route.ts`**
*   Call OpenAI with the prompt above.
*   Save the result to the `InterviewStore` (so the Agent can access it later via `get_latest_review` tool if we want to expand Phase 3).

### 3. Competency Report
*   Create a simple UI component `CompetencyReport.tsx` that renders after the interview ends.
*   Display:
    *   Total Run Attempts.
    *   Pass/Fail Status.
    *   Issues List (from Analysis Proxy).

## Debugging & Verification

### Step 1: The "Infinite Loop" Test
*   Write a `while True: pass` loop in the editor.
*   Run the Analysis Proxy manually via Curl.
*   **Check**: Does the LLM return a warning about "Possible infinite loop" or "Timeout risk"?

### Step 2: Sentry Tag Check
*   Trigger a runtime error (e.g., `print(undefined_var)`).
*   Go to Sentry Dashboard.
*   **Check**: Look for the tag `component: sandbox_execution`. If it's there, our custom instrumentation is working.

### Step 3: Rate Limit Handling
*   Ensure the Analysis API doesn't run on *every* keystroke.
*   **Check**: Verify it only runs on "Run Code" click or explicitly every 60 seconds.
