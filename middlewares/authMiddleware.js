import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded._id);
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
};

export default authMiddleware;
