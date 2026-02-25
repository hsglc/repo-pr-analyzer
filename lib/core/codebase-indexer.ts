import { Octokit } from "@octokit/rest";

// ─── Types ─────────────────────────────────────────────

export interface CodebaseIndex {
  repoFullName: string;
  commitSha: string;
  createdAt: string;
  tree: string[];
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  path: string;
  language: string;
  imports: string[];
  exports: string[];
  summary: string;
}

// ─── Constants ─────────────────────────────────────────

const MAX_FILES_TO_FETCH = 30;

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];

const IGNORE_PATTERNS = [
  "node_modules/",
  "dist/",
  ".next/",
  "build/",
  "coverage/",
  "__pycache__/",
  ".test.",
  ".spec.",
  ".stories.",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

// Priority tiers for file selection (higher = fetched first)
const PRIORITY_PATTERNS: [RegExp, number][] = [
  [/^(tsconfig|next\.config|package)\.\w+$/, 5],
  [/^lib\/core\//, 4],
  [/^lib\//, 4],
  [/^src\/lib\//, 4],
  [/^src\/core\//, 4],
  [/^src\/services\//, 3],
  [/^src\/components\//, 3],
  [/^components\//, 3],
  [/^app\/api\//, 3],
  [/^app\//, 2],
  [/^src\//, 2],
  [/^pages\//, 2],
];

const MAX_FILE_SIZE = 1_000_000; // 1MB — skip larger files

// ─── Helpers ───────────────────────────────────────────

function isSupportedFile(path: string): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isIgnored(path: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => path.includes(pattern));
}

function getFilePriority(path: string): number {
  for (const [pattern, priority] of PRIORITY_PATTERNS) {
    if (pattern.test(path)) return priority;
  }
  return 1;
}

function detectLanguage(path: string): string {
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".py")) return "py";
  return "unknown";
}

function resolveRelativeImport(importPath: string, currentFilePath: string): string {
  if (!importPath.startsWith(".")) return importPath;

  const currentDir = currentFilePath.split("/").slice(0, -1);
  const parts = importPath.split("/");

  for (const part of parts) {
    if (part === "..") {
      currentDir.pop();
    } else if (part !== ".") {
      currentDir.push(part);
    }
  }

  return currentDir.join("/");
}

// ─── Extract Module Info ───────────────────────────────

function extractModuleInfo(path: string, content: string): ModuleInfo {
  const language = detectLanguage(path);
  const imports: string[] = [];
  const exports: string[] = [];
  let summary = "";

  const lines = content.split("\n");

  // Extract summary from first JSDoc or comment block
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    // JSDoc: /** ... */
    const jsdocMatch = trimmed.match(/^\/\*\*\s*(.+?)(?:\s*\*\/)?$/);
    if (jsdocMatch) {
      summary = jsdocMatch[1].replace(/^\*\s*/, "").trim();
      break;
    }

    // Single-line comment: // ...
    const commentMatch = trimmed.match(/^\/\/\s*(.+)/);
    if (commentMatch) {
      summary = commentMatch[1].trim();
      break;
    }

    // If first non-empty line is not a comment, no summary
    break;
  }

  if (language === "py") {
    extractPythonInfo(content, path, imports, exports);
  } else {
    extractTSJSInfo(content, path, imports, exports);
  }

  return { path, language, imports, exports, summary };
}

function extractTSJSInfo(
  content: string,
  currentPath: string,
  imports: string[],
  exports: string[]
): void {
  // Extract imports
  const importRegex = /import\s+(?:(?:type\s+)?(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolved = resolveRelativeImport(importPath, currentPath);
    if (!imports.includes(resolved)) {
      imports.push(resolved);
    }
  }

  // Extract exports — function, class, const, type, interface, enum
  const exportPatterns = [
    /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g,
    /export\s+(?:default\s+)?class\s+(\w+)/g,
    /export\s+(?:const|let|var)\s+(\w+)/g,
    /export\s+type\s+(\w+)/g,
    /export\s+interface\s+(\w+)/g,
    /export\s+enum\s+(\w+)/g,
  ];

  for (const pattern of exportPatterns) {
    let expMatch;
    while ((expMatch = pattern.exec(content)) !== null) {
      const name = expMatch[1];
      if (!exports.includes(name)) {
        exports.push(name);
      }
    }
  }

  // Named re-exports: export { X, Y } from "..."
  const reExportRegex = /export\s+\{([^}]+)\}/g;
  while ((match = reExportRegex.exec(content)) !== null) {
    const names = match[1].split(",").map((n) => n.trim().split(/\s+as\s+/).pop()!.trim());
    for (const name of names) {
      if (name && !exports.includes(name)) {
        exports.push(name);
      }
    }
  }
}

function extractPythonInfo(
  content: string,
  currentPath: string,
  imports: string[],
  exports: string[]
): void {
  // Python imports
  const importRegex = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const mod = match[1] || match[2];
    if (mod && !imports.includes(mod)) {
      imports.push(mod);
    }
  }

  // Python exports: def, class, top-level assignments
  const defRegex = /^(?:async\s+)?def\s+(\w+)/gm;
  while ((match = defRegex.exec(content)) !== null) {
    const name = match[1];
    if (!name.startsWith("_") && !exports.includes(name)) {
      exports.push(name);
    }
  }

  const classRegex = /^class\s+(\w+)/gm;
  while ((match = classRegex.exec(content)) !== null) {
    const name = match[1];
    if (!exports.includes(name)) {
      exports.push(name);
    }
  }
}

// ─── Main Builder ──────────────────────────────────────

export async function buildCodebaseIndex(
  owner: string,
  repo: string,
  githubToken: string
): Promise<CodebaseIndex> {
  const octokit = new Octokit({ auth: githubToken });

  // 1. Get repo default branch + HEAD sha
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const commitSha = refData.object.sha;

  // 2. Get full file tree
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "1",
  });

  const allPaths = treeData.tree
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => item.path!);

  // 3. Filter to supported files, exclude ignored
  const candidateFiles = allPaths
    .filter((p) => isSupportedFile(p) && !isIgnored(p))
    .sort((a, b) => getFilePriority(b) - getFilePriority(a))
    .slice(0, MAX_FILES_TO_FETCH);

  // 4. Fetch file contents in parallel (batches of 10)
  const modules: ModuleInfo[] = [];
  const batchSize = 10;

  for (let i = 0; i < candidateFiles.length; i += batchSize) {
    const batch = candidateFiles.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: defaultBranch,
        });

        if ("content" in data && data.encoding === "base64") {
          if (data.size && data.size > MAX_FILE_SIZE) return null;
          const content = Buffer.from(data.content, "base64").toString("utf-8");
          return extractModuleInfo(filePath, content);
        }
        return null;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        modules.push(result.value);
      }
    }
  }

  console.log(`Codebase index built: ${modules.length} modules indexed for ${owner}/${repo}`);

  return {
    repoFullName: `${owner}/${repo}`,
    commitSha,
    createdAt: new Date().toISOString(),
    tree: allPaths,
    modules,
  };
}
