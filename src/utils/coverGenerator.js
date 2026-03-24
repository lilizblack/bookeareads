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

    // Wrap title helper
    const wrapText = (text, maxLength = 20) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            if ((currentLine + ' ' + words[i]).length < maxLength) {
                currentLine += ' ' + words[i];
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);
        return lines.slice(0, 4); // Limit to 4 lines
    };

    const titleLines = wrapText(title || 'Unknown Title');

    const svg = `
        <svg width="300" height="450" viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="450" fill="${bgColor}"/>
            <rect width="20" height="450" fill="rgba(0,0,0,0.1)"/>
            
            <!-- Book Icon in Background -->
            <path d="${bookIconPath}" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" transform="translate(100, 150) scale(4)"/>

            <!-- Center Content -->
            <g transform="translate(150, 225)">
                <!-- Icon -->
                <g transform="translate(-32, -140)">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" stroke-width="2" fill="none"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" stroke-width="2" fill="none"/>
                </g>

                <!-- Title wrapping -->
                <text y="-20" text-anchor="middle" fill="white" style="font-family: sans-serif; font-size: 28px; font-weight: 900;">
                    ${titleLines.map((line, i) => `<tspan x="0" dy="${i === 0 ? 0 : '1.2em'}">${line}</tspan>`).join('')}
                </text>

                <!-- Divider -->
                <line x1="-20" y1="80" x2="20" y2="80" stroke="white" stroke-width="2" opacity="0.5" />

                <!-- Author -->
                <text y="120" text-anchor="middle" fill="white" style="font-family: sans-serif; font-size: 18px; font-weight: 400; opacity: 0.9;">
                    ${author || 'Unknown Author'}
                </text>
            </g>
        </svg>
    `;
    const base64Svg = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64Svg}`;
};
