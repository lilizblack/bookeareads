import React, { useRef, useState } from 'react';
import { useBooks } from '../context/BookContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, User } from 'lucide-react';
import logo from '../assets/logo.png';

const Header = () => {
    const { exportData, importData, userProfile } = useBooks(); // Added userProfile
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [importMessage, setImportMessage] = useState('');

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const result = await importData(file);
                setImportMessage(`✅ Imported ${result.bookCount} books!`);
                setTimeout(() => setImportMessage(''), 3000);
            } catch (error) {
                setImportMessage(`❌ Failed: ${error.message}`);
                setTimeout(() => setImportMessage(''), 3000);
            }
        }
    };

    return (
        <header className="flex justify-between items-center mb-6 pt-2">
            <div className="flex items-center gap-4">
                <img src={logo} alt="Bookea Reads Logo" className="h-12 object-contain" />
            </div>

            <div className="flex items-center gap-2">
                {/* Import Message */}
                {importMessage && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mr-2 animate-fade-in">
                        {importMessage}
                    </span>
                )}

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                    title="Import Data (JSON)"
                >
                    <Download size={18} className="text-blue-600 dark:text-blue-400" />
                </button>
                <button
                    onClick={exportData}
                    className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                    title="Export Data (Backup)"
                >
                    <Upload size={18} className="text-emerald-600 dark:text-emerald-400" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />

                {/* Profile Button - Now shows Avatar */}
                <button
                    onClick={() => navigate('/settings')}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-500 transition-colors overflow-hidden ring-2 ring-transparent hover:ring-blue-500/50"
                >
                    {userProfile?.avatar ? (
                        <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User size={20} />
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;
