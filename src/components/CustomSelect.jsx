import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

const CustomSelect = ({
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    className = '',
    disabled = false,
    label = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Update isMobile on resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleDropdown = useCallback((e) => {
        if (e) {
            e.stopPropagation();
        }
        if (!disabled) {
            setIsOpen(prev => !prev);
        }
    }, [disabled]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        // Use a timer to wait for the next tick to avoid capturing the triggering event
        const timer = setTimeout(() => {
            const handleClickOutside = (event) => {
                const isClickInsideTrigger = triggerRef.current?.contains(event.target);
                const isClickInsideDropdown = dropdownRef.current?.contains(event.target);

                if (!isClickInsideTrigger && !isClickInsideDropdown) {
                    setIsOpen(false);
                    setSearchTerm('');
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
        }, 50); // Slightly longer delay for safer touch handling

        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
        setSearchTerm('');
    };

    const filteredOptions = options.filter(option =>
        String(option.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    // Fixed positioning for desktop dropdowns
    const [dropdownStyle, setDropdownStyle] = useState({});

    useEffect(() => {
        if (isOpen && !isMobile && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: `${rect.bottom + 8}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                zIndex: 10000
            });
        }
    }, [isOpen, isMobile]);

    const dropdownContent = (
        <div className="custom-select-portal-wrapper">
            {isMobile && (
                <div
                    className="custom-select-backdrop"
                    onClick={() => setIsOpen(false)}
                    style={{ zIndex: 9998 }}
                />
            )}

            <div
                ref={dropdownRef}
                className={`custom-select-dropdown ${isMobile ? 'mobile-sheet' : ''}`}
                style={isMobile ? { zIndex: 9999 } : dropdownStyle}
                onClick={(e) => e.stopPropagation()}
            >
                {options.length > 8 && (
                    <div className="custom-select-search">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="custom-select-search-input"
                            autoFocus
                        />
                    </div>
                )}

                <div className="custom-select-options">
                    {filteredOptions.length === 0 ? (
                        <div className="custom-select-option-empty">No options found</div>
                    ) : (
                        filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span>{option.label}</span>
                                {option.value === value && (
                                    <Check size={16} className="custom-select-check" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`custom-select-wrapper ${className}`}>
            {label && <label className="custom-select-label">{label}</label>}

            <button
                ref={triggerRef}
                type="button"
                className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={toggleDropdown}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsOpen(false);
                }}
                disabled={disabled}
            >
                <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''} truncate`}>
                    {displayText}
                </span>
                <ChevronDown
                    size={18}
                    className={`custom-select-icon ${isOpen ? 'rotate' : ''}`}
                />
            </button>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default CustomSelect;
