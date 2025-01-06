import express from 'express';
import { signup, login, getUserDetails, getParent, getChildren } from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, getUserDetails);
router.get('/parent', authMiddleware, getParent);
router.get('/children', authMiddleware, getChildren);

export default router;
