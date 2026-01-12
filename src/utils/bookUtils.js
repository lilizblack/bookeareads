/**
 * Calculates the reading progress percentage for a book.
 * @param {Object} book - The book object.
 * @returns {number} The progress percentage (0-100).
 */
export const getBookProgressPercentage = (book) => {
    if (!book) return 0;
    if (book.status === 'read') return 100;

    const currentProgress = book.progress || 0;

    // Primary: Use totalPages if available
    if (book.totalPages > 0) {
        return Math.round((currentProgress / book.totalPages) * 100);
    }

    // Fallback: Use totalChapters
    if (book.totalChapters > 0) {
        return Math.round((currentProgress / book.totalChapters) * 100);
    }

    // If no totals set, assume progress is a percentage
    return Math.min(Number(currentProgress) || 0, 100);
};

export const getSpineColor = (str) => {
    const colors = [
        'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400',
        'bg-lime-400', 'bg-green-400', 'bg-emerald-400', 'bg-teal-400',
        'bg-cyan-400', 'bg-sky-400', 'bg-blue-400', 'bg-indigo-400',
        'bg-violet-400', 'bg-purple-400', 'bg-fuchsia-400', 'bg-pink-400',
        'bg-rose-400', 'bg-slate-400'
    ];

    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Helper to darken for text color logic if needed, but we'll stick to a palette
    // Pick from our tailored Tailwind list
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};
