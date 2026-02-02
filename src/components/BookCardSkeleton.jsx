import React from 'react';
import Skeleton from './Skeleton';

const BookCardSkeleton = () => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 p-3 flex flex-col gap-3">
            {/* Cover Skeleton */}
            <Skeleton className="w-full aspect-[2/3] rounded-xl" />

            <div className="space-y-2">
                {/* Title Skeleton */}
                <Skeleton variant="text" width="80%" />
                {/* Author Skeleton */}
                <Skeleton variant="text" width="60%" height="0.75rem" />
            </div>

            <div className="mt-auto pt-2 flex justify-between items-center">
                {/* Progress Skeleton */}
                <Skeleton width="40%" height="0.5rem" className="rounded-full" />
                {/* Badge Skeleton */}
                <Skeleton width="30%" height="1.25rem" className="rounded-lg" />
            </div>
        </div>
    );
};

export const BookListSkeleton = ({ count = 6 }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <BookCardSkeleton key={i} />
            ))}
        </div>
    );
};

export default BookCardSkeleton;
