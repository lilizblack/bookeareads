import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [themePreset, setThemePreset] = useState(() => {
        return localStorage.getItem('themePreset') || 'default';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        // Clean up previous mode and preset classes
        root.classList.remove('light', 'dark', 'default', 'cozy-lofi', 'paper-ink');

        // Add current ones
        root.classList.add(theme);
        root.classList.add(themePreset);

        localStorage.setItem('theme', theme);
        localStorage.setItem('themePreset', themePreset);
    }, [theme, themePreset]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, themePreset, setThemePreset }}>
            {children}
        </ThemeContext.Provider>
    );
};
