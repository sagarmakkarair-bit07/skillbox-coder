import React, { HTMLAttributes } from 'react';

export const Card = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`border border-[var(--border)] rounded-lg p-5 bg-[var(--surface)] ${className}`} {...props}>
      {children}
    </div>
  );
};
