import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
}

export const Button = ({ children, className = '', variant = 'default', ...props }: ButtonProps) => {
  const styles: Record<string, string> = {
    default: 'border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-hover)] hover:text-[var(--fg)]',
    primary: 'bg-white text-black hover:bg-neutral-200',
    ghost: 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
    danger: 'text-red-500 hover:text-red-400',
  };

  return (
    <button
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
