"use client";

import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useCrypto, deriveKey } from "@/hooks/useCrypto";
import { collection, onSnapshot, query, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Copy, Check, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";

export interface VaultItem {
  id: string;
  name: string;
  encryptedBlob: string;
  createdAt?: string;
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer p-1 shrink-0" title="Copy">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function MaskedValue({ value, mono = true }: { value: string; mono?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`break-all ${mono ? 'font-mono' : ''} ${visible ? 'text-neutral-200' : 'text-neutral-600'} text-[13px]`}>
        {visible ? value : '•'.repeat(Math.min(value.length, 20))}
      </span>
      <button onClick={() => setVisible(v => !v)} className="text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer p-1 shrink-0" title={visible ? "Hide" : "Show"}>
        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
      <CopyBtn value={value} />
    </div>
  );
}

export default function VaultPage() {
  const { user, logout } = useFirebaseAuth();
  const router = useRouter();

  const [masterPassword, setMasterPassword] = useState("");
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [entryName, setEntryName] = useState("");
  const [entryUsername, setEntryUsername] = useState("");
  const [entryPassword, setEntryPassword] = useState("");
  const [entryUrl, setEntryUrl] = useState("");
  const [customFields, setCustomFields] = useState<{ id: string; key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [revealedData, setRevealedData] = useState<{
    username?: string;
    password?: string;
    url?: string;
    customFields?: { key: string; value: string }[];
    payload?: string;
  } | null>(null);

  const { encrypt, decrypt } = useCrypto();

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "users", user.uid, "vaultItems"));
    const unsub = onSnapshot(q, (snap) => {
      const list: VaultItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as VaultItem));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setItems(list);
    });
    return () => unsub();
  }, [user]);

  const handleUnlock = async () => {
    if (!masterPassword || !user?.uid) return;
    setUnlockError("");
    const key = await deriveKey(masterPassword, user.uid);
    if (items.length > 0) {
      try {
        await decrypt(key, items[0].encryptedBlob);
      } catch {
        setUnlockError("Wrong master password.");
        return;
      }
    }
    setCryptoKey(key);
  };

  const handleSave = async () => {
    if (!cryptoKey || !entryName || !user?.uid) return;
    setSaving(true);
    try {
      const blob = await encrypt(cryptoKey, JSON.stringify({
        username: entryUsername,
        password: entryPassword,
        url: entryUrl,
        customFields: customFields.map(f => ({ key: f.key, value: f.value })),
      }));
      await addDoc(collection(db, "users", user.uid, "vaultItems"), {
        name: entryName, encryptedBlob: blob, createdAt: new Date().toISOString(),
      });
      setEntryName(""); setEntryUsername(""); setEntryPassword(""); setEntryUrl(""); setCustomFields([]);
      setShowForm(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, "users", user.uid, "vaultItems", id));
    if (revealedId === id) { setRevealedId(null); setRevealedData(null); }
  };

  const toggleReveal = async (id: string, blob: string) => {
    if (revealedId === id) { setRevealedId(null); setRevealedData(null); return; }
    if (!cryptoKey) return;
    try {
      const raw = await decrypt(cryptoKey, blob);
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { payload: raw }; }
      setRevealedId(id); setRevealedData(parsed);
    } catch {
      alert("Decryption failed.");
    }
  };

  // ── Not logged in
  if (!user) return (
    <div className="flex items-center justify-center min-h-screen">
      <Button onClick={() => router.push('/')} variant="primary">Sign In</Button>
    </div>
  );

  // ── Locked
  if (!cryptoKey) return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-xs space-y-4">
        <div>
          <h1 className="text-base font-medium">Unlock Vault</h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">{user.email}</p>
        </div>
        {unlockError && <p className="text-xs text-red-500">{unlockError}</p>}
        <div className="flex gap-2">
          <Input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Master Password"
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <Button onClick={handleUnlock} variant="primary">Unlock</Button>
        </div>
        <button
          onClick={async () => { await logout(); router.push('/'); }}
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  // ── Unlocked
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-50">
        <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Vault</span>
            <span className="text-xs text-neutral-600 font-mono">{user.email}</span>
          </div>
          <Button onClick={async () => { await logout(); router.push('/'); }} variant="ghost">Sign Out</Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {/* New entry form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="text-[13px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
          >
            + New entry
          </button>
        ) : (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">New entry</span>
              <Button onClick={() => setShowForm(false)} variant="ghost">Cancel</Button>
            </div>
            <div className="space-y-3">
              <Input value={entryName} onChange={(e) => setEntryName(e.target.value)} placeholder="Name (e.g. Gmail, AWS)" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={entryUsername} onChange={(e) => setEntryUsername(e.target.value)} placeholder="Username / Email" />
                <Input type="password" value={entryPassword} onChange={(e) => setEntryPassword(e.target.value)} placeholder="Password" />
              </div>
              <Input value={entryUrl} onChange={(e) => setEntryUrl(e.target.value)} placeholder="URL (optional)" />

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((f) => (
                    <div key={f.id} className="flex gap-2">
                      <Input placeholder="Label" value={f.key} onChange={(e) => setCustomFields(prev => prev.map(x => x.id === f.id ? { ...x, key: e.target.value } : x))} className="w-1/3" />
                      <Input placeholder="Value" type="password" value={f.value} onChange={(e) => setCustomFields(prev => prev.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))} />
                      <Button onClick={() => setCustomFields(prev => prev.filter(x => x.id !== f.id))} variant="danger">✕</Button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setCustomFields(prev => [...prev, { id: Math.random().toString(36).slice(2, 8), key: "", value: "" }])}
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer"
              >
                + Add field
              </button>
            </div>
            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <Button onClick={handleSave} variant="primary" disabled={!entryName || saving}>
                {saving ? "Saving…" : "Encrypt & Save"}
              </Button>
            </div>
          </Card>
        )}

        {/* Entries */}
        <div className="space-y-px">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-neutral-600 uppercase tracking-wider">Entries</span>
            <span className="text-xs text-neutral-700">{items.length}</span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-neutral-600 py-6">No entries yet.</p>
          ) : (
            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              {items.map((item, idx) => (
                <div key={item.id} className={`bg-[var(--surface)] ${idx > 0 ? 'border-t border-[var(--border)]' : ''}`}>
                  {/* Row header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => toggleReveal(item.id, item.encryptedBlob)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-neutral-200 truncate">{item.name}</span>
                        {item.createdAt && (
                          <span className="text-[11px] text-neutral-700 font-mono shrink-0">
                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {/* Preview: show username if decrypted, otherwise hint */}
                      {revealedId === item.id && revealedData?.username ? (
                        <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{revealedData.username}</p>
                      ) : (
                        <p className="text-[11px] text-neutral-700 mt-0.5">Click to reveal</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {revealedId === item.id && revealedData?.url && (
                        <a
                          href={revealedData.url.startsWith('http') ? revealedData.url : `https://${revealedData.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-600 hover:text-neutral-300 transition-colors p-1.5"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => toggleReveal(item.id, item.encryptedBlob)}
                        className={`text-[11px] px-2 py-1 rounded cursor-pointer transition-colors ${
                          revealedId === item.id
                            ? 'text-neutral-300 bg-neutral-800'
                            : 'text-neutral-600 hover:text-neutral-400'
                        }`}
                      >
                        {revealedId === item.id ? "Hide" : "Reveal"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-neutral-700 hover:text-red-500 transition-colors p-1.5 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {revealedId === item.id && revealedData && (
                    <div className="px-4 pb-4 space-y-2.5 border-t border-[var(--border)] pt-3 mx-4 mb-1">
                      {revealedData.username && (
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-[11px] text-neutral-600 uppercase tracking-wider w-16 pt-0.5 shrink-0">User</span>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-[13px] text-neutral-200 break-all flex-1">{revealedData.username}</span>
                            <CopyBtn value={revealedData.username} />
                          </div>
                        </div>
                      )}
                      {revealedData.password && (
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-[11px] text-neutral-600 uppercase tracking-wider w-16 pt-0.5 shrink-0">Pass</span>
                          <div className="flex-1"><MaskedValue value={revealedData.password} /></div>
                        </div>
                      )}
                      {revealedData.url && (
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-[11px] text-neutral-600 uppercase tracking-wider w-16 pt-0.5 shrink-0">URL</span>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <a
                              href={revealedData.url.startsWith('http') ? revealedData.url : `https://${revealedData.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] text-neutral-400 hover:text-neutral-200 break-all flex-1 transition-colors"
                            >
                              {revealedData.url}
                            </a>
                            <CopyBtn value={revealedData.url} />
                          </div>
                        </div>
                      )}
                      {revealedData.customFields?.map((f, i) => (
                        <div key={i} className="flex items-start justify-between gap-4">
                          <span className="text-[11px] text-neutral-600 uppercase tracking-wider w-16 pt-0.5 shrink-0 truncate">{f.key || 'Field'}</span>
                          <div className="flex-1"><MaskedValue value={f.value} /></div>
                        </div>
                      ))}
                      {revealedData.payload && (
                        <p className="text-[13px] text-amber-400 font-mono break-all">{revealedData.payload}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
