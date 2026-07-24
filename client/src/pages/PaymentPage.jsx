import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import * as paymentService from '../api/paymentService';
import * as tripService from '../api/tripService';
import PaymentForm from '../components/PaymentForm';
import Spinner from '../components/Spinner';
import { FARE_DISPLAY } from '../utils/constants';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

const buildFareBreakdown = (trip, amount) => {
  const distanceKm =
    trip?.distanceMeters != null
      ? (trip.distanceMeters / 1000).toFixed(1)
      : null;
  const durationMin =
    trip?.durationSeconds != null
      ? Math.round(trip.durationSeconds / 60)
      : null;
  const surgeMultiplier = trip?.surgeMultiplier ?? 1;
  const distanceCost =
    trip?.distanceMeters != null
      ? (trip.distanceMeters / 1000) * FARE_DISPLAY.perKmRate
      : null;
  const durationCost =
    trip?.durationSeconds != null
      ? (trip.durationSeconds / 60) * FARE_DISPLAY.perMinuteRate
      : null;

  return {
    distanceKm,
    durationMin,
    distanceCost,
    durationCost,
    surgeMultiplier,
    total: amount,
  };
};

const PaymentPage = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [amount, setAmount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializePayment = async () => {
      setLoading(true);
      setError('');

      try {
        const tripResponse = await tripService.getTrip(tripId);
        const tripData = tripResponse.data;
        setTrip(tripData);

        if (tripData.paymentInfo?.status === 'succeeded') {
          setLoading(false);
          return;
        }

        if (tripData.status !== 'completed') {
          setError('Payment is only available for completed trips');
          setLoading(false);
          return;
        }

        if (!stripePromise) {
          setError('Stripe publishable key is not configured');
          setLoading(false);
          return;
        }

        const paymentResponse = await paymentService.createPayment(tripId);
        setClientSecret(paymentResponse.data.clientSecret);
        setAmount(paymentResponse.data.amount);
      } catch (initError) {
        const message = initError.message || 'Unable to initialize payment';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [tripId]);

  const fareBreakdown = useMemo(
    () => buildFareBreakdown(trip, amount),
    [trip, amount]
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Preparing secure checkout...
        </p>
      </div>
    );
  }

  if (trip?.paymentInfo?.status === 'succeeded') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Payment complete</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            This trip has already been paid.
          </p>
          <Link to={`/rate/${tripId}`} className="btn-primary mt-6 inline-flex">
            Rate your trip
          </Link>
        </div>
      </div>
    );
  }

  if (error || !trip || !clientSecret || amount == null || !stripePromise) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Payment unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            {error || 'Unable to load payment details for this trip.'}
          </p>
          <Link to={`/trip/${tripId}`} className="btn-primary mt-6 inline-flex">
            Back to trip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card space-y-6">
        <div>
          <h1>Complete Payment</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Pay securely for your completed trip using Stripe.
          </p>
        </div>

        <section className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/60">
          <h2 className="text-lg font-semibold">Trip summary</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {trip.pickupAddress}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            to {trip.destinationAddress}
          </p>
        </section>

        <section className="space-y-3 text-sm">
          <h2 className="text-lg font-semibold">Fare breakdown</h2>

          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Base fare</span>
            <span className="font-medium">${FARE_DISPLAY.baseFare.toFixed(2)}</span>
          </div>

          {fareBreakdown.distanceKm != null && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Distance ({fareBreakdown.distanceKm} km)
              </span>
              <span className="font-medium">
                ${fareBreakdown.distanceCost?.toFixed(2)}
              </span>
            </div>
          )}

          {fareBreakdown.durationMin != null && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Duration ({fareBreakdown.durationMin} min)
              </span>
              <span className="font-medium">
                ${fareBreakdown.durationCost?.toFixed(2)}
              </span>
            </div>
          )}

          {fareBreakdown.surgeMultiplier > 1 && (
            <div className="flex items-center justify-between text-warning">
              <span>Surge pricing ({fareBreakdown.surgeMultiplier}x)</span>
              <span className="font-medium">Applied</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold dark:border-gray-700">
            <span>Total due</span>
            <span>${fareBreakdown.total?.toFixed(2)}</span>
          </div>
        </section>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Payment details</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Card details are handled securely by Stripe Elements.
        </p>

        <div className="mt-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              amount={amount}
              tripId={tripId}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
