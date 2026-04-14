import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Share2, Check } from 'lucide-react';
import { generateGenericCover } from '../utils/coverGenerator';

const ShareModal = ({ book, onClose }) => {
    const cardRef = useRef(null);
    const containerRef = useRef(null);
    const [generating, setGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [coverDataUrl, setCoverDataUrl] = useState(null);
    const [coverLoading, setCoverLoading] = useState(true);
    const [cardScale, setCardScale] = useState(1);
    const [cardHeight, setCardHeight] = useState(0);

    // Pre-load cover as data URL to completely avoid CORS issues in html2canvas
    useEffect(() => {
        if (!book?.cover) {
            setCoverDataUrl(generateGenericCover(book?.title, book?.author));
            setCoverLoading(false);
            return;
        }

        // Already a local/data URL — use directly
        if (book.cover.startsWith('data:') || book.cover.startsWith('/') || book.cover.startsWith('./')) {
            setCoverDataUrl(book.cover);
            setCoverLoading(false);
            return;
        }

        let cancelled = false;

        const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const fetchWithTimeout = (url, ms = 6000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), ms);
            return fetch(url, { signal: controller.signal })
                .finally(() => clearTimeout(id));
        };

        const fallback = () => {
            if (!cancelled) {
                setCoverDataUrl(generateGenericCover(book?.title, book?.author));
                setCoverLoading(false);
            }
        };

        // For Firebase Storage URLs, try fetching directly first —
        // their ?alt=media&token= makes them publicly readable.
        // For other external URLs, go straight to the weserv.nl proxy.
        const isFirebaseStorage = book.cover.includes('firebasestorage.googleapis.com');
        const coverUrl = book.cover.replace('http://', 'https://');

        // Proxy URL: avoid double-encoding already-encoded chars (e.g. %2F in Firebase paths)
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(decodeURIComponent(coverUrl))}&w=512&output=jpg&q=85`;

        const tryProxy = () =>
            fetchWithTimeout(proxyUrl)
                .then(res => { if (!res.ok) throw new Error('proxy failed'); return res.blob(); })
                .then(blobToDataUrl)
                .then(dataUrl => { if (!cancelled) { setCoverDataUrl(dataUrl); setCoverLoading(false); } })
                .catch(fallback);

        if (isFirebaseStorage) {
            fetchWithTimeout(coverUrl)
                .then(res => { if (!res.ok) throw new Error('direct failed'); return res.blob(); })
                .then(blobToDataUrl)
                .then(dataUrl => { if (!cancelled) { setCoverDataUrl(dataUrl); setCoverLoading(false); } })
                .catch(() => tryProxy());
        } else {
            tryProxy();
        }

        return () => { cancelled = true; };
    }, [book]);

    // Pre-load logo as data URL too
    const [logoDataUrl, setLogoDataUrl] = useState(null);
    useEffect(() => {
        fetch('/bookea-logo.png')
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => setLogoDataUrl(reader.result);
                reader.readAsDataURL(blob);
            })
            .catch(() => setLogoDataUrl(null));
    }, []);

    // Compute scale so the 340px card fits inside whatever container width is available
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                setCardScale(Math.min(1, containerWidth / 340));
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Track card height so the wrapper can shrink to the scaled visual height
    useEffect(() => {
        if (!cardRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setCardHeight(entry.contentRect.height + 52); // +52 accounts for padding
            }
        });
        observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [coverLoading]);

    const triggerDownload = (url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `bookea-achievement-${(book?.title || 'book').toLowerCase().replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (!generatedImageUrl) return;

        try {
            // Convert dataURL to File for sharing
            const res = await fetch(generatedImageUrl);
            const blob = await res.blob();
            const file = new File([blob], 'achievement.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My Reading Achievement',
                    text: `I just finished reading ${book.title}! Check out my progress on Bookea Reads.`
                });
            } else if (navigator.share) {
                // Basic text share fallback
                await navigator.share({
                    title: 'My Reading Achievement',
                    text: `I just finished reading ${book.title}!`,
                    url: window.location.origin
                });
            } else {
                triggerDownload(generatedImageUrl);
            }
        } catch (err) {
            console.error("Sharing failed:", err);
            triggerDownload(generatedImageUrl);
        }
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setGenerating(true);
        setErrorMsg(null);
        setGeneratedImageUrl(null);

        try {
            // Short delay to ensure any dynamic content is settled
            await new Promise(resolve => setTimeout(resolve, 300));

            const el = cardRef.current;
            const canvas = await html2canvas(el, {
                scale: 2, // 2 is usually enough and more stable on mobile memory
                backgroundColor: '#0F172A',
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: 340,
                height: el.offsetHeight,
                windowWidth: 340,
                onclone: (clonedDoc) => {
                    const elClone = clonedDoc.getElementById('capture-card');
                    if (elClone) {
                        elClone.style.margin = '0';
                        elClone.style.transform = 'none';
                        elClone.style.position = 'static';
                        elClone.style.display = 'flex';
                        // Reset the responsive scale wrapper so html2canvas
                        // always captures the card at its native 340px size
                        if (elClone.parentElement) {
                            elClone.parentElement.style.transform = 'none';
                            elClone.parentElement.style.height = 'auto';
                        }
                        // Ensure all images in clone have crossOrigin set if they are external
                        const imgs = elClone.getElementsByTagName('img');
                        for (let img of imgs) {
                            if (img.src.startsWith('http')) {
                                img.crossOrigin = 'anonymous';
                            }
                        }
                    }
                }
            });

            const dataUrl = canvas.toDataURL('image/png');
            setGeneratedImageUrl(dataUrl);

        } catch (err) {
            console.error("Screenshot failed:", err);
            setErrorMsg(`Error: ${err.message}. Please try again.`);
        } finally {
            setGenerating(false);
        }
    };

    // Build star display string
    if (!book) return null;

    const rating = book.rating || 0;
    const spice = book.spiceRating || 0;

    const StarIcon = ({ fill = 0, index = 0 }) => {
        const clipId = `starClip-${index}`;
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="rgba(255,255,255,0.15)"
                />
                {fill > 0 && (
                    <g clipPath={`url(#${clipId})`}>
                        <defs>
                            <clipPath id={clipId}>
                                <rect width={`${fill * 24}`} height="24" />
                            </clipPath>
                        </defs>
                        <path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill="#FACC15"
                        />
                    </g>
                )}
            </svg>
        );
    };

    const SpiceIcon = ({ fill = 0 }) => (
        <span style={{ fontSize: '18px', opacity: fill > 0 ? 1 : 0.1 }}>🌶️</span>
    );

    // Inline styles only — no Tailwind, no filters, no blur, no SVGs inside the card
    const cardStyles = {
        width: '340px',
        background: 'linear-gradient(160deg, #1e1145 0%, #0F172A 35%, #0c1422 65%, #1a0e30 100%)',
        borderRadius: '24px',
        padding: '28px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, sans-serif",
        boxSizing: 'border-box',
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-start sm:items-center justify-center p-4 overflow-y-auto animate-fade-in" style={{ backdropFilter: 'none' }}>
            <div className="w-full max-w-md flex flex-col items-center gap-5 pb-4 my-auto">

                {/* Header - outside the card, not captured */}
                <div className="w-full flex justify-between items-center text-white shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Share2 size={18} /> Share your achievement
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={22} />
                    </button>
                </div>

                {generatedImageUrl ? (
                    <div className="w-full flex flex-col items-center gap-4 animate-fade-in px-2">
                        <div style={{ overflow: 'hidden', borderRadius: '16px', border: '2px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                            <img
                                src={generatedImageUrl}
                                alt="Your achievement"
                                style={{ width: '100%', display: 'block', background: '#0F172A' }}
                            />
                        </div>

                        <div className="flex flex-col gap-3 w-full mt-2">
                            <button
                                onClick={handleShare}
                                className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            >
                                <Share2 size={20} /> Share Achievement
                            </button>

                            <button
                                onClick={() => triggerDownload(generatedImageUrl)}
                                className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            >
                                <Download size={20} /> Download Image
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setGeneratedImageUrl(null);
                            }}
                            className="text-white/40 hover:text-white/60 text-xs font-medium py-2 transition-colors"
                        >
                            ← Back to preview
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ===== THE CARD TO CAPTURE ===== */}
                        {/* The card is always 340px wide (required for html2canvas export).
                            The outer container measures available width and scales the card
                            preview down on narrow screens using CSS transform. The html2canvas
                            onclone callback resets the transform so exports are always 340px. */}
                        <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                transformOrigin: 'top center',
                                transform: cardScale < 1 ? `scale(${cardScale})` : 'none',
                                height: cardScale < 1 ? `${cardHeight * cardScale}px` : 'auto',
                            }}>
                        <div id="capture-card" ref={cardRef} style={cardStyles}>

                            {/* Branding row */}
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '8px 14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                                    {logoDataUrl ? (
                                        <img src={logoDataUrl} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'white' }} />
                                    )}
                                    <span style={{ color: 'white', fontWeight: 800, fontSize: '12px', whiteSpace: 'nowrap', letterSpacing: '0.02em', lineHeight: 1 }}>Bookea Reads</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', padding: '6px 14px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                                    <span style={{ color: 'white', fontWeight: 900, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1 }}>MILESTONE</span>
                                </div>
                            </div>

                            {/* Book cover — explicit height, no aspect-ratio */}
                            <div style={{ width: '180px', height: '270px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 16px 32px rgba(0,0,0,0.4)' }}>
                                {coverLoading ? (
                                    <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Loading...</span>
                                    </div>
                                ) : (
                                    <img
                                        src={coverDataUrl}
                                        alt={book.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                )}
                            </div>

                            {/* Title */}
                            <div style={{ textAlign: 'center', marginTop: '20px', width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
                                <div style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '20px', fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: '6px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                    {book.title}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    by <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{book.author}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ width: '60px', height: '1px', background: 'rgba(255,255,255,0.15)', margin: '18px 0' }} />

                            {/* Star rating — SVG based for perfect alignment */}
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px' }}>
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon key={i} index={i} fill={Math.max(0, Math.min(1, rating - i))} />
                                ))}
                            </div>

                            {/* Spice rating */}
                            {spice > 0 && (
                                <div style={{
                                    marginTop: '20px',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '8px 16px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    gap: '6px',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                    {[...Array(5)].map((_, i) => (
                                        <SpiceIcon key={i} fill={Math.max(0, Math.min(1, spice - i))} />
                                    ))}
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', lineHeight: 1 }}>
                                    Reader Achievement Unlocked
                                </span>
                            </div>
                        </div> {/* end capture-card */}
                            </div> {/* end scale wrapper */}
                        </div> {/* end container */}

                        {/* Error display */}
                        {errorMsg && (
                            <div className="w-full px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                                <p className="text-red-300 text-xs text-center">{errorMsg}</p>
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleDownload}
                            disabled={generating || coverLoading}
                            className="w-full py-4 bg-white text-violet-600 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-70 disabled:cursor-wait shrink-0"
                        >
                            {generating ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                                    </svg>
                                    Generating...
                                </span>
                            ) : coverLoading ? (
                                'Loading cover...'
                            ) : (
                                <>
                                    <Download size={20} /> Save Image
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ShareModal;
