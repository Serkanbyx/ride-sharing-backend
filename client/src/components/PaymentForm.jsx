import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import Spinner from './Spinner';

const PaymentForm = ({ clientSecret, amount, tripId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsSubmitting(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/rate/${tripId}`,
      },
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      <button
        type="submit"
        className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
        disabled={!stripe || !elements || isSubmitting}
      >
        {isSubmitting ? <Spinner size="sm" /> : null}
        {isSubmitting ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
};

export default PaymentForm;
