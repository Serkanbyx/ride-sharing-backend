require('dotenv').config();

const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Driver = require('../models/Driver');

const CENTER_LNG = -122.4194;
const CENTER_LAT = 37.7749;

const seedUsers = [
  {
    name: 'Alice Passenger',
    email: 'passenger@test.com',
    password: 'Password123!',
    phone: '+14155550001',
    role: 'passenger',
  },
  {
    name: 'Bob Driver',
    email: 'driver@test.com',
    password: 'Password123!',
    phone: '+14155550002',
    role: 'driver',
    driverProfile: {
      vehicle: {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'White',
        plateNumber: 'ABC1234',
      },
      location: {
        type: 'Point',
        coordinates: [CENTER_LNG, CENTER_LAT],
      },
      heading: 90,
    },
  },
  {
    name: 'Carol Driver',
    email: 'driver2@test.com',
    password: 'Password123!',
    phone: '+14155550003',
    role: 'driver',
    driverProfile: {
      vehicle: {
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        color: 'Black',
        plateNumber: 'XYZ5678',
      },
      location: {
        type: 'Point',
        coordinates: [CENTER_LNG + 0.012, CENTER_LAT + 0.009],
      },
      heading: 180,
    },
  },
  {
    name: 'Dan Driver',
    email: 'driver3@test.com',
    password: 'Password123!',
    phone: '+14155550004',
    role: 'driver',
    driverProfile: {
      vehicle: {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        color: 'Blue',
        plateNumber: 'TESLA01',
      },
      location: {
        type: 'Point',
        coordinates: [CENTER_LNG - 0.015, CENTER_LAT - 0.011],
      },
      heading: 270,
    },
  },
];

const clearTripData = async () => {
  try {
    const Trip = require('../models/Trip');
    await Trip.deleteMany({});
    console.log('Cleared trips');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
  }
};

const seedDatabase = async () => {
  if (env.NODE_ENV === 'production') {
    console.error('Seed script cannot run in production');
    process.exit(1);
  }

  await connectDB();

  await User.deleteMany({});
  await Driver.deleteMany({});
  await clearTripData();

  console.log('Cleared existing users and drivers');

  for (const seedUser of seedUsers) {
    const { driverProfile, ...userData } = seedUser;
    const user = await User.create(userData);

    if (driverProfile) {
      await Driver.create({
        user: user._id,
        vehicle: driverProfile.vehicle,
        location: driverProfile.location,
        heading: driverProfile.heading,
        isAvailable: true,
        isOnTrip: false,
        lastLocationUpdate: new Date(),
      });
    }

    console.log(`Created ${user.role}: ${user.email} / Password123!`);
  }

  console.log('\nSeed completed successfully');
  console.log('Test accounts:');
  console.log('- Passenger: passenger@test.com');
  console.log('- Drivers: driver@test.com, driver2@test.com, driver3@test.com');
  console.log('- Password for all accounts: Password123!');

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
};

seedDatabase().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
