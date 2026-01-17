/**
 * Book API Utility - Fetches book data from Open Library API using ISBN
 */

/**
 * Fetches book details from Open Library API
 * @param {string} isbn - The ISBN-10 or ISBN-13 number
 * @returns {Promise<Object>} Book data or error
 */
export const fetchBookByISBN = async (isbn) => {
    try {
        // Clean ISBN (remove hyphens and spaces)
        const cleanISBN = isbn.replace(/[-\s]/g, '');

        if (!cleanISBN || cleanISBN.length < 10) {
            throw new Error('Invalid ISBN format');
        }

        // Open Library API endpoint
        const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch book data');
        }

        const data = await response.json();
        const bookKey = `ISBN:${cleanISBN}`;

        // Check if book was found
        if (!data[bookKey]) {
            throw new Error('Book not found for this ISBN');
        }

        const bookData = data[bookKey];

        // Extract and format book information
        const result = {
            title: bookData.title || '',
            author: bookData.authors?.[0]?.name || '',
            cover: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small || '',
            totalPages: bookData.number_of_pages || '',
            genres: extractGenres(bookData.subjects),
            isbn: cleanISBN,
            publisher: bookData.publishers?.[0]?.name || '',
            publishDate: bookData.publish_date || ''
        };

        return { success: true, data: result };

    } catch (error) {
        console.error('Error fetching book by ISBN:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch book data'
        };
    }
};

/**
 * Extracts and maps genres from Open Library subjects
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
 * Validates ISBN format (basic check)
 * @param {string} isbn - The ISBN to validate
 * @returns {boolean} True if valid format
 */
export const isValidISBN = (isbn) => {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^(97[89])?\d{9}[\dX]$/i.test(cleanISBN);
};
