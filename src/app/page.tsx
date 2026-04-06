"use client";

import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Home() {
  const { user, login, register, isAuthenticating, error } = useFirebaseAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      router.push('/vault');
    }
  }, [user, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register(email, password);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="space-y-1">
          <h1 className="text-base font-medium">SecureVault</h1>
          <p className="text-xs text-neutral-500">Sign in to access your vault.</p>
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <form className="space-y-3" onSubmit={handleLogin}>
          <Input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isAuthenticating} variant="primary" className="flex-1">
              Sign In
            </Button>
            <Button type="button" onClick={handleRegister} disabled={isAuthenticating} className="flex-1">
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
