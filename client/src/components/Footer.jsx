const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-gray-600 sm:flex-row sm:px-6 lg:px-8 dark:text-gray-400">
        <p>© {currentYear} RideFlow — Ride Sharing Demo</p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary transition-colors hover:text-primary-dark"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
};

export default Footer;
