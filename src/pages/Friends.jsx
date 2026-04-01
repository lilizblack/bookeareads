import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../context/BookContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
    Search, 
    UserPlus, 
    Users, 
    UserCheck, 
    X, 
    ChevronRight, 
    Clock, 
    User,
    Check
} from 'lucide-react';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    serverTimestamp,
    onSnapshot,
    limit,
    getDoc,
    collectionGroup
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { AtSign } from 'lucide-react';

const Friends = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list', 'requests'

    // Real-time listener for friends and requests
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const friendshipsRef = collection(db, 'friendships');
        
        // Query all friendships involving current user
        // Note: orderBy('createdAt') requires a composite index with array-contains.
        // We sort client-side to avoid the index requirement causing silent empty results.
        const q = query(
            friendshipsRef,
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            try {
                const allFriendships = [];
                
                for (const docSnap of snapshot.docs) {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    
                    const otherUid = data.participants.find(p => p !== user.uid);
                    if (!otherUid) continue;

                    const profileRef = doc(db, 'users', otherUid, 'profile', 'info');
                    const otherProfileSnap = await getDoc(profileRef);
                    const otherProfile = otherProfileSnap.exists() ? otherProfileSnap.data() : { name: 'Unknown Reader' };

                    allFriendships.push({
                        friendshipId: docSnap.id,
                        status: data.status,
                        requesterId: data.requesterId,
                        createdAt: data.createdAt,
                        otherUser: {
                            uid: otherUid,
                            ...otherProfile
                        }
                    });
                }

                // Sort client-side by createdAt descending
                allFriendships.sort((a, b) => {
                    const aTime = a.createdAt?.toMillis?.() ?? 0;
                    const bTime = b.createdAt?.toMillis?.() ?? 0;
                    return bTime - aTime;
                });

                setFriends(allFriendships.filter(f => f.status === 'accepted'));
                setRequests(allFriendships.filter(f => f.status === 'pending'));
                setLoading(false);
            } catch (err) {
                console.error('Error processing friendships:', err);
                setLoading(false);
            }
        }, (error) => {
            console.error('Error listening to friendships:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Auto-switch to Requests tab when there are incoming (not sent) requests
    useEffect(() => {
        const incomingCount = requests.filter(r => r.requesterId !== user?.uid).length;
        if (incomingCount > 0 && activeTab === 'list' && friends.length === 0) {
            setActiveTab('requests');
        }
    }, [requests]);

    if (!user && !loading) {
        return (
            <div className="py-20 text-center flex flex-col items-center gap-6 px-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                    <User size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('auth.signInRequired', 'Sign in to see friends')}</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">{t('auth.signInReason', 'You need to be logged in to search for readers, send friend requests, and track progress together.')}</p>
                </div>
                <button 
                    onClick={() => navigate('/settings')}
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                    {t('auth.gotoAccount', 'Go to Account')}
                </button>
            </div>
        );
    }

    const handleSearch = async (e) => {
        e.preventDefault();
        const cleanQuery = searchQuery.trim().toLowerCase().replace(/^@/, '');
        if (!cleanQuery || !user) return;
        
        setIsSearching(true);
        try {
            // Search by username using Collection Group query
            const profileGroup = collectionGroup(db, 'profile');
            const q = query(profileGroup, where('username', '==', cleanQuery), limit(20));
            const snap = await getDocs(q);
            
            const results = [];
            for (const docSnap of snap.docs) {
                const data = docSnap.data();
                // Parent document of users/{uid}/profile/info is users/{uid}/profile
                // Parent of that is users/{uid}
                const uid = docSnap.ref.parent.parent.id;
                
                if (uid !== user.uid) {
                    results.push({
                        uid,
                        ...data,
                        displayName: data.name || data.displayName || 'Unknown Reader'
                    });
                }
            }
            
            // If no exact username match, fallback to exact display name search if needed
            // But the user specifically asked for username-based search
            if (results.length === 0) {
                // Try display name search as fallback
                const usersRef = collection(db, 'users');
                const displayNameQuery = query(usersRef, where('displayName', '==', searchQuery.trim()), limit(10));
                const nameSnap = await getDocs(displayNameQuery);
                
                for (const d of nameSnap.docs) {
                    if (d.id !== user.uid) {
                        // Fetch the profile for this user to get their username
                        const profileRef = doc(db, 'users', d.id, 'profile', 'info');
                        const pSnap = await getDoc(profileRef);
                        const pData = pSnap.exists() ? pSnap.data() : {};
                        
                        results.push({
                            uid: d.id,
                            ...d.data(),
                            ...pData,
                            displayName: d.data().displayName || pData.name || 'Unknown Reader'
                        });
                    }
                }
            }
            
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const sendRequest = async (targetUid) => {
        if (!user) return;
        try {
            const friendshipsRef = collection(db, 'friendships');

            // Check if a relationship already exists in either direction
            const existingQ = query(
                friendshipsRef,
                where('participants', 'array-contains', user.uid)
            );
            const existingSnap = await getDocs(existingQ);
            const alreadyExists = existingSnap.docs.some(d => 
                d.data().participants.includes(targetUid)
            );

            if (alreadyExists) {
                alert('You already have a request or friendship with this user.');
                setSearchResults(prev => prev.filter(r => r.uid !== targetUid));
                return;
            }

            await addDoc(friendshipsRef, {
                participants: [user.uid, targetUid],
                requesterId: user.uid,
                receiverId: targetUid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            alert('Friend request sent! ✅');
            setSearchResults(prev => prev.filter(r => r.uid !== targetUid));
        } catch (error) {
            console.error('Error sending request:', error);
        }
    };

    const respondToRequest = async (friendshipId, accept) => {
        try {
            const docRef = doc(db, 'friendships', friendshipId);
            if (accept) {
                await updateDoc(docRef, { 
                    status: 'accepted',
                    acceptedAt: serverTimestamp()
                });
            } else {
                // For rejection, we can delete or update status
                await updateDoc(docRef, { status: 'rejected' });
            }
        } catch (error) {
            console.error('Error responding to request:', error);
        }
    };

    return (
        <div className="pb-24 animate-fade-in max-w-2xl mx-auto px-4 pt-4">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('nav.friends', 'Friend List')}</h1>
                    <p className="text-slate-500 font-medium">{t('friends.subtitle', 'Connect with other readers and track together.')}</p>
                </div>
                <button 
                    onClick={() => navigate('/profile')}
                    aria-label={t('nav.profile', 'My Profile')}
                    className="p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-500/30 hover:text-blue-500 transition-all shadow-sm active:scale-95 group relative"
                >
                    <User size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                        {t('nav.profile', 'My Profile')}
                    </span>
                </button>
            </header>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative mb-8 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('friends.searchPlaceholder', 'Find readers by @username or name...')}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all shadow-sm focus:shadow-blue-500/10 placeholder:text-slate-400 dark:text-white"
                />
                {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                )}
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="mb-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100/50 dark:border-blue-800/30">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t('friends.searchResults', 'People found')}</h3>
                        <button onClick={() => setSearchResults([])} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>
                    <div className="space-y-3">
                        {searchResults.map((res) => (
                            <div key={res.uid} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                                        {res.avatar ? <img src={res.avatar} className="w-full h-full object-cover" /> : <User size={20} className="text-blue-600" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold dark:text-white leading-none">{res.displayName}</span>
                                        {res.username && (
                                            <p className="text-violet-500 font-bold text-[10px] flex items-center gap-0.5 mt-0.5">
                                                <AtSign size={8} strokeWidth={3} />
                                                {res.username}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => sendRequest(res.uid)}
                                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-90"
                                >
                                    <UserPlus size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Tabs */}
            <div className="flex gap-4 mb-6">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                    <Users size={16} />
                    {t('friends.allFriends', 'All Friends')}
                    {friends.length > 0 && <span className="ml-1 opacity-50">{friends.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                    <Clock size={16} />
                    {t('friends.pending', 'Requests')}
                    {(() => {
                        const incoming = requests.filter(r => r.requesterId !== user?.uid).length;
                        const outgoing = requests.filter(r => r.requesterId === user?.uid).length;
                        if (incoming > 0) return <span className="ml-1 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] animate-pulse">{incoming}</span>;
                        if (outgoing > 0) return <span className="ml-1 opacity-50">{outgoing}</span>;
                        return null;
                    })()}
                </button>
            </div>

            {/* List View */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
                ) : activeTab === 'list' ? (
                    friends.length > 0 ? (
                        friends.map((item) => (
                            <div 
                                key={item.friendshipId} 
                                onClick={() => navigate(`/profile/${item.otherUser.username ? '@' + item.otherUser.username : item.otherUser.uid}`)}
                                className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 dark:hover:border-blue-500/30 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden ring-2 ring-slate-50 dark:ring-slate-800">
                                        {item.otherUser.avatar ? (
                                            <img src={item.otherUser.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 dark:text-white">{item.otherUser.name || 'Unknown'}</h3>
                                        <p className="text-xs text-slate-500 line-clamp-1">{item.otherUser.bio || 'Book lover'}</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
                            <Users size={48} strokeWidth={1} />
                            <p className="font-medium text-slate-500">{t('friends.empty', 'No friends added yet. Start searching!')}</p>
                        </div>
                    )
                ) : (
                    requests.length > 0 ? (
                        requests.map((req) => (
                            <div key={req.friendshipId} className="p-5 bg-white dark:bg-slate-900 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                        {req.otherUser.avatar ? <img src={req.otherUser.avatar} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold dark:text-white leading-none mb-1">{req.otherUser.name || 'Unknown Reader'}</h3>
                                        <p className="text-[11px] text-slate-500 uppercase font-black tracking-tight flex items-center gap-1">
                                            {req.requesterId === user.uid ? (
                                                <><Clock size={10} /> {t('friends.outRequest', 'Sent Request')}</>
                                            ) : (
                                                <><UserPlus size={10} /> {t('friends.inRequest', 'Wants to be friends')}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                
                                {req.requesterId !== user.uid && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => respondToRequest(req.friendshipId, true)}
                                            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                        >
                                            <Check size={16} /> {t('actions.accept', 'Accept')}
                                        </button>
                                        <button 
                                            onClick={() => respondToRequest(req.friendshipId, false)}
                                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-black hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all"
                                        >
                                            {t('actions.decline', 'Decline')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
                            <Clock size={48} strokeWidth={1} />
                            <p className="font-medium text-slate-500">{t('friends.noRequests', 'No pending requests.')}</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Friends;
