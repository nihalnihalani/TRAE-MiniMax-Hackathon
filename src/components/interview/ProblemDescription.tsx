import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';

const PROBLEM_MARKDOWN = `
# Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.

### Example 1:

\`\`\`text
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

### Example 2:

\`\`\`text
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

### Constraints:

*   \`2 <= nums.length <= 10^4\`
*   \`-10^9 <= nums[i] <= 10^9\`
*   \`-10^9 <= target <= 10^9\`
*   **Only one valid answer exists.**
`;

export function ProblemDescription() {
  return (
    <Card className="h-full border-0 rounded-none overflow-auto">
      <CardHeader>
        <CardTitle>Problem Description</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{PROBLEM_MARKDOWN}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}
