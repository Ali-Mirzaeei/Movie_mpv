import React, { useState } from 'react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelect?: () => void;
  disabled?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect, disabled = false }) => {
  const [imgError, setImgError] = useState(false);
  
  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect();
    }
  };

  const getImageUrl = () => {
    if (imgError || !movie.id) {
      return `https://via.placeholder.com/300x450/1e293b/8b5cf6?text=${encodeURIComponent(movie.title.substring(0, 30))}`;
    }
    return `/posters/${movie.id}.webp`;
  };

  return (
    <div 
      className={`relative rounded-xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        disabled ? 'opacity-90 cursor-default' : 'hover:shadow-primary/30'
      }`}
      onClick={handleClick}
    >
      <div className="relative h-80 overflow-hidden">
        <img
          src={getImageUrl()}
          onError={() => setImgError(true)}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
        
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{movie.title}</h3>
          {movie.persianTitle && (
            <p className="text-sm text-gray-300 mb-2 line-clamp-1">{movie.persianTitle}</p>
          )}
          <div className="flex items-center justify-between text-sm">
            {movie.year && <span className="text-gray-300">{movie.year}</span>}
            {movie.rating && <span className="text-yellow-400">⭐ {movie.rating.split(' ')[0]}</span>}
          </div>
        </div>
      </div>
      
      {!disabled && (
        <div className="absolute top-3 right-3 bg-primary/90 text-white text-xs font-bold px-3 py-1 rounded-full">
          انتخاب
        </div>
      )}
      
      {movie.reason && !disabled && (
        <div className="p-3 bg-surface">
          <p className="text-sm text-gray-300 italic line-clamp-2">"{movie.reason}"</p>
        </div>
      )}
    </div>
  );
};

export default MovieCard;