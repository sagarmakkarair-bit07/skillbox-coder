import React, { ButtonHTMLAttributes } from 'react';

export const Button = ({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={`px-4 py-2 border border-slate-800 text-sm font-medium transition-colors hover:bg-slate-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
