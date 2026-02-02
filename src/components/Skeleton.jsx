import React from 'react';

/**
 * Skeleton component for loading states
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - 'text', 'rect', or 'circle'
 * @param {string} props.width - Width of the skeleton
 * @param {string} props.height - Height of the skeleton
 */
const Skeleton = ({ className = '', variant = 'rect', width, height }) => {
    const baseClass = 'bg-slate-200 dark:bg-slate-800 animate-pulse-soft relative overflow-hidden';

    let variantClass = '';
    if (variant === 'circle') {
        variantClass = 'rounded-full';
    } else if (variant === 'text') {
        variantClass = 'rounded h-4 mb-2 last:mb-0';
    } else {
        variantClass = 'rounded-xl';
    }

    return (
        <div
            className={`${baseClass} ${variantClass} ${className}`}
            style={{ width, height }}
        >
            <div className="absolute inset-0 skeleton-shimmer" />
        </div>
    );
};

export default Skeleton;
