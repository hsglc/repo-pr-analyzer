<div align="center">

# PR Impact Analyzer (PIA)

**AI destekli pull request etki analizi, otomatik test senaryosu ve kod inceleme platformu.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_RTDB-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

</div>

---

## Genel Bakış

PR Impact Analyzer, bir pull request açıldığında veya güncellendiğinde değişikliklerin hangi özellik, sayfa ve servisleri etkilediğini otomatik olarak analiz eden bir platformdur. AI destekli test senaryoları oluşturur, kod incelemesi yapar ve detaylı raporu doğrudan PR'a yorum olarak yazar.

### Temel Özellikler

- **Etki Analizi** — Değişikliklerin hangi özellikleri, servisleri ve sayfaları etkilediğini tespit eder
- **AI Test Senaryoları** — Claude veya OpenAI ile bağlama özel test senaryoları üretir
- **Kod İnceleme** — Güvenlik açıkları, performans sorunları ve kod kalitesi bulgularını otomatik tespit eder
- **Branch Karşılaştırma** — İki branch arasındaki farkları analiz eder, merge öncesi potansiyel sorunları belirler
- **PR Yorum Entegrasyonu** — Analiz sonuçlarını doğrudan GitHub PR'ına yorum olarak yazar
- **Çoklu AI Desteği** — Claude (Anthropic) ve OpenAI model aileleri arasında seçim yapabilme

---

## Nasıl Çalışır?

```
PR Açılır / Güncellenir
        │
        ▼
  CI/CD Pipeline tetiklenir
  (GitHub Actions veya Azure Pipelines)
        │
        ▼
  Diff Parser ── PR diff'ini parse eder
        │
        ▼
  Impact Analyzer ── impact-map.config.json
        │               ile dosya → özellik eşler
        ▼
  AI Test Generator ── Claude/OpenAI ile
        │               test senaryoları üretir
        ▼
  Report Generator ── Markdown rapor oluşturur
        │
        ▼
  PR'a yorum olarak yazar
  (varsa mevcut yorumu günceller)
```

---

## Hızlı Başlangıç

### 1. Depoyu klonlayın ve bağımlılıkları yükleyin

```bash
git clone https://github.com/hsglc/repo-pr-analyzer.git
cd repo-pr-analyzer/branch-analyzer
npm install
```

### 2. Ortam değişkenlerini yapılandırın

Proje kök dizininde `.env.local` dosyası oluşturun:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_DATABASE_URL=...

