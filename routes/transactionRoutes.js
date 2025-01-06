import express from 'express';
import { createTransaction } from '../controllers/transactionController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createTransaction);

export default router;
