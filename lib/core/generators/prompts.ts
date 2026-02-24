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
    "TypeScript": `- \`any\` tipi kullanımından kaçınılmalı, doğru tipler tanımlanmalı
- Null/undefined kontrolleri yapılmalı (strict null checks)
- Enum yerine union type tercih edilmeli (tree-shaking uyumluluğu)
- Interface ve type alias doğru kullanılmalı`,
    "TypeScript/React": `- \`any\` tipi kullanımından kaçınılmalı, doğru tipler tanımlanmalı
- React hook kuralları: hook'lar koşullu çağrılmamalı, bağımlılık dizileri eksiksiz olmalı
- Gereksiz re-render: useMemo/useCallback eksikliği, büyük objelerin inline tanımlanması
- useEffect bağımlılık dizisi doğruluğu ve cleanup fonksiyonu
- Key prop'larının benzersiz ve kararlı olması`,
    "JavaScript": `- == yerine === kullanılmalı
- var yerine const/let tercih edilmeli
- Promise hataları yakalanmalı (.catch veya try/catch)
- Prototype pollution riski kontrol edilmeli`,
    "JavaScript/React": `- == yerine === kullanılmalı
- React hook kuralları: hook'lar koşullu çağrılmamalı, bağımlılık dizileri eksiksiz olmalı
- Gereksiz re-render kontrolü
- useEffect cleanup fonksiyonu
- Key prop'larının benzersiz ve kararlı olması`,
    "Python": `- Type hint kullanımı tercih edilmeli
- Mutable default argument kullanılmamalı (def f(x=[]))
- Context manager (with) kullanılmalı (dosya/bağlantı işlemleri)
- List comprehension ve generator uygun yerde kullanılmalı
- f-string tercih edilmeli (format güvenliği)`,
    "Go": `- Error handling: hataları yutmayın (_, err := ... sonrası kontrol)
- Goroutine leak kontrolü (context.Cancel kullanımı)
- defer kullanımı (resource cleanup)
- Interface segregation: küçük interface'ler tercih edilmeli
- Pointer vs value receiver tutarlılığı`,
  };

  return practices[lang] || `- Dil standartlarına ve idiomlarına uygunluk
- Hata yönetimi en iyi pratikleri
- Performans açısından verimli veri yapıları ve algoritmalar`;
}

export function buildCodeReviewPrompt(
  impact: ImpactResult,
  diffContent: string,
  maxItems: number
): string {
  const features = impact.features
    .map((f) => `- **${f.name}** (${f.changeType === "direct" ? "doğrudan" : "dolaylı"}): ${f.description}`)
    .join("\n");

  const detectedLang = detectLanguage(diffContent);
  const langPractices = getLanguageBestPractices(detectedLang);

  return `## Rol
Sen SOLID prensiplerini, performans optimizasyonunu ve ${detectedLang} best practice'lerini bilen senior bir yazılım mühendisi ve kod incelemecisisin.

## Etki Özeti
${impact.summary}

### Risk Seviyesi: ${impact.riskLevel.toUpperCase()}

### Etkilenen Özellikler
${features || "_Yok_"}

## Diff İçeriği
${diffContent}

## İnceleme Kriterleri

### 1. Bug & Güvenlik (en yüksek öncelik)
- Mantık hataları, off-by-one, null/undefined erişimi
- Güvenlik açıkları: injection, XSS, CSRF, hassas veri sızıntısı
- Race condition ve eşzamanlılık sorunları
- Hata yönetimi eksiklikleri (yakalanmayan hatalar, yutulmuş exception'lar)

### 2. Performans
- Gereksiz hesaplama veya tekrarlanan işlemler (döngü içinde döngü, N+1 sorgu)
- Bellek sızıntısı riski (event listener temizlenmemesi, büyük obje referansları)
- Gereksiz re-render veya DOM manipülasyonu
- Eksik cache veya memoization fırsatları
- Büyük payload veya verimsiz veri yapısı kullanımı

### 3. SOLID Prensipleri
- **SRP**: Bir sınıf/fonksiyon birden fazla sorumluluğa mı sahip?
- **OCP**: Değişiklik yapmadan genişletilebilir mi?
- **LSP**: Alt tipler üst tiplerin yerine sorunsuz kullanılabilir mi?
- **ISP**: Gereksiz bağımlılıklara zorlanıyor mu?
- **DIP**: Somut sınıflara mı yoksa soyutlamalara mı bağımlı?

### 4. ${detectedLang} Best Practice'leri
${langPractices}

### 5. Bakım Kolaylığı & Stil
- Kod okunabilirliği ve anlaşılırlığı
- İsimlendirme tutarlılığı ve açıklayıcılığı
- DRY prensibi: tekrarlanan kod blokları
- Karmaşıklık (cyclomatic complexity) yüksekliği
- Eksik veya yanıltıcı yorum/dokümantasyon

## Talimatlar
1. En fazla **${maxItems}** bulgu oluştur
2. Her bulgu için dosya yolu ve mümkünse satır numarası belirt
3. Severity sıralaması: critical > warning > info > suggestion
4. Şu kategorileri kullan: bug, security, performance, maintainability, style
5. Her bulgu için düzeltme önerisi (kod snippet) ver (mümkünse)
6. Gerçek hataları ve güvenlik açıklarını önceliklendir
7. False positive'lerden kaçın - sadece gerçek sorunları bildir
8. SOLID ve performans bulgularını somut kodla destekle

Yanıtı yalnızca aşağıdaki yapıda bir JSON objesi olarak döndür (markdown code block kullanma):
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
}`;
}
