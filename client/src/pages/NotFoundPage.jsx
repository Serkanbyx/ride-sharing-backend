import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="card w-full py-12">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPinOff className="h-12 w-12" aria-hidden="true" />
        </div>

        <p className="text-6xl font-bold tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          The page you are looking for does not exist or may have been moved.
        </p>

        <Link to="/" className="btn-primary mt-8 inline-flex">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
