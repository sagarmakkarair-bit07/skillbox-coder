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

export interface VaultItem {
  id: string;
  name: string;
  encryptedBlob: string;
  createdAt?: string;
}

export default function VaultPage() {
  const { user, logout } = useFirebaseAuth();
  const router = useRouter();
  
  const [masterPassword, setMasterPassword] = useState("");
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const [entryName, setEntryName] = useState("");
  const [entryUsername, setEntryUsername] = useState("");
  const [entryPassword, setEntryPassword] = useState("");
  const [customFields, setCustomFields] = useState<{ id: string; key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [revealedData, setRevealedData] = useState<{
    username?: string;
    password?: string;
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
    setCryptoKey(await deriveKey(masterPassword, user.uid));
  };

  const handleSave = async () => {
    if (!cryptoKey || !entryName || !user?.uid) return;
    setSaving(true);
    try {
      const blob = await encrypt(cryptoKey, JSON.stringify({
        username: entryUsername,
        password: entryPassword,
        customFields: customFields.map(f => ({ key: f.key, value: f.value })),
      }));
      await addDoc(collection(db, "users", user.uid, "vaultItems"), {
        name: entryName, encryptedBlob: blob, createdAt: new Date().toISOString(),
      });
      setEntryName(""); setEntryUsername(""); setEntryPassword(""); setCustomFields([]);
      setShowForm(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, "users", user.uid, "vaultItems", id));
  };

  const toggleReveal = async (id: string, blob: string) => {
    if (revealedId === id) { setRevealedId(null); setRevealedData(null); return; }
    if (!cryptoKey) return;
    try {
      const raw = await decrypt(cryptoKey, blob);
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { payload: raw }; }
      setRevealedId(id); setRevealedData(parsed);
      setTimeout(() => { setRevealedId(null); setRevealedData(null); }, 15000);
    } catch {
      alert("Decryption failed. Wrong master password?");
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
      <div className="w-full max-w-xs space-y-5">
        <div className="space-y-1">
          <h1 className="text-base font-medium">Unlock Vault</h1>
          <p className="text-xs text-neutral-500 font-mono">{user.email}</p>
        </div>
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
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-50">
        <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Vault</span>
            <span className="text-xs text-neutral-600 font-mono">{user.email}</span>
          </div>
          <Button onClick={async () => { await logout(); router.push('/'); }} variant="ghost">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {/* Add button / form */}
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
              <Input
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                placeholder="Name"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={entryUsername}
                  onChange={(e) => setEntryUsername(e.target.value)}
                  placeholder="Username"
                />
                <Input
                  type="password"
                  value={entryPassword}
                  onChange={(e) => setEntryPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>

              {/* Custom fields */}
              {customFields.length > 0 && (
                <div className="space-y-2 pt-1">
                  {customFields.map((f) => (
                    <div key={f.id} className="flex gap-2">
                      <Input
                        placeholder="Label"
                        value={f.key}
                        onChange={(e) => setCustomFields(prev => prev.map(x => x.id === f.id ? { ...x, key: e.target.value } : x))}
                        className="w-1/3"
                      />
                      <Input
                        placeholder="Value"
                        type="password"
                        value={f.value}
                        onChange={(e) => setCustomFields(prev => prev.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
                      />
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

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <Button onClick={handleSave} variant="primary" disabled={!entryName || saving}>
                {saving ? "Saving…" : "Encrypt & Save"}
              </Button>
            </div>
          </Card>
        )}

        {/* Items list */}
        <div className="space-y-px">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-neutral-600 uppercase tracking-wider">Entries</span>
            <span className="text-xs text-neutral-700">{items.length}</span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-neutral-600 py-6">No entries yet.</p>
          ) : (
            <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)]">
              {items.map((item) => (
                <div key={item.id} className="bg-[var(--surface)]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => toggleReveal(item.id, item.encryptedBlob)}
                    >
                      <span className="text-[13px] font-medium text-neutral-200">{item.name}</span>
                      {item.createdAt && (
                        <span className="text-[11px] text-neutral-700 ml-3 font-mono">
                          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        onClick={() => toggleReveal(item.id, item.encryptedBlob)}
                        variant="ghost"
                      >
                        {revealedId === item.id ? "Hide" : "Reveal"}
                      </Button>
                      <Button onClick={() => handleDelete(item.id)} variant="danger">Delete</Button>
                    </div>
                  </div>

                  {revealedId === item.id && revealedData && (
                    <div className="px-4 pb-3 space-y-1.5 border-t border-[var(--border)] pt-3">
                      {revealedData.username && (
                        <div className="flex gap-6 text-[13px]">
                          <span className="text-neutral-600 w-20 shrink-0">username</span>
                          <span className="text-emerald-400 font-mono break-all">{revealedData.username}</span>
                        </div>
                      )}
                      {revealedData.password && (
                        <div className="flex gap-6 text-[13px]">
                          <span className="text-neutral-600 w-20 shrink-0">password</span>
                          <span className="text-emerald-400 font-mono break-all">{revealedData.password}</span>
                        </div>
                      )}
                      {revealedData.customFields?.map((f, i) => (
                        <div key={i} className="flex gap-6 text-[13px]">
                          <span className="text-neutral-600 w-20 shrink-0 truncate">{f.key || 'field'}</span>
                          <span className="text-emerald-400 font-mono break-all">{f.value}</span>
                        </div>
                      ))}
                      {revealedData.payload && (
                        <div className="text-[13px] text-amber-400 font-mono break-all">{revealedData.payload}</div>
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
