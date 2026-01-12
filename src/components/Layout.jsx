import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useBooks } from '../context/BookContext';
import ShareModal from './ShareModal';

const Layout = () => {
    const { celebrationBook, closeCelebration } = useBooks();

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pb-20 transition-colors duration-300">
            {/* Top Bar removed - Dashboard has its own header */}

            <main className="container mx-auto px-4 max-w-md animate-fade-in relative">
                <Outlet />
            </main>

            <Navbar />

            {/* Global Celebration Modal */}
            {celebrationBook && (
                <ShareModal
                    book={celebrationBook}
                    onClose={closeCelebration}
                />
            )}
        </div>
    );
};

export default Layout;
