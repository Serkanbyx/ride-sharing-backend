const User = require('../models/User');
const Driver = require('../models/Driver');
const generateToken = require('../utils/generateToken');
const { success, fail } = require('../utils/apiResponse');

const cancelActiveTripsForUser = async (userId, driverId = null) => {
  try {
    const Trip = require('../models/Trip');

    const query = {
      status: { $nin: ['completed', 'cancelled'] },
      $or: [{ passenger: userId }],
    };

    if (driverId) {
      query.$or.push({ driver: driverId });
    }

    await Trip.updateMany(query, {
      status: 'cancelled',
      cancelledBy: 'system',
      cancellationReason: 'Account deleted',
      cancelledAt: new Date(),
    });
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'passenger',
    });

    const token = generateToken(user);

    return success(
      res,
      {
        token,
        user,
      },
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 'Registration failed. Email may already be in use.', 400);
    }

    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return fail(res, 'Invalid email or password', 401);
    }

    const token = generateToken(user);

    user.password = undefined;

    return success(res, {
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return success(res, req.user);
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return success(res, user);
  } catch (error) {
    next(error);
  }
};

const becomeDriver = async (req, res, next) => {
  try {
    const { vehicle } = req.body;

    const existingDriver = await Driver.findOne({ user: req.user._id });
    if (existingDriver) {
      return fail(res, 'Driver profile already exists', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role: 'driver' },
      { new: true, runValidators: true }
    );

    const driver = await Driver.create({
      user: user._id,
      vehicle,
    });

    return success(
      res,
      {
        user,
        driver,
      },
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 'Driver profile already exists', 400);
    }

    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return fail(res, 'Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    return success(res, { message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(password))) {
      return fail(res, 'Password is incorrect', 400);
    }

    const driver = await Driver.findOne({ user: user._id });

    await cancelActiveTripsForUser(user._id, driver?._id);

    if (driver) {
      await Driver.findByIdAndDelete(driver._id);
    }

    await User.findByIdAndDelete(user._id);

    return success(res, { message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  becomeDriver,
  changePassword,
  deleteAccount,
};
