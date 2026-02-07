/**
 * Book API Utility - Waterfall Search Strategy
 * Tries Google Books API first, then falls back to Open Library API
 */

// Placeholder image for books without covers
const PLACEHOLDER_COVER = 'https://via.placeholder.com/300x450/8b5cf6/ffffff?text=No+Cover';

/**
 * Standard Book Object Interface
 * @typedef {Object} BookData
 * @property {string} title - Book title
 * @property {string} author - First author name
 * @property {string} cover - Cover image URL
 * @property {number|string} totalPages - Number of pages
 * @property {string} isbn - ISBN number
 * @property {string} publisher - Publisher name
 * @property {string} publishedDate - Publication date
 * @property {string} genres - Genre/category
 * @property {string} description - Book description
 */

/**
 * Main waterfall search function
 * Tries Google Books API first, then Open Library API
 * @param {string} query - Search query (title, author, or ISBN)
 * @param {string} searchType - 'isbn' or 'title'
 * @returns {Promise<{success: boolean, data?: BookData, error?: string}>}
 */
export const fetchBookData = async (query, searchType = 'title') => {
    try {
        // Step 1: Try Google Books API
        console.log(`🔍 Searching Google Books for: ${query}`);
        const googleResult = await searchGoogleBooks(query, searchType);

        if (googleResult.success && googleResult.data) {
            console.log('✅ Found in Google Books');
            return googleResult;
        }

        // Step 2: Fallback to Open Library API
        console.log('⚠️ Google Books failed, trying Open Library...');
        const openLibraryResult = await searchOpenLibrary(query, searchType);

        if (openLibraryResult.success && openLibraryResult.data) {
            console.log('✅ Found in Open Library');
            return openLibraryResult;
        }

        // Step 3: Both failed
        console.log('❌ No results from any API');
        return {
            success: false,
            error: 'Book not found in any database. Please enter details manually.'
        };

    } catch (error) {
        console.error('Error in waterfall search:', error);
        return {
            success: false,
            error: error.message || 'Failed to search for book'
        };
    }
};

/**
 * Search Google Books API
 * @param {string} query - Search query
 * @param {string} searchType - 'isbn' or 'title'
 * @returns {Promise<{success: boolean, data?: BookData, error?: string}>}
 */
