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

  return `Sen deneyimli bir QA muhendisisin. Asagidaki PR degisikliklerini analiz ederek test senaryolari olustur.

## Etki Analizi
${impact.summary}

### Dogrudan Etkilenen Feature'lar
${directFeatures || "_Yok_"}

### Dolayli Etkilenen Feature'lar
${indirectFeatures || "_Yok_"}

### Etkilenen Servisler
${services || "_Yok_"}

### Etkilenen Sayfalar
${pages || "_Yok_"}

### Risk Seviyesi: ${impact.riskLevel.toUpperCase()}

## Degisiklik Ozeti (Diff)
\`\`\`
${diffSummary}
\`\`\`

## Talimatlar
1. En fazla **${maxScenarios}** test senaryosu olustur
2. Risk seviyesine gore onceliklendir (critical > high > medium > low)
3. Dogrudan etkilenen feature'lar icin **functional** ve **regression** testleri yaz
4. Dolayli etkilenen feature'lar icin **integration** testleri yaz
5. Edge-case'leri gozden kacirma
6. Her senaryo icin net, uygulanabilir adimlar yaz

Yaniti asagidaki JSON formatinda ver:
\`\`\`json
{
  "scenarios": [
    {
      "id": "TC-001",
      "title": "Senaryo basligi",
      "feature": "Etkilenen feature adi",
      "priority": "critical|high|medium|low",
      "type": "functional|regression|edge-case|integration",
      "steps": [
        "Adim 1: ...",
        "Adim 2: ..."
      ],
      "expectedResult": "Beklenen sonuc"
    }
  ]
}
\`\`\``;
}
