import React, { InputHTMLAttributes } from 'react';

export const Input = ({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={`w-full bg-transparent border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--fg)] placeholder-neutral-600 focus:outline-none focus:border-[var(--border-hover)] transition-colors ${className}`}
      {...props}
    />
  );
};
