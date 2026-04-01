import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooks } from '../context/BookContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isSameMonth } from 'date-fns';
import { 
    User, 
    Settings as SettingsIcon, 
    Grid, 
    BookOpen, 
    Heart, 
    Bookmark, 
    Share2, 
    UserPlus, 
    UserCheck, 
    Users,
    MessageCircle,
    ChevronLeft,
    Download,
    Camera,
    Info,
    Globe,
    Tag,
    Hash,
    Plus,
    Check,
    Calendar,
    X as CloseIcon
} from 'lucide-react';
import CoverImage from '../components/CoverImage';
import ShareProfileCard from '../components/ShareProfileCard';
import { getBookProgressPercentage } from '../utils/bookUtils';
import { db } from '../lib/firebaseClient';
import { doc, getDoc, collection, collectionGroup, query, where, getDocs, limit, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const Profile = () => {
    const { username: usernameParam } = useParams(); // e.g. 'lili' or '@lili'
    const { user } = useAuth();
    const { books, userProfile, wantToReadBooks, readingBooks, addBook, readingGoal } = useBooks();
    const { t } = useTranslation();
    const navigate = useNavigate();

    // resolvedUid is the actual Firebase UID of the profile being viewed
    const [resolvedUid, setResolvedUid] = useState(null);
    const isOwnProfile = !usernameParam || resolvedUid === user?.uid;
    
    const [targetProfile, setTargetProfile] = useState(null);
    const [targetBooks, setTargetBooks] = useState({ reading: [], tbr: [], favorites: [], read: [] });
    const [targetReadingGoal, setTargetReadingGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reading');
    const [showShareCard, setShowShareCard] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState('none');
    const [selectedBookForPreview, setSelectedBookForPreview] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Stats
    const favoriteBooks = books.filter(b => b.isFavorite);
    const finishedBooks = books.filter(b => b.status === 'read');
    
    // Calculate Monthly Stats - MOVED BEFORE RETURNS
    const monthlyStats = useMemo(() => {
        const now = new Date();
        const bookList = isOwnProfile ? (books || []) : Array.from(new Map(Object.values(targetBooks || {}).flat().map(b => [b.id, b])).values());
        
        const monthlyBooks = bookList.filter(b => {
            if ((b.status !== 'read' && b.status !== 'completed') || !b.finishedAt) return false;
            try {
                return isSameMonth(parseISO(String(b.finishedAt)), now);
            } catch (e) {
                return false;
            }
        }).length;

        let monthlyPages = 0;
        let monthlyAudioMinutes = 0;

        bookList.forEach(book => {
            const logs = Array.isArray(book.readingLogs) ? book.readingLogs : [];
            const sortedLogs = [...logs].sort((a, b) => {
                try { return new Date(a.date) - new Date(b.date); } catch(e) { return 0; }
            });
            
            const monthLogs = sortedLogs.filter(l => {
                if (!l.date) return false;
                try {
                    return isSameMonth(parseISO(String(l.date)), now);
                } catch(e) {
                    return false;
                }
            });

            if (monthLogs.length > 0) {
                const logsBeforeMonth = sortedLogs.filter(l => {
                    if (!l.date) return false;
                    try {
                        const d = parseISO(String(l.date));
                        return d < now && !isSameMonth(d, now);
                    } catch(e) {
                        return false;
                    }
                });
                const startOfMonthProgress = logsBeforeMonth.length > 0
                    ? Number(logsBeforeMonth[logsBeforeMonth.length - 1].pagesRead) || 0
                    : 0;
                
                const endOfMonthProgress = Math.max(...monthLogs.map(l => Number(l.pagesRead) || 0));
                const readInMonth = Math.max(0, endOfMonthProgress - startOfMonthProgress);
                
                const mode = book.tracking_unit || book.progressMode || (book.format === 'Audiobook' ? 'minutes' : 'pages');
                
                if (mode === 'minutes') {
                    monthlyAudioMinutes += readInMonth;
                } else if (mode === 'pages') {
                    monthlyPages += readInMonth;
                } else if (mode === 'chapters' && book.totalPages && book.totalChapters) {
                    monthlyPages += Math.round((readInMonth / book.totalChapters) * book.totalPages);
                }
            }
        });

        // Format audio time as "Xh Ym" or "Xm"
        const audioHours = Math.floor(monthlyAudioMinutes / 60);
        const audioMins = monthlyAudioMinutes % 60;
        const audioTimeStr = audioHours > 0 ? `${audioHours}h ${audioMins}m` : `${audioMins}m`;

        return { 
            books: monthlyBooks, 
            pages: monthlyPages,
            audioMinutes: monthlyAudioMinutes,
            audioTimeStr,
            monthName: format(now, 'MMMM')
        };
    }, [isOwnProfile, books, targetBooks]);

    // Yearly Goal Progress
    const yearlyGoalProgress = useMemo(() => {
        const activeGoal = isOwnProfile ? readingGoal : targetReadingGoal;
        if (!activeGoal?.yearly) return null;
        
        const currentYear = new Date().getFullYear();
        const bookList = isOwnProfile ? books : Array.from(new Map(Object.values(targetBooks || {}).flat().map(b => [b.id, b])).values());
        
        const booksReadThisYear = bookList.filter(b => {
            if (b.status !== 'read' && b.status !== 'completed') return false;
            if (!b.finishedAt) return false;
            try { return parseISO(b.finishedAt).getFullYear() === currentYear; } catch { return false; }
        }).length;
        
        const goal = activeGoal.yearly;
        const pct = Math.min(100, Math.round((booksReadThisYear / goal) * 100));
        return { read: booksReadThisYear, goal, pct, year: currentYear };
    }, [isOwnProfile, books, readingGoal, targetReadingGoal, targetBooks]);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!usernameParam) {
                // Own profile
                setResolvedUid(user?.uid || null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Step 1: Resolve username -> UID via collectionGroup query
                const cleanUsername = usernameParam.replace(/^@/, '').toLowerCase();
                let targetUid = null;
                let profileData = null;

                const profileGroup = collectionGroup(db, 'profile');
                const q = query(profileGroup, where('username', '==', cleanUsername), limit(1));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const profileDoc = snap.docs[0];
                    profileData = profileDoc.data();
                    // users/{uid}/profile/{docId}  →  parent.parent.id = uid
                    targetUid = profileDoc.ref.parent.parent.id;
                }

                if (!targetUid) {
                    setLoading(false);
                    return; // profile not found
                }

                setResolvedUid(targetUid);

                // If this turns out to be the logged-in user, stop (own profile)
                if (targetUid === user?.uid) {
                    setLoading(false);
                    return;
                }

                // Step 2: Set profile and fetch books
                setTargetProfile(profileData);

                const booksRef = collection(db, 'users', targetUid, 'books');
                const booksQuery = query(booksRef); // Removed limit(20) to accurately fetch all books for stats
                const booksSnap = await getDocs(booksQuery);
                
                // Convert Firestore Timestamps to ISO strings so parseISO works securely
                const allUserBooks = booksSnap.docs.map(d => {
                    const data = d.data();
                    
                    const toISO = (val) => {
                        if (!val) return null;
                        if (typeof val === 'string') return val;
                        if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
                        if (val.seconds !== undefined) return new Date(val.seconds * 1000).toISOString();
                        return val;
                    };

                    return {
                        id: d.id,
                        ...data,
                        addedAt: toISO(data.addedAt),
                        startedAt: toISO(data.startedAt),
                        finishedAt: toISO(data.finishedAt),
                        updatedAt: toISO(data.updatedAt),
                        readingLogs: (data.readingLogs || []).map(log => ({
                            ...log,
                            date: toISO(log.date)
                        }))
                    };
                });

                setTargetBooks({
                    reading: allUserBooks.filter(b => b.status === 'reading'),
                    tbr: allUserBooks.filter(b => b.status === 'want-to-read'),
                    favorites: allUserBooks.filter(b => b.isFavorite),
                    read: allUserBooks.filter(b => b.status === 'read' || b.status === 'completed')
                });

                // Fetch target user's reading goal
                try {
                    const currentYear = new Date().getFullYear().toString();
                    const goalDoc = await getDoc(doc(db, 'users', targetUid, 'goals', currentYear));
                    if (goalDoc.exists()) {
                        setTargetReadingGoal({
                            yearly: goalDoc.data().yearlyGoal || 15,
                            monthly: goalDoc.data().monthlyGoal || 2
                        });
                    } else {
                        // Fallback goal if user hasn't actively set one
                        setTargetReadingGoal({ yearly: 15, monthly: 2 });
                    }
                } catch (err) {
                    console.error('Error fetching target reading goal:', err);
                    setTargetReadingGoal({ yearly: 15, monthly: 2 }); // fallback
                }

                // Step 3: Check friendship status
                if (user?.uid) {
                    const friendshipsRef = collection(db, 'friendships');
                    const qFriend = query(friendshipsRef,
                        where('participants', 'array-contains', user.uid),
                        limit(20)
                    );
                    const friendSnap = await getDocs(qFriend);
                    const match = friendSnap.docs.find(d => d.data().participants.includes(targetUid));
                    setFriendshipStatus(match ? match.data().status : 'none');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [usernameParam, user?.uid]);

    // Handle Send Friend Request
    const handleSendFriendRequest = async () => {
        if (!user) { navigate('/signup'); return; }
        if (!resolvedUid) return;
        try {
            await addDoc(collection(db, 'friendships'), {
                participants: [user.uid, resolvedUid],
                requesterId: user.uid,
                receiverId: resolvedUid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setFriendshipStatus('pending');
            alert(t('messages.success.requestSent', { defaultValue: 'Friend request sent!' }));
        } catch (error) {
            console.error('Error sending request:', error);
            alert(t('messages.error.generic', { defaultValue: 'Something went wrong.' }));
        }
    };

    // Handle Add to Library
    const handleAddToLibrary = async (book) => {
        if (!user) {
            navigate('/signup');
            return;
        }
        
        setIsAdding(true);
        try {
            await addBook({
                title: book.title,
                author: book.author,
                cover: book.cover,
                isbn: book.isbn,
                language: book.language,
                genres: book.genres,
                description: book.description,
                format: book.format,
                totalPages: book.totalPages,
                totalChapters: book.totalChapters,
                total_duration_minutes: book.total_duration_minutes,
                hasSpice: book.hasSpice,
                progressMode: book.progressMode,
                tracking_unit: book.tracking_unit,
                status: 'want-to-read',
                addedAt: new Date().toISOString(),
                progress: 0,
                rating: 0,
                spiceRating: 0,
                isOwned: false,
                isFavorite: false,
                toBuy: false
            });
            alert(t('messages.success.addedToLibrary', { defaultValue: 'Book added to your library!' }));
            setSelectedBookForPreview(null);
        } catch (error) {
            console.error('Error adding book:', error);
            alert(t('messages.error.generic', { defaultValue: 'Something went wrong.' }));
        } finally {
            setIsAdding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">{t('common.loading', 'Loading profile...')}</p>
            </div>
        );
    }

    if (!targetProfile && !isOwnProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <User size={40} className="text-slate-400" />
                </div>
                <h2 className="text-xl font-bold dark:text-white mb-2">{t('profile.notFound', 'Profile Not Found')}</h2>
                <p className="text-slate-500 mb-6">{t('profile.notFoundDesc', 'The user you are looking for does not exist or has a private profile.')}</p>
                <button 
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold"
                >
                    {t('actions.goBack', 'Go Back')}
                </button>
            </div>
        );
    }

    const displayName = isOwnProfile ? (userProfile?.name || 'Reader') : (targetProfile?.name || 'Reader');
    const displayAvatar = isOwnProfile ? userProfile?.avatar : targetProfile?.avatar;
    const bio = isOwnProfile ? (userProfile?.bio || t('profile.noBio')) : (targetProfile?.bio || t('profile.noBio'));
    
    const displayBooks = isOwnProfile ? {
        reading: readingBooks || [],
        tbr: wantToReadBooks || [],
        favorites: favoriteBooks || [],
        read: finishedBooks || []
    } : (targetBooks || { reading: [], tbr: [], favorites: [], read: [] });

    const stats = {
        reading: displayBooks.reading.length,
        books: displayBooks.read.length,
        tbr: displayBooks.tbr.length,
        friends: 0 // Mocked
    };

    // Unified profile object for sharing — always populated
    const displayProfile = {
        name: displayName,
        avatar: displayAvatar,
        bio,
        username: isOwnProfile ? userProfile?.username : targetProfile?.username,
    };

    const tabs = [
        { id: 'reading', label: t('book.status.reading'), icon: BookOpen, count: isOwnProfile ? readingBooks.length : targetBooks.reading.length },
        { id: 'tbr', label: t('book.fields.tbr', 'TBR'), icon: Bookmark, count: isOwnProfile ? wantToReadBooks.length : targetBooks.tbr.length },
        { id: 'read', label: t('book.status.read'), icon: Check, count: isOwnProfile ? finishedBooks.length : targetBooks.read.length },
        { id: 'favorites', label: t('nav.favorites'), icon: Heart, count: isOwnProfile ? favoriteBooks.length : targetBooks.favorites.length }
    ];

    const currentBooks = displayBooks[activeTab] || [];

    return (
        <div className="pb-24 animate-fade-in max-w-2xl mx-auto">
            {/* Navigation Header */}
            <div className="flex items-center justify-between py-4 px-2 mb-4 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 transition-colors">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ChevronLeft size={24} className="dark:text-white" />
                </button>
                <h1 className="font-bold text-lg dark:text-white">{displayName}</h1>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setShowShareCard(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        title="Share Profile"
                    >
                        <Share2 size={20} className="dark:text-white" />
                    </button>
                    {isOwnProfile && (
                        <button 
                            onClick={() => navigate('/settings')}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <SettingsIcon size={20} className="dark:text-white" />
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Header (Instagram Style) */}
            <div className="px-4 mb-8">
                <div className="flex items-center gap-6 mb-6">
                    {/* Avatar */}
                    <div className="relative group overflow-hidden">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 shadow-xl overflow-hidden ring-2 ring-violet-500/20">
                            {displayAvatar ? (
                                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <User size={48} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 flex justify-between px-2">
                        <div className="flex flex-col items-center">
                            <span className="font-black text-lg dark:text-white">{stats.reading}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{t('book.status.reading', 'Reading')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-black text-lg dark:text-white">{stats.books}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{t('stats.read', 'Completed')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-black text-lg dark:text-white">{stats.tbr}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{t('stats.tbr', 'TBR')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-black text-lg dark:text-white">{stats.friends}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{t('stats.friends', 'Friends')}</span>
                        </div>
                    </div>
                </div>

                {/* Bio & Actions */}
                <div className="space-y-4">
                    <div>
                        <h2 className="font-black dark:text-white text-base">{displayName}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap mt-1 leading-relaxed">
                            {bio}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {isOwnProfile ? (
                            <>
                                <button 
                                    onClick={() => navigate('/settings')}
                                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                                >
                                    {t('settings.editProfile', 'Edit Profile')}
                                </button>
                                <button className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg transition-all active:scale-95 border border-slate-200 dark:border-slate-700">
                                    <Users size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                {friendshipStatus === 'none' ? (
                                    <button 
                                        onClick={() => handleSendFriendRequest()}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        <UserPlus size={16} />
                                        {t('profile.addFriend', 'Add Friend')}
                                    </button>
                                ) : friendshipStatus === 'pending' ? (
                                    <button className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-sm font-bold transition-all cursor-default flex items-center justify-center gap-2">
                                        <UserCheck size={16} />
                                        {t('profile.requestSent', 'Request Sent')}
                                    </button>
                                ) : (
                                    <button className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Users size={16} />
                                        {t('profile.friends', 'Friends')}
                                    </button>
                                )}
                                <button className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                                    <MessageCircle size={16} />
                                    {t('profile.message', 'Message')}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Monthly Activity Card */}
                <div className="mt-6 mb-2 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/20 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Calendar size={20} />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{monthlyStats.monthName} Activity</h4>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Books completed */}
                        <div className="flex-1 min-w-[70px] bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none block">{monthlyStats.books}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{monthlyStats.books === 1 ? t('book.status.read') : t('stats.read', 'Books Read')}</span>
                        </div>
                        {/* Pages read */}
                        {monthlyStats.pages > 0 && (
                            <div className="flex-1 min-w-[70px] bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none block">{monthlyStats.pages.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t('book.fields.pages')}</span>
                            </div>
                        )}
                        {/* Audio time */}
                        {monthlyStats.audioMinutes > 0 && (
                            <div className="flex-1 min-w-[70px] bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none block">{monthlyStats.audioTimeStr}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">🎧 Listened</span>
                            </div>
                        )}
                    </div>

                    {/* Yearly Goal Progress — own profile only */}
                    {yearlyGoalProgress && (
                        <div className="pt-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                                    {yearlyGoalProgress.year} Reading Goal
                                </span>
                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                                    {yearlyGoalProgress.read}
                                    <span className="font-bold text-slate-400"> / {yearlyGoalProgress.goal} books</span>
                                </span>
                            </div>
                            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ 
                                        width: `${yearlyGoalProgress.pct}%`,
                                        background: yearlyGoalProgress.pct >= 100
                                            ? 'linear-gradient(90deg,#10b981,#34d399)'
                                            : 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[9px] font-bold text-slate-400">{yearlyGoalProgress.pct}% complete</span>
                                {yearlyGoalProgress.pct >= 100 
                                    ? <span className="text-[9px] font-black text-emerald-500">🎉 Goal achieved!</span>
                                    : <span className="text-[9px] font-bold text-slate-400">{yearlyGoalProgress.goal - yearlyGoalProgress.read} left</span>
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-slate-100 dark:border-slate-800">
                <div className="flex">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                                    activeTab === tab.id 
                                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' 
                                        : 'border-transparent text-slate-400'
                                }`}
                            >
                                <Icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.count || 0}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-3 gap-1 pt-1 bg-white dark:bg-slate-950 min-h-[40vh]">
                {currentBooks.length > 0 ? (
                    currentBooks.map((book) => (
                        <div 
                            key={book.id} 
                            onClick={() => {
                                if (isOwnProfile) {
                                    navigate(`/book/${book.id}`);
                                } else {
                                    setSelectedBookForPreview(book);
                                }
                            }}
                            className="aspect-[2/3] relative group cursor-pointer overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50"
                        >
                            <div className="w-full h-full relative overflow-hidden">
                                <CoverImage 
                                    src={book.cover} 
                                    title={book.title}
                                    author={book.author}
                                    className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105" 
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            {/* Progress Overlay for Active Tab */}
                            {activeTab === 'reading' && (
                                (() => {
                                    const percent = getBookProgressPercentage(book);
                                    
                                    if (percent > 0) {
                                        return (
                                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30 backdrop-blur-sm">
                                                <div 
                                                    className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-500" 
                                                    style={{ width: `${percent}%` }}
                                                />
                                                <div className="absolute bottom-2 right-1.5 px-1.5 py-0.5 bg-blue-600/90 backdrop-blur-md rounded text-[9px] font-black text-white shadow-lg flex items-center gap-0.5">
                                                    <BookOpen size={8} />
                                                    {percent}%
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;

                                })()
                            )}
                            {book.isFavorite && (
                                <div className="absolute top-2 right-2 p-1 bg-black/40 backdrop-blur-md rounded-full shadow-lg">
                                    <Heart size={12} fill="#ef4444" className="text-red-500" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                                <span className="text-[10px] font-black leading-tight drop-shadow-md mb-1">{book.title}</span>
                                <span className="text-[8px] font-bold text-white/70">{book.author}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 py-20 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                        <Bookmark size={40} strokeWidth={1} />
                        <p className="text-sm font-medium">{t('profile.noBooks') || 'No books in this list yet.'}</p>
                    </div>
                )}
            </div>

            {/* Share Modal */}
            {showShareCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareCard(false)}>
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
                        <ShareProfileCard 
                            profile={displayProfile} 
                            books={currentBooks.slice(0, 3)} 
                            stats={stats}
                            onClose={() => setShowShareCard(false)} 
                        />
                    </div>
                </div>
            )}

            {/* Quick View Modal */}
            {selectedBookForPreview && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedBookForPreview(null)}>
                    <div 
                        onClick={e => e.stopPropagation()} 
                        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[90vh]"
                    >
                        {/* Header Image */}
                        <div className="relative h-48 sm:h-56 overflow-hidden">
                            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />
                            <CoverImage 
                                src={selectedBookForPreview.cover} 
                                title={selectedBookForPreview.title}
                                className="w-full h-full object-cover brightness-50 blur-[2px]" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent" />
                            
                            <button 
                                onClick={() => setSelectedBookForPreview(null)}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
                            >
                                <CloseIcon size={20} />
                            </button>

                            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4">
                                <div className="w-24 h-36 bg-white dark:bg-slate-800 rounded-lg shadow-2xl overflow-hidden ring-4 ring-white dark:ring-slate-900 flex-shrink-0">
                                    <CoverImage src={selectedBookForPreview.cover} title={selectedBookForPreview.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 pb-1">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white line-clamp-2 leading-tight">{selectedBookForPreview.title}</h3>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{selectedBookForPreview.author}</p>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 pt-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Hash size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">ISBN</span>
                                    </div>
                                    <p className="text-xs font-bold dark:text-white truncate">{selectedBookForPreview.isbn || '---'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Globe size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('book.fields.language')}</span>
                                    </div>
                                    <p className="text-xs font-bold dark:text-white">{selectedBookForPreview.language || 'English'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Tag size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('book.fields.genre')}</span>
                                    </div>
                                    <p className="text-xs font-bold dark:text-white truncate">
                                        {Array.isArray(selectedBookForPreview.genres) ? selectedBookForPreview.genres[0] : selectedBookForPreview.genre || '---'}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <BookOpen size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('book.fields.pages')}</span>
                                    </div>
                                    <p className="text-xs font-bold dark:text-white">{selectedBookForPreview.totalPages || '---'}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center gap-2 text-slate-400 mb-2">
                                    <Info size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('book.fields.description')}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-32 overflow-y-auto pr-2">
                                    {selectedBookForPreview.description || t('book.noDescription', 'No description available for this book.')}
                                </p>
                            </div>

                            <button 
                                onClick={() => handleAddToLibrary(selectedBookForPreview)}
                                disabled={isAdding}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Plus size={18} />
                                {isAdding ? t('common.loading') : t('actions.addToLibrary', 'Add to Library')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
