import type { ImpactResult } from "../types";

// --- Test Generation Prompts ---

export function buildTestGenerationSystemPrompt(): string {
  return `Sen deneyimli bir QA mühendisisin. PR değişikliklerini analiz ederek test senaryoları oluşturuyorsun.

## Talimatlar
1. Risk seviyesine göre önceliklendir (critical > high > medium > low)
2. Doğrudan etkilenen feature'lar için functional ve regression testleri yaz
3. Dolaylı etkilenen feature'lar için integration testleri yaz
4. Edge-case'leri gözden kaçırma
5. Her senaryo için net, uygulanabilir adımlar yaz

Yanıtını SADECE geçerli JSON olarak ver. Markdown code block, açıklama veya ek metin ekleme — yalnızca JSON objesi döndür.

JSON formatı:
{"scenarios":[{"id":"TC-001","title":"Başlık","feature":"Feature adı","priority":"critical|high|medium|low","type":"functional|regression|edge-case|integration","steps":["Adım 1","Adım 2"],"expectedResult":"Beklenen sonuç"}]}`;
}

export function buildTestGenerationUserMessage(
  impact: ImpactResult,
  diffSummary: string,
  maxScenarios: number
): string {
  const directFeatures = impact.features
    .filter((f) => f.changeType === "direct")
    .map((f) => `- ${f.name}: ${f.description} (${f.affectedFiles.join(", ")})`)
    .join("\n");

  const indirectFeatures = impact.features
    .filter((f) => f.changeType === "indirect")
    .map((f) => `- ${f.name}: ${f.description}`)
    .join("\n");

  const services = impact.services.map((s) => `- ${s}`).join("\n");
  const pages = impact.pages.map((p) => `- ${p}`).join("\n");

  return `En fazla ${maxScenarios} test senaryosu oluştur.

Etki Analizi: ${impact.summary}
Risk: ${impact.riskLevel.toUpperCase()}

Doğrudan Etkilenen Feature'lar:
${directFeatures || "Yok"}

Dolaylı Etkilenen Feature'lar:
${indirectFeatures || "Yok"}

Servisler: ${services || "Yok"}
Sayfalar: ${pages || "Yok"}

Diff:
${diffSummary}`;
}

// --- Code Review Prompts ---

function detectLanguage(diffContent: string): string {
  const extCounts: Record<string, number> = {};
  const fileMatches = diffContent.matchAll(/^(?:diff --git a\/.*?\.|[+-]{3} [ab]\/.*?\.)(\w+)/gm);
  for (const m of fileMatches) {
    const ext = m[1].toLowerCase();
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }

  const extToLang: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript/React", js: "JavaScript", jsx: "JavaScript/React",
    py: "Python", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin",
    cs: "C#", rb: "Ruby", php: "PHP", swift: "Swift", dart: "Dart",
  };

  let topExt = "";
  let topCount = 0;
  for (const [ext, count] of Object.entries(extCounts)) {
    if (count > topCount && extToLang[ext]) {
      topExt = ext;
      topCount = count;
    }
  }

  return extToLang[topExt] || "General";
}

function getLanguageBestPractices(lang: string): string {
  const practices: Record<string, string> = {
    "TypeScript": `- any tipi kullanımından kaçınılmalı
- Null/undefined kontrolleri yapılmalı
- Enum yerine union type tercih edilmeli`,
    "TypeScript/React": `- any tipi kullanımından kaçınılmalı
- Hook kuralları: koşullu çağrılmamalı, bağımlılık dizileri eksiksiz olmalı
- Gereksiz re-render: useMemo/useCallback eksikliği
- useEffect bağımlılık dizisi ve cleanup fonksiyonu
- Key prop'ları benzersiz ve kararlı olmalı`,
    "JavaScript": `- == yerine === kullanılmalı
- var yerine const/let tercih edilmeli
- Promise hataları yakalanmalı`,
    "JavaScript/React": `- == yerine === kullanılmalı
- Hook kuralları ve bağımlılık dizileri
- Gereksiz re-render kontrolü
- Key prop'ları benzersiz olmalı`,
    "Python": `- Type hint kullanımı tercih edilmeli
- Mutable default argument kullanılmamalı
- Context manager (with) kullanılmalı
- f-string tercih edilmeli`,
    "Go": `- Error handling: hataları yutmayın
- Goroutine leak kontrolü (context.Cancel)
- defer kullanımı (resource cleanup)
- Interface segregation`,
  };

  return practices[lang] || `- Dil standartlarına uygunluk
- Hata yönetimi en iyi pratikleri
- Verimli veri yapıları ve algoritmalar`;
}

export function buildCodeReviewSystemPrompt(diffContent: string): string {
  const detectedLang = detectLanguage(diffContent);
  const langPractices = getLanguageBestPractices(detectedLang);

  return `Sen SOLID prensiplerini, performans optimizasyonunu ve ${detectedLang} best practice'lerini bilen senior bir yazılım mühendisi ve kod incelemecisisin.

Yanıtını SADECE geçerli JSON olarak ver. Markdown code block, açıklama veya ek metin ekleme — yalnızca JSON objesi döndür.

İnceleme Kriterleri:
1. Bug & Güvenlik: mantık hataları, injection, XSS, CSRF, race condition, hata yönetimi eksiklikleri
2. Performans: gereksiz hesaplama, N+1 sorgu, bellek sızıntısı, eksik memoization
3. SOLID Prensipleri: SRP, OCP, LSP, ISP, DIP ihlalleri
4. ${detectedLang} Best Practice'leri:
${langPractices}
5. Bakım & Stil: okunabilirlik, isimlendirme, DRY, karmaşıklık

Talimatlar:
- Severity: critical > warning > info > suggestion
- Kategoriler: bug, security, performance, maintainability, style
- Her bulgu için dosya yolu ve satır numarası belirt
- Düzeltme önerisi (kod snippet) ver
- False positive'lerden kaçın

JSON formatı:
{"items":[{"id":"CR-001","file":"src/example.ts","line":42,"severity":"critical|warning|info|suggestion","category":"bug|security|performance|maintainability|style","title":"Başlık","description":"Açıklama","suggestion":"Öneri"}]}`;
}

export function buildCodeReviewUserMessage(
  impact: ImpactResult,
  diffContent: string,
  maxItems: number
): string {
  const features = impact.features
    .map((f) => `- ${f.name} (${f.changeType === "direct" ? "doğrudan" : "dolaylı"}): ${f.description}`)
    .join("\n");

  return `En fazla ${maxItems} bulgu oluştur.

Etki: ${impact.summary}
Risk: ${impact.riskLevel.toUpperCase()}
Özellikler:
${features || "Yok"}

Diff:
${diffContent}`;
}