const searchGoogleBooks = async (query, searchType) => {
    try {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            throw new Error('Empty search query');
        }

        // Build search query
        let searchParam;
        if (searchType === 'isbn') {
            const cleanISBN = cleanQuery.replace(/[-\s]/g, '');
            searchParam = `isbn:${cleanISBN}`;
        } else {
            searchParam = encodeURIComponent(cleanQuery);
        }

        const url = `https://www.googleapis.com/books/v1/volumes?q=${searchParam}&maxResults=1`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Google Books API request failed');
        }

        const data = await response.json();

        // Check if results exist
        if (!data.items || data.items.length === 0) {
            return { success: false, error: 'No results found' };
        }

        const book = data.items[0].volumeInfo;

        // Validate critical fields
        if (!book.title) {
            return { success: false, error: 'Missing title' };
        }

        // Normalize Google Books data
        const normalizedData = normalizeGoogleBooksData(book);

        // EXTRA VALIDATION: If searching by ISBN, ensure the result actually contains that ISBN
        if (searchType === 'isbn') {
            const cleanISBN = cleanQuery.replace(/[-\s]/g, '');
            const resultISBN = normalizedData.isbn.replace(/[-\s]/g, '');
            if (resultISBN && !resultISBN.includes(cleanISBN) && !cleanISBN.includes(resultISBN)) {
                return { success: false, error: 'Book not found (ISBN mismatch)' };
            }
        }

        // EXTRA VALIDATION: If searching by title, do a basic keyword match
        if (searchType === 'title') {
            const queryKeywords = cleanQuery.toLowerCase().split(/\s+/).filter(k => k.length > 2);
            const titleLower = normalizedData.title.toLowerCase();
            const authorLower = normalizedData.author.toLowerCase();

            // Check if at least some significant keywords are in title or author
            const keywordMatch = queryKeywords.every(k => titleLower.includes(k) || authorLower.includes(k));

            if (!keywordMatch && queryKeywords.length > 0) {
                // If it's not even a partial keyword match, it's likely a "random" related book
                return { success: false, error: 'Book not found (Title mismatch)' };
            }
        }

        return { success: true, data: normalizedData };

    } catch (error) {
        console.error('Google Books API error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Search Open Library API
 * @param {string} query - Search query
 * @param {string} searchType - 'isbn' or 'title'
 * @returns {Promise<{success: boolean, data?: BookData, error?: string}>}
 */
const searchOpenLibrary = async (query, searchType) => {
    try {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            throw new Error('Empty search query');
        }

        let url;
        if (searchType === 'isbn') {
            const cleanISBN = cleanQuery.replace(/[-\s]/g, '');
            url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`;
        } else {
            // Search by title
            const searchParam = encodeURIComponent(cleanQuery);
            url = `https://openlibrary.org/search.json?q=${searchParam}&limit=1`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Open Library API request failed');
        }

        const data = await response.json();

        // Handle ISBN search response
        if (searchType === 'isbn') {
            const cleanISBN = cleanQuery.replace(/[-\s]/g, '');
            const bookKey = `ISBN:${cleanISBN}`;

            if (!data[bookKey]) {
                return { success: false, error: 'No results found' };
            }

            const normalizedData = normalizeOpenLibraryDataISBN(data[bookKey], cleanISBN);
            return { success: true, data: normalizedData };
        }

        // Handle title search response
        if (!data.docs || data.docs.length === 0) {
            return { success: false, error: 'No results found' };
        }

        const book = data.docs[0];

        if (!book.title) {
            return { success: false, error: 'Missing title' };
        }

        const normalizedData = normalizeOpenLibraryDataSearch(book);

        // EXTRA VALIDATION: Basic keyword match for Title search
        const queryKeywords = cleanQuery.toLowerCase().split(/\s+/).filter(k => k.length > 2);
        const titleLower = normalizedData.title.toLowerCase();
        const authorLower = normalizedData.author.toLowerCase();

        const keywordMatch = queryKeywords.every(k => titleLower.includes(k) || authorLower.includes(k));

        if (!keywordMatch && queryKeywords.length > 0) {
            return { success: false, error: 'Book not found (Title mismatch)' };
        }

        return { success: true, data: normalizedData };

    } catch (error) {
        console.error('Open Library API error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Normalize Google Books API data to standard format
 * @param {Object} book - Google Books volumeInfo object
 * @returns {BookData}
 */
const normalizeGoogleBooksData = (book) => {
    return {
        title: book.title || '',
        author: book.authors?.[0] || '',
        cover: book.imageLinks?.thumbnail?.replace('http:', 'https:') ||
            book.imageLinks?.smallThumbnail?.replace('http:', 'https:') ||
            PLACEHOLDER_COVER,
        totalPages: book.pageCount || book.printedPageCount || '',
        isbn: extractISBN(book.industryIdentifiers) || '',
        publisher: book.publisher || '',
        publishedDate: book.publishedDate || '',
        genres: book.categories?.[0] || '',
        description: book.description || ''
    };
};

/**
 * Normalize Open Library ISBN search data to standard format
 * @param {Object} book - Open Library book data object
 * @param {string} isbn - ISBN number
 * @returns {BookData}
 */
const normalizeOpenLibraryDataISBN = (book, isbn) => {
    return {
        title: book.title || '',
        author: book.authors?.[0]?.name || '',
        cover: book.cover?.large ||
            book.cover?.medium ||
            book.cover?.small ||
            PLACEHOLDER_COVER,
        totalPages: book.number_of_pages || (book.pagination ? parseInt(book.pagination) : ''),
        isbn: isbn || '',
        publisher: book.publishers?.[0]?.name || '',
        publishedDate: book.publish_date || '',
        genres: extractGenres(book.subjects),
        description: book.notes || ''
    };
};

/**
 * Normalize Open Library search data to standard format
 * @param {Object} book - Open Library search result document
 * @returns {BookData}
 */
const normalizeOpenLibraryDataSearch = (book) => {
    // Build cover URL from cover_i
    let coverUrl = PLACEHOLDER_COVER;
    if (book.cover_i) {
        coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
    } else if (book.isbn && book.isbn[0]) {
        coverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-L.jpg`;
    }

    return {
        title: book.title || '',
        author: book.author_name?.[0] || '',
        cover: coverUrl,
        totalPages: book.number_of_pages_median || '',
        isbn: book.isbn?.[0] || '',
        publisher: book.publisher?.[0] || '',
        publishedDate: book.first_publish_year?.toString() || '',
        genres: (book.subject && book.subject[0]) || '',
        description: '' // Search API doesn't usually provide descriptions
    };
};

/**
 * Extract ISBN from Google Books industry identifiers
 * Prefers ISBN-13 over ISBN-10
 * @param {Array} identifiers - Array of identifier objects
 * @returns {string} ISBN or empty string
 */
const extractISBN = (identifiers) => {
    if (!identifiers || !Array.isArray(identifiers)) return '';

    // Look for ISBN-13 first
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) return isbn13.identifier;

    // Fall back to ISBN-10
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
    if (isbn10) return isbn10.identifier;

    return '';
};

/**
 * Extract and map genres from Open Library subjects
 * @param {Array} subjects - Array of subject objects from API
 * @returns {string} First matching genre or empty string
 */
const extractGenres = (subjects) => {
    if (!subjects || !Array.isArray(subjects)) return '';

    // Common genre mappings
    const genreMap = {
        'fiction': 'Fiction',
        'fantasy': 'Fantasy',
        'science fiction': 'Science Fiction',
        'romance': 'Romance',
        'mystery': 'Mystery',
        'thriller': 'Thriller',
        'horror': 'Horror',
        'historical': 'Historical Fiction',
        'biography': 'Biography',
        'self-help': 'Self-Help',
        'business': 'Business',
        'poetry': 'Poetry',
        'young adult': 'Young Adult',
        'children': 'Children',
        'graphic novel': 'Graphic Novel',
        'memoir': 'Memoir',
        'philosophy': 'Philosophy',
        'religion': 'Religion',
        'science': 'Science',
        'history': 'History'
    };

    // Try to find a matching genre
    for (const subject of subjects) {
        const subjectName = subject.name?.toLowerCase() || '';

        for (const [key, value] of Object.entries(genreMap)) {
            if (subjectName.includes(key)) {
                return value;
            }
        }
    }

    // Return first subject if no match found
    return subjects[0]?.name || '';
};

/**
 * Legacy function for backward compatibility
 * Search by ISBN using waterfall strategy
 * @param {string} isbn - ISBN number
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const fetchBookByISBN = async (isbn) => {
    // Data is already in correct format from normalize functions
    return await fetchBookData(isbn, 'isbn');
};

/**
 * Search by title using waterfall strategy
 * @param {string} title - Book title
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const fetchBookByTitle = async (title) => {
    // Data is already in correct format from normalize functions
    return await fetchBookData(title, 'title');
};

/**
 * Validates ISBN format (basic check)
 * @param {string} isbn - The ISBN to validate
 * @returns {boolean} True if valid format
 */
export const isValidISBN = (isbn) => {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^(97[89])?\d{9}[\dX]$/i.test(cleanISBN);
};
