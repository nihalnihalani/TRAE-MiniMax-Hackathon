import { Problem } from '@/data/problems';

function formatPythonValue(val: any): string {
    if (val === null) return 'None';
    if (Array.isArray(val)) return `[${val.map(formatPythonValue).join(', ')}]`;
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
}

function formatJsValue(val: any): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return `[${val.map(formatJsValue).join(', ')}]`;
    if (typeof val === 'string') return JSON.stringify(val);
    return String(val);
}

function generatePythonTestCode(problem: Problem, userCode: string): string {
    const testCalls = problem.testCases.map((tc, i) => {
        const argsStr = tc.inputs.map(formatPythonValue).join(', ');
        const expectedStr = formatPythonValue(tc.expected);

        return `
try:
    result = ${problem.functionName}(${argsStr})
    expected = ${expectedStr}
    if result == expected:
        print(f"✓ Test ${i + 1} passed")
    else:
        print(f"✗ Test ${i + 1} failed: expected {expected}, got {result}")
except Exception as e:
    print(f"✗ Test ${i + 1} error: {e}")
`;
    }).join('\n');

    return `${userCode}\n\nprint("\\n=== Running Tests ===\")\n${testCalls}\nprint("\\n=== Tests Complete ===\")`;
}

function generateJsTestCode(problem: Problem, userCode: string): string {
    const testCalls = problem.testCases.map((tc, i) => {
        const argsStr = tc.inputs.map(formatJsValue).join(', ');
        const expectedStr = formatJsValue(tc.expected);

        return `
try {
    const result = ${problem.functionName}(${argsStr});
    const expected = ${expectedStr};
    const passed = JSON.stringify(result) === JSON.stringify(expected);
    if (passed) {
        console.log("\\u2713 Test ${i + 1} passed");
    } else {
        console.log("\\u2717 Test ${i + 1} failed: expected " + JSON.stringify(expected) + ", got " + JSON.stringify(result));
    }
} catch (e) {
    console.log("\\u2717 Test ${i + 1} error: " + e.message);
}`;
    }).join('\n');

    return `${userCode}\n\nconsole.log("\\n=== Running Tests ===");\n${testCalls}\nconsole.log("\\n=== Tests Complete ===");`;
}

export function generateTestCode(problem: Problem, userCode: string, language: string = 'python'): string {
    if (language === 'javascript' || language === 'typescript') {
        return generateJsTestCode(problem, userCode);
    }
    return generatePythonTestCode(problem, userCode);
}
