const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { success, fail } = require('../utils/apiResponse');

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

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};
