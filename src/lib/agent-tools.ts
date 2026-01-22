import { useInterviewStore } from '@/lib/store';

export const getAgentTools = (workspaceId: string | null) => ({
    read_candidate_code: async () => {
        console.log("Agent requested code read");
        const currentCode = useInterviewStore.getState().code;
        return currentCode || "No code written yet.";
    },

    read_sandbox_file: async ({ path }: { path: string }) => {
        console.log("Agent requested file read:", path);
        if (!workspaceId) return "No active workspace.";

        try {
            const response = await fetch('/api/sandbox/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, path })
            });
            const json = await response.json();
            const data = json.data || json;
            return data.content || "File not found or empty.";
        } catch (e) {
            console.error(e);
            return "Error reading file.";
        }
    },

    run_coderabbit_analysis: async () => {
        console.log("Agent requested CodeRabbit analysis");
        if (!workspaceId) return "No active workspace.";

        try {
            const response = await fetch('/api/analysis/coderabbit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId })
            });
            const data = await response.json();
            return JSON.stringify(data);
        } catch (e) {
            console.error(e);
            return "Error running analysis.";
        }
    },

    run_code: async () => {
        console.log("Agent requested code execution");
        if (!workspaceId) return "No active workspace.";
        const code = useInterviewStore.getState().code;
        const language = useInterviewStore.getState().language;

        try {
            const response = await fetch('/api/sandbox/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, code, language })
            });
            const json = await response.json();
            const result = json.data || json;
            return `Exit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
        } catch (e) {
            return "Error executing code.";
        }
    },

    install_dependency: async ({ packageName, manager }: { packageName: string, manager: string }) => {
        console.log(`Agent requested install: ${packageName} via ${manager}`);
        if (!workspaceId) return "No active workspace.";
        try {
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
        } catch (e) {
            console.error(e);
            return "Error installing dependency.";
        }
    },

    run_hidden_test: async ({ testCode }: { testCode: string }) => {
        console.log("Agent requested hidden test execution");
        if (!workspaceId) return "No active workspace.";
        try {
            const response = await fetch('/api/sandbox/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, testCode })
            });
            const json = await response.json();
            const result = json.data || json;
            return `Test Execution Result:\nExit Code: ${result.isError ? 1 : 0}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
        } catch (e) {
            console.error(e);
            return "Error executing hidden test.";
        }
    },

    get_integrity_status: async () => {
        const store = useInterviewStore.getState();
        if (store.getIntegrityReport) {
            return store.getIntegrityReport();
        }
        return "Integrity monitoring not available.";
    }
});
