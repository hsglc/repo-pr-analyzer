import type { CodebaseIndex, ModuleInfo } from "./codebase-indexer";

/**
 * Given a codebase index and a list of changed file paths (from diff),
 * returns a structured text context describing the relevant modules,
 * their dependencies, and their consumers.
 */
export function retrieveContext(
  index: CodebaseIndex,
  changedFiles: string[]
): string {
  const moduleMap = new Map<string, ModuleInfo>();
  for (const mod of index.modules) {
    moduleMap.set(mod.path, mod);
  }

  // Normalize changed file paths — strip leading "a/" or "b/" if present
  const normalizedChanged = changedFiles.map((f) =>
    f.replace(/^[ab]\//, "")
  );

  // 1. Find modules for changed files
  const changedModules: ModuleInfo[] = [];
  for (const filePath of normalizedChanged) {
    const mod = findModule(moduleMap, filePath);
    if (mod) changedModules.push(mod);
  }

  // 2. Find direct dependencies (files imported by changed files)
  const dependencyPaths = new Set<string>();
  for (const mod of changedModules) {
    for (const imp of mod.imports) {
      const resolved = findModule(moduleMap, imp);
      if (resolved && !normalizedChanged.includes(resolved.path)) {
        dependencyPaths.add(resolved.path);
      }
    }
  }

  // 3. Find consumers (files that import any of the changed files)
  const consumerMap = new Map<string, string[]>(); // changedPath -> consumer paths
  for (const mod of index.modules) {
    if (normalizedChanged.includes(mod.path)) continue;

    for (const imp of mod.imports) {
      const resolvedMod = findModule(moduleMap, imp);
      if (resolvedMod && normalizedChanged.includes(resolvedMod.path)) {
        const existing = consumerMap.get(resolvedMod.path) || [];
        existing.push(mod.path);
        consumerMap.set(resolvedMod.path, existing);
      }
    }
  }

  // 4. Build structured text
  const sections: string[] = [];
  sections.push("## Codebase Context\n");

  // Changed files section
  if (changedModules.length > 0) {
    sections.push("### Değişen Dosyalar");
    for (const mod of changedModules) {
      const exportsStr = mod.exports.length > 0
        ? mod.exports.join(", ")
        : "(export yok)";
      const consumers = consumerMap.get(mod.path);
      let line = `- \`${mod.path}\`: ${exportsStr} export eder`;
      if (mod.summary) {
        line += ` — ${mod.summary}`;
      }
      sections.push(line);
      if (consumers && consumers.length > 0) {
        sections.push(`  - Import eden dosyalar: ${consumers.map(c => `\`${c}\``).join(", ")}`);
      }
    }
    sections.push("");
  }

  // Dependencies section
  const depModules = Array.from(dependencyPaths)
    .map((p) => moduleMap.get(p))
    .filter((m): m is ModuleInfo => m !== undefined);

  if (depModules.length > 0) {
    sections.push("### Bağımlılıklar (Değişen Dosyaların Import Ettikleri)");
    for (const mod of depModules) {
      const exportsStr = mod.exports.length > 0
        ? mod.exports.join(", ")
        : "(export yok)";
      let line = `- \`${mod.path}\`: ${exportsStr}`;
      if (mod.summary) {
        line += ` — ${mod.summary}`;
      }
      sections.push(line);
    }
    sections.push("");
  }

  // Consumers section (files NOT changed but importing changed files)
  const allConsumers = new Set<string>();
  for (const consumers of consumerMap.values()) {
    for (const c of consumers) {
      if (!dependencyPaths.has(c)) {
        allConsumers.add(c);
      }
    }
  }

  const consumerModules = Array.from(allConsumers)
    .map((p) => moduleMap.get(p))
    .filter((m): m is ModuleInfo => m !== undefined);

  if (consumerModules.length > 0) {
    sections.push("### Etkilenen Tüketiciler (Bu Dosyaları Kullanan Modüller)");
    for (const mod of consumerModules) {
      const exportsStr = mod.exports.length > 0
        ? mod.exports.join(", ")
        : "(export yok)";
      let line = `- \`${mod.path}\`: ${exportsStr}`;
      if (mod.summary) {
        line += ` — ${mod.summary}`;
      }
      sections.push(line);
    }
    sections.push("");
  }

  // Repo structure overview (top-level dirs)
  const topDirs = getTopLevelStructure(index.tree);
  if (topDirs.length > 0) {
    sections.push("### Repo Yapısı (Özet)");
    sections.push(topDirs.join("\n"));
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Try to find a module in the map by path, handling cases where
 * the import path may not have an extension.
 */
function findModule(
  moduleMap: Map<string, ModuleInfo>,
  importPath: string
): ModuleInfo | undefined {
  // Direct match
  if (moduleMap.has(importPath)) return moduleMap.get(importPath);

  // Try with common extensions
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".py"];
  for (const ext of extensions) {
    const withExt = importPath + ext;
    if (moduleMap.has(withExt)) return moduleMap.get(withExt);
  }

  // Try /index variants
  for (const ext of extensions) {
    const indexPath = importPath + "/index" + ext;
    if (moduleMap.has(indexPath)) return moduleMap.get(indexPath);
  }

  // Handle @/ alias (common in Next.js)
  if (importPath.startsWith("@/")) {
    const stripped = importPath.slice(2);
    return findModule(moduleMap, stripped);
  }

  return undefined;
}

/**
 * Build a compact top-level directory structure from file tree.
 */
function getTopLevelStructure(tree: string[]): string[] {
  const dirCounts = new Map<string, number>();

  for (const path of tree) {
    const topDir = path.split("/")[0];
    if (topDir.includes(".")) continue; // skip root-level files
    dirCounts.set(topDir, (dirCounts.get(topDir) || 0) + 1);
  }

  return Array.from(dirCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dir, count]) => `- \`${dir}/\` (${count} dosya)`);
}
