import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the environment first
const mockEnv = { VITE_OPENAI_API_KEY: 'test-api-key' };
Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  configurable: true,
});

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
  APIError: class extends Error {
    constructor(message: string, public status: number) {
      super(message);
      this.name = 'APIError';
    }
  },
}));

// Import after mocking
import { analyzeMealFromText, testOpenAIConnection, MealAnalysisResult } from '../gpt';
import OpenAI from 'openai';

describe('GPT Service', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock function from the mocked OpenAI instance
    const MockedOpenAI = OpenAI as any;
    const instance = new MockedOpenAI();
    mockCreate = instance.chat.completions.create;
  });

  describe('analyzeMealFromText', () => {
    it('should return error for empty meal text', async () => {
      const result = await analyzeMealFromText('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ne peut pas être vide');
    });

    it('should return error for text that is too long', async () => {
      const longText = 'a'.repeat(1001);
      const result = await analyzeMealFromText(longText);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('trop longue');
    });

    it('should successfully analyze a valid meal description', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              description: "Blanc de poulet grillé avec légumes",
              protein: 35,
              calories: 250,
              confidence: "high",
              breakdown: [
                {
                  name: "Blanc de poulet grillé",
                  quantity: "150g",
                  protein: 30,
                  calories: 180
                },
                {
                  name: "Légumes variés",
                  quantity: "100g",
                  protein: 5,
                  calories: 70
                }
              ],
              suggestions: ["Excellent choix riche en protéines"]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await analyzeMealFromText('Blanc de poulet grillé avec légumes');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.protein).toBe(35);
      expect(result.data?.confidence).toBe('high');
      expect(result.data?.breakdown).toHaveLength(2);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('nutritionniste expert'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Blanc de poulet grillé avec légumes'),
          }),
        ]),
        temperature: 0.1,
        max_tokens: 1000,
      });
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await analyzeMealFromText('Test meal');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('traitement de la réponse');
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValue(new OpenAI.APIError('Unauthorized', 401));

      const result = await analyzeMealFromText('Test meal');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Clé API OpenAI invalide');
    });

    it('should handle rate limit errors', async () => {
      mockCreate.mockRejectedValue(new OpenAI.APIError('Rate limit exceeded', 429));

      const result = await analyzeMealFromText('Test meal');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite de requêtes atteinte');
    });

    it('should validate response structure', async () => {
      const invalidResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              description: "Test meal",
              // Missing required protein field
              confidence: "high",
              breakdown: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(invalidResponse);

      const result = await analyzeMealFromText('Test meal');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should validate breakdown items structure', async () => {
      const invalidResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              description: "Test meal",
              protein: 20,
              confidence: "high",
              breakdown: [
                {
                  name: "Test food",
                  protein: "invalid" // Should be number
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(invalidResponse);

      const result = await analyzeMealFromText('Test meal');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });
  });

  describe('testOpenAIConnection', () => {
    it('should return success for valid connection', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'OK'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await testOpenAIConnection();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for connection failure', async () => {
      mockCreate.mockRejectedValue(new Error('Connection failed'));

      const result = await testOpenAIConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// Integration-style test (can be run with real API key if available)
describe('GPT Service Integration', () => {
  it.skip('should analyze real meal description (requires API key)', async () => {
    // This test is skipped by default and can be enabled for manual testing
    // with a real OpenAI API key
    const result = await analyzeMealFromText('100g de saumon grillé avec 150g de quinoa');
    
    expect(result.success).toBe(true);
    expect(result.data?.protein).toBeGreaterThan(0);
    expect(result.data?.breakdown).toBeDefined();
    expect(result.data?.breakdown.length).toBeGreaterThan(0);
  });
});