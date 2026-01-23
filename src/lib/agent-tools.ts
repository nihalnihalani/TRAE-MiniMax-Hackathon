import { useInterviewStore } from '@/lib/store';

// Wrapper to catch tool errors and prevent disconnections
const wrapTool = (name: string, fn: Function) => async (...args: any[]) => {
    try {
        console.log(`🔧 Tool called: ${name}`, args.length > 0 ? args[0] : '(no args)');
        const result = await fn(...args);
        console.log(`✅ Tool ${name} succeeded`);
        return result;
    } catch (error) {
        console.error(`❌ Tool ${name} failed:`, error);
        return `Error in ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
};

export const getAgentTools = (workspaceId: string | null) => ({
    read_candidate_code: wrapTool('read_candidate_code', async () => {
        console.log("Agent requested code read");
        const currentCode = useInterviewStore.getState().code;
        return currentCode || "No code written yet.";
    }),

    read_sandbox_file: wrapTool('read_sandbox_file', async ({ path }: { path: string }) => {
        console.log("Agent requested file read:", path);
        if (!workspaceId) return "No active workspace.";

        const response = await fetch('/api/sandbox/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, path })
        });
        const json = await response.json();
        const data = json.data || json;
        return data.content || "File not found or empty.";
    }),

    run_coderabbit_analysis: wrapTool('run_coderabbit_analysis', async () => {
        console.log("Agent requested CodeRabbit analysis");
        if (!workspaceId) return "No active workspace.";

        const response = await fetch('/api/analysis/coderabbit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId })
        });
        const data = await response.json();
        return JSON.stringify(data);
    }),

    run_code: wrapTool('run_code', async () => {
        console.log("Agent requested code execution");
        if (!workspaceId) return "No active workspace.";
        const code = useInterviewStore.getState().code;
        const language = useInterviewStore.getState().language;

        const response = await fetch('/api/sandbox/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, code, language })
        });
        const json = await response.json();
        const result = json.data || json;
        return `Exit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
    }),

    install_dependency: wrapTool('install_dependency', async ({ packageName, manager }: { packageName: string, manager: string }) => {
        console.log(`Agent requested install: ${packageName} via ${manager}`);
        if (!workspaceId) return "No active workspace.";

        const response = await fetch('/api/sandbox/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, packageName, manager })
        });
        const json = await response.json();
        const result = json.data || json;
        if (result.isError) {
            return `Failed to install ${packageName}: ${result.stderr}`;
        }
        return `Successfully installed ${packageName}. stdout: ${result.stdout}`;
    }),

    run_hidden_test: wrapTool('run_hidden_test', async ({ testCode }: { testCode: string }) => {
        console.log("Agent requested hidden test execution");
        if (!workspaceId) return "No active workspace.";

        const response = await fetch('/api/sandbox/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, testCode })
        });
        const json = await response.json();
        const result = json.data || json;
        return `Test Execution Result:\nExit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
    }),

    get_integrity_status: wrapTool('get_integrity_status', async () => {
        const store = useInterviewStore.getState();
        if (store.getIntegrityReport) {
            return store.getIntegrityReport();
        }
        return "Integrity monitoring not available.";
    })
});
