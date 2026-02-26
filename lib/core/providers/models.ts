export interface ModelInfo {
  id: string;
  name: string;
  provider: "claude" | "openai";
}

const MODELS: ModelInfo[] = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "claude" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "claude" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "claude" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
];

export function getModelsForProvider(provider: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getDefaultModel(provider: string): string {
  if (provider === "openai") return "gpt-4o";
  return "claude-sonnet-4-6";
}

export function isValidModel(provider: string, model: string): boolean {
  return MODELS.some((m) => m.provider === provider && m.id === model);
}

export function getCheapestModel(provider: string): string {
  if (provider === "openai") return "gpt-4o-mini";
  return "claude-haiku-4-5-20251001";
}
