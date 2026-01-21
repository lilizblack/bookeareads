import React from 'react';
import { useBooks } from '../context/BookContext';
import BookCard from '../components/BookCard';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CheckCircle2 } from 'lucide-react';

const Wishlist = () => {
    const { wantToReadBooks } = useBooks();
    const navigate = useNavigate();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Wishlist</h1>

            <div className="space-y-3">
                {wantToReadBooks.map(book => (
                    <div
                        key={book.id}
                        onClick={() => navigate(`/book/${book.id}`)}
                        className="flex gap-4 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 active:scale-95 transition-transform"
                    >
                        <div className="w-[60px] flex-shrink-0 aspect-[2/3] rounded-md overflow-hidden bg-slate-900">
                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <h3 className="font-bold text-slate-100">{book.title}</h3>
                            <p className="text-xs text-slate-400 mb-2">{book.author}</p>

                            <div className="flex items-center gap-2">
                                {book.isOwned ? (
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 size={12} className="mr-1" /> Owned
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                        <ShoppingBag size={12} className="mr-1" /> Need to Buy
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {wantToReadBooks.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <p>Your wishlist is empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
