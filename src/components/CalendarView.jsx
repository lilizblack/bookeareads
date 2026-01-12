import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

const CalendarView = ({ books }) => {
    // Logic to show when books were finished or daily reading (mocked for now)
    const currentMonth = new Date();
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Mock: find days where a book was finished
    const getEventsForDay = (date) => {
        // In a real app, check 'finishDate' of books
        // Mocking one book finished today for demo
        if (isToday(date) && books.some(b => b.status === 'read')) return 'bg-violet-500';
        return '';
    };

    return (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">{format(currentMonth, 'MMMM yyyy')}</h2>

            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i}>{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {days.map((day) => {
                    const eventColor = getEventsForDay(day);
                    return (
                        <div key={day.toString()} className="flex flex-col items-center gap-1">
                            <div
                                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs
                  ${isToday(day) ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-300'}
                  ${eventColor && !isToday(day) ? 'bg-slate-700' : ''}
                `}
                            >
                                {format(day, 'd')}
                            </div>
                            {eventColor && (
                                <div className={`w-1 h-1 rounded-full ${eventColor}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
