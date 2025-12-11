import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-cyan-400 text-xs font-bold uppercase tracking-wider ml-1">{label}</label>
      <input
        className={`bg-slate-900/80 border border-slate-700 text-white px-4 py-3 rounded-md outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all duration-300 placeholder-slate-500 ${className}`}
        {...props}
      />
    </div>
  );
};