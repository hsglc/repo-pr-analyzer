import type { AIProvider } from "../providers/ai-provider";
import type { CodeReviewItem, ImpactResult, ParsedFile } from "../types";

// ~80K chars ≈ ~20K tokens — Claude/OpenAI context limiti içinde güvenli
const MAX_DIFF_CHARS = 80_000;

export class CodeReviewGenerator {
  constructor(private aiProvider: AIProvider) {}

  async generate(
    impact: ImpactResult,
    files: ParsedFile[],
    maxItems: number
  ): Promise<CodeReviewItem[]> {
    const fileDiffs = files.map((f) => {
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
    });

    // Dosyaları tek tek ekle, limit aşılınca dur
    let diffContent = "";
    let includedCount = 0;
    for (const fileDiff of fileDiffs) {
      const next = includedCount === 0 ? fileDiff : `\n\n${fileDiff}`;
      if (diffContent.length + next.length > MAX_DIFF_CHARS) break;
      diffContent += next;
      includedCount++;
    }

    // Kalan dosyaları özet olarak ekle
    if (includedCount < files.length) {
      const skipped = files.slice(includedCount).map((f) =>
        `${f.path} (+${f.additions}/-${f.deletions})`
      );
      diffContent += `\n\n[Diff çok büyük — ${skipped.length} dosya özet olarak eklendi:]\n${skipped.join("\n")}`;
    }

    return this.aiProvider.generateCodeReview(impact, diffContent, maxItems);
  }
}
