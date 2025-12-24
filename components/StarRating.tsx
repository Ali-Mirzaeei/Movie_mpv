import React, { useState } from 'react';

interface StarRatingProps {
  onRate: (rating: number) => void;
  initialRating?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ onRate, initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleClick = (index: number) => {
    setRating(index);
    onRate(index);
  };

  return (
    <div className="flex space-x-1 justify-center py-2">
      {[...Array(5)].map((_, index) => {
        index += 1;
        return (
          <button
            key={index}
            type="button"
            className={`text-2xl transition-colors duration-200 ${index <= (hover || rating) ? "text-yellow-400" : "text-gray-600"}`}
            onClick={() => handleClick(index)}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(rating)}
          >
            &#9733;
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;