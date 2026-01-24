# Daytona Interview Sandbox

A next-generation technical interview platform powered by **Daytona**, **ElevenLabs**, and **Gemini 3 Pro**.

## Features

- **Voice-First AI Interviewer**: "Alex", an AI agent that can see your code and guide you through problems.
- **Secure Sandbox**: Code execution in isolated containers via Daytona.
- **Deep Analysis**: Gemini 3 Pro reviews code for time complexity, bugs, and edge cases.
- **Wizard Mode**: A fail-safe demo mode to ensure smooth presentations.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, Shadcn UI
- **State**: Zustand (Persistent)
- **AI**: Google Gemini 1.5/3 Pro, ElevenLabs React SDK
- **Sandbox**: Daytona SDK
- **Monitoring**: Sentry

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.local.example` to `.env.local` and add keys:
   - `DAYTONA_API_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Application**:
   Visit [http://localhost:3000/interview](http://localhost:3000/interview)

## Architecture

- `src/app/interview`: Main application route.
- `src/lib/daytona.ts`: Service layer for sandbox operations.
- `src/lib/gemini.ts`: AI analysis pipeline.
- `src/components/agent`: Voice agent visualization and control.
