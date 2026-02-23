import type { ImpactResult } from "../types";

export function buildTestGenerationPrompt(
  impact: ImpactResult,
  diffSummary: string,
  maxScenarios: number
): string {
  const directFeatures = impact.features
    .filter((f) => f.changeType === "direct")
    .map((f) => `- **${f.name}**: ${f.description} (${f.affectedFiles.join(", ")})`)
    .join("\n");

  const indirectFeatures = impact.features
    .filter((f) => f.changeType === "indirect")
    .map((f) => `- **${f.name}**: ${f.description}`)
    .join("\n");

  const services = impact.services.map((s) => `- ${s}`).join("\n");
  const pages = impact.pages.map((p) => `- ${p}`).join("\n");

  return `Sen deneyimli bir QA mühendisisin. Aşağıdaki PR değişikliklerini analiz ederek test senaryoları oluştur.

## Etki Analizi
${impact.summary}

### Doğrudan Etkilenen Feature'lar
${directFeatures || "_Yok_"}

### Dolaylı Etkilenen Feature'lar
${indirectFeatures || "_Yok_"}

### Etkilenen Servisler
${services || "_Yok_"}

### Etkilenen Sayfalar
${pages || "_Yok_"}

### Risk Seviyesi: ${impact.riskLevel.toUpperCase()}

## Değişiklik Özeti (Diff)
\`\`\`
${diffSummary}
\`\`\`

## Talimatlar
1. En fazla **${maxScenarios}** test senaryosu oluştur
2. Risk seviyesine göre önceliklendir (critical > high > medium > low)
3. Doğrudan etkilenen feature'lar için **functional** ve **regression** testleri yaz
4. Dolaylı etkilenen feature'lar için **integration** testleri yaz
5. Edge-case'leri gözden kaçırma
6. Her senaryo için net, uygulanabilir adımlar yaz

Yanıtı aşağıdaki JSON formatında ver:
\`\`\`json
{
  "scenarios": [
    {
      "id": "TC-001",
      "title": "Senaryo başlığı",
      "feature": "Etkilenen feature adı",
      "priority": "critical|high|medium|low",
      "type": "functional|regression|edge-case|integration",
      "steps": [
        "Adım 1: ...",
        "Adım 2: ..."
      ],
      "expectedResult": "Beklenen sonuç"
    }
  ]
}
\`\`\``;
}

export function buildCodeReviewPrompt(
  impact: ImpactResult,
  diffContent: string,
  maxItems: number
): string {
  const features = impact.features
    .map((f) => `- **${f.name}** (${f.changeType === "direct" ? "doğrudan" : "dolaylı"}): ${f.description}`)
    .join("\n");

  return `Sen deneyimli bir yazılım mühendisisin. Aşağıdaki PR diff'ini detaylı şekilde inceleyerek kod inceleme bulguları oluştur.

## Etki Özeti
${impact.summary}

### Risk Seviyesi: ${impact.riskLevel.toUpperCase()}

### Etkilenen Özellikler
${features || "_Yok_"}

## Diff İçeriği
\`\`\`diff
${diffContent}
\`\`\`

## Talimatlar
1. En fazla **${maxItems}** bulgu oluştur
2. Her bulgu için dosya yolu ve mümkünse satır numarası belirt
3. Severity sıralaması: critical > warning > info > suggestion
4. Şu kategorileri kullan: bug, security, performance, maintainability, style
5. Her bulgu için düzeltme önerisi (kod snippet) ver (mümkünse)
6. Gerçek hataları ve güvenlik açıklarını önceliklendir
7. False positive'lerden kaçın - sadece gerçek sorunları bildir

Yanıtı aşağıdaki JSON formatında ver:
\`\`\`json
{
  "items": [
    {
      "id": "CR-001",
      "file": "src/example.ts",
      "line": 42,
      "severity": "critical|warning|info|suggestion",
      "category": "bug|security|performance|maintainability|style",
      "title": "Kısa başlık",
      "description": "Detaylı açıklama",
      "suggestion": "Düzeltme önerisi (kod snippet)"
    }
  ]
}
\`\`\``;
}
