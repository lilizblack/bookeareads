import React, { forwardRef } from 'react';

/**
 * Enhanced Form Textarea Component
 * Mobile-first, touch-optimized textarea field with soft UI design
 * 
 * @param {string} label - Textarea label text
 * @param {string} value - Textarea value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Whether field is required
 * @param {string} error - Error message to display
 * @param {number} rows - Number of rows (default: 4)
 * @param {string} className - Additional CSS classes
 * @param {string} helperText - Helper text below textarea (optional)
 */
const FormTextarea = forwardRef(({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    error = null,
    rows = 4,
    className = '',
    helperText = null,
    ...props
}, ref) => {
    const hasError = !!error;

    return (
        <div className="w-full">
            {/* Label */}
            {label && (
                <label className="block font-ui text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex justify-between items-center">
                    <span>{label}</span>
                    {required && (
                        <span className="text-red-500 text-xs font-bold">*</span>
                    )}
                </label>
            )}

            {/* Textarea Field */}
            <textarea
                ref={ref}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                className={`
                    w-full
                    font-ui text-base
                    bg-slate-50 dark:bg-slate-800/50
                    border-2 ${hasError
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }
                    rounded-xl
                    px-4 py-3
                    text-slate-900 dark:text-white
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    outline-none
                    resize-y
                    transition-all duration-base
                    focus:border-violet-500 dark:focus:border-violet-400
                    focus:bg-white dark:focus:bg-slate-800
                    focus:shadow-soft-md focus:shadow-violet-500/10
                    hover:border-slate-300 dark:hover:border-slate-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${hasError ? 'ring-2 ring-red-500/20' : ''}
                    ${className}
                `}
                {...props}
            />

            {/* Helper Text or Error */}
            {(helperText || error) && (
                <div className="mt-2 px-1">
                    {error ? (
                        <p className="font-ui text-xs font-semibold text-red-500 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                            <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                            {error}
                        </p>
                    ) : helperText ? (
                        <p className="font-ui text-xs text-slate-500 dark:text-slate-400">
                            {helperText}
                        </p>
                    ) : null}
                </div>
            )}
        </div>
    );
});

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
