import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useBooks } from '../context/BookContext';
import { ChevronRight, Globe, CreditCard, Moon, User, LogOut, UploadCloud, LogIn, MessageSquare, Bug, Download, Upload, Edit2, Camera, X, Save, Users, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { collectionGroup, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { db, storage } from '../lib/firebaseClient';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { AtSign } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import CustomSelect from '../components/CustomSelect';
import { useTranslation } from 'react-i18next';
import FormInput from '../components/FormInput';
import FormTextarea from '../components/FormTextarea';
import FormButton from '../components/FormButton';
import pkg from '../../package.json';

const Settings = () => {
    const { t } = useTranslation();
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
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    const {
        updateServiceWorker,
    } = useRegisterSW();

    // Profile Edit State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [tempProfile, setTempProfile] = useState({ 
        name: '', 
        firstName: '', 
        lastName: '', 
        username: '', 
        avatar: '' 
    });
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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
                alert('✅ ' + t('messages.success.syncComplete') + '\n\n' + result.message);
            } else {
                alert('❌ ' + t('messages.error.syncFailed') + '\n\n' + result.message);
            }
        } catch (error) {
            alert('❌ ' + t('messages.error.syncError') + '\n\n' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    // If update found, the UpdateToast will handle showing the UI
                    // If no update found, we can show a small message
                    setTimeout(() => {
                        setIsCheckingUpdate(false);
                        // We don't easily know if an update was found or not without more complex logic
                        // but if no toast appears after a second, it's likely up to date
                    }, 1000);
                } else {
                    setIsCheckingUpdate(false);
                }
            } else {
                setIsCheckingUpdate(false);
            }
        } catch (error) {
            console.error('Update check failed:', error);
            setIsCheckingUpdate(false);
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

        const userConfirmed = confirm(t('messages.confirm.importData'));

        if (userConfirmed) {
            try {
                const result = await importData(file);
                let message = t('messages.success.importSuccess', { count: result.bookCount });
                if (result.duplicatesRemoved > 0) {
                    message += '\n\n' + t('messages.success.importDuplicates', { count: result.duplicatesRemoved });
                }
                alert(message);

                // Force navigation to library to show imported books
                window.location.href = '/library';
            } catch (error) {
                console.error('❌ Import error:', error);
                alert(t('messages.error.importFailed') + ': ' + error.message);
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
            firstName: userProfile.firstName || '',
            lastName: userProfile.lastName || '',
            username: userProfile.username || '',
            avatar: userProfile.avatar,
            bio: userProfile.bio || '',
            isPublic: userProfile.isPublic ?? true
        });
        setUsernameError('');
        setIsProfileModalOpen(true);
    };

    const handleSaveProfile = async () => {
        if (tempProfile.username !== userProfile.username) {
            setIsCheckingUsername(true);
            try {
                // Unique check via Collection Group query on 'profile' collections
                // Note: The structure is users/{uid}/profile/info
                const profileGroup = collectionGroup(db, 'profile');
                const q = query(profileGroup, where('username', '==', tempProfile.username.toLowerCase()));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    setUsernameError(t('settings.usernameTaken', { defaultValue: 'This username is already taken.' }));
                    setIsCheckingUsername(false);
                    return;
                }
            } catch (error) {
                console.error("Error checking username:", error);
            } finally {
                setIsCheckingUsername(false);
            }
        }

        updateUserProfile(tempProfile);
        setIsProfileModalOpen(false);
    };

    const handleNameChange = (e, field) => {
        const val = e.target.value;
        setTempProfile(prev => {
            const updated = { ...prev, [field]: val };
            
            // Reconstruct full name
            if (field === 'firstName' || field === 'lastName') {
                updated.name = `${updated.firstName} ${updated.lastName}`.trim();
                
                // Only auto-generate username if it's currently empty
                if (!prev.username) {
                    const baseName = updated.name.toLowerCase().replace(/\s+/g, '');
                    if (baseName) {
                        updated.username = baseName + Math.floor(1000 + Math.random() * 9000);
                    }
                }
            }
            
            return updated;
        });
    };

    const handleAvatarFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        // Show a local preview immediately while uploading
        const localPreview = URL.createObjectURL(file);
        setTempProfile(prev => ({ ...prev, avatar: localPreview }));
        setIsUploadingAvatar(true);

        try {
            // Upload to Firebase Storage at avatars/{uid}/profile.{ext}
            const ext = file.name.split('.').pop();
            const storageRef = ref(storage, `avatars/${user.uid}/profile.${ext}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed', null, reject, resolve);
            });

            const downloadURL = await getDownloadURL(storageRef);
            setTempProfile(prev => ({ ...prev, avatar: downloadURL }));
        } catch (err) {
            console.error('Avatar upload failed:', err);
            alert('Failed to upload profile picture. Please try again.');
            // Revert to previous avatar
            setTempProfile(prev => ({ ...prev, avatar: userProfile.avatar || '' }));
        } finally {
            setIsUploadingAvatar(false);
            // Clean up the object URL
            URL.revokeObjectURL(localPreview);
        }
    };

    const sections = [
        {
            title: t('settings.preferences'),
            items: [
                {
                    icon: <Moon size={20} />,
                    label: t('settings.darkMode'),
                    action: themePreset === 'default' ? toggleTheme : undefined,
                    isToggle: true,
                    value: theme === 'dark',
                    disabled: themePreset !== 'default',
                    description: themePreset !== 'default' ? t('settings.onlyDefaultTheme', { defaultValue: 'Only available in Default theme' }) : null
                },
                {
                    icon: <Edit2 size={20} />,
                    label: t('settings.themePreset'),
                    value: (
                        <div className="min-w-[140px]">
                            <CustomSelect
                                value={themePreset}
                                onChange={(e) => setThemePreset(e.target.value)}
                                options={[
                                    { value: 'default', label: t('settings.default') },
                                    { value: 'cozy-lofi', label: t('settings.cozyLofi') },
                                    { value: 'paper-ink', label: t('settings.paperInk') },
                                    { value: 'dark-romance', label: t('settings.darkRomance', { defaultValue: 'Dark Romance' }) },
                                    { value: 'romance', label: t('settings.romance', { defaultValue: 'Romance' }) }
                                ]}
                                className="text-sm"
                            />
                        </div>
                    ),
                    noChevron: true
                },
                {
                    icon: <Globe size={20} />,
                    label: t('settings.language'),
                    value: <LanguageSwitcher />,
                    noChevron: true
                },
                { icon: <CreditCard size={20} />, label: t('book.fields.currency'), value: 'USD ($)' },
            ]
        },
        {
            title: t('settings.dataManagement'),
            items: [
                { icon: <Download size={20} />, label: t('settings.exportData'), action: handleExport },
                { icon: <Upload size={20} />, label: t('settings.importData'), action: handleImportClick }
            ]
        },
        {
            title: t('settings.support'),
            items: [
                {
                    icon: <RefreshCw size={20} className={isCheckingUpdate ? 'animate-spin' : ''} />,
                    label: t('settings.checkUpdate', { defaultValue: 'Check for Updates' }),
                    action: handleCheckUpdate
                },
                { icon: <MessageSquare size={20} />, label: t('settings.feedback'), action: () => handleFeedback('feedback') },
                { icon: <Bug size={20} />, label: t('settings.reportBug'), action: () => handleFeedback('bug') }
            ]
        }
    ];

    // Determine Display Name and Avatar
    const displayName = userProfile.name || (user ? user.email.split('@')[0] : t('settings.guestUser', { defaultValue: 'Guest User' }));
    const displayAvatar = userProfile.avatar;

    return (
        <div className="pb-24 pt-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t('settings.title')}</h1>

            {/* Profile Section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 mb-8 relative overflow-hidden contrast-card">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl">
                        {displayAvatar ? (
                            <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} />
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-black text-2xl text-slate-900 dark:text-white leading-tight">
                            {displayName}
                        </h2>
                        {userProfile.username && (
                            <p className="text-violet-500 font-black text-sm mb-1 leading-tight flex items-center gap-1">
                                <AtSign size={14} strokeWidth={3} />
                                {userProfile.username}
                            </p>
                        )}
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3">
                            {user ? t('settings.account') : t('settings.localProfile')}
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {!user ? (
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                >
                                    <LogIn size={16} />
                                    {t('auth.signIn')} / {t('auth.signUp')}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={isSyncing ? undefined : handleSync}
                                        disabled={isSyncing}
                                        className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-blue-500/20 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <UploadCloud size={14} className={isSyncing ? 'animate-pulse' : ''} />
                                        {isSyncing ? t('messages.info.syncing') : t('settings.syncCloud')}
                                    </button>
                                    <button
                                        onClick={() => signOut()}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl text-xs font-black transition-all active:scale-95"
                                    >
                                        <LogOut size={14} />
                                        {t('auth.logout')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={openProfileModal}
                    className="absolute right-6 top-6 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/30 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all active:scale-90"
                >
                    <Edit2 size={20} />
                </button>
            </div>

            <div className="space-y-6">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">{section.title}</h3>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            {section.items.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={!item.disabled ? item.action : undefined}
                                    className={`
                                    flex items-center justify-between p-4 transition-colors
                                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                                    ${i !== section.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}
                                    ${i === 0 ? 'rounded-t-xl' : ''}
                                    ${i === section.items.length - 1 ? 'rounded-b-xl' : ''}
                                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={item.className || "text-slate-400"}>{item.icon}</div>
                                        <div>
                                            <span className={`font-medium ${item.className || "text-slate-700 dark:text-slate-200"}`}>{item.label}</span>
                                            {item.description && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">{item.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {item.value !== undefined && (
                                            typeof item.value === 'boolean' ? (
                                                <span className="text-slate-400 text-sm">
                                                    {item.value ? t('common.on') : t('common.off')}
                                                </span>
                                            ) : (
                                                <div className="flex items-center">{item.value}</div>
                                            )
                                        )}
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
            </div>

            <div className="text-center mt-8 text-xs text-slate-400 font-medium">
                {t('settings.appVersion', { defaultValue: 'App Version' })}: {pkg.version} {user ? t('settings.cloudSyncEnabled', { defaultValue: '(Cloud Sync Enabled ☁️)' }) : t('settings.localStorageOnly', { defaultValue: '(Local Storage Only)' })}
            </div>

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            <input type="file" ref={avatarInputRef} onChange={handleAvatarFile} className="hidden" accept="image/*" />

            {/* Profile Edit Modal */}
            {
                isProfileModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-scale-in flex flex-col items-center">
                            <div className="flex justify-between items-center w-full mb-6">
                                <h3 className="text-xl font-bold dark:text-white">{t('settings.editProfile')}</h3>
                                <button onClick={() => setIsProfileModalOpen(false)}><X className="text-slate-400" /></button>
                            </div>

                            {/* Avatar Picker */}
                            <div className="relative mb-8 group cursor-pointer" onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-white dark:ring-slate-700 shadow-xl">
                                    {tempProfile.avatar ? (
                                        <img src={tempProfile.avatar} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>
                                    )}
                                </div>
                                {/* Uploading spinner overlay */}
                                {isUploadingAvatar ? (
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span className="text-white text-[9px] font-bold mt-1">Uploading…</span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full ring-2 ring-white">
                                    <Edit2 size={12} className="text-white" />
                                </div>
                            </div>

                            {/* Username Input */}
                            <div className="w-full mb-4">
                                <FormInput
                                    label={t('settings.username', { defaultValue: 'Username' })}
                                    type="text"
                                    value={tempProfile.username}
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
                                        setTempProfile(prev => ({ ...prev, username: val }));
                                        if (usernameError) setUsernameError('');
                                    }}
                                    placeholder={t('settings.enterUsername', { defaultValue: '@username' })}
                                    icon={AtSign}
                                    className="font-bold text-violet-600"
                                    description={isCheckingUsername ? t('settings.checkingUsername') : usernameError || t('settings.usernameFormat')}
                                    error={!!usernameError}
                                />
                            </div>

                            {/* First & Last Name */}
                            <div className="flex gap-4 w-full mb-4">
                                <div className="flex-1">
                                    <FormInput
                                        label={t('settings.firstName', { defaultValue: 'First Name' })}
                                        type="text"
                                        value={tempProfile.firstName}
                                        onChange={e => handleNameChange(e, 'firstName')}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="flex-1">
                                    <FormInput
                                        label={t('settings.lastName', { defaultValue: 'Last Name' })}
                                        type="text"
                                        value={tempProfile.lastName}
                                        onChange={e => handleNameChange(e, 'lastName')}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            {/* Full Name display (read-only or calculated) */}
                            <div className="w-full mb-8 opacity-60">
                                <FormInput
                                    label={t('settings.displayName', { defaultValue: 'Display Name (Public)' })}
                                    type="text"
                                    value={tempProfile.name}
                                    readOnly
                                    icon={User}
                                />
                            </div>

                            {/* Bio Input */}
                            <div className="w-full mb-6">
                                <FormTextarea
                                    label={t('settings.bio', { defaultValue: 'Bio' })}
                                    value={tempProfile.bio || ''}
                                    onChange={e => setTempProfile(prev => ({ ...prev, bio: e.target.value }))}
                                    placeholder={t('settings.bioPlaceholder', { defaultValue: 'Write a short bio...' })}
                                    rows={3}
                                />
                            </div>

                            {/* Visibility Toggle */}
                            <div className="w-full mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe size={18} className="text-slate-400" />
                                    <div>
                                        <p className="text-sm font-bold dark:text-white uppercase tracking-tight">{t('settings.profileVisibility', { defaultValue: 'Profile Visibility' })}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{tempProfile.isPublic ? t('settings.public') : t('settings.private')}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setTempProfile(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${tempProfile.isPublic ? 'bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${tempProfile.isPublic ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <FormButton
                                onClick={handleSaveProfile}
                                disabled={isCheckingUsername || isUploadingAvatar || !!usernameError}
                                variant="primary"
                                size="lg"
                                icon={(isCheckingUsername || isUploadingAvatar) ? RefreshCw : Save}
                                className={`w-full ${(isCheckingUsername || isUploadingAvatar) ? 'animate-pulse' : ''}`}
                            >
                                {isCheckingUsername ? t('common.checking', { defaultValue: 'Checking...' }) : t('actions.save')}
                            </FormButton>
                        </div>
                    </div>
                )
            }

            {/* Feedback Modal */}
            {
                showFeedbackModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-in">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feedbackType === 'bug' ? t('settings.reportBug') : t('settings.feedback')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('settings.feedbackEmailTip')}</p>
                            <FormTextarea
                                placeholder={t('settings.feedbackPlaceholder', { defaultValue: 'Type your message...' })}
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                rows={6}
                                className="mb-4"
                            />
                            <div className="flex gap-3 justify-end">
                                <FormButton
                                    onClick={() => setShowFeedbackModal(false)}
                                    variant="secondary"
                                    size="md"
                                >
                                    {t('actions.cancel')}
                                </FormButton>
                                <FormButton
                                    onClick={handleSubmitFeedback}
                                    disabled={!feedbackMessage.trim()}
                                    variant="primary"
                                    size="md"
                                    icon={MessageSquare}
                                >
                                    {t('settings.sendEmail')}
                                </FormButton>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Settings;
