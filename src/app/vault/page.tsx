"use client";

import { useWeb3Auth } from "@/hooks/useWeb3Auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useCrypto, deriveKey } from "@/hooks/useCrypto";

export default function VaultPage() {
  const { address, logout } = useWeb3Auth();
  const router = useRouter();
  
  // Auth state
  const [masterPassword, setMasterPassword] = useState("");
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  
  // Data state (Mocked locally since Firebase credentials require user input)
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [decryptedKey, setDecryptedKey] = useState<number | null>(null);
  const [decryptedValue, setDecryptedValue] = useState("");
  
  const { encrypt, decrypt } = useCrypto();

  useEffect(() => {
    if (address === null) {
      router.push("/");
    }
  }, [address, router]);

  const handleUnlock = async () => {
    if (!masterPassword || !address) return;
    // Derive AES-GCM symmetric key via PBKDF2 using ETH address as salt
    const key = await deriveKey(masterPassword, address);
    setCryptoKey(key);
  };

  const handleEncryptAdd = async () => {
    if (!cryptoKey || !newItem) return;
    try {
      const encrypted = await encrypt(cryptoKey, newItem);
      setItems((prev) => [...prev, encrypted]);
      setNewItem("");
    } catch (e) {
      console.error("Encryption failed", e);
    }
  };

  const attemptDecrypt = async (index: number, blob: string) => {
    if (!cryptoKey) return;
    try {
      const result = await decrypt(cryptoKey, blob);
      setDecryptedKey(index);
      setDecryptedValue(result);
      
      // Auto-hide after 3 seconds for security UX
      setTimeout(() => {
        setDecryptedKey(null);
        setDecryptedValue("");
      }, 3000);
    } catch (e) {
      console.error("Decryption failed. Invalid Master Password?", e);
      alert("Decryption failed. Compromised integrity or wrong key.");
    }
  };

  if (address === null) return null; // Prevent hydration flash

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 mt-12 pb-20">
      <header className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-medium">Vault</h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <Button onClick={logout} className="text-xs">Disconnect</Button>
      </header>

      {!cryptoKey ? (
        <Card className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Please enter your Master Password. This never leaves your device and is used to derive the local <span className="font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded">AES-256-GCM</span> symmetric key.
          </p>
          <div className="flex gap-2">
            <Input 
              type="password" 
              value={masterPassword} 
              onChange={(e) => setMasterPassword(e.target.value)} 
              placeholder="Master Password"
            />
            <Button onClick={handleUnlock}>Unlock</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-10">
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-slate-500">Add Entry</h2>
            <Card className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input 
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)} 
                  placeholder="Data to encrypt (e.g. API keys, config secrets)"
                />
                <Button onClick={handleEncryptAdd}>Encrypt</Button>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-slate-500">Secure Blobs</h2>
              <span className="text-xs text-slate-600">{items.length} records</span>
            </div>
            
            {items.length === 0 ? (
              <p className="text-sm text-slate-600 py-4 border-t border-slate-800">No items in your vault.</p>
            ) : items.map((encryptedValue, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 border border-slate-800 transition-colors hover:border-slate-700 group cursor-pointer" onClick={() => attemptDecrypt(i, encryptedValue)}>
                <div className="flex justify-between items-center text-slate-500 group-hover:text-slate-400 transition-colors">
                  <span className="text-xs font-medium">Record #{i + 1}</span>
                  <span className="text-[10px] uppercase tracking-wider">Click to decrypt</span>
                </div>
                
                {decryptedKey === i ? (
                  <div className="text-sm font-mono text-white pt-2 border-t border-slate-800/50 mt-1">
                    {decryptedValue}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-600 break-all leading-relaxed whitespace-pre-wrap">
                    {encryptedValue}
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
