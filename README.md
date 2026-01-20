# DAYTONA Interview Sandbox

An advanced, AI-powered technical interview platform that combines a live coding environment with an interactive voice agent and intelligent code analysis. This project leverages the **Daytona SDK** for secure sandboxed execution, **ElevenLabs** for realistic voice interaction, and **Google Gemini 3 Pro** for deep code understanding and feedback.

## 🚀 Key Features

*   **🤖 AI Interview Agent:** A conversational AI interviewer (powered by ElevenLabs) that guides candidates through problems, answers questions, and provides verbal feedback.
*   **💻 Secure Coding Sandbox:** A fully functional, browser-based code editor (Monaco Editor) backed by **Daytona** containers for safe code execution in various languages.
*   **🧠 Intelligent Code Analysis:** Real-time code reviews and "CodeRabbit-style" feedback powered by **Google Gemini**, offering insights on bugs, complexity, and best practices.
*   **🐇 Deep CodeRabbit Integration:** Native integration with the **CodeRabbit CLI** within the Daytona sandbox, providing professional-grade automated code reviews, walkthroughs, and issue detection directly in the interview workflow.
*   **⚡ Modern UI/UX:** A responsive, accessible interface built with **Next.js 16**, **Tailwind CSS 4**, and **Shadcn UI**.
*   **📊 Live Feedback Loop:** Instant feedback on code execution and analysis during the interview session.
*   **🕵️‍♂️ Integrity & Proctoring:** Automated monitoring of tab focus and paste events to ensure interview integrity.
*   **📝 Automated Reporting:** Generates comprehensive Markdown reports summarizing code quality, test results, and integrity metrics.
*   **🔧 Agentic Infrastructure:** The AI agent can autonomously install dependencies (pip/npm) and run hidden test cases to verify solutions.

## 🛠️ Technology Stack

### Core Framework
*   **[Next.js 16](https://nextjs.org/)** - App Router architecture.
*   **[React 19](https://react.dev/)** - The latest React features including Server Components.
*   **[TypeScript](https://www.typescriptlang.org/)** - Fully typed codebase for reliability.

### UI & Styling
*   **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework.
*   **[Shadcn UI](https://ui.shadcn.com/)** - Reusable components built with Radix UI.
*   **[Lucide React](https://lucide.dev/)** - Beautiful, consistent icons.
*   **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - The VS Code editor for the web.

### AI & Backend Services
*   **[Daytona SDK](https://daytona.io/)** - For managing secure, ephemeral coding environments.
*   **[CodeRabbit CLI](https://coderabbit.ai/)** - Integrated for deep, contextual code reviews.
*   **[ElevenLabs React SDK](https://elevenlabs.io/)** - For low-latency conversational AI.
*   **[Google Generative AI (Gemini)](https://ai.google.dev/)** - For code reasoning and interview logic.
*   **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight state management.
*   **[Sentry](https://sentry.io/)** - Error tracking and performance monitoring.

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+ (LTS recommended)
*   npm or yarn
*   API Keys for:
    *   Daytona
    *   ElevenLabs
    *   Google Gemini (AI Studio)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nihalnihalani/DAYTONA-InterviewSandBox.git
    cd DAYTONA-InterviewSandBox
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your API keys:

    ```env
    # Daytona Configuration
    DAYTONA_API_KEY=your_daytona_api_key
    DAYTONA_API_URL=https://api.daytona.io/...
    NEXT_PUBLIC_USE_MOCK_DAYTONA=true  # Set to false to use real Daytona backend

    # ElevenLabs Configuration
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id
    NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key

    # Google Gemini (Analysis)
    GEMINI_API_KEY=your_gemini_api_key

    # Monitoring (Optional)
    SENTRY_DSN=your_sentry_dsn
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the app:**
    Visit `http://localhost:3000` in your browser.

## 📂 Project Structure

```text
/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/            # API Routes (Sandbox proxy, Analysis)
│   │   ├── interview/      # Main interview interface
│   │   └── page.tsx        # Landing page
│   ├── components/
│   │   ├── agent/          # AI Visualizer & Agent components
│   │   ├── analysis/       # Code Review & Analysis panels
│   │   ├── editor/         # Monaco Editor wrapper
│   │   ├── interview/      # Interview control panels
│   │   └── ui/             # Shadcn/Radix UI primitives
│   ├── lib/                # Utility functions & API wrappers
│   │   ├── coderabbit.ts   # Code analysis logic
│   │   ├── daytona.ts      # Daytona SDK integration
│   │   └── gemini.ts       # LLM integration
│   └── types/              # TypeScript interfaces
├── public/                 # Static assets
└── plans/                  # Project roadmap and documentation
```

## 🗓️ Roadmap

- [x] **Phase 1: Setup & Infrastructure:** Initial project structure, dependencies, and basic UI.
- [ ] **Phase 2: Daytona Integration:** Connect the Code Editor to real Daytona containers for execution.
- [ ] **Phase 3: Voice Agent:** Implement full ElevenLabs conversational flow.
- [ ] **Phase 4: Code Analysis:** Enhance Gemini integration for deeper code reviews.
- [ ] **Phase 5: UI Polish:** Refine animations, themes, and accessibility.
- [x] **Phase 7: Daytona Sprint Features:** Agentic control, autonomous testing, integrity monitoring, and reporting.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
