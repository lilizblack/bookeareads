import React, { useState } from 'react';
import { generateGenericCover } from '../utils/coverGenerator';

const CoverImage = ({ src, title, author, className, alt, ...props }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <img
                src={generateGenericCover(title, author)}
                alt={alt || title}
                className={className}
                {...props}
            />
        );
    }

    return (
        <img
            src={src}
            alt={alt || title}
            className={className}
            onError={() => setError(true)}
            {...props}
        />
    );
};

export default CoverImage;
