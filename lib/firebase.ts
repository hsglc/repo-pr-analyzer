const DATABASE_URL = process.env.FIREBASE_DATABASE_URL!;
const DATABASE_SECRET = process.env.FIREBASE_DATABASE_SECRET || "";

function buildUrl(path: string): string {
  const base = `${DATABASE_URL}/${path}.json`;
  return DATABASE_SECRET ? `${base}?auth=${DATABASE_SECRET}` : base;
}

export async function dbGet<T = unknown>(path: string): Promise<T | null> {
  const res = await fetch(buildUrl(path));
  if (!res.ok) throw new Error(`Firebase GET failed: ${res.statusText}`);
  const data = await res.json();
  return data as T | null;
}

export async function dbSet(path: string, data: unknown): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PUT failed: ${res.statusText}`);
}

export async function dbUpdate(path: string, data: unknown): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PATCH failed: ${res.statusText}`);
}

export async function dbPush(path: string, data: unknown): Promise<string> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase POST failed: ${res.statusText}`);
  const result = await res.json();
  return result.name as string;
}

// RTDB key'lerinde . $ # [ ] / kullanılamaz, email'i key-safe hale getir
export function emailToKey(email: string): string {
  return email
    .replace(/\./g, ",")
    .replace(/@/g, "__")
    .replace(/\$/g, "_D_")
    .replace(/#/g, "_H_")
    .replace(/\[/g, "_LB_")
    .replace(/\]/g, "_RB_");
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
