# 🏆 Devpost Submission: Daytona Interview Sandbox

## Project Name
**Daytona Interview Sandbox: The Voice-First AI Technical Interviewer**

## Tagline
An AI-powered interviewer that watches you code, listens to your reasoning, and runs your solution in a secure Daytona sandbox—just like a real Senior Engineer.

## Inspiration
Hiring software engineers is broken. Traditional LeetCode-style platforms are silent, lonely, and disconnected from reality. They check *if* code passes hidden test cases, but they fail to measure *how* a candidate thinks, communicates, or handles edge cases.

We wanted to fix this by building "Alex"—an AI interviewer that doesn't just stare at your code but **talks to you**. We wanted an experience that feels like pair programming with a senior engineer: someone who notices when you're writing a nested loop, asks "Why did you choose that data structure?", and runs your code in a real environment, not a fragile browser mock.

## What it does
Daytona Interview Sandbox is a full-stack interview platform where:

1.  **"Alex" Talks to You**: Using **ElevenLabs Conversational AI**, the agent conducts a natural voice interview. It introduces the problem, asks follow-up questions, and offers hints if you get stuck.
2.  **Real Code Execution**: We use **Daytona** to spin up an ephemeral, secure coding environment for every candidate. When you click "Run", your code executes in a real Linux container, allowing for file I/O, package installation (e.g., `pip install numpy`), and genuine terminal output.
3.  **Real-time Intelligence**:
    *   **Gemini 3 Pro** acts as the reasoning engine, watching every keystroke to detect complexity issues (e.g., O(n^2) algorithms) and security flaws.
    *   **CodeRabbit** runs deep architectural reviews on demand.
4.  **Integrity Shield**: The system silently monitors tab switching (blur events) and suspicious large paste operations to ensure fairness, generating a "Trust Score" at the end.
5.  **Wizard Mode**: A unique feature we built for demos/admins that allows a human to override the AI and force specific voice lines via the **ElevenLabs TTS API**, ensuring perfect presentations every time.

## How we built it
*   **Frontend**: Built with **Next.js 16** (App Router) and **React 19**, utilizing **Tailwind CSS** and **Shadcn UI** for a modern, responsive interface.
*   **Infrastructure (The Core)**: We used the **Daytona SDK** to manage the lifecycle of coding environments. Each session creates a fresh workspace where the user's code is synced and executed.
*   **Voice**: **ElevenLabs** powers the bi-directional voice stream. We implemented a custom visualizer to show when the agent is "listening", "thinking", or "speaking".
*   **Analysis**: We chained **Google Gemini 3 Pro** for high-speed logic analysis and **CodeRabbit** for deep code reviews.
*   **State Management**: We used **Zustand** to handle the complex synchronization between the code editor, the voice agent's state, and the terminal output.

## Challenges we ran into
*   **Latency vs. Accuracy**: Balancing the speed of voice responses with the depth of code analysis was tough. We solved this by decoupling the loops: the voice agent responds instantly to conversation, while the "Deep Analysis" runs asynchronously in the background and injects context when ready.
*   **Secure Execution**: Allowing users to run arbitrary Python code is risky. **Daytona** made this trivial by providing isolated environments that we could spin up and tear down instantly.
*   **Agent Hallucinations**: During testing, the LLM would sometimes invent API methods. We built "Wizard Mode" (`Ctrl+Shift+X`) to give us a "kill switch" to force the agent back onto the happy path during live demos.

## Accomplishments that we're proud of
*   **The "Magic" Moment**: The first time "Alex" correctly interrupted us to say, *"I see you missed an edge case with the empty list,"* while we were typing—it felt like magic.
*   **Seamless Daytona Integration**: We went from "how do we run code?" to a fully working remote execution engine in under a few hours thanks to the SDK.
*   **Integrity System**: We built a robust cheat-detection system that doesn't just block users but gathers evidence for a final "Hire/No Hire" report.

## What's next for Daytona Interview Sandbox
*   **Multi-Language Support**: Expanding beyond Python to Go, Rust, and TypeScript.
*   **System Design Interview**: Adding a shared whiteboard canvas where the candidate can draw architecture diagrams while discussing them with Alex.
*   **Post-Interview Analytics**: sending the final report and recording to the hiring manager via email.

## Built With
*   **Daytona**
*   **ElevenLabs**
*   **Next.js**
*   **Gemini**
*   **CodeRabbit**
*   **TypeScript**
*   **Tailwind**
*   **Docker**
