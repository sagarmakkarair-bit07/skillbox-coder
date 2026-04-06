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
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-xl font-medium tracking-tight">SecureVault</h1>
          <p className="text-sm text-slate-500 leading-relaxed">Identity anchored in Firebase. Zero-knowledge local encryption.</p>
        </div>

        {error && (
          <div className="border border-red-900 border-l-2 border-l-red-500 text-red-500 p-3 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-2">
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
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isAuthenticating}
              className="flex-1"
            >
              Sign In
            </Button>
            <Button 
              type="button" 
              onClick={handleRegister} 
              disabled={isAuthenticating}
              className="flex-1 bg-transparent text-slate-400 hover:text-white"
            >
              Sign Up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
