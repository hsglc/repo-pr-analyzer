import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import { ownerSchema, repoSchema } from "@/lib/validation";

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

const PostReviewSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  prNumber: z.number().int().positive(),
  codeReview: z.array(CodeReviewItemSchema),
});

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟡",
  info: "🔵",
  suggestion: "💡",
};

export async function POST(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const userId = auth.uid;
    const body = await request.json();
    const { owner, repo, prNumber, codeReview } = PostReviewSchema.parse(body);

    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(githubToken, owner, repo);

    // Build review body summary
    const criticalCount = codeReview.filter((i) => i.severity === "critical").length;
    const warningCount = codeReview.filter((i) => i.severity === "warning").length;
    const infoCount = codeReview.filter((i) => i.severity === "info").length;
    const suggestionCount = codeReview.filter((i) => i.severity === "suggestion").length;

    const summaryLines = [
      `## 🔍 AI Kod İnceleme Bulguları`,
      "",
      `| Severity | Sayı |`,
      `|----------|------|`,
    ];
    if (criticalCount > 0) summaryLines.push(`| 🔴 Critical | ${criticalCount} |`);
    if (warningCount > 0) summaryLines.push(`| 🟡 Warning | ${warningCount} |`);
    if (infoCount > 0) summaryLines.push(`| 🔵 Info | ${infoCount} |`);
    if (suggestionCount > 0) summaryLines.push(`| 💡 Suggestion | ${suggestionCount} |`);
    summaryLines.push("");

    // Add items without line numbers as part of the body
    const noLineItems = codeReview.filter((i) => !i.line);
    if (noLineItems.length > 0) {
      summaryLines.push("### Genel Bulgular", "");
      for (const item of noLineItems) {
        const emoji = SEVERITY_EMOJI[item.severity] || "";
        summaryLines.push(
          `**${emoji} ${item.id} - ${item.title}** (\`${item.file}\`)`,
          "",
          item.description,
        );
        if (item.suggestion) {
          summaryLines.push("", "```suggestion", item.suggestion, "```");
        }
        summaryLines.push("");
      }
    }

    summaryLines.push("_PR Etki Analizci tarafından oluşturulmuştur._");

    // Build inline comments for items with line numbers
    const comments = codeReview
      .filter((item) => item.line)
      .map((item) => {
        const emoji = SEVERITY_EMOJI[item.severity] || "";
        let commentBody = `**${emoji} ${item.id} [${item.severity}/${item.category}] ${item.title}**\n\n${item.description}`;
        if (item.suggestion) {
          commentBody += `\n\n\`\`\`suggestion\n${item.suggestion}\n\`\`\``;
        }
        return {
          path: item.file,
          line: item.line,
          body: commentBody,
        };
      });

    await platform.createReview(prNumber, summaryLines.join("\n"), comments);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz veri formatı" }, { status: 400 });
    }
    console.error("Post review error:", error);
    return NextResponse.json({ error: "Review gönderilemedi" }, { status: 500 });
  }
  });
}
