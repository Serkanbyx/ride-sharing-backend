import { useAuth } from './contexts/AuthContext';

const App = () => {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <h1 className="text-primary">RideFlow</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {isAuthenticated
            ? `Welcome, ${user?.name}`
            : 'Ride-sharing app — UI implemented in upcoming steps.'}
        </p>
      </div>
    </main>
  );
};

export default App;
