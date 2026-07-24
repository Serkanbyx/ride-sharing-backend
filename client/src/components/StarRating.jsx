import { useState } from 'react';
import { Star } from 'lucide-react';

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const StarRating = ({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;
  const starSize = sizeClasses[size] || sizeClasses.md;

  const handleSelect = (score) => {
    if (readOnly || !onChange) {
      return;
    }

    onChange(score);
  };

  const handleKeyDown = (event, score) => {
    if (readOnly || !onChange) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(score);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={readOnly ? `${value} out of 5 stars` : 'Rating'}
      onMouseLeave={() => {
        if (!readOnly) {
          setHoverValue(0);
        }
      }}
    >
      {[1, 2, 3, 4, 5].map((score) => {
        const isActive = score <= displayValue;

        if (readOnly) {
          return (
            <Star
              key={score}
              className={`${starSize} ${
                isActive
                  ? 'fill-warning text-warning'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
              aria-hidden="true"
            />
          );
        }

        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} star${score === 1 ? '' : 's'}`}
            className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => handleSelect(score)}
            onMouseEnter={() => setHoverValue(score)}
            onKeyDown={(event) => handleKeyDown(event, score)}
          >
            <Star
              className={`${starSize} ${
                isActive
                  ? 'fill-warning text-warning'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
