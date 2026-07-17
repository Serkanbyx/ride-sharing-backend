const sizeClasses = {
  sm: 'h-4 w-4 border',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
};

const Spinner = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div
        className={`animate-spin rounded-full border-gray-300 border-t-primary ${sizeClasses[size]}`}
      />
    </div>
  );
};

export default Spinner;
