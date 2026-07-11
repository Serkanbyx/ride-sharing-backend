const mongoose = require('mongoose');
const {
  TRIP_STATUSES,
  PAYMENT_STATUSES,
  CANCELLED_BY,
} = require('../utils/constants');

const ratingSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    pickup: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            );
          },
          message: 'Pickup coordinates must be valid [lng, lat] values',
        },
      },
    },
    pickupAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    destination: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            );
          },
          message: 'Destination coordinates must be valid [lng, lat] values',
        },
      },
    },
    destinationAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: TRIP_STATUSES,
      default: 'requested',
    },
    distanceMeters: {
      type: Number,
      default: null,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: null,
      min: 0,
    },
    estimatedFare: {
      type: Number,
      default: null,
      min: 0,
    },
    finalFare: {
      type: Number,
      default: null,
      min: 0,
    },
    surgeMultiplier: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    paymentInfo: {
      stripePaymentIntentId: {
        type: String,
        default: null,
      },
      clientSecret: {
        type: String,
        default: null,
      },
      status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: 'pending',
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
    offeredDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
      },
    ],
    cancelledBy: {
      type: String,
      enum: CANCELLED_BY,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    passengerRating: {
      type: ratingSchema,
      default: null,
    },
    driverRating: {
      type: ratingSchema,
      default: null,
    },
    eta: {
      type: Number,
      default: null,
      min: 0,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: TRIP_STATUSES,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.pre('save', async function () {
  if (!this.isModified('status')) return;

  this.statusHistory.push({
    status: this.status,
    timestamp: new Date(),
    note: '',
  });
});

tripSchema.index({ passenger: 1, status: 1 });
tripSchema.index({ driver: 1, status: 1 });
tripSchema.index({ status: 1, createdAt: -1 });
tripSchema.index({ pickup: '2dsphere' });

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
