import React from 'react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelect?: () => void;
  disabled?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  onSelect, 
  disabled = false
}) => {
  const handleClick = () => {
    if (onSelect && !disabled) {
      onSelect();
    }
  };

  return (
    <div 
      className={`relative bg-surface rounded-xl overflow-hidden shadow-2xl transition-all duration-300 h-full flex flex-col ${
        !disabled ? 'cursor-pointer hover:scale-[1.02] hover:shadow-primary/20' : ''
      }`}
      onClick={handleClick}
    >
      {/* Poster Container با نسبت پورتره ثابت */}
      <div className="relative" style={{ paddingBottom: '150%' }}>
        <img 
          src={movie.imageUrl || `https://picsum.photos/600/900?random=${movie.id}`}
          alt={movie.title}
          className="absolute top-0 left-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        
        {/* Rating badge */}
        {movie.rating && (
          <div className="absolute top-3 left-3 bg-primary/90 text-white px-3 py-1 rounded-full text-sm font-bold">
            ⭐ {movie.rating}
          </div>
        )}
        
        {/* Year badge */}
        {movie.year && (
          <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-md text-xs">
            {movie.year}
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-white mb-1 truncate">
          {movie.title}
        </h3>
        
        {movie.persianTitle && (
          <p className="text-sm text-gray-300 mb-2 truncate">
            {movie.persianTitle}
          </p>
        )}
        
        {/* Genre tags */}
        {movie.genre && (
          <div className="mb-3">
            <span className="inline-block text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
              {movie.genre}
            </span>
          </div>
        )}
        
        {/* Description */}
        {movie.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">
            {movie.description}
          </p>
        )}
        
        {/* Select button */}
        {!disabled && onSelect && (
          <button 
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-colors mt-auto"
            onClick={handleClick}
          >
            انتخاب این فیلم
          </button>
        )}
        
        {/* Disabled state */}
        {disabled && (
          <div className="w-full bg-gray-800 text-gray-400 py-3 rounded-lg text-center mt-auto">
            پیشنهاد ویژه
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard;