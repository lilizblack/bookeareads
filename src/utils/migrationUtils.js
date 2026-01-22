// Data Migration Utilities
// Migrates existing JSONB data (reading_logs, notes) to normalized tables
// Run this once after creating the new schema

import { supabase } from '../lib/supabaseClient';

/**
 * Migrates reading_logs from books table (JSONB) to reading_sessions table
 * @returns {Promise<{success: boolean, migratedCount: number, errors: Array}>}
 */
export const migrateReadingLogsToSessions = async () => {
    try {
        console.log('Starting migration of reading logs to sessions...');

        // Fetch all books with reading_logs
        const { data: books, error: fetchError } = await supabase
            .from('books')
            .select('id, user_id, reading_logs');

        if (fetchError) throw fetchError;

        let migratedCount = 0;
        const errors = [];

        for (const book of books) {
            if (!book.reading_logs || !Array.isArray(book.reading_logs) || book.reading_logs.length === 0) {
                continue;
            }

            // Transform reading_logs to reading_sessions format
            const sessions = book.reading_logs.map(log => ({
                user_id: book.user_id,
                book_id: book.id,
                duration_minutes: log.minutesRead || 0,
                pages_read: log.pagesRead || 0,
                started_at: log.date,
                ended_at: log.date // Same as started for historical data
            })).filter(session => session.duration_minutes > 0); // Only migrate sessions with actual time

            if (sessions.length > 0) {
                const { error: insertError } = await supabase
                    .from('reading_sessions')
                    .insert(sessions);

                if (insertError) {
                    console.error(`Error migrating sessions for book ${book.id}:`, insertError);
                    errors.push({ bookId: book.id, error: insertError.message });
                } else {
                    migratedCount += sessions.length;
                }
            }
        }

        console.log(`Migration complete. Migrated ${migratedCount} sessions.`);
        return { success: true, migratedCount, errors };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, migratedCount: 0, errors: [error.message] };
    }
};

/**
 * Migrates notes from books table (JSONB) to notes table
 * @returns {Promise<{success: boolean, migratedCount: number, errors: Array}>}
 */
export const migrateNotesToTable = async () => {
    try {
        console.log('Starting migration of notes to notes table...');

        // Fetch all books with notes
        const { data: books, error: fetchError } = await supabase
            .from('books')
            .select('id, user_id, notes');

        if (fetchError) throw fetchError;

        let migratedCount = 0;
        const errors = [];

        for (const book of books) {
            if (!book.notes || !Array.isArray(book.notes) || book.notes.length === 0) {
                continue;
            }

            // Transform notes to notes table format
            const notes = book.notes.map(note => ({
                user_id: book.user_id,
                book_id: book.id,
                content: note.content || note.text || '',
                date: note.date || new Date().toISOString()
            })).filter(note => note.content.trim().length > 0); // Only migrate non-empty notes

            if (notes.length > 0) {
                const { error: insertError } = await supabase
                    .from('notes')
                    .insert(notes);

                if (insertError) {
                    console.error(`Error migrating notes for book ${book.id}:`, insertError);
                    errors.push({ bookId: book.id, error: insertError.message });
                } else {
                    migratedCount += notes.length;
                }
            }
        }

        console.log(`Migration complete. Migrated ${migratedCount} notes.`);
        return { success: true, migratedCount, errors };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, migratedCount: 0, errors: [error.message] };
    }
};

/**
 * Runs all migrations in sequence
 * @returns {Promise<{success: boolean, results: Object}>}
 */
export const runAllMigrations = async () => {
    console.log('Starting full data migration...');

    const sessionsMigration = await migrateReadingLogsToSessions();
    const notesMigration = await migrateNotesToTable();

    const results = {
        sessions: sessionsMigration,
        notes: notesMigration,
        totalMigrated: sessionsMigration.migratedCount + notesMigration.migratedCount,
        totalErrors: sessionsMigration.errors.length + notesMigration.errors.length
    };

    console.log('Full migration complete:', results);
    return { success: true, results };
};

/**
 * Verifies migration by comparing counts
 * @returns {Promise<{success: boolean, verification: Object}>}
 */
export const verifyMigration = async () => {
    try {
        // Count reading_logs in books
        const { data: books } = await supabase
            .from('books')
            .select('reading_logs, notes');

        const totalLogsInBooks = books?.reduce((sum, book) =>
            sum + (book.reading_logs?.length || 0), 0) || 0;
        const totalNotesInBooks = books?.reduce((sum, book) =>
            sum + (book.notes?.length || 0), 0) || 0;

        // Count sessions in reading_sessions
        const { count: sessionsCount } = await supabase
            .from('reading_sessions')
            .select('*', { count: 'exact', head: true });

        // Count notes in notes table
        const { count: notesCount } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true });

        const verification = {
            logsInBooks: totalLogsInBooks,
            sessionsInTable: sessionsCount || 0,
            notesInBooks: totalNotesInBooks,
            notesInTable: notesCount || 0,
            sessionsMigrationComplete: sessionsCount >= totalLogsInBooks,
            notesMigrationComplete: notesCount >= totalNotesInBooks
        };

        console.log('Migration verification:', verification);
        return { success: true, verification };
    } catch (error) {
        console.error('Verification failed:', error);
        return { success: false, error: error.message };
    }
};
