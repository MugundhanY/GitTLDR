'use client';

import { useState } from 'react';
import { CodeBracketIcon } from '@heroicons/react/24/outline';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Show fallback if no src, image error, or image hasn't loaded yet
  const showFallback = !src || imageError || !imageLoaded;

  return (
    <div className={`${sizeClasses[size]} flex-shrink-0 relative ${className}`}>
      {src && !imageError && (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-lg object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      
      {showFallback && (
        <div className={`${sizeClasses[size]} bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center ${imageLoaded && !imageError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
          <CodeBracketIcon className={`${iconSizes[size]} text-slate-600 dark:text-slate-400`} />
        </div>
      )}
    </div>
  );
}
