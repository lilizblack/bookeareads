import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Download, 
    Link as LinkIcon, 
    X, 
    Check, 
    Share2, 
    User,
    BookOpen,
    Star,
    Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas';

const ShareProfileCard = ({ profile, books = [], stats = {}, onClose }) => {
    const { t } = useTranslation();
    const cardRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    const displayName = profile?.name || 'Reader';
    const displayAvatar = profile?.avatar;
    const bio = profile?.bio || 'Just reading around...';

    const handleCopyLink = () => {
        const url = `${window.location.origin}/profile/${profile?.username ? '@' + profile.username : profile?.id || ''}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsCapturing(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 3, // for high quality
                backgroundColor: null,
            });
            const link = document.createElement('a');
            link.download = `BookeaProfile_${displayName.replace(/\s/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Failed to capture profile card:', error);
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative animate-scale-in">
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/30 transition-colors"
                title={t('actions.close', 'Close')}
            >
                <X size={18} />
            </button>

            {/* The Actual Card to Capture */}
            <div 
                ref={cardRef}
                className="relative p-8 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white min-h-[500px] flex flex-col items-center text-center justify-center gap-6"
            >
                {/* Decorative Elements */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <Sparkles className="absolute top-10 left-10 text-white/20" size={40} />
                <BookOpen className="absolute bottom-10 right-10 text-white/20" size={60} />
                
                {/* Card Content */}
                <div className="relative z-10 space-y-4">
                    {/* Avatar Container */}
                    <div className="relative inline-block mt-4">
                        <div className="w-28 h-28 rounded-full border-4 border-white/50 p-1 shadow-2xl animate-float">
                            <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-md overflow-hidden flex items-center justify-center">
                                {displayAvatar ? (
                                    <img 
                                        src={displayAvatar} 
                                        alt={displayName} 
                                        crossOrigin="anonymous" // required for html2canvas
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <User size={60} className="text-white/80" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-black tracking-tight">{displayName}</h2>
                        <p className="text-white/80 font-medium text-sm max-w-[240px] line-clamp-2 italic">
                            "{bio}"
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-8 py-4 px-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                        <div className="flex flex-col">
                            <span className="text-2xl font-black">{stats.books || 0}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Read</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black">{stats.tbr || 0}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">TBR</span>
                        </div>
                    </div>

                    {/* App Branding */}
                    <div className="pt-4 flex flex-col items-center">
                        <div className="bg-white text-indigo-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                            Bookea Reads
                        </div>
                        <span className="text-[10px] text-white/60 mt-2 font-medium">Join me on Bookea</span>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800 flex gap-4">
                <button 
                    onClick={handleDownload}
                    disabled={isCapturing}
                    className={`flex-1 py-3 px-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl ${isCapturing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isCapturing ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Download size={18} />
                    )}
                    {t('actions.downloadImg', 'Save Image')}
                </button>
                <button 
                    onClick={handleCopyLink}
                    className="flex-1 py-3 px-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all border border-indigo-200 dark:border-indigo-800"
                >
                    {copied ? <Check size={18} /> : <LinkIcon size={18} />}
                    {copied ? t('common.copied', 'Copied!') : t('common.copyLink', 'Copy Link')}
                </button>
            </div>
        </div>
    );
};

export default ShareProfileCard;
