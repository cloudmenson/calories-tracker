import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "h-11 w-full rounded-xl border border-gray-200 dark:border-[#27273a] bg-gray-50 dark:bg-[#1e1e2c] px-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600",
            "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white dark:focus:bg-[#252538]",
            "transition-all duration-200",
            icon && "pl-10",
            error && "border-red-400 focus:ring-red-400",
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  ),
);
Input.displayName = "Input";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-gray-200 dark:border-[#27273a] bg-gray-50 dark:bg-[#1e1e2c] px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600",
          "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white dark:focus:bg-[#252538]",
          "transition-all duration-200 resize-none",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  ),
);
TextArea.displayName = "TextArea";
