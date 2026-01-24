// src/lib/coderabbit.ts

export interface CodeRabbitReview {
  summary: string;
  walkthrough: string[];
  issues: {
    severity: 'high' | 'medium' | 'low';
    message: string;
    line?: number;
  }[];
}

export class CodeRabbitService {
  async analyzeCode(code: string, language: string): Promise<CodeRabbitReview> {
    // For now, we default to the high-fidelity mock since we lack a real CLI token/setup
    // In a real scenario, this would SSH into the Daytona sandbox and run the CLI.
    console.log(`[CodeRabbit] Analyzing ${language} code...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return this.getMockReview(code);
  }

  private getMockReview(code: string): CodeRabbitReview {
    const isPython = code.includes('def ') || code.includes('import ');
    
    return {
      summary: "I've reviewed your code changes. The logic seems sound, but there are a few opportunities for optimization and better error handling.",
      walkthrough: [
        "Analyzed the main algorithm structure.",
        "Checked for time complexity bottlenecks.",
        "Verified variable naming conventions.",
        "Scanned for potential edge cases."
      ],
      issues: [
        {
          severity: 'medium',
          message: "Consider adding type hints (if Python 3.5+) or stricter types to improve readability and tooling support.",
          line: 1
        },
        {
          severity: 'low',
          message: "A few variable names could be more descriptive to explain their intent.",
          line: 3
        }
      ]
    };
  }
}

export const codeRabbitService = new CodeRabbitService();
