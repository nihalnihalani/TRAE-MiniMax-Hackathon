import { useInterviewStore } from '@/lib/store';
import { generateTestCode } from '@/lib/test-runner';
import { PROBLEMS } from '@/data/problems';

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

        const store = useInterviewStore.getState();
        const code = store.code;
        const language = store.language;
        const currentProblemId = store.currentProblemId;

        // Find current problem and generate test code (same as manual run)
        const currentProblem = PROBLEMS.find(p => p.id === currentProblemId);
        const testCode = currentProblem
            ? generateTestCode(currentProblem, code)
            : code;

        const response = await fetch('/api/sandbox/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, code: testCode, language })
        });
        const json = await response.json();
        const result = json.data || json;

        // Display output in the UI console (same as manual run)
        if (result.stdout) {
            store.addLog(result.stdout, 'stdout');

            // Parse and store test results if tests were run
            if (currentProblem) {
                const testOutput = result.stdout;
                const passedMatches = testOutput.match(/✓ Test \d+ passed/g) || [];
                const testsTotal = currentProblem.testCases.length;
                const testsPassed = passedMatches.length;

                store.addTestResult({
                    timestamp: Date.now(),
                    problemId: currentProblemId || 'unknown',
                    testsPassed,
                    testsTotal,
                    details: {
                        stdout: result.stdout,
                        stderr: result.stderr,
                    },
                });
            }
        }

        if (result.stderr) {
            store.addLog(result.stderr, 'stderr');
        }

        // Return formatted test results to the agent
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

    get_current_problem: wrapTool('get_current_problem', async () => {
        console.log("Agent requested current problem info");
        const currentProblemId = useInterviewStore.getState().currentProblemId;
        const { PROBLEMS } = await import('@/data/problems');
        const problem = PROBLEMS.find(p => p.id === currentProblemId);

        if (!problem) {
            return "No problem selected yet. Please wait for the candidate to select a problem.";
        }

        return JSON.stringify({
            title: problem.title,
            difficulty: problem.difficulty,
            description: problem.description,
            examples: problem.examples,
            constraints: problem.constraints,
            functionName: problem.functionName,
            hint: `The candidate needs to implement a function called '${problem.functionName}'.`
        }, null, 2);
    }),

    get_integrity_status: wrapTool('get_integrity_status', async () => {
        const store = useInterviewStore.getState();
        if (store.getIntegrityReport) {
            return store.getIntegrityReport();
        }
        return "Integrity monitoring not available.";
    })
});
