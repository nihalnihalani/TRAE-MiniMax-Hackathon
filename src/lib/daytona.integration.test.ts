import { describe, it, expect } from 'vitest';
import { daytonaService } from './daytona';

// Only run if we have a real API key and we explicitly want to run integration tests
const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' && process.env.DAYTONA_API_KEY;

describe.skipIf(!runIntegration)('DaytonaService Integration', () => {
  it('should create and cleanup a real workspace', async () => {
    // 1. Create
    console.log('Creating integration workspace...');
    const workspace = await daytonaService.createWorkspace({ language: 'python' });
    expect(workspace.id).toBeDefined();

    // 2. Execute simple code
    console.log(`Executing code in ${workspace.id}...`);
    const result = await daytonaService.executeCode(workspace.id, 'print("integration test")', 'python');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('integration test');

    // 3. Cleanup
    console.log(`Cleaning up ${workspace.id}...`);
    // Note: cleanupWorkspace might need to return a promise in the real implementation if it doesn't already
    await daytonaService.cleanupWorkspace(workspace.id);
  }, 120000); // Long timeout for real provisioning
});
