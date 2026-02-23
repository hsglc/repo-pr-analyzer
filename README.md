# PR Impact Analyzer

PR acildiginda degisikliklerin hangi feature, sayfa ve servisleri etkiledigini otomatik analiz eden, AI destekli test senaryolari olusturan ve detayli raporu PR'a comment olarak yazan otomasyon araci.

## Nasil Calisir?

```
PR Acilir / Guncellenir
        |
        v
  CI/CD Pipeline tetiklenir
  (GitHub Actions veya Azure Pipelines)
        |
        v
  Diff Parser -- PR diff'ini parse eder
        |
        v
  Impact Analyzer -- impact-map.config.json
        |               ile dosya -> feature esler
        v
  AI Test Generator -- Claude/OpenAI ile
        |               test senaryolari uretir
        v
  Report Generator -- Markdown rapor olusturur
        |
        v
  PR'a comment olarak yazar
  (varsa mevcut comment'i gunceller)
```

## Hizli Baslangic

### 1. branch-analyzer klasorunu projenize kopyalayin

Bu klasoru mevcut projenizin root dizinine kopyalayin:

```bash
cp -r branch-analyzer/ /path/to/your-project/branch-analyzer/
```

### 2. Bagimliliklari yukleyin ve build edin

```bash
cd branch-analyzer
npm install
npm run build
```

### 3. impact-map.config.json dosyasini projenize gore duzenleyin

Bu dosya degisikliklerin hangi feature'lari etkiledigini belirlemek icin kullanilir. Kendi proje yapisiniza gore guncelleyin:

```json
{
  "features": {
    "Feature Adi": {
      "description": "Bu feature ne yapar",
      "paths": ["src/bu-feature-ile-ilgili/**"],
      "relatedFeatures": ["Iliskili Baska Feature"]
    }
  },
  "services": {
    "Servis Adi": ["src/bu-servise-ait-dosyalar/**"]
  },
  "pages": {
    "Sayfa Adi": ["src/pages/bu-sayfa/**"]
  },
  "ignorePatterns": ["**/*.test.ts", "**/node_modules/**"]
}
```

**features.paths**: Glob pattern'leri ile dosya -> feature eslemesi yapar.
**relatedFeatures**: Bir feature degistiginde dolayli etkilenen feature'lari belirtir.
**ignorePatterns**: Analiz disinda birakilacak dosyalar (testler, lock dosyalari vb.).

### 4. CI/CD entegrasyonu secin

---

## GitHub Actions Entegrasyonu

### Workflow dosyasini kopyalayin

`branch-analyzer/.github/workflows/pr-impact-analysis.yml` dosyasi hazir olarak geliyor. Projenizin root'undaki `.github/workflows/` klasorune kopyalayin:

```bash
cp branch-analyzer/.github/workflows/pr-impact-analysis.yml .github/workflows/
```

Eger branch-analyzer projenizin root'unda degilse, workflow icindeki `working-directory` degerlerini guncelleyin.

### Secret ekleyin

