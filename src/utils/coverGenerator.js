/**
 * Generates a generic book cover as a data URL SVG.
 * @param {string} title - The title of the book.
 * @param {string} author - The author of the book.
 * @returns {string} Data URL of the generated SVG.
 */
export const generateGenericCover = (title, author) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB'
    ];
    // Simple hash for consistent color per title
    const hash = (title || '').split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const bgColor = colors[hash % colors.length];

    // Book Icon Path (from Lucide)
    const bookIconPath = "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z";

    const svg = `
        <svg width="300" height="450" viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="450" fill="${bgColor}"/>
            <rect width="20" height="450" fill="rgba(0,0,0,0.1)"/>
            
            <!-- Book Icon in Background -->
            <path d="${bookIconPath}" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" transform="translate(100, 150) scale(4)"/>

            <foreignObject x="30" y="60" width="240" height="330">
                <div xmlns="http://www.w3.org/1999/xhtml" style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: white; font-family: sans-serif; padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                    </div>
                    <div style="font-size: 24px; font-weight: 800; line-height: 1.2; margin-bottom: 20px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">${title || 'Unknown Title'}</div>
                    <div style="width: 40px; height: 2px; background: rgba(255,255,255,0.5); margin: 20px 0;"></div>
                    <div style="font-size: 16px; font-weight: 400; opacity: 0.9;">${author || 'Unknown Author'}</div>
                </div>
            </foreignObject>
        </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};
