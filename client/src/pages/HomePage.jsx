import { Link } from 'react-router-dom';
import {
  Car,
  CreditCard,
  MapPin,
  Radio,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated, isPassenger, isDriver } = useAuth();

  const ctaHref = (() => {
    if (isAuthenticated && isPassenger) {
      return '/request-ride';
    }

    if (isAuthenticated && isDriver) {
      return '/driver';
    }

    return '/login';
  })();

  const ctaLabel = (() => {
    if (isAuthenticated && isPassenger) {
      return 'Request a Ride';
    }

    if (isAuthenticated && isDriver) {
      return 'Open Driver Panel';
    }

    return 'Get Started';
  })();

  const steps = [
    {
      icon: MapPin,
      title: 'Request',
      description: 'Enter pickup and destination to request a ride instantly.',
    },
    {
      icon: Users,
      title: 'Match',
      description: 'Nearby drivers receive your request and accept in real time.',
    },
    {
      icon: Car,
      title: 'Ride',
      description: 'Track your trip, pay securely, and rate your experience.',
    },
  ];

  const features = [
    {
      icon: Radio,
      title: 'Real-time tracking',
      description: 'Follow trip status, driver location, and ETA live in the app.',
    },
    {
      icon: CreditCard,
      title: 'Secure payments',
      description: 'Pay completed trips safely with Stripe-powered checkout.',
    },
    {
      icon: Star,
      title: 'Driver ratings',
      description: 'Two-way ratings help keep the RideFlow community reliable.',
    },
  ];

  return (
    <div className="space-y-16">
      <section className="rounded-2xl bg-linear-to-br from-primary to-primary-dark px-6 py-16 text-white sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-white">Get a ride in minutes</h1>
          <p className="mt-4 text-lg text-blue-100">
            Request rides, match with nearby drivers, and track your trip from
            pickup to drop-off.
          </p>
          <Link to={ctaHref} className="btn-secondary mt-8 inline-flex bg-white text-primary hover:bg-blue-50">
            {ctaLabel}
          </Link>
        </div>
      </section>

      <section>
        <div className="text-center">
          <h2>How it works</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Three simple steps from request to ride.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="card text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
                <step.icon className="h-6 w-6" />
              </div>
              <h3>{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center">
          <h2>Built for modern ride sharing</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Everything you need for a smooth passenger and driver experience.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3>{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <Shield className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-4">Safe, simple, and reliable</h2>
        <p className="mx-auto mt-2 max-w-2xl text-gray-600 dark:text-gray-400">
          RideFlow combines real-time matching, secure payments, and role-based
          dashboards for passengers and drivers.
        </p>
      </section>
    </div>
  );
};

export default HomePage;
