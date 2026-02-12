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
    const trackingUnit = book.tracking_unit || book.progressMode || (book.format === 'Audiobook' ? 'minutes' : 'pages');

    // Time-based tracking (audiobooks)
    if (trackingUnit === 'minutes') {
        if (book.total_duration_minutes > 0) {
            return Math.round((currentProgress / book.total_duration_minutes) * 100);
        }
    }

    // Chapter-based tracking
    if (trackingUnit === 'chapters') {
        if (book.totalChapters > 0) {
            return Math.round((currentProgress / book.totalChapters) * 100);
        }
    }

    // Page-based tracking (default)
    if (book.totalPages > 0) {
        return Math.round((currentProgress / book.totalPages) * 100);
    }

    // Generic fallback if primary fails
    const total = (trackingUnit === 'chapters' ? book.totalChapters : trackingUnit === 'minutes' ? book.total_duration_minutes : book.totalPages) || book.totalPages || book.totalChapters || book.total_duration_minutes || 0;
    if (total > 0) return Math.round((currentProgress / total) * 100);

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

    if (preset === 'dark-romance') {
        const romanceColors = [
            'bg-[#000000]', // Pure Black
            'bg-[#2D0E0E]', // Deepest Black-Red
            'bg-[#3D1414]', // Dark Maroon
            'bg-[#5D2424]', // Deep Crimson
            'bg-[#606066]', // Charcoal
            'bg-[#1A0909]'  // Very Dark Maroon
        ];
        const index = Math.abs(hash) % romanceColors.length;
        return romanceColors[index];
    }

    if (preset === 'romance') {
        const romanceColors = [
            'bg-[#C00645]', // Vivid Raspberry
            'bg-[#D05D65]', // Dusty Rose
            'bg-[#E1848C]', // Rose Gold/Pink
            'bg-[#EAA8AC]', // Pale Pink
            'bg-[#E7CDCE]'  // Bone/Off-pink
        ];
        const index = Math.abs(hash) % romanceColors.length;
        return romanceColors[index];
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
 * Supports multiple tracking formats with intelligent fallbacks.
 * @param {Object} book - The book object.
 * @param {number} globalSpeed - Global average fallback for page-based tracking.
 * @returns {number|null} Minutes left, or null if insufficient data.
 */
export const getEstimatedTimeLeftMultiFormat = (book, globalSpeed = 1.0) => {
    if (!book) return null;

    // Determine tracking unit (support both new and legacy field names)
    const trackingUnit = book.tracking_unit || book.progressMode || (book.format === 'Audiobook' ? 'chapters' : 'pages');

    // Case A: Minutes-based (Audiobooks with known duration)
    if (trackingUnit === 'minutes') {
        if (!book.total_duration_minutes || book.total_duration_minutes <= 0) {
            return null; // No duration set - show fallback message
        }
        const currentProgress = book.progress || 0;
        const remaining = Math.max(0, book.total_duration_minutes - currentProgress);
        return Math.round(remaining);
    }

    // Case B: Chapters-based (Session-based learning)
    if (trackingUnit === 'chapters') {
        const totalChapters = book.totalChapters || 0;
        const currentChapter = book.progress || 0;
        const remainingChapters = totalChapters - currentChapter;

        if (remainingChapters <= 0) return 0;

        // Need reading session data to calculate average time per chapter
        const totalTimeRead = book.totalTimeRead || 0;
        const chaptersCompleted = currentChapter;

        // Require at least 5 minutes of reading data and at least 1 chapter completed
        if (totalTimeRead < 5 || chaptersCompleted === 0) {
            return null; // Not enough data - show fallback message
        }

        // Calculate average minutes per chapter based on actual reading sessions
        const avgMinsPerChapter = totalTimeRead / chaptersCompleted;
        const estimatedTimeLeft = Math.round(remainingChapters * avgMinsPerChapter);

        return estimatedTimeLeft;
    }

    // Case C: Pages-based (Existing logic)
    const totalPages = book.totalPages || 0;
    const currentPage = book.progress || 0;
    const remainingPages = totalPages - currentPage;

    if (remainingPages <= 0) return 0;

    const speed = getReadingSpeed(book, globalSpeed);
    return Math.round(remainingPages / speed);
};

/**
 * Legacy function - maintained for backwards compatibility.
 * Use getEstimatedTimeLeftMultiFormat for new implementations.
 */
export const getEstimatedTimeLeft = (book, globalSpeed = 1.0) => {
    return getEstimatedTimeLeftMultiFormat(book, globalSpeed);
};
