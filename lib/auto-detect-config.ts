import type { ImpactMapConfig } from "@/lib/core/types";

export function detectConfigFromTree(filePaths: string[]): ImpactMapConfig {
  const features: ImpactMapConfig["features"] = {};
  const services: ImpactMapConfig["services"] = {};
  const pages: ImpactMapConfig["pages"] = {};

  // Page detection: app/**/page.tsx
  for (const fp of filePaths) {
    const pageMatch = fp.match(/^app\/(.+)\/page\.(tsx|ts|jsx|js)$/);
    if (pageMatch) {
      const route = pageMatch[1]
        .replace(/\[\.\.\..*?\]/g, "*")
        .replace(/\[.*?\]/g, ":param");
      const name = route.split("/").pop() || route;
      pages[name] = [`app/${pageMatch[1]}/**`];
    }
  }

  // Service detection: app/api/** routes
  for (const fp of filePaths) {
    const apiMatch = fp.match(/^app\/api\/([^/]+)/);
    if (apiMatch) {
      const serviceName = apiMatch[1];
      if (!services[serviceName]) {
        services[serviceName] = [`app/api/${serviceName}/**`];
      }
    }
  }

  // Feature detection: group files in components/, lib/, src/ by top-level directory
  const featureDirs = new Map<string, string[]>();
  for (const fp of filePaths) {
    const featureMatch = fp.match(/^(components|lib|src)\/([^/]+)/);
    if (featureMatch) {
      const dir = featureMatch[2];
      // Skip files directly in root (non-directory grouping)
      if (fp.split("/").length > 2) {
        const key = `${featureMatch[1]}/${dir}`;
        if (!featureDirs.has(key)) {
          featureDirs.set(key, []);
        }
        featureDirs.get(key)!.push(fp);
      }
    }
  }

  for (const [dirPath, files] of featureDirs) {
    const name = dirPath.split("/").pop()!;
    if (!features[name]) {
      features[name] = {
        description: `${name} modulu`,
        paths: [`${dirPath}/**`],
      };
    }
  }

  // Also detect standalone component files as features
  for (const fp of filePaths) {
    const componentMatch = fp.match(/^components\/([^/]+)\.(tsx|ts|jsx|js)$/);
    if (componentMatch) {
      const name = componentMatch[1].replace(/\.(tsx|ts|jsx|js)$/, "");
      if (!features[name]) {
        features[name] = {
          description: `${name} bileseni`,
          paths: [fp],
        };
      }
    }
  }

  const ignorePatterns = [
    "**/*.test.*",
    "**/*.spec.*",
    "**/*.md",
    "**/node_modules/**",
  ];

  return { features, services, pages, ignorePatterns };
}
