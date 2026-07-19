import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

const currentYear = new Date().getFullYear();

const BecomeDriverPage = () => {
  const { becomeDriver } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: String(currentYear),
    color: '',
    plateNumber: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const yearOptions = useMemo(() => {
    const options = [];

    for (let year = currentYear + 1; year >= 1990; year -= 1) {
      options.push(year);
    }

    return options;
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
  };

  const validateForm = () => {
    const errors = {};
    const make = formData.make.trim();
    const model = formData.model.trim();
    const color = formData.color.trim();
    const plateNumber = formData.plateNumber.trim();
    const year = Number(formData.year);

    if (!make) {
      errors.make = 'Vehicle make is required';
    } else if (make.length > 30) {
      errors.make = 'Vehicle make cannot exceed 30 characters';
    }

    if (!model) {
      errors.model = 'Vehicle model is required';
    } else if (model.length > 30) {
      errors.model = 'Vehicle model cannot exceed 30 characters';
    }

    if (!year || year < 1990 || year > currentYear + 1) {
      errors.year = `Vehicle year must be between 1990 and ${currentYear + 1}`;
    }

    if (!color) {
      errors.color = 'Vehicle color is required';
    } else if (color.length > 20) {
      errors.color = 'Vehicle color cannot exceed 20 characters';
    }

    if (!plateNumber) {
      errors.plateNumber = 'Plate number is required';
    } else if (plateNumber.length > 10) {
      errors.plateNumber = 'Plate number cannot exceed 10 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const vehicle = {
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: Number(formData.year),
      color: formData.color.trim(),
      plateNumber: formData.plateNumber.trim().toUpperCase(),
    };

    try {
      await becomeDriver(vehicle);
      toast.success('Driver profile created successfully');
      navigate('/driver');
    } catch (submitError) {
      setError(submitError.message || 'Unable to create driver profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h1>Become a Driver</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Start earning by giving rides on RideFlow.
        </p>

        <section className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/60">
          <h2 className="text-lg font-semibold">Driver responsibilities</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Keep your vehicle information accurate and up to date.</li>
            <li>Arrive on time and follow trip status updates in the app.</li>
            <li>Share live location while available and on active trips.</li>
            <li>Maintain a safe, clean vehicle and professional service.</li>
          </ul>
          <h3 className="mt-4 text-sm font-semibold">Requirements</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Valid driver&apos;s license and vehicle insurance.</li>
            <li>Vehicle model year 1990 or newer.</li>
            <li>Ability to accept real-time ride offers when available.</li>
          </ul>
        </section>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="make" className="mb-1 block text-sm font-medium">
                Make
              </label>
              <input
                id="make"
                name="make"
                type="text"
                className="input-field"
                value={formData.make}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.make && (
                <p className="mt-1 text-sm text-danger">{fieldErrors.make}</p>
              )}
            </div>

            <div>
              <label htmlFor="model" className="mb-1 block text-sm font-medium">
                Model
              </label>
              <input
                id="model"
                name="model"
                type="text"
                className="input-field"
                value={formData.model}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.model && (
                <p className="mt-1 text-sm text-danger">{fieldErrors.model}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="year" className="mb-1 block text-sm font-medium">
                Year
              </label>
              <select
                id="year"
                name="year"
                className="input-field"
                value={formData.year}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {fieldErrors.year && (
                <p className="mt-1 text-sm text-danger">{fieldErrors.year}</p>
              )}
            </div>

            <div>
              <label htmlFor="color" className="mb-1 block text-sm font-medium">
                Color
              </label>
              <input
                id="color"
                name="color"
                type="text"
                className="input-field"
                value={formData.color}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.color && (
                <p className="mt-1 text-sm text-danger">{fieldErrors.color}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="plateNumber"
              className="mb-1 block text-sm font-medium"
            >
              Plate Number
            </label>
            <input
              id="plateNumber"
              name="plateNumber"
              type="text"
              className="input-field uppercase"
              value={formData.plateNumber}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
            {fieldErrors.plateNumber && (
              <p className="mt-1 text-sm text-danger">
                {fieldErrors.plateNumber}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : null}
            {isSubmitting ? 'Submitting...' : 'Become a Driver'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BecomeDriverPage;
