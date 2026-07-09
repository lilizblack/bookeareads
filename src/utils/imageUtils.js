import { storage } from '../lib/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

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

/**
 * Uploads a base64 encoded image string to Firebase Storage
 * @param {string} userId - The UID of the current user
 * @param {string} base64String - The data URL of the image
 * @returns {Promise<string>} - Resolves with the public download URL
 */
export const uploadImageToStorage = async (userId, base64String) => {
    if (!userId || !base64String) {
        throw new Error('Missing userId or image data for upload');
    }

    try {
        const filename = `covers/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, filename);

        await uploadString(storageRef, base64String, 'data_url');
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error uploading image to storage:', error);
        throw error;
    }
};

/**
 * Resolves the cover value to save for an uploaded image: a Firebase Storage
 * URL for logged-in users, or the resized base64 data URL as a fallback for
 * guests and when the upload fails (so saving a picture never breaks).
 * @param {string | undefined} userId - The UID of the current user, if any
 * @param {string} base64String - The resized data URL of the image
 * @returns {Promise<string>} - Storage URL or the base64 string itself
 */
export const resolveCoverUpload = async (userId, base64String) => {
    if (!userId || !storage) {
        return base64String;
    }
    try {
        return await uploadImageToStorage(userId, base64String);
    } catch (error) {
        console.warn('Cover upload failed, storing image locally instead:', error);
        return base64String;
    }
};
