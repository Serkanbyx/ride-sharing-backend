const PagePlaceholder = ({ title, step }) => (
  <div className="card">
    <h1>{title}</h1>
    <p className="mt-2 text-gray-600 dark:text-gray-400">
      This page will be implemented in {step}.
    </p>
  </div>
);

export default PagePlaceholder;
