/**
 * Calculates the reading progress percentage for a book.
 * @param {Object} book - The book object.
 * @returns {number} The progress percentage (0-100).
 */
export const getBookProgressPercentage = (book) => {
    if (!book) return 0;
    if (book.status === 'read') return 100;
    if (book.status === 'want-to-read') return 0;

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

export const getSpineColor = (str, preset = 'default') => {
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    if (preset === 'cozy-lofi') {
        const lofiColors = [
            'bg-[#8FBC8F]', // Sage Green
            'bg-[#D8BFD8]', // Dusty Pink
            'bg-[#778899]', // Slate Blue
            'bg-[#CD5C5C]'  // Muted Coral
        ];
        const index = Math.abs(hash) % lofiColors.length;
        return lofiColors[index];
    }

    if (preset === 'paper-ink') {
        const paperColors = [
            'bg-[#FFFFFF]', // White
            'bg-[#E5E5E5]', // Medium Light Grey
            'bg-[#D4D4D4]', // Neutral Grey
            'bg-[#F5F5F5]'  // Very Light Grey
        ];
        const index = Math.abs(hash) % paperColors.length;
        return paperColors[index];
    }

    const colors = [
        'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400',
        'bg-lime-400', 'bg-green-400', 'bg-emerald-400', 'bg-teal-400',
        'bg-cyan-400', 'bg-sky-400', 'bg-blue-400', 'bg-indigo-400',
        'bg-violet-400', 'bg-purple-400', 'bg-fuchsia-400', 'bg-pink-400',
        'bg-rose-400', 'bg-slate-400'
    ];

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

/**
 * Calculates a global reading speed from a list of books.
 * @param {Array} books - List of books.
 * @returns {number} Global average speed.
 */
export const calculateGlobalSpeed = (books) => {
    if (!books || books.length === 0) return 1.0;

    let totalMinutes = 0;
    let totalPages = 0;

    books.forEach(b => {
        totalMinutes += (b.totalTimeRead || 0);
        totalPages += (b.totalTimedProgress || 0);
    });

    if (totalMinutes >= 15 && totalPages > 0) {
        return parseFloat((totalPages / totalMinutes).toFixed(2));
    }

    return 1.0; // Baseline
};

/**
 * Calculates average reading speed in pages per minute.
 * @param {Object} book - The book object.
 * @param {number} globalSpeed - Global average fallback.
 * @returns {number} Pages per minute.
 */
export const getReadingSpeed = (book, globalSpeed = 1.0) => {
    // 1. If we have reliable data for THIS specific book (at least 15 minutes tracked)
    if (book && book.totalTimeRead >= 15 && book.totalTimedProgress > 0) {
        const speed = book.totalTimedProgress / book.totalTimeRead;
        return parseFloat(speed.toFixed(2));
    }

    // 2. Fallback to global speed if provided and valid
    if (globalSpeed > 0) return globalSpeed;

    // 3. Absolute baseline (human average: 1 page per minute)
    return 1.0;
};

/**
 * Calculates estimated time left to finish the book in minutes.
 * @param {Object} book - The book object.
 * @param {number} globalSpeed - Global average fallback.
 * @returns {number} Minutes left.
 */
export const getEstimatedTimeLeft = (book, globalSpeed = 1.0) => {
    if (!book) return 0;
    const total = book.totalPages || book.totalChapters || 0;
    const remaining = total - (book.progress || 0);
    if (remaining <= 0) return 0;

    const speed = getReadingSpeed(book, globalSpeed);
    return Math.round(remaining / speed);
};
