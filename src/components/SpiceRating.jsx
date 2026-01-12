import React, { useState } from 'react';
import ChilliIcon from './ChilliIcon';

const SpiceRating = ({ value, max = 5, onChange, readOnly = false }) => {
    const [hoverValue, setHoverValue] = useState(null);

    const handleMouseMove = (e, index) => {
        if (readOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isHalf = x < rect.width / 2;
        setHoverValue(isHalf ? index + 0.5 : index + 1);
    };

    const handleClick = (e, index) => {
        if (readOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isHalf = x < rect.width / 2;
        onChange(isHalf ? index + 0.5 : index + 1);
    };

    const displayValue = hoverValue !== null ? hoverValue : value;

    return (
        <div className="flex items-center gap-2">
            <div className="flex gap-1" onMouseLeave={() => setHoverValue(null)}>
                {[...Array(max)].map((_, index) => {
                    const filled = displayValue >= index + 1;
                    const half = displayValue >= index + 0.5 && displayValue < index + 1;

                    return (
                        <button
                            key={index}
                            type="button"
                            className={`transition-transform relative ${!readOnly && 'hover:scale-110'}`}
                            onClick={(e) => handleClick(e, index)}
                            onMouseMove={(e) => handleMouseMove(e, index)}
                            disabled={readOnly}
                        >
                            <ChilliIcon
                                size={20}
                                fillPercentage={filled ? 100 : half ? 50 : 0}
                                className={`
                    ${(filled || half) ? 'text-red-500' : 'text-slate-600'}
                    transition-colors duration-200
                `}
                            />
                        </button>
                    );
                })}
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 min-w-[24px]">
                {displayValue || 0}
            </span>
        </div>
    );
};

export default SpiceRating;
