import React from 'react';

const Carousel = ({ title, children }) => {
    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button className="text-xs text-violet-400 font-medium hover:text-violet-300">See All</button>
            </div>

            {/* Scroll Container */}
            <div className="flex overflow-x-auto gap-4 pb-4 px-1 -mx-4 px-4 snap-x hide-scrollbar">
                {React.Children.map(children, (child) => (
                    <div className="flex-none w-[140px] snap-center">
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Carousel;
