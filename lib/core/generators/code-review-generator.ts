import type { AIProvider } from "../providers/ai-provider";
import type { CodeReviewItem, ImpactResult, ParsedFile } from "../types";

export class CodeReviewGenerator {
  constructor(private aiProvider: AIProvider) {}

  async generate(
    impact: ImpactResult,
    files: ParsedFile[],
    maxItems: number
  ): Promise<CodeReviewItem[]> {
    const diffContent = files
      .map((f) => {
        const header = `--- ${f.oldPath || f.path}\n+++ ${f.path}`;
        const chunks = f.chunks
          .map((chunk) => {
            const hunkHeader = `@@ -${chunk.oldStart} +${chunk.newStart} @@`;
            const lines = chunk.changes
              .map((c) => {
                const prefix = c.type === "add" ? "+" : c.type === "del" ? "-" : " ";
                return `${prefix}${c.content}`;
              })
              .join("\n");
            return `${hunkHeader}\n${lines}`;
          })
          .join("\n");
        return `${header}\n${chunks}`;
      })
      .join("\n\n");

    return this.aiProvider.generateCodeReview(impact, diffContent, maxItems);
  }
}
