import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useBooks } from '../context/BookContext';
import { ChevronRight, Globe, CreditCard, Moon, User, LogOut, UploadCloud, LogIn, MessageSquare, Bug, Download, Upload, Edit2, Camera, X } from 'lucide-react';

const Settings = () => {
    const { toggleTheme, theme, themePreset, setThemePreset } = useTheme();
    const { user, signOut } = useAuth();
    const { syncLocalToCloud, books, exportData, importData, userProfile, updateUserProfile } = useBooks();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackType, setFeedbackType] = useState('feedback'); // 'feedback' or 'bug'
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Profile Edit State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [tempProfile, setTempProfile] = useState({ name: '', avatar: '' });

    const handleFeedback = (type) => {
        setFeedbackType(type);
        setFeedbackMessage('');
        setShowFeedbackModal(true);
    };

    const handleSubmitFeedback = () => {
        const subject = encodeURIComponent(`[BookTracker] ${feedbackType === 'bug' ? 'Bug Report' : 'Feedback'}`);
        const body = encodeURIComponent(`${feedbackMessage}\n\n--\nSent from Book Tracker Web App`);
        window.location.href = `mailto:lbbookspr@gmail.com?subject=${subject}&body=${body}`;
        setShowFeedbackModal(false);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncLocalToCloud();
            if (result.success) {
                alert('✅ Sync Complete!\n\n' + result.message);
            } else {
                alert('❌ Sync Failed\n\n' + result.message);
            }
        } catch (error) {
            alert('❌ Sync Error\n\n' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // Data Management
    const handleExport = () => exportData();
    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = async (event) => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const userConfirmed = confirm('Importing data will overwrite your current library. Are you sure?');

        if (userConfirmed) {
            try {
                const result = await importData(file);
                alert(`Successfully imported ${result.bookCount} books!`);

                // Force navigation to library to show imported books
                window.location.href = '/library';
            } catch (error) {
                console.error('❌ Import error:', error);
                alert('Failed to import: ' + error.message);
            }
        } else {
            // User cancelled
        }

        // Reset file input
        event.target.value = '';
    };

    // Profile Management
    const openProfileModal = () => {
        setTempProfile({
            name: userProfile.name || (user ? user.email.split('@')[0] : 'Guest User'),
            avatar: userProfile.avatar
        });
        setIsProfileModalOpen(true);
    };

    const handleSaveProfile = () => {
        updateUserProfile(tempProfile);
        setIsProfileModalOpen(false);
    };

    const handleAvatarFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempProfile(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const sections = [
        {
            title: 'App Settings',
            items: [
                {
                    icon: <Moon size={20} />,
                    label: 'Dark Mode',
                    action: themePreset === 'default' ? toggleTheme : undefined,
                    isToggle: true,
                    value: theme === 'dark',
                    disabled: themePreset !== 'default',
                    description: themePreset !== 'default' ? 'Only available in Default theme' : null
                },
                {
                    icon: <Edit2 size={20} />,
                    label: 'Theme Preset',
                    value: (
                        <select
                            value={themePreset}
                            onChange={(e) => setThemePreset(e.target.value)}
                            className="bg-transparent border-none text-slate-500 dark:text-slate-400 font-medium outline-none cursor-pointer text-right"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="default">Default</option>
                            <option value="cozy-lofi">Cozy Lofi</option>
                            <option value="paper-ink">Paper & Ink</option>
                        </select>
                    ),
                    noChevron: true
                },
                { icon: <Globe size={20} />, label: 'Language', value: 'English' },
                { icon: <CreditCard size={20} />, label: 'Currency', value: 'USD ($)' },
            ]
        },
        {
            title: 'Data Management',
            items: [
                { icon: <Download size={20} />, label: 'Export Data', action: handleExport },
                { icon: <Upload size={20} />, label: 'Import Data', action: handleImportClick }
            ]
        },
        {
            title: 'Support',
            items: [
                { icon: <MessageSquare size={20} />, label: 'Send Feedback', action: () => handleFeedback('feedback') },
                { icon: <Bug size={20} />, label: 'Report a Bug', action: () => handleFeedback('bug') }
            ]
        }
    ];

    // Determine Display Name and Avatar
    const displayName = userProfile.name || (user ? user.email.split('@')[0] : 'Guest User');
    const displayAvatar = userProfile.avatar;

    return (
        <div className="pb-24 pt-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Settings</h1>

            {/* Profile Section */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-md">
                    {displayAvatar ? (
                        <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User size={32} />
                    )}
                </div>
                <div>
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                        {displayName}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {user ? 'Cloud Sync Enabled' : 'Local Profile'}
                    </p>
                </div>
                <button
                    onClick={openProfileModal}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                    <Edit2 size={18} />
                </button>
            </div>

            <div className="space-y-6">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">{section.title}</h3>
                        <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                            {section.items.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={!item.disabled ? item.action : undefined}
                                    className={`
                                    flex items-center justify-between p-4 transition-colors
                                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                                    ${i !== section.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}
                                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={item.className || "text-slate-400"}>{item.icon}</div>
                                        <div>
                                            <span className={`font-medium ${item.className || "text-slate-700 dark:text-slate-200"}`}>{item.label}</span>
                                            {item.description && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">{item.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.value !== undefined && <span className="text-slate-400 text-sm">{item.value === true ? 'On' : item.value === false ? 'Off' : item.value}</span>}
                                        {item.isToggle ? (
                                            <div className={`w-10 h-6 rounded-full relative transition-colors ${item.value ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${item.value ? 'left-5' : 'left-1'}`} />
                                            </div>
                                        ) : !item.noChevron && (
                                            <ChevronRight size={16} className="text-slate-300" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Auth Actions (Merged) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                    {user ? (
                        <>
                            <div
                                onClick={isSyncing ? undefined : handleSync}
                                className={`flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 ${isSyncing
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3 text-blue-500">
                                    <UploadCloud size={20} className={isSyncing ? 'animate-pulse' : ''} />
                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                        {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
                                    </span>
                                </div>
                                {!isSyncing && <ChevronRight size={16} className="text-slate-300" />}
                            </div>
                            <div onClick={() => signOut()} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50">
                                <div className="flex items-center gap-3 text-red-500"><LogOut size={20} /><span className="font-medium">Sign Out</span></div>
                                <ChevronRight size={16} className="text-slate-300" />
                            </div>
                        </>
                    ) : (
                        <div onClick={() => navigate('/signup')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50">
                            <div className="flex items-center gap-3 text-green-500"><LogIn size={20} /><span className="font-medium">Sign In / Sign Up</span></div>
                            <ChevronRight size={16} className="text-slate-300" />
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center mt-8 text-xs text-slate-400">
                Ver 3.2.0 {user ? '(Cloud Sync Enabled ☁️)' : '(Local Storage Only)'}
            </div>

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            <input type="file" ref={avatarInputRef} onChange={handleAvatarFile} className="hidden" accept="image/*" />

            {/* Profile Edit Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-scale-in flex flex-col items-center">
                        <div className="flex justify-between items-center w-full mb-6">
                            <h3 className="text-xl font-bold dark:text-white">Edit Profile</h3>
                            <button onClick={() => setIsProfileModalOpen(false)}><X className="text-slate-400" /></button>
                        </div>

                        {/* Avatar Picker */}
                        <div className="relative mb-8 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-white dark:ring-slate-700 shadow-xl">
                                {tempProfile.avatar ? (
                                    <img src={tempProfile.avatar} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" />
                            </div>
                            <div className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full ring-2 ring-white">
                                <Edit2 size={12} className="text-white" />
                            </div>
                        </div>

                        {/* Name Input */}
                        <div className="w-full mb-8">
                            <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-wider">Display Name</label>
                            <input
                                type="text"
                                className="w-full text-center text-xl font-bold bg-slate-50 dark:bg-slate-800/50 rounded-xl py-3 outline-none border-2 border-transparent focus:border-blue-500 transition-all dark:text-white"
                                value={tempProfile.name}
                                onChange={e => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter name"
                            />
                        </div>

                        <button onClick={handleSaveProfile} className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-violet-500/30 active:scale-95 transition-all">
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feedbackType === 'bug' ? 'Report a Bug' : 'Send Feedback'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">We'll format this into an email for you.</p>
                        <textarea
                            className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white resize-none mb-4"
                            placeholder="Type your message..."
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleSubmitFeedback} disabled={!feedbackMessage.trim()} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">Send Email</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
