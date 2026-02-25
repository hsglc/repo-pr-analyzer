import OpenAI from "openai";
import { z } from "zod";
import type { AIProvider } from "./ai-provider";
import type { CodeReviewItem, ImpactResult, TestScenario } from "../types";
import {
  buildTestGenerationSystemPrompt,
  buildTestGenerationUserMessage,
  buildCodeReviewSystemPrompt,
  buildCodeReviewUserMessage,
} from "../generators/prompts";

const TestScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  feature: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  type: z.enum(["functional", "regression", "edge-case", "integration"]),
  steps: z.array(z.string()),
  expectedResult: z.string(),
});

const TestResponseSchema = z.object({
  scenarios: z.array(TestScenarioSchema),
});

const CodeReviewItemSchema = z.object({
  id: z.string(),
  file: z.string(),
  line: z.number().optional(),
  severity: z.enum(["critical", "warning", "info", "suggestion"]),
  category: z.enum(["bug", "security", "performance", "maintainability", "style"]),
  title: z.string(),
  description: z.string(),
  suggestion: z.string().optional(),
});

const CodeReviewResponseSchema = z.object({
  items: z.array(CodeReviewItemSchema),
});

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.client = new OpenAI({ apiKey, maxRetries: 2 });
    this.model = model;
  }

  private async callOpenAIOnce(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response.choices?.length || !response.choices[0]?.message) {
      throw new Error("OpenAI'dan geçerli bir yanıt alınamadı");
    }
    const content = response.choices[0].message.content;
    if (!content) throw new Error("OpenAI'dan yanıt alınamadı");
    return content;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const APP_RETRY_DELAYS = [0, 10_000, 20_000];
    let lastError: unknown;

    for (let i = 0; i < APP_RETRY_DELAYS.length; i++) {
      if (APP_RETRY_DELAYS[i] > 0) {
        console.warn(`OpenAI API overloaded, ${APP_RETRY_DELAYS[i] / 1000}s bekleniyor... (deneme ${i + 1}/${APP_RETRY_DELAYS.length})`);
        await new Promise((r) => setTimeout(r, APP_RETRY_DELAYS[i]));
      }
      try {
        return await this.callOpenAIOnce(systemPrompt, userPrompt);
      } catch (err) {
        lastError = err;
        const isOverloaded = err instanceof OpenAI.APIError && (err.status === 529 || err.status === 503);
        if (isOverloaded && i < APP_RETRY_DELAYS.length - 1) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  async generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number,
    codebaseContext?: string
  ): Promise<TestScenario[]> {
    const systemPrompt = buildTestGenerationSystemPrompt(codebaseContext);
    const userMessage = buildTestGenerationUserMessage(impact, diffSummary, maxScenarios);
    const content = await this.callOpenAI(systemPrompt, userMessage);
    const parsed = TestResponseSchema.parse(JSON.parse(content));
    return parsed.scenarios;
  }

  async generateCodeReview(
    impact: ImpactResult,
    diffContent: string,
    maxItems: number,
    codebaseContext?: string
  ): Promise<CodeReviewItem[]> {
    const systemPrompt = buildCodeReviewSystemPrompt(diffContent, codebaseContext);
    const userMessage = buildCodeReviewUserMessage(impact, diffContent, maxItems);
    const content = await this.callOpenAI(systemPrompt, userMessage);
    const parsed = CodeReviewResponseSchema.parse(JSON.parse(content));
    return parsed.items;
  }
}
