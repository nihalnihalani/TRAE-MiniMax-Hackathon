# Phase 4: Monitoring & Analysis (Sentry & Code Analysis)

## Goal
Implement automated quality checks and error monitoring to provide data for the competency report and real-time feedback.

## Implementation Plan

1.  **Sentry Integration**
    *   **Frontend**: Initialize Sentry in Next.js to catch UI crashes.
    *   **Runtime (Sandbox)**: This is the tricky part.
        *   *Approach*: When `runCode` is executed in Daytona, parse the `stderr`.
        *   If `stderr` contains a traceback/error, send a custom event to Sentry via the server-side SDK: `Sentry.captureException(new Error(sandboxError))`.
        *   Tag these errors with `candidate_id` and `context: sandbox`.

2.  **Code Quality Analysis (CodeRabbit-ish)**
    *   Since CodeRabbit might be a GitHub App, for a *live* sandbox, we might need a proxy.
    *   *Alternative*: Use an LLM (Claude/GPT-4) as a "Code Reviewer" agent running in the background.
    *   *Trigger*: On successful compile/run or every N minutes.
    *   *Action*: Send code to Reviewer LLM with prompt: "Analyze for code smells, complexity, and best practices."
    *   *Output*: JSON list of issues.
    *   *Feedback*: Store these issues. The ElevenLabs agent can read these via a tool (`get_code_review_feedback`) and verbally mention them: "I noticed you're using a nested loop there, is that O(n^2) intentional?"

3.  **Competency Report Generation**
    *   Collect metrics: Time taken, Lines of Code, Error count (Sentry), Code Smells (Analysis).
    *   Generate a simple Markdown summary at the end.

## Debug Plan

1.  **Verification Steps**
    *   Trigger a deliberate Python error (e.g., `1/0`) in the sandbox and check the Sentry dashboard.
    *   Write "smelly" code (global variables, infinite loops) and verify the analysis tool detects it.
    *   Verify the ElevenLabs agent can reference these errors.

2.  **Common Issues & Fixes**
    *   *Issue*: Sentry quotas. *Fix*: Use sampling or dev keys.
    *   *Issue*: Reviewer LLM is too slow. *Fix*: Run analysis asynchronously; don't block the UI.
