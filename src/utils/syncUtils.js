
import { supabase } from '../lib/supabaseClient';

export const syncLocalDataToSupabase = async (userId) => {
    if (!supabase) return false;

    try {
        const localData = localStorage.getItem('book-tracker-data-v3');
        if (!localData) {
            return true; // No data is not an error
        }

        const books = JSON.parse(localData);
        if (!Array.isArray(books) || books.length === 0) {
            return true;
        }

        console.log('Found local data. Starting sync...', books.length, 'books');

        // Check which books already exist in Supabase
        const { data: existingBooks, error: fetchError } = await supabase
            .from('books')
            .select('id, title, author')
            .eq('user_id', userId);

        if (fetchError) {
            console.error('Error fetching existing books:', fetchError);
        }

        const existingIds = new Set(existingBooks?.map(b => b.id) || []);

        // Only sync books that don't already exist (filter out UUID books)
        const booksToSync = books.filter(book => {
            // If book has a UUID (from Supabase), skip it
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id);
            if (isUUID && existingIds.has(book.id)) {
                return false; // Already in Supabase
            }
            // If book has a timestamp ID (created offline), sync it
            return !isUUID;
        });

        if (booksToSync.length === 0) {
            return true;
        }

        console.log(`Syncing ${booksToSync.length} offline books...`);

        // Sanitize and validate books before upload
        const formattedBooks = booksToSync.map(book => {
            // Create clean object with ONLY valid database columns
            const cleanBook = {
                user_id: userId, // CRITICAL: Must be set
                title: book.title || 'Untitled',
                author: book.author || null,
                cover: book.cover || null,
                status: book.status || 'want-to-read',
                progress: parseInt(book.progress) || 0,
                total_pages: book.totalPages ? parseInt(book.totalPages) : null,
                total_chapters: book.totalChapters ? parseInt(book.totalChapters) : null,
                rating: parseFloat(book.rating) || 0,
                spice_rating: parseFloat(book.spiceRating) || 0,
                is_owned: Boolean(book.isOwned),
                is_favorite: Boolean(book.isFavorite),
                to_buy: Boolean(book.toBuy || book.isWantToBuy),
                price: book.price ? parseFloat(book.price) : null,
                review: book.review || null,
                format: book.format || null,
                genres: Array.isArray(book.genres) ? book.genres : [],
                added_at: book.addedAt || new Date().toISOString(),
                started_at: book.startedAt || null,
                finished_at: book.finishedAt || null,
                paused_at: book.pausedAt || null,
                dnf_at: book.dnfAt || null
            };

            // Remove any undefined values (Supabase doesn't like undefined)
            Object.keys(cleanBook).forEach(key => {
                if (cleanBook[key] === undefined) {
                    cleanBook[key] = null;
                }
            });

            return cleanBook;
        });

        // Insert Books
        const { data, error } = await supabase
            .from('books')
            .insert(formattedBooks)
            .select();


        if (error) {
            console.error('Error syncing books:', error);
            console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            console.log('Sample book data that failed:', formattedBooks[0]);
            throw error;
        }

        console.log('Successfully synced books to Supabase:', data.length);
        return true;

    } catch (error) {
        console.error('Sync failed:', error);
        return false;
    }
};
