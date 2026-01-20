import { Daytona, Workspace } from '@daytonaio/sdk';

export interface WorkspaceConfig {
  language: 'python' | 'typescript' | 'javascript';
  id: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class DaytonaService {
  private daytona: Daytona;

  constructor() {
    const apiKey = process.env.DAYTONA_API_KEY;
    const apiUrl = process.env.DAYTONA_API_URL;

    if (!apiKey || !apiUrl) {
      console.warn("Daytona API keys are missing. Ensure DAYTONA_API_KEY and DAYTONA_API_URL are set.");
    }

    this.daytona = new Daytona({
      apiKey: apiKey || 'dummy',
      apiUrl: apiUrl || 'https://api.daytona.io',
    });
  }

  async createWorkspace(language: string): Promise<WorkspaceConfig> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
      console.log('Mocking Daytona createWorkspace');
      return { id: 'mock-ws-123', language: language as any };
    }

    try {
      // Create a workspace with the requested language
      // Note: This is a simplified example. You might need to specify a repository or image.
      const workspace = await this.daytona.create({
        language: language,
      });
      
      return {
        id: workspace.id,
        language: language as any,
      };
    } catch (error) {
      console.error('Failed to create workspace:', error);
      throw error;
    }
  }

  async executeCode(workspaceId: string, code: string, language: string): Promise<ExecutionResult> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
      console.log('Mocking Daytona executeCode');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
      return { 
        stdout: `Mock Output for ${language}:\n${code}\nResult: Success`, 
        stderr: "", 
        exitCode: 0 
      };
    }

    try {
      // Execute code in the workspace
      // The SDK method might differ slightly depending on version, assuming exec or similar
      const result = await this.daytona.exec(workspaceId, code, language);
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    } catch (error) {
      console.error('Failed to execute code:', error);
      // Return error as result instead of throwing, so UI can show it
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1
      };
    }
  }

  async cleanupWorkspace(workspaceId: string): Promise<void> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log('Mocking Daytona cleanupWorkspace');
        return;
    }
    try {
        await this.daytona.remove(workspaceId);
    } catch (error) {
        console.error('Failed to cleanup workspace:', error);
    }
  }
}

export const daytonaService = new DaytonaService();
