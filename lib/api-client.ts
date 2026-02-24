import { auth } from "@/lib/firebase-client";

export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Oturum açılmamış");

  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
