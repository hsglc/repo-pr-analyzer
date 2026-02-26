import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_MESSAGES = 10;
const MAX_TOKENS = 2048;

function buildSystemPrompt(codebaseContext: string): string {
  return `Sen bir kod asistanısın. Kullanıcının soruları hakkında aşağıdaki codebase bilgilerini kullanarak yardımcı ol.

Kurallar:
- Yanıtlarını Türkçe ver (teknik terimler İngilizce kalabilir).
- Kod örnekleri verirken ilgili dosya yollarını belirt.
- Kısa ve net yanıtlar ver, gereksiz tekrarlardan kaçın.
- Emin olmadığın konularda bunu belirt.

${codebaseContext}`;
}

function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

export async function* streamChatClaude(
  apiKey: string,
  model: string,
  codebaseContext: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey });
  const history = trimHistory(messages);

  const stream = client.messages.stream({
    model,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(codebaseContext),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

export async function* streamChatOpenAI(
  apiKey: string,
  model: string,
  codebaseContext: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey });
  const history = trimHistory(messages);

  const stream = await client.chat.completions.create({
    model,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt(codebaseContext) },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

export function streamChat(
  provider: string,
  apiKey: string,
  model: string,
  codebaseContext: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  if (provider === "openai") {
    return streamChatOpenAI(apiKey, model, codebaseContext, messages);
  }
  return streamChatClaude(apiKey, model, codebaseContext, messages);
}
