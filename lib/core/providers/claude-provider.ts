import Anthropic from "@anthropic-ai/sdk";
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

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
    this.model = model;
  }

  private extractJSON(text: string): string {
    let json: string | null = null;

    // Pattern 1: ```json block (greedy — son ``` a kadar al)
    const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*)\n```/);
    if (jsonBlockMatch) {
      json = jsonBlockMatch[1];
    }

    // Pattern 2: ``` block (without json label)
    if (!json) {
      const codeBlockMatch = text.match(/```\s*\n([\s\S]*)\n```/);
      if (codeBlockMatch) json = codeBlockMatch[1];
    }

    // Pattern 3: First { to last }
    if (!json) {
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        json = text.substring(firstBrace, lastBrace + 1);
      }
    }

    if (!json) {
      console.error("Claude yanıtından JSON bulunamadı. İlk 500 karakter:", text.substring(0, 500));
      throw new Error("Claude yanıtından JSON parse edilemedi");
    }

    // Trailing comma temizliği: ,] → ] ve ,} → }
    json = json.replace(/,\s*([\]}])/g, "$1");

    return json;
  }

  private async callClaudeOnce(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude'dan metin yanıtı alınamadı");
    }

    if (response.stop_reason === "max_tokens") {
      console.error("Claude yanıtı max_tokens sınırına ulaştı ve kesildi.");
      throw new Error("Claude yanıtı çok uzun olduğu için kesildi. Daha az senaryo ile tekrar deneyin.");
    }

    return this.extractJSON(textBlock.text);
  }

  private async callClaude(systemPrompt: string, userMessage: string): Promise<string> {
    const APP_RETRY_DELAYS = [0, 10_000, 20_000];
    let lastError: unknown;

    for (let i = 0; i < APP_RETRY_DELAYS.length; i++) {
      if (APP_RETRY_DELAYS[i] > 0) {
        console.warn(`Claude API overloaded, ${APP_RETRY_DELAYS[i] / 1000}s bekleniyor... (deneme ${i + 1}/${APP_RETRY_DELAYS.length})`);
        await new Promise((r) => setTimeout(r, APP_RETRY_DELAYS[i]));
      }
      try {
        return await this.callClaudeOnce(systemPrompt, userMessage);
      } catch (err) {
        lastError = err;
        const isOverloaded = err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503);
        if (isOverloaded && i < APP_RETRY_DELAYS.length - 1) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private parseJSON(jsonStr: string): unknown {
    try {
      return JSON.parse(jsonStr);
    } catch {
      console.error("JSON parse hatası. İlk 500 karakter:", jsonStr.substring(0, 500));
      throw new SyntaxError("Claude yanıtı geçerli JSON değil");
    }
  }

  async generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number
  ): Promise<TestScenario[]> {
    const systemPrompt = buildTestGenerationSystemPrompt();
    const userMessage = buildTestGenerationUserMessage(impact, diffSummary, maxScenarios);
    const jsonStr = await this.callClaude(systemPrompt, userMessage);
    const parsed = TestResponseSchema.parse(this.parseJSON(jsonStr));
    return parsed.scenarios;
  }

  async generateCodeReview(
    impact: ImpactResult,
    diffContent: string,
    maxItems: number
  ): Promise<CodeReviewItem[]> {
    const systemPrompt = buildCodeReviewSystemPrompt(diffContent);
    const userMessage = buildCodeReviewUserMessage(impact, diffContent, maxItems);
    const jsonStr = await this.callClaude(systemPrompt, userMessage);
    const parsed = CodeReviewResponseSchema.parse(this.parseJSON(jsonStr));
    return parsed.items;
  }
}
