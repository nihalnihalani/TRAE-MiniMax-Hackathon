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

  async installDependencies(workspaceId: string, command: string): Promise<ExecutionResult> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking installDependencies: ${command}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { stdout: "Dependencies installed", stderr: "", exitCode: 0 };
    }

    try {
        // Run the installation command
        // Note: Using 'exec' as a generic command runner here, assuming SDK supports it or similar
        // Adjust based on actual SDK capability if 'exec' is purely for code. 
        // Typically daytona.exec runs in the default shell.
        const result = await this.daytona.exec(workspaceId, command, 'shell');
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
        };
    } catch (error) {
        console.error('Failed to install dependencies:', error);
        return {
            stdout: "",
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: 1
        };
    }
  }

  async saveFile(workspaceId: string, path: string, content: string): Promise<void> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking saveFile: ${path}`);
        return;
    }

    try {
        // Simple write using echo for now. 
        // In production, consider using a proper FS API or base64 encoding to avoid shell escaping issues.
        // const escapedContent = content.replace(/"/g, '\\"');
        // await this.daytona.exec(workspaceId, `echo "${escapedContent}" > ${path}`);
        
        // Better approach: SDK likely has fs.upload or similar. 
        // Failing that, we can try to assume the SDK isn't fully typed here and use a specific method if known.
        // For this task, let's assume 'exec' is the main way interaction happens if detailed FS isn't exposed.
        
        // Using base64 to safely write file content via shell
        const base64Content = Buffer.from(content).toString('base64');
        await this.daytona.exec(workspaceId, `echo "${base64Content}" | base64 -d > ${path}`, 'shell');
        
    } catch (error) {
        console.error('Failed to save file:', error);
        throw error;
    }
  }

  async executeCode(
      workspaceId: string, 
      code: string, 
      language: string, 
      timeoutMs: number = 30000
    ): Promise<ExecutionResult> {
    
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
      console.log('Mocking Daytona executeCode');
      await new Promise(resolve => setTimeout(resolve, 500)); 
      return { 
        stdout: `Mock Output for ${language}:\n${code}\nResult: Success`, 
        stderr: "", 
        exitCode: 0 
      };
    }

    try {
      let command = code;
      let filename = 'main';

      if (language === 'python') {
        filename = 'main.py';
        command = `python ${filename}`;
      } else if (language === 'javascript' || language === 'typescript') {
        filename = 'index.js'; // Simplification for Node
        command = `node ${filename}`;
      }

      // 1. Save the code to a file
      await this.saveFile(workspaceId, filename, code);

      // 2. Execute the file
      const executionPromise = this.daytona.exec(workspaceId, command, 'shell');
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      // Race between execution and timeout
      // Note: SDK types might need casting if result doesn't match exactly what we expect
      const result = await Promise.race([executionPromise, timeoutPromise]) as any;

      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode ?? 0,
      };
    } catch (error) {
      console.error('Failed to execute code:', error);
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1 // Treat timeout or error as failure
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
