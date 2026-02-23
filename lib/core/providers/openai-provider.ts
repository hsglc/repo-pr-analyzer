import OpenAI from "openai";
import { z } from "zod";
import type { AIProvider } from "./ai-provider";
import type { CodeReviewItem, ImpactResult, TestScenario } from "../types";
import { buildTestGenerationPrompt, buildCodeReviewPrompt } from "../generators/prompts";

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

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
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

  async generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number
  ): Promise<TestScenario[]> {
    const prompt = buildTestGenerationPrompt(impact, diffSummary, maxScenarios);
    const content = await this.callOpenAI(
      "Sen bir QA mühendisisin. Yanıtı her zaman JSON formatında ver.",
      prompt
    );
    const parsed = TestResponseSchema.parse(JSON.parse(content));
    return parsed.scenarios;
  }

  async generateCodeReview(
    impact: ImpactResult,
    diffContent: string,
    maxItems: number
  ): Promise<CodeReviewItem[]> {
    const prompt = buildCodeReviewPrompt(impact, diffContent, maxItems);
    const content = await this.callOpenAI(
      "Sen deneyimli bir yazılım mühendisisin. Yanıtı her zaman JSON formatında ver.",
      prompt
    );
    const parsed = CodeReviewResponseSchema.parse(JSON.parse(content));
    return parsed.items;
  }
}
