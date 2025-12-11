import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, ...props }) => {
  const baseClasses = "px-6 py-3 rounded-md font-bold tracking-wide transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantClasses = "";
  switch(variant) {
    case 'primary':
      variantClasses = "bg-cyan-500/10 border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]";
      break;
    case 'secondary':
      variantClasses = "bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white";
      break;
    case 'danger':
      variantClasses = "bg-red-900/20 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white";
      break;
  }

  return (
    <button className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};