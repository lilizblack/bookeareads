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
        const savedPreset = localStorage.getItem('themePreset') || 'default';

        // If saved preset is not default, force light mode regardless of what was saved
        if (savedPreset !== 'default') return 'light';

        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [themePreset, setThemePreset] = useState(() => {
        return localStorage.getItem('themePreset') || 'default';
    });

    // Enforce light mode if themePreset is changed to something other than default
    const updateThemePreset = (newPreset) => {
        setThemePreset(newPreset);
        if (newPreset !== 'default') {
            setTheme('light');
        }
    };

    useEffect(() => {
        const root = window.document.documentElement;
        // Clean up previous mode and preset classes
        root.classList.remove('light', 'dark', 'default', 'cozy-lofi', 'paper-ink', 'dark-romance', 'romance');

        // Add current ones
        root.classList.add(theme);
        root.classList.add(themePreset);

        localStorage.setItem('theme', theme);
        localStorage.setItem('themePreset', themePreset);
    }, [theme, themePreset]);

    const toggleTheme = () => {
        // Only allow toggling if we are in the default theme
        if (themePreset === 'default') {
            setTheme(prev => prev === 'light' ? 'dark' : 'light');
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            themePreset,
            setThemePreset: updateThemePreset
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
