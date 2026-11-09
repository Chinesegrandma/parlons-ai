"use client";

/**
 * Minimal Supabase Auth REST client.
 * The publishable key is public; never use a Supabase service-role key in the browser.
 */
export type CloudConfig =
  | { enabled: false }
  | { enabled: true; url: string; publishable_key: string };

export type CloudSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user?: { id?: string; email?: string };
};

const STORAGE = "parlons-cloud-auth";
let configuration: CloudConfig | null = null;
let pendingRefresh: Promise<CloudSession | null> | null = null;

function stored(): CloudSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (
      value &&
      typeof value.access_token === "string" &&
      typeof value.refresh_token === "string" &&
      typeof value.expires_at === "number"
    )
      return value as CloudSession;
  } catch {
    /* Broken or blocked storage signs the user out. */
  }
  return null;
}

function save(value: CloudSession | null) {
  try {
    if (value) localStorage.setItem(STORAGE, JSON.stringify(value));
    else localStorage.removeItem(STORAGE);
  } catch {
    /* Access token still works in memory until the page is refreshed. */
  }
  inMemory = value;
}

let inMemory: CloudSession | null = null;
const session = () => inMemory || stored();

export async function loadCloudConfig(): Promise<CloudConfig> {
  const response = await fetch("/api/backend/auth/config", { cache: "no-store" });
  if (!response.ok) throw Error("无法读取登录配置 / Unable to load auth settings");
  const raw = (await response.json()) as CloudConfig;
  if (
    raw.enabled &&
    (!raw.url?.startsWith("https://") || !raw.publishable_key)
  )
    throw Error("Cloud authentication is misconfigured");
  configuration = raw;
  return raw;
}

function activeConfig(): Extract<CloudConfig, { enabled: true }> {
  if (!configuration?.enabled) throw Error("Cloud login is not enabled");
  return configuration;
}

async function authRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const config = activeConfig();
  const response = await fetch(config.url + "/auth/v1" + path, {
    method: options.method || "POST",
    headers: {
      apikey: config.publishable_key,
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok)
    throw Error(
      String(result.msg || result.error_description || result.message || "Authentication failed").slice(0, 300),
    );
  return result as T;
}

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
};

function accept(response: AuthResponse): CloudSession {
  if (!response.access_token || !response.refresh_token)
    throw Error("Check your email to confirm your account before signing in.");
  const value: CloudSession = {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: Date.now() + (response.expires_in || 3600) * 1000,
    user: response.user,
  };
  save(value);
  return value;
}

export async function signIn(email: string, password: string): Promise<CloudSession> {
  return accept(
    await authRequest<AuthResponse>("/token?grant_type=password", {
      body: { email, password },
    }),
  );
}

export async function signUp(email: string, password: string): Promise<boolean> {
  const response = await authRequest<AuthResponse>("/signup", {
    body: { email, password },
  });
  if (response.access_token && response.refresh_token) {
    accept(response);
    return true;
  }
  return false;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await authRequest("/recover?redirect_to=" + encodeURIComponent(window.location.origin), {
    body: { email },
  });
}

export async function changePassword(password: string): Promise<void> {
  const token = await accessToken();
  if (!token) throw Error("Session expired. Please sign in again.");
  await authRequest("/user", {
    method: "PUT",
    token,
    body: { password },
  });
}

export async function refresh(): Promise<CloudSession | null> {
  if (pendingRefresh) return pendingRefresh;
  const old = session();
  if (!old) return null;
  pendingRefresh = (async () => {
    try {
      return accept(
        await authRequest<AuthResponse>("/token?grant_type=refresh_token", {
          body: { refresh_token: old.refresh_token },
        }),
      );
    } catch {
      save(null);
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
}

export async function accessToken(): Promise<string | null> {
  if (!configuration?.enabled) return null;
  const current = session();
  if (!current) return null;
  if (current.expires_at < Date.now() + 60_000)
    return (await refresh())?.access_token || null;
  return current.access_token;
}

async function withUser(value: CloudSession): Promise<CloudSession> {
  if (value.user?.id) return value;
  const user = await authRequest<{ id: string; email?: string }>("/user", {
    method: "GET",
    token: value.access_token,
  });
  const complete = { ...value, user: { id: user.id, email: user.email } };
  save(complete);
  return complete;
}

export async function restoreCloudSession(): Promise<{
  session: CloudSession | null;
  recovering: boolean;
}> {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const recovering = params.get("type") === "recovery";
  if (token && refreshToken) {
    const result = accept({
      access_token: token,
      refresh_token: refreshToken,
      expires_in: Number(params.get("expires_in") || 3600),
    });
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return { session: await withUser(result), recovering };
  }
  const current = session();
  if (!current) return { session: null, recovering: false };
  const valid = await accessToken();
  return { session: valid ? await withUser(session()!) : null, recovering: false };
}

export async function signOut(): Promise<void> {
  const current = session();
  save(null);
  if (current) {
    try {
      await authRequest("/logout", { token: current.access_token });
    } catch {
      /* Even if remote logout fails, locally stored credentials are removed. */
    }
  }
}

export function clearBrowserLearningData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("parlons-learning") || key.startsWith("parlons-session"))
        localStorage.removeItem(key);
    }
    localStorage.removeItem("parlons-guessing-words");
  } catch {
    /* Storage may have been blocked by browser privacy settings. */
  }
}
