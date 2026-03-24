/**
 * Safely resizes an image while maintaining aspect ratio
 * @param {File | string} source - The image File object or Base64 string
 * @param {number} maxWidth - Maximum width (default: 400)
 * @param {number} maxHeight - Maximum height (default: 600)
 * @param {number} quality - JPEG quality (0 to 1, default: 0.8)
 * @returns {Promise<string>} - Resolves with the resized Base64 string
 */
export const resizeImage = (source, maxWidth = 400, maxHeight = 600, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Handle both File objects and Base64 strings
        const imageUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            // Maintain aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to Base64 JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Cleanup object URL if created
            if (typeof source !== 'string') {
                URL.revokeObjectURL(imageUrl);
            }
            
            resolve(dataUrl);
        };
        
        img.onerror = (err) => {
            if (typeof source !== 'string') {
                URL.revokeObjectURL(imageUrl);
            }
            reject(new Error('Failed to load image for resizing'));
        };
        
        img.src = imageUrl;
    });
};
