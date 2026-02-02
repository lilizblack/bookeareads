import React from 'react';
import { Book, Plus } from 'lucide-react';
import FormButton from './FormButton';
import { useNavigate } from 'react-router-dom';

/**
 * Empty state component for list pages
 * @param {Object} props
 * @param {string} props.title - Title for empty state
 * @param {string} props.message - Descriptive message
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} props.actionLabel - Label for action button
 * @param {string} props.actionPath - Path to navigate to on action
 */
const EmptyState = ({
    title = "No books found",
    message = "Start your library by adding your first book!",
    icon = <Book size={48} className="text-slate-300 dark:text-slate-600" />,
    actionLabel,
    actionPath = "/add",
    onAction
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-100 dark:ring-slate-800/10">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8">
                {message}
            </p>
            {actionLabel && (
                <FormButton
                    variant="primary"
                    icon={Plus}
                    onClick={() => onAction ? onAction() : navigate(actionPath)}
                >
                    {actionLabel}
                </FormButton>
            )}
        </div>
    );
};

export default EmptyState;
