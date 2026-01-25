import { SchemaType } from "@google/generative-ai";

/**
 * Interview Tools for Gemini Live WebSocket API
 * These tools are used by the AI interviewer to interact with the sandbox
 */
export const INTERVIEW_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "read_candidate_code",
        description: "Read the current code written by the candidate in the editor.",
      },
      {
        name: "read_sandbox_file",
        description: "Read the content of a specific file in the sandbox workspace.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: {
              type: SchemaType.STRING,
              description: "The file path to read (e.g., 'main.py')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "run_coderabbit_analysis",
        description: "Run a CodeRabbit analysis on the current code or workspace to get a code review.",
      },
      {
        name: "run_code",
        description: "Execute the candidate's current code in the sandbox environment and get the output.",
      },
      {
        name: "install_dependency",
        description: "Install a package/dependency in the sandbox environment.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            packageName: {
              type: SchemaType.STRING,
              description: "The name of the package to install",
            },
            manager: {
              type: SchemaType.STRING,
              description: "The package manager to use ('pip' or 'npm')",
            },
          },
          required: ["packageName", "manager"],
        },
      },
      {
        name: "run_hidden_test",
        description: "Run a specific hidden test case against the candidate's code.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            testCode: {
              type: SchemaType.STRING,
              description: "The test code to execute",
            },
          },
          required: ["testCode"],
        },
      },
      {
        name: "get_current_problem",
        description: "Get details about the current coding problem (description, examples, constraints).",
      },
      {
        name: "get_interview_mode",
        description: "Get the current interview mode (real vs practice) and role instructions.",
      },
      {
        name: "provide_hint",
        description: "Provide a hint to the candidate (only available in practice mode).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            level: {
              type: SchemaType.NUMBER,
              description: "The hint level index (0-based) to retrieve",
            },
          },
        },
      },
      {
        name: "explain_concept",
        description: "Get an explanation for a coding concept (for practice mode).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            topic: {
              type: SchemaType.STRING,
              description: "The concept or topic to explain",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "get_integrity_status",
        description: "Check the candidate's integrity status (paste events, blur events).",
      },
    ],
  },
];
