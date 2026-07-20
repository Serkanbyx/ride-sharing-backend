import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Navigation } from 'lucide-react';
import * as tripService from '../api/tripService';
import Spinner from '../components/Spinner';
import { DEFAULT_MAP_CENTER } from '../utils/constants';

const DEMO_COORD_OFFSET = 0.01;

const initialFormData = {
  pickupAddress: '',
  pickupLat: String(DEFAULT_MAP_CENTER.lat),
  pickupLng: String(DEFAULT_MAP_CENTER.lng),
  destinationAddress: '',
  destLat: String(DEFAULT_MAP_CENTER.lat + DEMO_COORD_OFFSET),
  destLng: String(DEFAULT_MAP_CENTER.lng + DEMO_COORD_OFFSET),
};

const isValidLatitude = (value) => {
  const latitude = Number(value);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
};

const isValidLongitude = (value) => {
  const longitude = Number(value);
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
};

const RequestRidePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
  };

  const validateForm = () => {
    const errors = {};
    const pickupAddress = formData.pickupAddress.trim();
    const destinationAddress = formData.destinationAddress.trim();

    if (!pickupAddress) {
      errors.pickupAddress = 'Pickup address is required';
    } else if (pickupAddress.length > 200) {
      errors.pickupAddress = 'Pickup address cannot exceed 200 characters';
    }

    if (!isValidLatitude(formData.pickupLat)) {
      errors.pickupLat = 'Pickup latitude must be between -90 and 90';
    }

    if (!isValidLongitude(formData.pickupLng)) {
      errors.pickupLng = 'Pickup longitude must be between -180 and 180';
    }

    if (!destinationAddress) {
      errors.destinationAddress = 'Destination address is required';
    } else if (destinationAddress.length > 200) {
      errors.destinationAddress =
        'Destination address cannot exceed 200 characters';
    }

    if (!isValidLatitude(formData.destLat)) {
      errors.destLat = 'Destination latitude must be between -90 and 90';
    }

    if (!isValidLongitude(formData.destLng)) {
      errors.destLng = 'Destination longitude must be between -180 and 180';
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

    const payload = {
      pickupAddress: formData.pickupAddress.trim(),
      pickupLat: Number(formData.pickupLat),
      pickupLng: Number(formData.pickupLng),
      destinationAddress: formData.destinationAddress.trim(),
      destLat: Number(formData.destLat),
      destLng: Number(formData.destLng),
    };

    try {
      const response = await tripService.requestTrip(payload);
      const trip = response.data;
      const estimatedFare = trip?.estimatedFare;

      if (estimatedFare != null) {
        toast.success(`Trip requested. Estimated fare: $${estimatedFare.toFixed(2)}`);
      } else {
        toast.success('Trip requested successfully');
      }

      navigate(`/trip/${trip._id}`);
    } catch (submitError) {
      setError(submitError.message || 'Unable to request trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h1>Request a Ride</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Enter pickup and destination details to find a nearby driver.
        </p>

        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          For demo, enter coordinates manually. Production would use Google
          Places Autocomplete.
        </p>

        <form className="mt-6 space-y-8" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Pickup</h2>
            </div>

            <div>
              <label
                htmlFor="pickupAddress"
                className="mb-1 block text-sm font-medium"
              >
                Pickup Address
              </label>
              <input
                id="pickupAddress"
                name="pickupAddress"
                type="text"
                className="input-field"
                value={formData.pickupAddress}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="123 Market St, San Francisco"
                required
              />
              {fieldErrors.pickupAddress && (
                <p className="mt-1 text-sm text-danger">
                  {fieldErrors.pickupAddress}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="pickupLat"
                  className="mb-1 block text-sm font-medium"
                >
                  Pickup Latitude
                </label>
                <input
                  id="pickupLat"
                  name="pickupLat"
                  type="number"
                  step="any"
                  className="input-field"
                  value={formData.pickupLat}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.pickupLat && (
                  <p className="mt-1 text-sm text-danger">
                    {fieldErrors.pickupLat}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pickupLng"
                  className="mb-1 block text-sm font-medium"
                >
                  Pickup Longitude
                </label>
                <input
                  id="pickupLng"
                  name="pickupLng"
                  type="number"
                  step="any"
                  className="input-field"
                  value={formData.pickupLng}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.pickupLng && (
                  <p className="mt-1 text-sm text-danger">
                    {fieldErrors.pickupLng}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Navigation
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">Destination</h2>
            </div>

            <div>
              <label
                htmlFor="destinationAddress"
                className="mb-1 block text-sm font-medium"
              >
                Destination Address
              </label>
              <input
                id="destinationAddress"
                name="destinationAddress"
                type="text"
                className="input-field"
                value={formData.destinationAddress}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="456 Mission St, San Francisco"
                required
              />
              {fieldErrors.destinationAddress && (
                <p className="mt-1 text-sm text-danger">
                  {fieldErrors.destinationAddress}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="destLat"
                  className="mb-1 block text-sm font-medium"
                >
                  Destination Latitude
                </label>
                <input
                  id="destLat"
                  name="destLat"
                  type="number"
                  step="any"
                  className="input-field"
                  value={formData.destLat}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.destLat && (
                  <p className="mt-1 text-sm text-danger">
                    {fieldErrors.destLat}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="destLng"
                  className="mb-1 block text-sm font-medium"
                >
                  Destination Longitude
                </label>
                <input
                  id="destLng"
                  name="destLng"
                  type="number"
                  step="any"
                  className="input-field"
                  value={formData.destLng}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.destLng && (
                  <p className="mt-1 text-sm text-danger">
                    {fieldErrors.destLng}
                  </p>
                )}
              </div>
            </div>
          </section>

          <button
            type="submit"
            className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : null}
            {isSubmitting ? 'Requesting...' : 'Request Ride'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequestRidePage;
