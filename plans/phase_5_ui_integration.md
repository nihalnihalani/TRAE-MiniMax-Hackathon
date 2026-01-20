# Phase 5: UI/UX & Integration

## Goal
Assemble the components into a cohesive, immersive interview environment.

## Implementation Plan

1.  **Main Interface (`/interview` page)**
    *   **Left Panel**: Problem Statement (Markdown).
    *   **Center**: Monaco Editor (The Daytona Interface).
        *   Language selector (Python/TS).
        *   Run Button.
        *   Console Output panel.
    *   **Right/Floating**: Agent Interface.
        *   "Interviewer" Avatar/Visualizer.
        *   Transcript (optional, for accessibility).
        *   "End Interview" button.

2.  **State Management**
    *   Use `zustand` store: `useInterviewStore`.
    *   State: `status` (idle, active, completed), `code`, `consoleOutput`, `agentStatus` (listening, speaking, thinking).

3.  **Onboarding Flow**
    *   Landing page -> Permission Check (Mic) -> Start Session.

## Debug Plan

1.  **Verification Steps**
    *   Responsive check: Ensure editor is usable on intended screen sizes.
    *   State consistency: Verify navigating away and back preserves code (if desired) or resets cleanly.
    *   Accessibility: Basic keyboard navigation for the editor.

2.  **Common Issues & Fixes**
    *   *Issue*: layout shifts when keyboard opens (mobile) or console expands. *Fix*: Flexbox/Grid constraints.
