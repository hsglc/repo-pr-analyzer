import { requestContext, setAuthToken } from "./request-context";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_CONFIG_ID!;

export function withRequestContext<T>(fn: () => Promise<T>): Promise<T> {
  return requestContext.run({ authToken: null }, fn);
}

export async function verifyAuth(
  request: Request
): Promise<{ uid: string; email: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.substring(7);

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const user = data.users?.[0];
    if (!user) return null;

    // Store token for RTDB requests
    setAuthToken(idToken);

    return { uid: user.localId, email: user.email || "" };
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}
