const Trip = require('../models/Trip');
const {
  getDriverByUserId,
  updateDriverLocation,
  setDriverAvailability,
} = require('../services/driverService');
const { emitToTrip } = require('../sockets');
const { updateTripEta } = require('../services/etaService');
const { success, fail } = require('../utils/apiResponse');

const getMyDriverProfile = async (req, res, next) => {
  try {
    const driver = await getDriverByUserId(req.user._id);

    if (!driver) {
      return fail(res, 'Driver profile not found', 404);
    }

    return success(res, driver);
  } catch (error) {
    next(error);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const { lng, lat, heading } = req.body;
    const driver = await getDriverByUserId(req.user._id);

    if (!driver) {
      return fail(res, 'Driver profile not found', 404);
    }

    const updatedDriver = await updateDriverLocation(
      driver._id,
      Number(lng),
      Number(lat),
      heading !== undefined ? Number(heading) : 0
    );

    const activeTrip = await Trip.findOne({
      driver: driver._id,
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (activeTrip) {
      emitToTrip(activeTrip._id.toString(), 'driver_location_update', {
        tripId: activeTrip._id.toString(),
        driverId: driver._id.toString(),
        lng: Number(lng),
        lat: Number(lat),
        heading: heading !== undefined ? Number(heading) : 0,
      });

      if (['accepted', 'driver_arriving'].includes(activeTrip.status)) {
        updateTripEta(activeTrip._id).catch((error) => {
          console.error('ETA update failed:', error.message);
        });
      }
    }

    return success(res, updatedDriver);
  } catch (error) {
    if (error.message === 'Invalid coordinates') {
      return fail(res, 'Invalid coordinates', 400);
    }

    next(error);
  }
};

const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const driver = await getDriverByUserId(req.user._id);

    if (!driver) {
      return fail(res, 'Driver profile not found', 404);
    }

    const updatedDriver = await setDriverAvailability(driver._id, isAvailable);

    return success(res, updatedDriver);
  } catch (error) {
    if (error.message === 'Cannot change availability while on an active trip') {
      return fail(res, error.message, 400);
    }

    next(error);
  }
};

module.exports = {
  getMyDriverProfile,
  updateLocation,
  toggleAvailability,
};
