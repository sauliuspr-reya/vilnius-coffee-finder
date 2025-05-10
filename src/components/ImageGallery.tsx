'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

interface ImageGalleryProps {
  photoUrls: string[];
  placeName: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ photoUrls, placeName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- Hooks moved to top level ---
  const showNextImage = useCallback(() => {
    // Check photoUrls length inside to prevent issues if it were empty and modal somehow opened
    if (photoUrls && photoUrls.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % photoUrls.length);
    }
  }, [photoUrls]);

  const showPrevImage = useCallback(() => {
    if (photoUrls && photoUrls.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + photoUrls.length) % photoUrls.length);
    }
  }, [photoUrls]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (event.key === 'ArrowRight') {
        showNextImage();
      }
      if (event.key === 'ArrowLeft') {
        showPrevImage();
      }
      if (event.key === 'Escape') {
        closeModal(); // closeModal is defined below, but this is fine for useEffect setup
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, showNextImage, showPrevImage]); // closeModal is not a dependency as its identity is stable
  // --- End of moved hooks ---

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (!photoUrls || photoUrls.length === 0) {
    // Fallback to a single placeholder if no images from Google
    // This is already handled in page.tsx for the main image, 
    // but good to have a fallback within the gallery itself if it were used standalone.
    return (
      <div className="relative h-64 sm:h-80 md:h-96 w-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        <Image
          src="/coffee-placeholder.jpg"
          alt={`${placeName} - Placeholder Image`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
          priority
        />
      </div>
    );
  }

  // Simple collage: show up to 5 images. 
  // First image larger, others smaller thumbnails.
  // For a more complex collage, a library or more complex CSS would be needed.
  const mainImage = photoUrls[0];
  const thumbnailImages = photoUrls.slice(1, 5); // Show up to 4 thumbnails

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        {/* Main Image - takes more space or is the only one if fewer than 2 images */}
        <div className={`relative rounded-lg overflow-hidden cursor-pointer ${photoUrls.length > 1 ? 'sm:col-span-3 h-80 sm:h-96' : 'sm:col-span-4 h-96 sm:h-[500px]'}`} onClick={() => openModal(0)}>
          <Image
            src={mainImage}
            alt={`${placeName} - Photo 1`}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 60vw"
            priority={true} // Prioritize the first/main image
            onError={(e) => { (e.target as HTMLImageElement).src = '/coffee-placeholder.jpg';} }
          />
        </div>

        {/* Thumbnails - if more than 1 image exists */}
        {photoUrls.length > 1 && (
          <div className="sm:col-span-1 grid grid-cols-2 sm:grid-cols-1 gap-2">
            {thumbnailImages.map((url, index) => (
              <div
                key={index}
                className="relative h-32 sm:h-[calc((theme(space.96)-theme(space.2)*1)/2)] md:h-[calc((theme(space.96)-theme(space.2)*1)/2)] rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => openModal(index + 1)}
              >
                <Image
                  src={url}
                  alt={`${placeName} - Photo ${index + 2}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 25vw"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/coffee-placeholder.jpg';} }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="relative bg-white dark:bg-gray-900 p-2 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full h-auto" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={closeModal} 
              className="absolute top-3 right-3 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-50"
              aria-label="Close image viewer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative w-full h-[calc(90vh-80px)] flex items-center justify-center">
                <Image 
                    src={photoUrls[currentImageIndex]} 
                    alt={`${placeName} - Image ${currentImageIndex + 1}`} 
                    fill
                    className="object-contain rounded"
                    sizes="90vw"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/coffee-placeholder.jpg';} }
                />
            </div>
            
            {photoUrls.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-75 z-50"
                  aria-label="Previous image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-75 z-50"
                  aria-label="Next image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  {currentImageIndex + 1} / {photoUrls.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
