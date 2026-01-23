import React, { useState, useRef, useEffect } from 'react';
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
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
        setSearchTerm('');
    };

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className={`custom-select-wrapper ${className}`} ref={dropdownRef}>
            {label && <label className="custom-select-label">{label}</label>}

            <button
                type="button"
                className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
                    {displayText}
                </span>
                <ChevronDown
                    size={18}
                    className={`custom-select-icon ${isOpen ? 'rotate' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="custom-select-dropdown">
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
            )}
        </div>
    );
};

export default CustomSelect;
