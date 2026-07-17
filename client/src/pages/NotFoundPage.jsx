import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <h1>404</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        Go Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
