import React from 'react';
import { formatCurrency } from '../utils/currency';

const ChartCard = ({ title, data, colors, isCurrency = false }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 contrast-card">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-6">{title}</h3>

            <div className="flex items-center gap-8">
                {/* SVG Donut Chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {total > 0 ? data.map((item, i) => {
                            const percentage = (item.value / total) * 100;
                            const strokeDasharray = `${(percentage * circumference) / 100} ${circumference}`;
                            const strokeDashoffset = -currentOffset;
                            currentOffset += (percentage * circumference) / 100;

                            return (
                                <circle
                                    key={i}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="transparent"
                                    stroke={colors[i % colors.length]}
                                    strokeWidth="12"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-1000 ease-out"
                                />
                            );
                        }) : (
                            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth="8" />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                            {isCurrency ? formatCurrency(total) : total}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                    {data.length > 0 ? data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isCurrency && (
                                    <span className="text-[10px] font-bold text-slate-500">
                                        {formatCurrency(item.value)}
                                    </span>
                                )}
                                <span className="text-[10px] font-black text-slate-400 group-hover:text-violet-500">
                                    {Math.round((item.value / total) * 100)}%
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="text-xs text-slate-400 font-medium italic">No data yet</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChartCard;
