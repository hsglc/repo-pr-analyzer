import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AIProvider } from "./ai-provider";
import type { ImpactResult, TestScenario } from "../types";
import { buildTestGenerationPrompt } from "../generators/prompts";

const TestScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  feature: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  type: z.enum(["functional", "regression", "edge-case", "integration"]),
  steps: z.array(z.string()),
  expectedResult: z.string(),
});

const ResponseSchema = z.object({
  scenarios: z.array(TestScenarioSchema),
});

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number
  ): Promise<TestScenario[]> {
    const prompt = buildTestGenerationPrompt(impact, diffSummary, maxScenarios);

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude'dan metin yaniti alinamadi");
    }

    let jsonStr: string | null = null;

    // Pattern 1: ```json block
    const jsonBlockMatch = textBlock.text.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    }

    // Pattern 2: ``` block (without json label)
    if (!jsonStr) {
      const codeBlockMatch = textBlock.text.match(/```\s*\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
    }

    // Pattern 3: First { to last }
    if (!jsonStr) {
      const firstBrace = textBlock.text.indexOf("{");
      const lastBrace = textBlock.text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = textBlock.text.substring(firstBrace, lastBrace + 1);
      }
    }

    if (!jsonStr) {
      throw new Error("Claude yanitindan JSON parse edilemedi");
    }

    const parsed = ResponseSchema.parse(JSON.parse(jsonStr));
    return parsed.scenarios;
  }
}
