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
    const [isMobile, setIsMobile] = useState(() => {
        // Identify mobile by user agent or small screen - NOT just by touch support
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth <= 768;
        return isMobileUA || isSmallScreen;
    });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const isScrollingRef = useRef(false);
    const touchStartYRef = useRef(0);

    // Update isMobile on resize
    useEffect(() => {
        const handleResize = () => {
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768;
            setIsMobile(isMobileUA || isSmallScreen);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleDropdown = useCallback((e) => {
        if (e) {
            e.preventDefault();
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
        // Longer delay for mobile to prevent premature closure during scrolling
        const timer = setTimeout(() => {
            const handleClickOutside = (event) => {
                // Ignore if user is scrolling
                if (isScrollingRef.current) {
                    return;
                }

                const isClickInsideTrigger = triggerRef.current?.contains(event.target);
                const isClickInsideDropdown = dropdownRef.current?.contains(event.target);

                if (!isClickInsideTrigger && !isClickInsideDropdown) {
                    setIsOpen(false);
                    setSearchTerm('');
                }
            };

            // Only use mousedown for desktop
            if (!isMobile) {
                document.addEventListener('mousedown', handleClickOutside);
            } else {
                // For mobile, use touchend to avoid conflicts with scrolling
                document.addEventListener('touchend', handleClickOutside, { passive: false });
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchend', handleClickOutside);
            };
        }, isMobile ? 150 : 50); // Longer delay for mobile

        return () => clearTimeout(timer);
    }, [isOpen, isMobile]);

    const handleSelect = (optionValue, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Don't select if user was scrolling
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
        setSearchTerm('');
    };

    // Track scrolling to prevent accidental selection
    const handleTouchStart = useCallback((e) => {
        touchStartYRef.current = e.touches[0].clientY;
        isScrollingRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e) => {
        const touchY = e.touches[0].clientY;
        const deltaY = Math.abs(touchY - touchStartYRef.current);
        // If moved more than 10px, consider it scrolling
        if (deltaY > 10) {
            isScrollingRef.current = true;
        }
    }, []);

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
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(false);
                        setSearchTerm('');
                    }}
                    style={{ zIndex: 99998 }}
                />
            )}

            <div
                ref={dropdownRef}
                className={`custom-select-dropdown ${isMobile ? 'mobile-sheet' : ''}`}
                style={isMobile ? { zIndex: 99999 } : dropdownStyle}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
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
                                onClick={(e) => {
                                    // For mobile, we check the scroll ref
                                    if (isMobile && isScrollingRef.current) {
                                        isScrollingRef.current = false;
                                        return;
                                    }
                                    handleSelect(option.value, e);
                                }}
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
