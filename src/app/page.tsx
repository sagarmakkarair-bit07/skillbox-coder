"use client";

import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const { login, isAuthenticating, error, address } = useWeb3Auth();
  const router = useRouter();

  useEffect(() => {
    if (address) {
      router.push('/vault');
    }
  }, [address, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-xl font-medium tracking-tight">SecureVault</h1>
          <p className="text-sm text-slate-500 leading-relaxed">Identity anchored in Web3. Zero-knowledge local encryption.</p>
        </div>

        {error && (
          <div className="border border-red-900 border-l-2 border-l-red-500 text-red-500 p-3 text-sm">
            {error}
          </div>
        )}

        <Button 
          onClick={login} 
          disabled={isAuthenticating}
          className="w-full"
        >
          {isAuthenticating ? "Requesting Signature..." : "Sign in with Ethereum"}
        </Button>
      </div>
    </div>
  );
}
