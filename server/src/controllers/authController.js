import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Username and password required' });
    }

    // Lookup user by either email or username to make login flexible and robust
    let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: email }] });
    
    // Auto-create admin user on login if MongoDB is clean
    if (!user && (email.toLowerCase() === 'admin@refundshield.io' || email === 'admin')) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      user = await User.create({
        username: 'admin',
        email: 'admin@refundshield.io',
        passwordHash,
        role: 'Lead Investigator'
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    // Verify hashed password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function register(req, res) {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'Investigator'
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
