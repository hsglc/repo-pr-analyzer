import type { CodebaseIndex, ModuleInfo } from "./codebase-indexer";

/**
 * Converts a full CodebaseIndex into a structured text context for the chat system prompt.
 * Unlike context-retriever.ts which is diff-based, this provides a complete overview.
 */
export function buildChatContext(index: CodebaseIndex): string {
  const sections: string[] = [];

  sections.push(`# Repo: ${index.repoFullName}`);
  sections.push(`Commit: ${index.commitSha.substring(0, 7)}\n`);

  // Directory structure summary
  const dirStructure = getDirectoryStructure(index.tree);
  if (dirStructure.length > 0) {
    sections.push("## Dizin Yapısı");
    sections.push(dirStructure.join("\n"));
    sections.push("");
  }

  // Modules overview
  if (index.modules.length > 0) {
    sections.push("## Modüller");
    for (const mod of index.modules) {
      sections.push(formatModule(mod));
    }
    sections.push("");
  }

  // Dependency graph summary
  const depGraph = buildDependencyGraph(index.modules);
  if (depGraph.length > 0) {
    sections.push("## Bağımlılık Grafi");
    sections.push(depGraph.join("\n"));
    sections.push("");
  }

  return sections.join("\n");
}

function formatModule(mod: ModuleInfo): string {
  const parts: string[] = [`### \`${mod.path}\``];

  if (mod.summary) {
    parts.push(mod.summary);
  }

  if (mod.exports.length > 0) {
    parts.push(`- Exports: ${mod.exports.join(", ")}`);
  }

  if (mod.imports.length > 0) {
    parts.push(`- Imports: ${mod.imports.join(", ")}`);
  }

  if (mod.content) {
    parts.push(`\n\`\`\`${mod.language}\n${mod.content}\n\`\`\``);
  }

  return parts.join("\n");
}

function getDirectoryStructure(tree: string[]): string[] {
  const dirCounts = new Map<string, number>();

  for (const path of tree) {
    const parts = path.split("/");
    if (parts.length === 1) continue; // root-level files

    // Count top-level and second-level dirs
    const topDir = parts[0];
    dirCounts.set(topDir, (dirCounts.get(topDir) || 0) + 1);

    if (parts.length > 2) {
      const secondLevel = `${parts[0]}/${parts[1]}`;
      dirCounts.set(secondLevel, (dirCounts.get(secondLevel) || 0) + 1);
    }
  }

  // Show top-level dirs with counts, and important second-level dirs
  const topDirs = new Map<string, number>();
  const subDirs = new Map<string, number>();

  for (const [dir, count] of dirCounts) {
    if (dir.includes("/")) {
      subDirs.set(dir, count);
    } else {
      topDirs.set(dir, count);
    }
  }

  const lines: string[] = [];
  const sortedTop = Array.from(topDirs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  for (const [dir, count] of sortedTop) {
    lines.push(`- \`${dir}/\` (${count} dosya)`);

    // Show sub-dirs for important directories
    const subs = Array.from(subDirs.entries())
      .filter(([d]) => d.startsWith(dir + "/"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [subDir, subCount] of subs) {
      const relative = subDir.split("/").slice(1).join("/");
      lines.push(`  - \`${relative}/\` (${subCount} dosya)`);
    }
  }

  return lines;
}

function buildDependencyGraph(modules: ModuleInfo[]): string[] {
  // Find most-imported modules (hubs)
  const importCount = new Map<string, number>();

  for (const mod of modules) {
    for (const imp of mod.imports) {
      importCount.set(imp, (importCount.get(imp) || 0) + 1);
    }
  }

  const hubs = Array.from(importCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (hubs.length === 0) return [];

  return hubs.map(
    ([path, count]) => `- \`${path}\` — ${count} modül tarafından import ediliyor`
  );
}
