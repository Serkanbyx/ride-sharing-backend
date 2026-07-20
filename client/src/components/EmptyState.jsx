const EmptyState = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="card flex flex-col items-center py-10 text-center">
      {Icon ? (
        <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
          <Icon className="h-8 w-8" />
        </div>
      ) : null}
      <h2 className="text-xl font-semibold">{title}</h2>
      {message ? (
        <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className="btn-primary mt-6" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

export default EmptyState;
