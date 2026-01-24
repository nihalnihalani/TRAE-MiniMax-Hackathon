import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DaytonaService } from './daytona';

const { mockCreate, mockGet, mockExecuteCommand, mockDelete } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
    mockGet: vi.fn(),
    mockExecuteCommand: vi.fn(),
    mockDelete: vi.fn(),
  };
});

vi.mock('@daytonaio/sdk', () => {
  return {
    Daytona: class {
      constructor() {
        return {
          create: mockCreate,
          get: mockGet,
        };
      }
    },
  };
});

describe('DaytonaService', () => {
  let service: DaytonaService;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Setup default mock behaviors
    mockCreate.mockResolvedValue({
      id: 'test-workspace-id',
      process: {
        executeCommand: mockExecuteCommand,
      },
    });

    mockGet.mockResolvedValue({
      id: 'test-workspace-id',
      process: {
        executeCommand: mockExecuteCommand,
      },
      delete: mockDelete,
    });

    mockExecuteCommand.mockResolvedValue({
      result: 'success',
      exitCode: 0,
    });

    // Provide default keys to avoid warnings during instantiation
    process.env.DAYTONA_API_KEY = 'dummy';
    process.env.DAYTONA_API_URL = 'dummy';

    service = new DaytonaService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createWorkspace', () => {
    it('should create a workspace and install CodeRabbit CLI', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA = 'false';

      const result = await service.createWorkspace('python');

      expect(mockCreate).toHaveBeenCalledWith({ language: 'python' });
      expect(result).toEqual({
        id: 'test-workspace-id',
        language: 'python',
      });
    });

    it('should return mock data when mock mode is enabled', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA = 'true';

      const result = await service.createWorkspace('python');

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'mock-ws-123',
        language: 'python',
      });
    });
  });

  describe('executeCode', () => {
    it('should execute python code successfully', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA = 'false';
      
      const code = 'print("hello")';
      const workspaceId = 'ws-123';

      await service.executeCode(workspaceId, code, 'python');

      expect(mockGet).toHaveBeenCalledWith(workspaceId);
      expect(mockExecuteCommand).toHaveBeenCalledTimes(2); 
    });

    it('should handle execution errors', async () => {
      process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA = 'false';
      
      mockExecuteCommand
        .mockResolvedValueOnce({ result: '', exitCode: 0 }) 
        .mockResolvedValueOnce({ result: 'SyntaxError', exitCode: 1 }); 

      const result = await service.executeCode('ws-123', 'bad code', 'python');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('SyntaxError');
    });

    it('should timeout if execution takes too long', async () => {
        process.env.NEXT_PUBLIC_USE_MOCK_DAYTONA = 'false';
        
        mockExecuteCommand
            .mockResolvedValueOnce({ result: '', exitCode: 0 }) 
            .mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                return { result: 'slow', exitCode: 0 };
            });

        const result = await service.executeCode('ws-123', 'slow code', 'python', 10); 

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Execution timed out');
    });
  });
});
