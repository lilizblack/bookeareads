import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Share2, Star } from 'lucide-react';
import CoverImage from './CoverImage';
import ChilliIcon from './ChilliIcon';

const ShareModal = ({ book, onClose }) => {
    const cardRef = useRef(null);
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setGenerating(true);
        try {
            // Wait a moment for images to render fully if needed
            const canvas = await html2canvas(cardRef.current, {
                scale: 2, // Retinas/High-Res
                useCORS: true,
                backgroundColor: null, // Transparent wrapper if any
                logging: false,
            });

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `finished-${book.title.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.click();
        } catch (err) {
            console.error("Screenshot failed:", err);
            alert("Failed to generate image. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    if (!book) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md flex flex-col items-center gap-6">

                {/* Header */}
                <div className="w-full flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Share2 size={20} /> Share your achievement
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* The Shareable Card - Simple & Reliable */}
                <div
                    ref={cardRef}
                    className="w-full bg-gradient-to-br from-slate-900 via-violet-900 to-fuchsia-900 p-10 rounded-3xl shadow-2xl relative overflow-hidden aspect-[4/5] flex flex-col items-center justify-center gap-6"
                    style={{ minHeight: '500px' }}
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl" />

                    {/* Content Container */}
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        {/* Badge */}
                        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3 rounded-full shadow-xl">
                            <span className="text-white font-black text-sm tracking-widest uppercase">
                                ✨ Just Finished!
                            </span>
                        </div>

                        {/* Book Cover */}
                        <div className="w-56 aspect-[2/3] rounded-2xl shadow-2xl overflow-hidden ring-4 ring-white/20 bg-gradient-to-br from-slate-700 to-slate-800">
                            {book.cover ? (
                                <img
                                    src={book.cover}
                                    alt={book.title}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-600 to-slate-700">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-white leading-tight mb-2">
                                            {book.title}
                                        </div>
                                        <div className="text-sm font-bold text-white/70">
                                            {book.author}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Book Info */}
                        <div className="text-center space-y-3 max-w-sm px-4">
                            <h1 className="text-3xl font-black leading-tight text-white">
                                {book.title}
                            </h1>
                            <p className="text-xl font-bold text-white/90">
                                by {book.author}
                            </p>

                            {/* Rating */}
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        size={28}
                                        fill={star <= (book.rating || 5) ? "#FCD34D" : "none"}
                                        className={star <= (book.rating || 5) ? "text-yellow-300" : "text-white/30"}
                                        strokeWidth={2}
                                    />
                                ))}
                            </div>

                            {/* Spice Rating */}
                            {book.spiceRating > 0 && (
                                <div className="flex items-center justify-center gap-2 mt-3">
                                    {[1, 2, 3, 4, 5].map((i) => {
                                        const filled = book.spiceRating >= i;
                                        const half = book.spiceRating >= i - 0.5 && book.spiceRating < i;
                                        return (
                                            <ChilliIcon
                                                key={i}
                                                size={20}
                                                fillPercentage={filled ? 100 : half ? 50 : 0}
                                                className={filled || half ? "text-red-400" : "text-white/30"}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 bg-white/10 backdrop-blur-sm px-8 py-3 rounded-full border border-white/20">
                            <span className="text-white font-bold text-sm uppercase tracking-wider">
                                📚 Read on Bookea Reads
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={handleDownload}
                    disabled={generating}
                    className="w-full py-4 bg-white text-violet-600 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-70 disabled:cursor-wait"
                >
                    {generating ? 'Generating...' : (
                        <>
                            <Download size={20} /> Save Image
                        </>
                    )}
                </button>

            </div>
        </div>
    );
};

export default ShareModal;
