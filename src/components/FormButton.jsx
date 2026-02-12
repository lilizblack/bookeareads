import React from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

/**
 * Enhanced Form Button Component
 * Mobile-first, touch-optimized button with soft UI design
 * 
 * @param {string} variant - Button variant (primary, secondary, outline, danger)
 * @param {string} size - Button size (sm, md, lg)
 * @param {boolean} loading - Whether button is in loading state
 * @param {boolean} disabled - Whether button is disabled
 * @param {string} type - Button type (button, submit, reset)
 * @param {function} onClick - Click handler
 * @param {node} children - Button content
 * @param {object} icon - Icon component to display (optional)
 * @param {string} className - Additional CSS classes
 */
const FormButton = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    requireOnline = false,
    type = 'button',
    onClick,
    children,
    icon: Icon = null,
    className = '',
    ...props
}) => {
    const isOffline = useOffline();
    const isDisabled = disabled || loading || (requireOnline && isOffline);

    // Variant styles
    const variantStyles = {
        primary: `
            bg-gradient-to-r from-violet-600 to-violet-500
            dark:from-violet-500 dark:to-violet-400
            text-white
            shadow-soft-md shadow-violet-500/30
            hover:shadow-soft-lg hover:shadow-violet-500/40
            hover:from-violet-700 hover:to-violet-600
            dark:hover:from-violet-600 dark:hover:to-violet-500
            active:scale-95
        `,
        secondary: `
            bg-slate-100 dark:bg-slate-800
            text-slate-700 dark:text-slate-200
            border-2 border-slate-200 dark:border-slate-700
            shadow-soft-sm
            hover:bg-slate-200 dark:hover:bg-slate-700
            hover:border-slate-300 dark:hover:border-slate-600
            hover:shadow-soft-md
            active:scale-95
        `,
        outline: `
            bg-transparent
            text-violet-600 dark:text-violet-400
            border-2 border-violet-600 dark:border-violet-400
            hover:bg-violet-50 dark:hover:bg-violet-900/20
            hover:border-violet-700 dark:hover:border-violet-300
            active:scale-95
        `,
        danger: `
            bg-gradient-to-r from-red-600 to-red-500
            dark:from-red-500 dark:to-red-400
            text-white
            shadow-soft-md shadow-red-500/30
            hover:shadow-soft-lg hover:shadow-red-500/40
            hover:from-red-700 hover:to-red-600
            dark:hover:from-red-600 dark:hover:to-red-500
            active:scale-95
        `,
    };

    // Size styles
    const sizeStyles = {
        sm: `
            min-h-touch px-4 py-2
            text-sm font-semibold
            rounded-lg
        `,
        md: `
            min-h-touch-comfortable px-6 py-3
            text-base font-semibold
            rounded-xl
        `,
        lg: `
            min-h-touch-large px-8 py-4
            text-lg font-bold
            rounded-xl
        `,
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`
                relative
                font-ui
                flex items-center justify-center gap-2
                transition-all duration-base
                no-select touch-feedback
                outline-none
                focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2
                dark:focus:ring-offset-slate-900
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:scale-100
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${className}
            `}
            style={{
                willChange: 'transform, box-shadow',
            }}
            {...props}
        >
            {/* Loading Spinner */}
            {loading && (
                <Loader2
                    size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
                    className="animate-spin"
                />
            )}

            {/* Icon */}
            {!loading && Icon && (
                <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
            )}

            {/* Button Text */}
            <span>{children}</span>
        </button>
    );
};

export default FormButton;
