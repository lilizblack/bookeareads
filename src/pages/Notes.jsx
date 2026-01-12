import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooks } from '../context/BookContext';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar as CalendarIcon, X } from 'lucide-react';
import CoverImage from '../components/CoverImage';
import { format, isToday, isSameDay, subDays, parseISO } from 'date-fns';

const Notes = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { books, addNote, deleteNote } = useBooks();

    const book = books.find(b => b.id === id);

    const [filterType, setFilterType] = useState('All'); // 'All', 'Today', 'Last 7 Days', 'Custom'
    const [customDate, setCustomDate] = useState('');

    // Add Note State
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    const filteredNotes = useMemo(() => {
        if (!book?.notes) return [];

        let notes = [...book.notes].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filterType === 'Today') {
            notes = notes.filter(n => isToday(new Date(n.date)));
        } else if (filterType === 'Last 7 Days') {
            const sevenDaysAgo = subDays(new Date(), 7);
            notes = notes.filter(n => new Date(n.date) >= sevenDaysAgo);
        } else if (filterType === 'Custom' && customDate) {
            notes = notes.filter(n => isSameDay(new Date(n.date), parseISO(customDate)));
        }

        return notes;
    }, [book?.notes, filterType, customDate]);

    const handleAddNote = () => {
        if (!newNoteContent.trim()) return;
        addNote(id, newNoteContent);
        setNewNoteContent('');
        setIsAddingNote(false);
    };

    if (!book) return <div className="p-8 text-center">Book not found</div>;

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 px-4 py-4 flex items-center gap-4 shadow-sm border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-3 flex items-center gap-2 font-bold text-xs transition-colors active:scale-95"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Notes Details</h1>
                <button
                    onClick={() => setIsAddingNote(true)}
                    className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30 transition-all active:scale-95"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="p-6 max-w-2xl mx-auto">
                {/* Book Info */}
                <div className="flex gap-6 mb-8 items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                    <div className="w-20 shrink-0 shadow-md rounded-lg overflow-hidden">
                        <CoverImage src={book.cover} title={book.title} className="w-full h-auto aspect-[2/3] object-cover" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 leading-tight">{book.title}</h2>
                        <p className="text-xs font-medium text-slate-500">{book.author}</p>
                        <div className="mt-3 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/20 px-3 py-1 rounded-full self-start inline-flex items-center gap-1">
                            <span className="opacity-70">Total Notes:</span> {book.notes?.length || 0}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mb-6 flex-wrap sticky top-[72px] bg-white dark:bg-slate-950 py-2 z-10">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                        {['All', 'Today', 'Last 7 Days', 'Custom'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === type
                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    } `}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {filterType === 'Custom' && (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 dark:text-slate-300"
                            />
                        </div>
                    )}
                </div>

                {/* Notes Grid */}
                {filteredNotes.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <CalendarIcon size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="font-bold text-slate-400">No notes found</p>
                        <p className="text-xs text-slate-400 mt-1">Tap the + button to add a new note</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredNotes.map(note => (
                            <div key={note.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative group animate-fade-in">
                                {/* Note Header */}
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex gap-2">
                                        <span className="bg-violet-50 dark:bg-violet-900/20 text-[10px] font-bold px-2 py-1 rounded-md text-violet-600 dark:text-violet-300 uppercase tracking-wide">
                                            {format(new Date(note.date), 'MMM d, yyyy')}
                                        </span>
                                        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded-md text-slate-500 dark:text-slate-400">
                                            {format(new Date(note.date), 'h:mm a')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => deleteNote(id, note.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {note.content}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Note Modal */}
            {isAddingNote && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Note</h3>
                            <button onClick={() => setIsAddingNote(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Write your note here..."
                            className="w-full h-40 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 resize-none mb-4 dark:text-white"
                            autoFocus
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddingNote(false)}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddNote}
                                disabled={!newNoteContent.trim()}
                                className="px-6 py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                            >
                                Save Note
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notes;
