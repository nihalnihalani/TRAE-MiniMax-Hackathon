import { Daytona } from '@daytonaio/sdk';

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
      apiKey: apiKey || process.env.DAYTONA_API_KEY || 'dummy',
      apiUrl: apiUrl || process.env.DAYTONA_API_URL || 'https://api.daytona.io',
    });
  }

  // Helper to execute command in a specific workspace
  private async _exec(workspaceId: string, command: string): Promise<{ result: string, exitCode: number }> {
     // Retrieve the workspace (sandbox) instance
     const workspace = await this.daytona.get(workspaceId);
     // Execute command via the process API
     const response = await workspace.process.executeCommand(command);
     return {
        result: response.result,
        exitCode: response.exitCode
     };
  }

  async createWorkspace(language: string): Promise<WorkspaceConfig> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
      console.log('Mocking Daytona createWorkspace');
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { id: 'mock-ws-123', language: language as any };
    }

    try {
      const workspace = await this.daytona.create({
        language: language,
      });

      // Install CodeRabbit CLI
      console.log(`Installing CodeRabbit CLI in workspace ${workspace.id}...`);
      await workspace.process.executeCommand('curl -fsSL https://cli.coderabbit.ai/install.sh | sh');
      
      return {
        id: workspace.id,
        language: language as any,
      };
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      
      // Enhance error message if it looks like a 404 HTML response
      if (error?.statusCode === 404) {
        console.error("Daytona API returned 404. This often means DAYTONA_API_URL is pointing to a website instead of the API, or the endpoint is unreachable.");
        console.error("If running locally without a Daytona server, set NEXT_PUBLIC_USE_MOCK_DAYTONA=true in .env.local");
      }
      
      throw error;
    }
  }

  async installPackage(workspaceId: string, packageName: string, manager: 'pip' | 'npm'): Promise<ExecutionResult> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking installPackage: ${manager} install ${packageName}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { stdout: `Successfully installed ${packageName}`, stderr: "", exitCode: 0 };
    }

    try {
        let command = '';
        if (manager === 'pip') {
            command = `pip install ${packageName}`;
        } else if (manager === 'npm') {
            command = `npm install ${packageName}`;
        } else {
            throw new Error(`Unsupported package manager: ${manager}`);
        }

        console.log(`Installing ${packageName} via ${manager} in ${workspaceId}...`);
        const response = await this._exec(workspaceId, command);
        
        return {
            stdout: response.result,
            stderr: "", // SDK v1 might merge stdout/stderr or not expose stderr separately in simple executeCommand
            exitCode: response.exitCode,
        };
    } catch (error) {
        console.error('Failed to install package:', error);
        return {
            stdout: "",
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: 1
        };
    }
  }

  async readFile(workspaceId: string, path: string): Promise<string> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking readFile: ${path}`);
        return "def main():\n    print('Hello from mock file')";
    }

    try {
        const response = await this._exec(workspaceId, `cat ${path}`);
        if (response.exitCode !== 0) {
            throw new Error(`File read failed: ${response.result}`);
        }
        return response.result;
    } catch (error) {
        console.error('Failed to read file:', error);
        throw error;
    }
  }

  async saveFile(workspaceId: string, path: string, content: string): Promise<void> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking saveFile: ${path}`);
        return;
    }

    try {
        // Using base64 to safely write file content via shell to avoid escaping issues
        const base64Content = Buffer.from(content).toString('base64');
        const response = await this._exec(workspaceId, `echo "${base64Content}" | base64 -d > "${path}"`);
        
        if (response.exitCode !== 0) {
             throw new Error(`Failed to save file: ${response.result}`);
        }
    } catch (error) {
        console.error('Failed to save file:', error);
        throw error;
    }
  }

  async executeCommand(workspaceId: string, command: string): Promise<ExecutionResult> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking executeCommand: ${command}`);
        return { stdout: "Mock Command Output", stderr: "", exitCode: 0 };
    }
    
    try {
        const response = await this._exec(workspaceId, command);
        return {
            stdout: response.result,
            stderr: "", 
            exitCode: response.exitCode,
        };
    } catch (error) {
        console.error('Failed to execute command:', error);
        return {
            stdout: "",
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: 1
        };
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
      const executionPromise = this._exec(workspaceId, command);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      // Race between execution and timeout
      const response = await Promise.race([executionPromise, timeoutPromise]) as { result: string, exitCode: number };

      return {
        stdout: response.result,
        stderr: "",
        exitCode: response.exitCode,
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
        const workspace = await this.daytona.get(workspaceId);
        // @ts-ignore - Assuming delete exists on the workspace object based on SDK docs
        await workspace.delete();
    } catch (error) {
        console.error('Failed to cleanup workspace:', error);
    }
  }
}

export const daytonaService = new DaytonaService();
