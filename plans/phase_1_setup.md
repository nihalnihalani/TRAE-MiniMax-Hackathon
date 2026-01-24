# Phase 1: Project Setup & Infrastructure

## Goal
Initialize the repository with the necessary framework, configuration, and foundational structure to support the InterviewSandbox application.

## Implementation Plan

1.  **Initialize Next.js Project**
    *   Create a new Next.js project using `create-next-app` with TypeScript, Tailwind CSS, and App Router.
    *   Command: `npx create-next-app@latest . --typescript --tailwind --eslint` (ensure directory is empty or move files).
    *   *Note*: Since we are in the root, we might need to move existing files or init in a subfolder `web` if we want a monorepo structure. Given the scope, a single root app is fine, but cleaning the root is required or we init in `app`. Let's assume root for simplicity, but we have `plans/` now. I will init in `src` or just use the current root and ignore conflicts if possible, or move `plans` to `docs/plans`. actually, putting the app in a `web` or `app` directory is cleaner. Let's use `app` directory.

2.  **Project Configuration**
    *   Setup `tsconfig.json` paths.
    *   Configure `.env.local` for API keys (Daytona, ElevenLabs, Sentry, OpenAI/Anthropic if needed for code analysis).
    *   Add `.cursorrules` or similar if needed (already have system prompt).

3.  **Dependencies Installation**
    *   Install core libraries:
        *   UI: `lucide-react`, `radix-ui` (via `shadcn/ui` later if needed).
        *   State: `zustand` (for interview state).
        *   Editor: `@monaco-editor/react`.
        *   AI/Voice: `elevenlabs/react` (or client SDK).
        *   Sentry: `@sentry/nextjs`.
        *   Daytona: `@daytonaio/sdk` (if available) or standard fetch for API.

4.  **Basic Layout**
    *   Create a clean dashboard layout.
    *   Header with "InterviewSandbox" branding.
    *   Main split-pane layout: Code Editor (Left/Center) + Agent/Status Panel (Right/Overlay).

## Debug Plan

1.  **Verification Steps**
    *   Run `npm run dev` and ensure the landing page loads.
    *   Check console for any build errors.
    *   Verify Tailwind CSS is working by adding a test class.
    *   Verify `monaco-editor` loads correctly in a test component.

2.  **Common Issues & Fixes**
    *   *Issue*: Node version mismatch. *Fix*: Use `nvm use lts`.
    *   *Issue*: Tailwind styles not applying. *Fix*: Check `tailwind.config.ts` content paths.
    *   *Issue*: Monaco Editor SSR issues. *Fix*: Ensure dynamic import with `ssr: false` for the editor component.
