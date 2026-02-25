import type { AIProvider } from "../providers/ai-provider";
import type { CodeReviewItem, ImpactResult, ParsedFile } from "../types";

// ~50K chars ≈ ~12.5K tokens — daha düşük maliyet ve daha hızlı yanıt
const MAX_DIFF_CHARS = 50_000;

// Her chunk'ta değişiklik öncesi/sonrası en fazla bu kadar normal (unchanged) satır context olarak dahil edilir
const MAX_CONTEXT_LINES = 3;

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

          // Context satırlarını kısıtla: ardışık normal satırları en fazla MAX_CONTEXT_LINES tut
          const trimmedChanges: typeof chunk.changes = [];
          let consecutiveNormal = 0;

          for (const c of chunk.changes) {
            if (c.type === "normal") {
              consecutiveNormal++;
              if (consecutiveNormal <= MAX_CONTEXT_LINES) {
                trimmedChanges.push(c);
              }
            } else {
              // Değişiklik satırından önce, atlanmış normal satırlar varsa context'i sıfırla
              if (consecutiveNormal > MAX_CONTEXT_LINES) {
                // Son MAX_CONTEXT_LINES normal satırı geri ekle (değişiklik öncesi context)
                const skipped = consecutiveNormal - MAX_CONTEXT_LINES;
                const insertIdx = trimmedChanges.length;
                // chunk.changes'dan geriye bakarak son context satırlarını bul
                const changeIdx = chunk.changes.indexOf(c);
                for (let j = MAX_CONTEXT_LINES; j > 0; j--) {
                  const prevChange = chunk.changes[changeIdx - j];
                  if (prevChange && prevChange.type === "normal") {
                    trimmedChanges.splice(insertIdx, 0, prevChange);
                  }
                }
                if (skipped > 0) {
                  trimmedChanges.splice(insertIdx, 0, {
                    type: "normal",
                    content: `... (${skipped} satır atlandı)`,
                    lineNumber: 0,
                  });
                }
              }
              consecutiveNormal = 0;
              trimmedChanges.push(c);
            }
          }

          const lines = trimmedChanges
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
