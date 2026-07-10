const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    vehicle: {
      make: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
      },
      model: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
      },
      year: {
        type: Number,
        required: true,
        min: 1990,
        max: new Date().getFullYear() + 1,
      },
      color: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
      plateNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 10,
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        default: [0, 0],
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
          message: 'Location coordinates must be valid [lng, lat] values',
        },
      },
    },
    heading: {
      type: Number,
      default: 0,
      min: 0,
      max: 360,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    isOnTrip: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLocationUpdate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

driverSchema.index({ location: '2dsphere' });
driverSchema.index({ isAvailable: 1, isOnTrip: 1 });

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
