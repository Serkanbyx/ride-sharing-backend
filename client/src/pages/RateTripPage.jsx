import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as ratingService from '../api/ratingService';
import * as tripService from '../api/tripService';
import Spinner from '../components/Spinner';
import StarRating from '../components/StarRating';
import { useAuth } from '../contexts/AuthContext';

const MAX_COMMENT_LENGTH = 300;

const RateTripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTrip = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await tripService.getTrip(tripId);
        setTrip(response.data);
      } catch (loadError) {
        const message = loadError.message || 'Failed to load trip';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [tripId]);

  const ratingContext = useMemo(() => {
    if (!trip || !user) {
      return null;
    }

    const passengerId = trip.passenger?._id || trip.passenger;
    const driverUserId = trip.driver?.user?._id || trip.driver?.user;

    if (passengerId?.toString() === user._id?.toString()) {
      return {
        role: 'passenger',
        ratedPartyName: trip.driver?.user?.name || 'your driver',
        existingRating: trip.driverRating,
      };
    }

    if (driverUserId?.toString() === user._id?.toString()) {
      return {
        role: 'driver',
        ratedPartyName: trip.passenger?.name || 'your passenger',
        existingRating: trip.passengerRating,
      };
    }

    return null;
  }, [trip, user]);

  const handleCommentChange = (event) => {
    const nextComment = event.target.value.slice(0, MAX_COMMENT_LENGTH);
    setComment(nextComment);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!score) {
      setError('Please select a star rating before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      await ratingService.rateTrip(tripId, {
        score,
        comment: comment.trim(),
      });
      toast.success('Rating submitted successfully');
      navigate('/dashboard');
    } catch (submitError) {
      const message = submitError.message || 'Unable to submit rating';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Rating unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{error}</p>
          <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!trip || !ratingContext) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Rating unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            You are not authorized to rate this trip.
          </p>
          <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (trip.status !== 'completed') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Rating unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Only completed trips can be rated.
          </p>
          <Link to={`/trip/${tripId}`} className="btn-primary mt-6 inline-flex">
            Back to trip
          </Link>
        </div>
      </div>
    );
  }

  if (ratingContext.existingRating) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card space-y-6">
          <div>
            <h1>Your rating</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              You already rated {ratingContext.ratedPartyName} for this trip.
            </p>
          </div>

          <div className="space-y-3">
            <StarRating
              value={ratingContext.existingRating.score}
              readOnly
              size="lg"
            />
            {ratingContext.existingRating.comment ? (
              <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                {ratingContext.existingRating.comment}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No comment provided.
              </p>
            )}
          </div>

          <Link to="/dashboard" className="btn-primary inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h1>Rate your trip</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          How was your experience with {ratingContext.ratedPartyName}?
        </p>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Rating</label>
            <StarRating value={score} onChange={setScore} size="lg" />
          </div>

          <div>
            <label
              htmlFor="comment"
              className="mb-1 block text-sm font-medium"
            >
              Comment (optional)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={4}
              className="input-field resize-y"
              value={comment}
              onChange={handleCommentChange}
              disabled={isSubmitting}
              placeholder="Share feedback about your trip experience"
              maxLength={MAX_COMMENT_LENGTH}
            />
            <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : null}
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RateTripPage;
