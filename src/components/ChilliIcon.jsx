import React from 'react';

const ChilliIcon = ({ size = 20, className = "", fillPercentage = 100 }) => {
    // Generate a unique ID for the gradient to prevent conflicts
    const gradientId = React.useId ? React.useId() : `chilli-grad-${Math.random().toString(36).substr(2, 9)}`;
    const safeGradientId = gradientId.replace(/:/g, ''); // Ensure ID is valid for url()

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillPercentage === 100 ? "currentColor" : fillPercentage === 0 ? "none" : `url(#${safeGradientId})`}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <defs>
                <linearGradient id={safeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset={`${fillPercentage}%`} stopColor="currentColor" />
                    <stop offset={`${fillPercentage}%`} stopColor="transparent" />
                </linearGradient>
            </defs>
            <path d="M18 7V4a2 2 0 0 0-4 0" />
            <path d="M14 10s2 0 4 2c2-2 4-2 4-2" />
            <path d="M22 10c0 6.6-5.4 12-12 12-4.4 0-8-2.7-8-6v-.4C3.3 17.1 5 18 7 18c3.9 0 7-3.6 7-8 0-1.7 1.3-3 3-3h2c1.7 0 3 1.3 3 3" />
        </svg>
    );
};

export default ChilliIcon;
