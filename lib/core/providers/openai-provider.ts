import OpenAI from "openai";
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

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number
  ): Promise<TestScenario[]> {
    const prompt = buildTestGenerationPrompt(impact, diffSummary, maxScenarios);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sen bir QA muhendisisin. Yaniti her zaman JSON formatinda ver.",
        },
        { role: "user", content: prompt },
      ],
    });

    if (!response.choices?.length || !response.choices[0]?.message) {
      throw new Error("OpenAI'dan gecerli bir yanit alinamadi");
    }
    const content = response.choices[0].message.content;
    if (!content) throw new Error("OpenAI'dan yanit alinamadi");

    const parsed = ResponseSchema.parse(JSON.parse(content));
    return parsed.scenarios;
  }
}