# Şifreleme
ENCRYPTION_KEY=...
```

### 3. Geliştirme sunucusunu başlatın

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

### 4. `impact-map.config.json` dosyasını projenize göre düzenleyin

Bu dosya değişikliklerin hangi özellikleri etkilediğini belirlemek için kullanılır. Kendi proje yapınıza göre güncelleyin:

```json
{
  "features": {
    "Özellik Adı": {
      "description": "Bu özellik ne yapar",
      "paths": ["src/bu-ozellik-ile-ilgili/**"],
      "relatedFeatures": ["İlişkili Başka Özellik"]
    }
  },
  "services": {
    "Servis Adı": ["src/bu-servise-ait-dosyalar/**"]
  },
  "pages": {
    "Sayfa Adı": ["src/pages/bu-sayfa/**"]
  },
  "ignorePatterns": ["**/*.test.ts", "**/node_modules/**"]
}
```

| Alan | Açıklama |
|------|----------|
| `features.paths` | Glob kalıpları ile dosya → özellik eşlemesi yapar |
| `relatedFeatures` | Bir özellik değiştiğinde dolaylı etkilenen özellikleri belirtir |
| `ignorePatterns` | Analiz dışında bırakılacak dosyalar (testler, lock dosyaları vb.) |

---

## CI/CD Entegrasyonu

### GitHub Actions

#### Workflow dosyasını kopyalayın

`branch-analyzer/.github/workflows/pr-impact-analysis.yml` dosyası hazır olarak gelir. Projenizin kök dizinindeki `.github/workflows/` klasörüne kopyalayın:

```bash
cp branch-analyzer/.github/workflows/pr-impact-analysis.yml .github/workflows/
```

> Branch-analyzer projenizin kök dizininde değilse, workflow içindeki `working-directory` değerlerini güncelleyin.

#### Secret ekleyin

**Repository** > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret | Değer |
|--------|-------|
| `ANTHROPIC_API_KEY` | Claude API anahtarınız ([console.anthropic.com](https://console.anthropic.com)) |

> `GITHUB_TOKEN` GitHub Actions tarafından otomatik sağlanır, eklemenize gerek yok.

OpenAI kullanmak istiyorsanız workflow'daki `AI_PROVIDER` değerini `openai` yapın ve `OPENAI_API_KEY` secret'ı ekleyin.

#### Test edin

Bir PR açın veya mevcut PR'a push yapın. **Actions** sekmesinde workflow'un çalıştığını göreceksiniz. Tamamlanınca PR'da analiz raporu yorum olarak görünür.

---

### Azure DevOps

#### Pipeline oluşturun

1. Azure DevOps projenizde **Pipelines** > **New Pipeline** > **Existing YAML file** seçin
2. Path olarak `branch-analyzer/azure-pipelines/pr-impact-analysis.yml` seçin

#### Variable ekleyin

**Pipeline Edit** > **Variables** > **New variable**:

| Değişken | Değer | Secret |
|----------|-------|--------|
| `ANTHROPIC_API_KEY` | Claude API anahtarınız | Evet *(Keep this value secret)* |

> `System.AccessToken` Azure tarafından otomatik sağlanır.

#### Build Service iznini verin

**Project Settings** > **Repositories** > **Security** > `{Project Name} Build Service`:
- **Contribute to pull requests** → *Allow*

#### PR tetikleyici

Pipeline otomatik olarak `main`, `develop` ve `release/*` branch'lerine açılan PR'larda çalışır. Başka branch'ler eklemek için `azure-pipelines/pr-impact-analysis.yml` dosyasındaki `pr.branches.include` listesini güncelleyin.

---

## Yapılandırma

### Ortam Değişkenleri

| Değişken | Zorunlu | Varsayılan | Açıklama |
|----------|---------|------------|----------|
| `AI_PROVIDER` | — | `claude` | `claude` veya `openai` |
| `ANTHROPIC_API_KEY` | \* | — | Claude API anahtarı |
| `OPENAI_API_KEY` | \* | — | OpenAI API anahtarı |
| `PLATFORM` | — | `github` | `github` veya `azure` |
| `GITHUB_TOKEN` | \*\* | — | GitHub API token |
| `AZURE_TOKEN` | \*\* | — | Azure DevOps token |
| `AZURE_ORG_URL` | \*\* | — | Azure DevOps organizasyon URL'i |
| `PR_NUMBER` | Evet | — | PR numarası |
| `REPO_OWNER` | Evet | — | Depo sahibi |
| `REPO_NAME` | Evet | — | Depo adı |
| `MAX_TEST_SCENARIOS` | — | `15` | Maksimum test senaryosu sayısı |
| `RISK_THRESHOLD` | — | `medium` | Minimum risk eşiği |
| `REPORT_LANGUAGE` | — | `tr` | Rapor dili |

> \* Seçilen AI sağlayıcısına göre biri zorunlu.
> \*\* Seçilen platforma göre biri zorunlu. CI/CD ortamlarında otomatik sağlanır.

### Risk Hesaplama

| Koşul | Seviye |
|-------|--------|
| >500 satır değişiklik veya >5 özellik | Critical |
| >200 satır veya >3 özellik | High |
| >50 satır veya >1 özellik | Medium |
| Diğer | Low |

---

## Yorum Güncelleme (Idempotency)

PR'a her push yapıldığında pipeline tekrar çalışır. Aynı PR'da birden fazla yorum oluşmasını önlemek için **marker tabanlı idempotency** kullanılır:

1. Rapor `<!-- pr-impact-analyzer -->` HTML yorum işaretçisi içerir
2. Yeni analiz çalıştığında mevcut yorumlar arasında işaretçi aranır
3. Bulunursa mevcut yorum güncellenir, bulunamazsa yeni yorum oluşturulur

Bu sayede PR'da her zaman tek ve güncel bir analiz raporu bulunur.

---

## Lokal Çalıştırma (CI/CD olmadan)

Entegrasyon olmadan test etmek için:

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

## Örnek PR Yorum Çıktısı

Aşağıda aracın PR'a yazdığı örnek bir rapor:

> **PR Etki Analizi Raporu**
> Otomatik analiz — 23.02.2026 14:30:00

**Özet:** Bu PR **3** özelliği doğrudan etkiliyor ve **2** özelliği dolaylı olarak etkileyebilir. Risk seviyesi: **HIGH**.

| Metrik | Değer |
|--------|-------|
| Değişen dosya | 12 |
| Eklenen satır | +245 |
| Silinen satır | -89 |
| Etkilenen özellik | 5 |
| Risk seviyesi | HIGH |

**Doğrudan Etkiler:**
- Ödeme Sistemi (3 dosya)
- Kullanıcı Girişi (2 dosya)
- Oturum Yönetimi (1 dosya)

**Dolaylı Etkiler:**
- Bildirimler
- Kullanıcı Profili

**Test Senaryoları (10 adet):**

| ID | Senaryo | Öncelik | Tip |
|-----|---------|---------|-----|
| TC-001 | Kredi kartı ile başarılı ödeme | critical | functional |
| TC-002 | Geçersiz kart ile ödeme reddi | critical | functional |
| TC-003 | Ödeme sırasında oturum süresi dolma | high | integration |
| TC-007 | Eşzamanlı ödeme isteği (double submit) | high | edge-case |
| ... | ... | ... | ... |

Her senaryo detayları: adımlar + beklenen sonuç.

---

## Proje Yapısı

```
branch-analyzer/
├── app/                          # Next.js App Router sayfaları
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global stiller
│   ├── (auth)/                   # Kimlik doğrulama sayfaları
│   │   ├── layout.tsx
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Dashboard sayfaları
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       ├── page.tsx          # Repo listesi
│   │       └── [owner]/[repo]/   # Repo detayı & PR analizi
│   └── api/                      # API route'ları
│       ├── analyze/              # Analiz endpoint'leri
│       ├── repos/                # GitHub repo endpoint'leri
│       └── settings/             # Kullanıcı ayarları
├── components/                   # React bileşenleri
│   ├── pr-list-item.tsx
│   ├── impact-summary.tsx
│   ├── diff-viewer.tsx
│   ├── commit-history.tsx
│   ├── code-review-table.tsx
│   ├── test-scenarios-table.tsx
│   └── model-selector.tsx
├── lib/
│   ├── core/                     # İş mantığı
│   │   ├── types.ts              # TypeScript tipleri
│   │   ├── config.ts             # Yapılandırma (Zod ile)
│   │   └── providers/            # AI sağlayıcıları
│   ├── api-client.ts             # İstemci taraflı API yardımcısı
│   └── firebase.ts               # Firebase yapılandırması
├── .github/workflows/
│   └── pr-impact-analysis.yml    # GitHub Actions workflow
├── azure-pipelines/
│   └── pr-impact-analysis.yml    # Azure DevOps pipeline
├── impact-map.config.json        # Dosya → özellik eşleme yapılandırması
├── package.json
└── tsconfig.json
```

---

## Mimari Kararlar

| Karar | Gerekçe |
|-------|---------|
| **Strategy Pattern** | AI sağlayıcısı ve platform değiştirilebilir (arayüz tabanlı). Claude'dan OpenAI'a geçiş tek ortam değişkeni ile yapılır. |
| **Config-driven Impact Mapping** | Dosya → özellik eşlemesi `impact-map.config.json` ile kullanıcı tarafından tanımlanır. AST analizi gibi sihirli yaklaşımlar yerine deterministik ve anlaşılır bir yapı tercih edilmiştir. |
| **Zod Doğrulama** | AI yanıtları şema ile doğrulanır. Beklenmeyen format hataya dönüşür, sessizce geçilmez. |
| **Marker Tabanlı Idempotency** | PR'da tekrarlayan yorum yerine tek yorum güncellenir, temiz bir geçmiş sağlanır. |
| **Firebase Auth + RTDB** | Sunucusuz kimlik doğrulama ve gerçek zamanlı veritabanı ile altyapı yönetim yükü minimumda tutulur. |

---

## Lisans

Bu proje MIT lisansı ile lisanslanmıştır.
