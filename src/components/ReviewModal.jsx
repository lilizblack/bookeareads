import React, { useState } from 'react';
import { BookOpen, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Rating from './Rating';

const ReviewModal = ({ book, isOpen, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [reviewStars, setReviewStars] = useState(book?.rating || 0);
    const [reviewComments, setReviewComments] = useState(book?.review || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in scale-in relative overflow-hidden">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="text-violet-600 dark:text-violet-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('book.fields.review', 'Review Your Read')}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('review.prompt', 'How was your journey through')} <span className="font-bold text-violet-600">"{book?.title}"</span>?
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider font-montserrat">{t('book.fields.rating')}</span>
                        <Rating value={reviewStars} onChange={setReviewStars} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider font-montserrat px-1">{t('book.fields.notes', 'Comments')}</label>
                        <textarea
                            value={reviewComments}
                            onChange={(e) => setReviewComments(e.target.value)}
                            placeholder={t('book.fields.reviewPlaceholder', 'Write your thoughts...')}
                            className="w-full h-32 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none dark:text-white shadow-inner"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => onSubmit(0, '')}
                            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-2xl active:scale-95 transition-all text-sm"
                        >
                            {t('actions.skip', 'Skip')}
                        </button>
                        <button
                            onClick={() => onSubmit(reviewStars, reviewComments)}
                            className="flex-2 py-4 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all text-sm"
                        >
                            {t('actions.complete', 'Finish & Share')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
