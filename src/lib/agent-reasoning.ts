/**
 * Advanced Agent Reasoning System
 * Provides multi-step decision making and autonomous actions for the interview agent
 */

export interface AgentAction {
    type: 'speak' | 'install' | 'execute' | 'test' | 'analyze' | 'hint' | 'verify';
    content?: string;
    package?: string;
    manager?: 'pip' | 'npm';
    code?: string;
    expectedOutput?: string;
    level?: 'subtle' | 'direct' | 'solution';
}

export interface CodeAnalysis {
    hasMissingDependency: boolean;
    missingPackages: string[];
    complexityScore: number;
    hasEdgeCaseIssues: boolean;
    hasSyntaxErrors: boolean;
    hasLogicErrors: boolean;
    optimizationOpportunities: string[];
    securityIssues: string[];
}

export interface CandidateProfile {
    strengths: string[];
    weaknesses: string[];
    hintsGiven: number;
    problemsSolved: number;
    averageTimeToSolve: number;
    needsEncouragement: boolean;
}

export class AgentReasoning {
    private conversationHistory: Array<{ role: string; content: string }> = [];
    private candidateProfile: CandidateProfile = {
        strengths: [],
        weaknesses: [],
        hintsGiven: 0,
        problemsSolved: 0,
        averageTimeToSolve: 0,
        needsEncouragement: false,
    };

    /**
     * Analyze code and determine next actions
     */
    async analyzeAndAct(code: string, context?: string): Promise<AgentAction[]> {
        const analysis = await this.deepAnalysis(code);
        const actions: AgentAction[] = [];

        // Priority 1: Handle missing dependencies
        if (analysis.hasMissingDependency && analysis.missingPackages.length > 0) {
            const pkg = analysis.missingPackages[0];
            actions.push(
                {
                    type: 'speak',
                    content: `I notice you're trying to use ${pkg}. Let me install that for you.`
                },
                {
                    type: 'install',
                    package: pkg,
                    manager: this.detectPackageManager(code)
                },
                {
                    type: 'speak',
                    content: `Great! ${pkg} is installed. Try running your code again.`
                }
            );
            return actions;
        }

        // Priority 2: Handle syntax errors
        if (analysis.hasSyntaxErrors) {
            actions.push({
                type: 'speak',
                content: 'I see a syntax error. Check your brackets and indentation.',
            });
            return actions;
        }

        // Priority 3: Handle logic errors with testing
        if (analysis.hasLogicErrors) {
            actions.push(
                {
                    type: 'speak',
                    content: 'Let me run some tests to verify your logic...',
                },
                {
                    type: 'test',
                    code: this.generateTestCode(code),
                }
            );
            return actions;
        }

        // Priority 4: Complexity optimization
        if (analysis.complexityScore > 7 && this.candidateProfile.hintsGiven < 3) {
            const hint = this.generateComplexityHint(analysis);
            actions.push({
                type: 'hint',
                level: 'subtle',
                content: hint,
            });
            this.candidateProfile.hintsGiven++;
            return actions;
        }

        // Priority 5: Edge case handling
        if (analysis.hasEdgeCaseIssues) {
            actions.push({
                type: 'speak',
                content: 'Your solution works for the basic case. Have you considered edge cases like empty input or very large numbers?',
            });
            return actions;
        }

        // Priority 6: Security issues
        if (analysis.securityIssues.length > 0) {
            actions.push({
                type: 'speak',
                content: `I noticed a potential security issue: ${analysis.securityIssues[0]}. Can you address that?`,
            });
            return actions;
        }

        // Priority 7: Optimization opportunities
        if (analysis.optimizationOpportunities.length > 0) {
            actions.push({
                type: 'speak',
                content: `Good solution! ${analysis.optimizationOpportunities[0]}`,
            });
            return actions;
        }

        // Default: Positive feedback
        actions.push({
            type: 'speak',
            content: 'Looking good! Your code is clean and efficient.',
        });

        return actions;
    }

