import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useBooks } from '../context/BookContext';
import ShareModal from './ShareModal';
import TimerBanner from './TimerBanner';

const Layout = () => {
    const { celebrationBook, closeCelebration, activeTimer } = useBooks();

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pb-20 transition-colors duration-300">
            <TimerBanner />

            <main
                className={`container mx-auto px-4 max-w-md animate-fade-in relative transition-all duration-300`}
                style={{
                    paddingTop: activeTimer
                        ? 'calc(var(--safe-area-top, 0px) + 5rem)'
                        : 'calc(var(--safe-area-top, 0px) + 1.25rem)'
                }}
            >
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
