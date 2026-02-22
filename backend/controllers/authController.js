const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // Validation
    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }
    if (password.length < 6) {
      return errorResponse(res, 400, 'Password must be at least 6 characters');
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return errorResponse(res, 409, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        is_active: true
      })
      .select('id, email, full_name, phone, created_at')
      .single();

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    successResponse(res, 201, 'Registration successful', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    errorResponse(res, 500, 'Registration failed');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, phone, is_active, is_admin')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    if (!user.is_active) {
      return errorResponse(res, 401, 'Account is inactive');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    successResponse(res, 200, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        isAdmin: user.is_admin
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    errorResponse(res, 500, 'Login failed');
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, balance, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    successResponse(res, 200, 'Profile retrieved', { user });
  } catch (err) {
    console.error('Get profile error:', err);
    errorResponse(res, 500, 'Failed to get profile');
  }
};