Repository > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret | Deger |
|--------|-------|
| `ANTHROPIC_API_KEY` | Claude API anahtariniz ([console.anthropic.com](https://console.anthropic.com)) |

> `GITHUB_TOKEN` GitHub Actions tarafindan otomatik saglanir, eklemenize gerek yok.

OpenAI kullanmak istiyorsaniz workflow'daki `AI_PROVIDER`'i `openai` yapin ve `OPENAI_API_KEY` secret'i ekleyin.

### Test edin

Bir PR acin veya mevcut PR'a push yapin. Actions sekmesinde workflow'un calistigini goreceksiniz. Tamamlaninca PR'da analiz raporu comment olarak gorunur.

---

## Azure DevOps Entegrasyonu

### Pipeline olusturun

1. Azure DevOps projenizde **Pipelines** > **New Pipeline** > **Existing YAML file** secin
2. Path olarak `branch-analyzer/azure-pipelines/pr-impact-analysis.yml` secin

### Variable ekleyin

Pipeline **Edit** > **Variables** > **New variable**:

| Variable | Deger | Secret |
|----------|-------|--------|
| `ANTHROPIC_API_KEY` | Claude API anahtariniz | Evet (Keep this value secret) |

> `System.AccessToken` Azure tarafindan otomatik saglanir.

### Build Service iznini verin

Project Settings > **Repositories** > **Security** > `{Project Name} Build Service`:
- **Contribute to pull requests** = Allow

### PR trigger

Pipeline otomatik olarak `main`, `develop` ve `release/*` branch'lerine acilan PR'larda calisir. Baska branch'ler eklemek icin `azure-pipelines/pr-impact-analysis.yml` icindeki `pr.branches.include` listesini guncelleyin.

---

## Konfigursayon

### Environment Variables

| Variable | Zorunlu | Varsayilan | Aciklama |
|----------|---------|------------|----------|
| `AI_PROVIDER` | - | `claude` | `claude` veya `openai` |
| `ANTHROPIC_API_KEY` | * | - | Claude API anahtari |
| `OPENAI_API_KEY` | * | - | OpenAI API anahtari |
| `PLATFORM` | - | `github` | `github` veya `azure` |
| `GITHUB_TOKEN` | ** | - | GitHub API token |
| `AZURE_TOKEN` | ** | - | Azure DevOps token |
| `AZURE_ORG_URL` | ** | - | Azure DevOps org URL |
| `PR_NUMBER` | Evet | - | PR numarasi |
| `REPO_OWNER` | Evet | - | Repository sahibi |
| `REPO_NAME` | Evet | - | Repository adi |
| `MAX_TEST_SCENARIOS` | - | `15` | Maks test senaryosu sayisi |
| `RISK_THRESHOLD` | - | `medium` | Minimum risk esigi |
| `REPORT_LANGUAGE` | - | `tr` | Rapor dili |

\* Secilen AI provider'a gore biri zorunlu.
\** Secilen platforma gore biri zorunlu. CI/CD ortamlarinda otomatik saglanir.

### Risk Hesaplama

| Kosul | Seviye |
|-------|--------|
| >500 satir degisiklik veya >5 feature | Critical |
| >200 satir veya >3 feature | High |
| >50 satir veya >1 feature | Medium |
| Diger | Low |

---

## Comment Guncelleme (Idempotency)

PR'a her push yapildiginda pipeline tekrar calisir. Ayni PR'da birden fazla comment olusmasini onlemek icin **marker-based idempotency** kullanilir:

- Rapor `<!-- pr-impact-analyzer -->` HTML comment marker'i icerir
- Yeni analiz calistiginda mevcut commentler arasinda marker aranir
- Bulunursa mevcut comment guncellenir, bulunamazsa yeni comment olusturulur

Bu sayede PR'da her zaman tek ve guncel bir analiz raporu bulunur.

---

## Lokal Calistirma

Entegrasyon olmadan test etmek icin:

```bash
cd branch-analyzer

export AI_PROVIDER=claude
export ANTHROPIC_API_KEY=sk-ant-...
export PLATFORM=github
export GITHUB_TOKEN=ghp_...
export PR_NUMBER=42
export REPO_OWNER=kullanici-adi
export REPO_NAME=proje-adi

npm run dev
```

---

## Ornek PR Comment Ciktisi

Asagida aracin PR'a yazdigi ornek bir rapor:

---

> **PR Etki Analizi Raporu**
> Otomatik analiz - 23.02.2026 14:30:00

**Ozet:** Bu PR **3** feature'i dogrudan etkiliyor ve **2** feature'i dolayli olarak etkileyebilir. Risk seviyesi: **HIGH**.

| Metrik | Deger |
|--------|-------|
| Degisen dosya | 12 |
| Eklenen satir | +245 |
| Silinen satir | -89 |
| Etkilenen feature | 5 |
| Risk seviyesi | HIGH |

**Dogrudan Etkiler:**
- Odeme Sistemi (3 dosya)
- Kullanici Girisi (2 dosya)
- Oturum Yonetimi (1 dosya)

**Dolayli Etkiler:**
- Bildirimler
- Kullanici Profili

**Test Senaryolari (10 adet):**

| ID | Senaryo | Oncelik | Tip |
|-----|---------|---------|-----|
| TC-001 | Kredi karti ile basarili odeme | critical | functional |
| TC-002 | Gecersiz kart ile odeme reddi | critical | functional |
| TC-003 | Odeme sirasinda oturum suresi dolma | high | integration |
| TC-007 | Esanlik odeme istegi (double submit) | high | edge-case |
| ... | ... | ... | ... |

Her senaryo detaylari: adimlar + beklenen sonuc.

---

## Proje Yapisi

```
branch-analyzer/
├── src/
│   ├── index.ts              # Ana orkestrator
│   ├── types.ts              # TypeScript tipleri
│   ├── config.ts             # Konfigurasyon (Zod ile)
│   ├── parsers/
│   │   └── diff-parser.ts    # parse-diff ile diff parse
│   ├── analyzers/
│   │   └── impact-analyzer.ts # Dosya -> feature eslemesi
│   ├── generators/
│   │   ├── test-generator.ts  # AI test senaryosu orchestrator
│   │   ├── prompts.ts         # AI prompt sablonlari
│   │   └── report-generator.ts # Markdown rapor
│   ├── providers/
│   │   ├── ai-provider.ts     # AI provider interface
│   │   ├── claude-provider.ts # Claude API
│   │   └── openai-provider.ts # OpenAI API
│   └── platforms/
│       ├── platform.ts        # Platform interface
│       ├── github-platform.ts # GitHub API (Octokit)
│       └── azure-platform.ts  # Azure DevOps API
├── .github/workflows/
│   └── pr-impact-analysis.yml # GitHub Actions workflow
├── azure-pipelines/
│   └── pr-impact-analysis.yml # Azure DevOps pipeline
├── impact-map.config.json     # Dosya-feature esleme config'i
├── package.json
└── tsconfig.json
```

## Mimari Kararlar

- **Strategy Pattern**: AI provider ve platform degistirilebilir (interface-based). Claude'dan OpenAI'a gecis tek env variable.
- **Config-driven Impact Mapping**: Dosya -> feature eslemesi `impact-map.config.json` ile kullanici tarafindan tanimlanir. AST analizi gibi magic yok, deterministik ve anlasilir.
- **Zod Validation**: AI yanitlari sema ile dogrulanir. Beklenmedik format hataya donusur.
- **Marker-based Idempotency**: PR'da tekrarlayan comment yerine tek comment guncellenir.