    /**
     * Deep code analysis using pattern matching and heuristics
     */
    private async deepAnalysis(code: string): Promise<CodeAnalysis> {
        const analysis: CodeAnalysis = {
            hasMissingDependency: false,
            missingPackages: [],
            complexityScore: 0,
            hasEdgeCaseIssues: false,
            hasSyntaxErrors: false,
            hasLogicErrors: false,
            optimizationOpportunities: [],
            securityIssues: [],
        };

        // Check for missing imports/dependencies
        const importMatches = code.match(/import\s+(\w+)|from\s+(\w+)\s+import/g);
        const commonPackages = ['numpy', 'pandas', 'requests', 'flask', 'django'];

        if (importMatches) {
            importMatches.forEach((match) => {
                const pkg = match.match(/(?:import|from)\s+(\w+)/)?.[1];
                if (pkg && commonPackages.includes(pkg.toLowerCase())) {
                    analysis.hasMissingDependency = true;
                    analysis.missingPackages.push(pkg.toLowerCase());
                }
            });
        }

        // Check for syntax errors (basic)
        const openBrackets = (code.match(/[\(\[\{]/g) || []).length;
        const closeBrackets = (code.match(/[\)\]\}]/g) || []).length;
        if (openBrackets !== closeBrackets) {
            analysis.hasSyntaxErrors = true;
        }

        // Complexity analysis (nested loops)
        const nestedLoops = (code.match(/for\s+.*:\s*\n\s+for\s+/g) || []).length;
        analysis.complexityScore = Math.min(10, nestedLoops * 3 + 5);

        // Edge case detection
        const hasNullCheck = code.includes('if not') || code.includes('is None');
        const hasEmptyCheck = code.includes('len(') && code.includes('== 0');
        if (!hasNullCheck && !hasEmptyCheck && code.includes('def ')) {
            analysis.hasEdgeCaseIssues = true;
        }

        // Optimization opportunities
        if (nestedLoops > 0) {
            analysis.optimizationOpportunities.push(
                'Consider using a hash map to reduce time complexity from O(n²) to O(n).'
            );
        }

        // Security checks
        if (code.includes('eval(') || code.includes('exec(')) {
            analysis.securityIssues.push('Using eval() or exec() can be dangerous. Consider safer alternatives.');
        }

        return analysis;
    }

    /**
     * Generate test code for hidden testing
     */
    private generateTestCode(code: string): string {
        // Extract function name
        const funcMatch = code.match(/def\s+(\w+)\s*\(/);
        const funcName = funcMatch ? funcMatch[1] : 'solution';

        return `
${code}

# Hidden test cases
test_cases = [
    ([], []),  # Empty input
    ([1], [1]),  # Single element
    ([1, 2, 3], [1, 2, 3]),  # Basic case
    (list(range(1000)), list(range(1000))),  # Large input
]

for i, (input_val, expected) in enumerate(test_cases):
    try:
        result = ${funcName}(input_val)
        if result == expected:
            print(f"Test {i+1}: PASS")
        else:
            print(f"Test {i+1}: FAIL - Expected {expected}, got {result}")
    except Exception as e:
        print(f"Test {i+1}: ERROR - {str(e)}")
`;
    }

    /**
     * Generate complexity hint based on analysis
     */
    private generateComplexityHint(analysis: CodeAnalysis): string {
        if (analysis.complexityScore > 8) {
            return 'This approach works, but has O(n²) complexity. Can you think of a way to solve it in O(n) using a hash map?';
        } else if (analysis.complexityScore > 6) {
            return 'Good progress! There might be a more efficient approach. Consider what data structure could help you avoid nested loops.';
        }
        return 'Your solution is efficient. Nice work!';
    }

    /**
     * Detect package manager based on code
     */
    private detectPackageManager(code: string): 'pip' | 'npm' {
        // Simple heuristic: Python imports = pip, JS imports = npm
        if (code.includes('import ') || code.includes('from ')) {
            return 'pip';
        }
        if (code.includes('require(') || code.includes('import {')) {
            return 'npm';
        }
        return 'pip'; // Default
    }

    /**
     * Update candidate profile based on performance
     */
    updateProfile(event: {
        type: 'hint_given' | 'problem_solved' | 'struggled' | 'excelled';
        context?: string;
    }) {
        switch (event.type) {
            case 'hint_given':
                this.candidateProfile.hintsGiven++;
                break;
            case 'problem_solved':
                this.candidateProfile.problemsSolved++;
                break;
            case 'struggled':
                this.candidateProfile.needsEncouragement = true;
                if (event.context) {
                    this.candidateProfile.weaknesses.push(event.context);
                }
                break;
            case 'excelled':
                if (event.context) {
                    this.candidateProfile.strengths.push(event.context);
                }
                break;
        }
    }

    /**
     * Get candidate evaluation summary
     */
    getEvaluation(): string {
        const { strengths, weaknesses, hintsGiven, problemsSolved } = this.candidateProfile;

        let evaluation = `Candidate Performance Summary:\n\n`;
        evaluation += `Problems Solved: ${problemsSolved}\n`;
        evaluation += `Hints Required: ${hintsGiven}\n\n`;

        if (strengths.length > 0) {
            evaluation += `Strengths:\n${strengths.map(s => `- ${s}`).join('\n')}\n\n`;
        }

        if (weaknesses.length > 0) {
            evaluation += `Areas for Improvement:\n${weaknesses.map(w => `- ${w}`).join('\n')}\n\n`;
        }

        // Overall recommendation
        const score = (problemsSolved * 10) - (hintsGiven * 2);
        if (score >= 8) {
            evaluation += `Recommendation: STRONG HIRE - Excellent problem-solving skills with minimal guidance needed.`;
        } else if (score >= 5) {
            evaluation += `Recommendation: HIRE - Solid performance with good potential.`;
        } else if (score >= 3) {
            evaluation += `Recommendation: MAYBE - Shows promise but needs more development.`;
        } else {
            evaluation += `Recommendation: NO HIRE - Struggled significantly with basic concepts.`;
        }

        return evaluation;
    }
}

// Singleton instance
export const agentReasoning = new AgentReasoning();
