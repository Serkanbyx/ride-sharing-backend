const RoleBadge = ({ role }) => {
  const isDriver = role === 'driver';

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isDriver
          ? 'bg-primary/10 text-primary'
          : 'bg-success/10 text-success'
      }`}
    >
      {isDriver ? 'Driver' : 'Passenger'}
    </span>
  );
};

export default RoleBadge;
