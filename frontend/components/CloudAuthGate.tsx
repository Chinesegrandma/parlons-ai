"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Studio } from "./Studio";
import {
  accessToken,
  changePassword,
  clearBrowserLearningData,
  loadCloudConfig,
  requestPasswordReset,
  restoreCloudSession,
  signIn,
  signOut,
  signUp,
  type CloudConfig,
  type CloudSession,
} from "../lib/cloud-auth";

type FormMode = "login" | "signup" | "forgot";

export function CloudAuthGate() {
  const [config, setConfig] = useState<CloudConfig | null>(null);
  const [account, setAccount] = useState<CloudSession | null>(null);
  const [mode, setMode] = useState<FormMode>("login");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const next = await loadCloudConfig();
        if (!alive) return;
        setConfig(next);
        if (next.enabled) {
          const restored = await restoreCloudSession();
          if (alive) {
            setAccount(restored.session);
            setRecovery(restored.recovering);
          }
        }
      } catch (cause) {
        if (alive)
          setError(cause instanceof Error ? cause.message : "Unable to load app");
      }
    }
    void init();
    return () => {
      alive = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setNotice("请检查邮箱里的密码重置链接 / Check your email for a reset link.");
      } else if (mode === "signup") {
        const immediatelySignedIn = await signUp(email, password);
        if (immediatelySignedIn) {
          setAccount((await restoreCloudSession()).session);
        } else {
          setNotice("注册成功！请打开邮箱验证后再登录。 / Check your email to confirm your account.");
        }
      } else {
        setAccount(await signIn(email, password));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await changePassword(password);
      setRecovery(false);
      setPassword("");
      setNotice("密码已更新 / Password updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await signOut();
    // Never expose locally cached practice text to the next account on this browser.
    clearBrowserLearningData();
    setAccount(null);
    setRecovery(false);
    setNotice("");
    setBusy(false);
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "永久删除账号、全部对话和学习记录？此操作不可恢复。\nPermanently delete your account and practice data?",
      )
    ) return;
    setBusy(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw Error("Session expired. Please sign in again.");
      const response = await fetch("/api/backend/me/account", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { detail?: string };
        throw Error(result.detail || "Account deletion failed");
      }
      await signOut();
      clearBrowserLearningData();
      setAccount(null);
      setNotice("账号已删除 / Account deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete account");
    } finally {
      setBusy(false);
    }
  }

  if (!config && !error)
    return <main className="cloud-auth-page"><p>正在连接 Parlons AI…</p></main>;

  if (config && !config.enabled) return <Studio />;

  if (account && !recovery)
    return (
      <>
        <Studio key={account.user?.id || account.access_token.slice(0, 20)} userId={account.user?.id} />
        <details className="cloud-account-menu">
          <summary>我的账号 / Account</summary>
          <div className="cloud-account-content">
            <p>{account.user?.email || "Parlons AI Beta"}</p>
            {error && <p role="alert">{error}</p>}
            <button disabled={busy} onClick={() => void logout()}>退出账号 / Sign out</button>
            <button disabled={busy} className="cloud-danger" onClick={() => void deleteAccount()}>
              删除账号及数据 / Delete account and data
            </button>
            <a href="/privacy" target="_blank" rel="noreferrer">隐私政策 / Privacy</a>
          </div>
        </details>
      </>
    );

  return (
    <main className="cloud-auth-page">
      <section className="cloud-auth-panel">
        <div className="cloud-auth-logo">parlons<span>.</span></div>
        <p className="cloud-auth-eyebrow">FRENCH SPEAKING PRACTICE · PUBLIC BETA</p>
        <h1>
          {recovery
            ? "设置新密码 / Set a new password"
            : mode === "signup"
              ? "创建账号 / Create an account"
              : mode === "forgot"
                ? "重置密码 / Reset password"
                : "练习真正的法语 / Parlez français"}
        </h1>
        <p className="cloud-auth-subtitle">
          开口练习、纠正表达、收藏错误。你的对话由独立账号保护。
        </p>
        {error && <p role="alert" className="cloud-auth-error">{error}</p>}
        {notice && <p role="status" className="cloud-auth-notice">{notice}</p>}
        <form onSubmit={recovery ? (event) => void updatePassword(event) : (event) => void submit(event)}>
          {!recovery && (
            <label>
              邮箱 / Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          {mode !== "forgot" || recovery ? (
            <label>
              密码 / Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete={recovery ? "new-password" : mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          ) : null}
          <button type="submit" disabled={busy}>
            {busy ? "请稍候…" : recovery ? "保存新密码" : mode === "signup" ? "注册" : mode === "forgot" ? "发送重置邮件" : "登录"}
          </button>
        </form>
        {!recovery && (
          <nav className="cloud-auth-switch" aria-label="Account options">
            <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setNotice(""); }}>
              {mode === "signup" ? "已有账号？登录" : "没有账号？注册"}
            </button>
            <button onClick={() => { setMode(mode === "forgot" ? "login" : "forgot"); setError(""); setNotice(""); }}>
              {mode === "forgot" ? "返回登录" : "忘记密码？"}
            </button>
          </nav>
        )}
        <p className="cloud-auth-footer">
          继续使用即表示已阅读 <a href="/privacy" target="_blank" rel="noreferrer">隐私说明</a>。
          Beta 期间请勿输入敏感个人信息。
        </p>
      </section>
    </main>
  );
}
