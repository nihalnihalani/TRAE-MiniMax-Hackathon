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

      // Install CodeRabbit CLI
      console.log(`Installing CodeRabbit CLI in workspace ${workspace.id}...`);
      await this.daytona.exec(workspace.id, 'curl -fsSL https://cli.coderabbit.ai/install.sh | sh', 'shell');
      
      return {
        id: workspace.id,
        language: language as any,
      };
    } catch (error) {
      console.error('Failed to create workspace:', error);
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
        const result = await this.daytona.exec(workspaceId, command, 'shell');
        
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
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
        const result = await this.daytona.exec(workspaceId, `cat ${path}`, 'shell');
        if (result.exitCode !== 0) {
            throw new Error(`File read failed: ${result.stderr}`);
        }
        return result.stdout;
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

  async executeCommand(workspaceId: string, command: string): Promise<ExecutionResult> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA === 'true') {
        console.log(`Mocking executeCommand: ${command}`);
        return { stdout: "Mock Command Output", stderr: "", exitCode: 0 };
    }
    
    try {
        const result = await this.daytona.exec(workspaceId, command, 'shell');
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
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
