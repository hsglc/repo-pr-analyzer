const DATABASE_URL = process.env.FIREBASE_DATABASE_URL!;

function buildUrl(path: string): string {
  return `${DATABASE_URL}/${path}.json`;
}

export async function dbGet<T = unknown>(path: string): Promise<T | null> {
  const res = await fetch(buildUrl(path));
  if (!res.ok) {
    console.error(`Firebase GET failed: ${res.status} ${res.statusText} for path: ${path}`);
    throw new Error(`Firebase GET failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data as T | null;
}

export async function dbSet(path: string, data: unknown): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`Firebase PUT failed: ${res.status} ${res.statusText} for path: ${path}`);
    throw new Error(`Firebase PUT failed: ${res.statusText}`);
  }
}

export async function dbUpdate(path: string, data: unknown): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`Firebase PATCH failed: ${res.status} ${res.statusText} for path: ${path}`);
    throw new Error(`Firebase PATCH failed: ${res.statusText}`);
  }
}

export async function dbPush(path: string, data: unknown): Promise<string> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`Firebase POST failed: ${res.status} ${res.statusText} for path: ${path}`);
    throw new Error(`Firebase POST failed: ${res.statusText}`);
  }
  const result = await res.json();
  return result.name as string;
}

// repo full name'i (owner/repo) key-safe hale getir
export function repoToKey(fullName: string): string {
  return fullName
    .replace(/\//g, "___")
    .replace(/\./g, ",")
    .replace(/\$/g, "_D_")
    .replace(/#/g, "_H_")
    .replace(/\[/g, "_LB_")
    .replace(/\]/g, "_RB_");
}
