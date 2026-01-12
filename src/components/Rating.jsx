import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

const Rating = ({ value, max = 5, onChange, readOnly = false }) => {
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
                            {/* Render Full, Half, or Empty Star */}
                            {filled ? (
                                <Star
                                    size={20}
                                    className="fill-yellow-400 text-yellow-400 transition-colors duration-200"
                                />
                            ) : half ? (
                                <div className="relative">
                                    <StarHalf
                                        size={20}
                                        className="fill-yellow-400 text-yellow-400 transition-colors duration-200"
                                    />
                                    <Star
                                        size={20}
                                        className="text-slate-300 absolute top-0 left-0 -z-10"
                                    />
                                </div>
                            ) : (
                                <Star
                                    size={20}
                                    className="text-slate-300 transition-colors duration-200"
                                />
                            )}
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

export default Rating;
