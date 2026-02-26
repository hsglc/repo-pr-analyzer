import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getOrBuildCodebaseIndex } from "@/lib/analysis-service";
import { buildChatContext } from "@/lib/core/chat-context-builder";
import { streamChat, type ChatMessage } from "@/lib/core/chat-service";
import { getCheapestModel } from "@/lib/core/providers/models";
import { ownerSchema, repoSchema } from "@/lib/validation";

const ChatSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
});

export async function POST(request: Request) {
  return withRequestContext(async () => {
    const auth = await verifyAuth(request);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Yetkisiz erişim" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      const body = await request.json();
      parsed = ChatSchema.parse(body);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.errors[0].message
          : "Geçersiz istek";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { owner, repo, message, history } = parsed;
    const userId = auth.uid;

    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return new Response(
        JSON.stringify({ error: "GitHub token bulunamadı" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const provider = apiKeys.aiProvider || "claude";

    let aiApiKey: string;
    if (provider === "openai") {
      if (!apiKeys.openaiApiKey) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key bulunamadı" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      aiApiKey = decrypt(apiKeys.openaiApiKey);
    } else {
      if (!apiKeys.claudeApiKey) {
        return new Response(
          JSON.stringify({ error: "Claude API key bulunamadı" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      aiApiKey = decrypt(apiKeys.claudeApiKey);
    }

    // Build codebase context
    let codebaseContext = "";
    try {
      const index = await getOrBuildCodebaseIndex(
        owner,
        repo,
        githubToken,
        userId
      );
      if (index) {
        codebaseContext = buildChatContext(index);
      }
    } catch (err) {
      console.warn("Chat: codebase index failed:", (err as Error)?.message);
    }

    const model = getCheapestModel(provider);
    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    // SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const gen = streamChat(
            provider,
            aiApiKey,
            model,
            codebaseContext,
            messages
          );

          for await (const chunk of gen) {
            const data = JSON.stringify({ type: "chunk", content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          const done = JSON.stringify({ type: "done" });
          controller.enqueue(encoder.encode(`data: ${done}\n\n`));
        } catch (err) {
          const errMsg =
            (err as Error)?.message || "Chat sırasında hata oluştu";
          const errorData = JSON.stringify({
            type: "error",
            message: errMsg,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
}
