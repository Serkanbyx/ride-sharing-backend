const AvailabilityToggle = ({ isAvailable, onChange, disabled = false }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {isAvailable ? 'Go Offline' : 'Go Online'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isAvailable
            ? 'You are online and can receive ride offers'
            : 'Turn on availability to receive ride offers'}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        aria-label={isAvailable ? 'Go offline' : 'Go online'}
        disabled={disabled}
        onClick={() => onChange(!isAvailable)}
        className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isAvailable ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
            isAvailable ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default AvailabilityToggle;
