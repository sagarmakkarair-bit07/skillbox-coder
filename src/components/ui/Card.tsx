import React, { HTMLAttributes } from 'react';

export const Card = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`border border-slate-800 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};
