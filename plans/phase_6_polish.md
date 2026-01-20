# Phase 6: Polish & Demo Prep

## Goal
Ensure the "Happy Path" is flawless for the demo video/presentation.

## Implementation Plan

1.  **Demo Script**
    *   Define the exact "Coding Challenge": *Reverse a linked list* or *Implement an LRU Cache* (classic, easy to discuss).
    *   Script the Agent's personality to be encouraging but rigorous.

2.  **Mocking (If needed for stability)**
    *   If Daytona/Sentry has latency, implement a "Demo Mode" toggle that simulates the sandbox response for the video recording (fallback).

3.  **Final Code Cleanup**
    *   Remove `console.log` debugging.
    *   Add comments.
    *   Ensure README explains how to run the stack.

## Debug Plan

1.  **Verification Steps**
    *   Full run-through: Start to Finish.
    *   Record the screen to check for glitches.

2.  **Common Issues & Fixes**
    *   *Issue*: API rate limits during demo practice. *Fix*: Increase limits or mock.
