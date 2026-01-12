import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Share2, Star } from 'lucide-react';
import CoverImage from './CoverImage';

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

                {/* The Shareable Card */}
                <div
                    ref={cardRef}
                    className="w-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center aspect-[4/5] flex flex-col items-center justify-center gap-6"
                    style={{ minHeight: '500px' }}
                >
                    {/* Decorative Patterns */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-300/20 rounded-full blur-3xl" />

                    {/* Banner */}
                    <div className="bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full shadow-lg transform -rotate-2 border border-white/50">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 font-black text-xs tracking-widest uppercase">
                            Just Finished!
                        </span>
                    </div>

                    {/* Book Cover */}
                    <div className="w-40 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden ring-4 ring-white/30 transform rotate-1 transition-transform">
                        <CoverImage
                            src={book.cover}
                            title={book.title}
                            author={book.author}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Info */}
                    <div className="text-white z-10 space-y-2 max-w-xs">
                        <h1 className="text-2xl font-black leading-tight drop-shadow-md line-clamp-2">
                            {book.title}
                        </h1>
                        <p className="text-white/90 font-medium text-sm drop-shadow-sm">
                            by {book.author}
                        </p>

                        {/* Rating (Placeholder or Actual) */}
                        <div className="flex items-center justify-center gap-1 mt-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    size={20}
                                    fill={star <= (book.rating || 5) ? "currentColor" : "none"}
                                    className={star <= (book.rating || 5) ? "text-yellow-300 drop-shadow-sm" : "text-white/30"}
                                    strokeWidth={2.5}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer Branding */}
                    <div className="absolute bottom-6 text-white/60 text-[10px] uppercase tracking-widest font-bold">
                        Read on BookTracker
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
