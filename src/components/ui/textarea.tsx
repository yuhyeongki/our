// src/components/ui/textarea.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  helperText?: string;
  maxLengthIndicator?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      label,
      helperText,
      maxLengthIndicator = false,
      maxLength,
      value,
      defaultValue,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const [charCount, setCharCount] = React.useState<number>(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="text-sm font-medium text-warm-900 select-none"
            >
              {label}
            </label>
            {maxLengthIndicator && maxLength && (
              <span className="text-xs text-warm-500 font-mono">
                {charCount} / {maxLength}자
              </span>
            )}
          </div>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          maxLength={maxLength}
          onChange={handleChange}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            'w-full min-h-[120px] bg-warm-50/70 border border-warm-200 rounded-2xl p-4 text-base text-warm-900 placeholder:text-warm-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:bg-white resize-y disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed',
            error &&
              'border-blush-400 focus:ring-blush-400 bg-blush-50/20 text-blush-900',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-blush-600 font-medium pl-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-warm-600 pl-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
