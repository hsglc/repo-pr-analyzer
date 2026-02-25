import { AsyncLocalStorage } from "node:async_hooks";

interface RequestStore {
  authToken: string | null;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function setAuthToken(token: string | null) {
  const store = requestContext.getStore();
  if (store) {
    store.authToken = token;
  }
}

export function getAuthToken(): string | null {
  return requestContext.getStore()?.authToken ?? null;
}
