import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const createTransaction = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user;

    const transaction = new Transaction({
      user: user._id,
      amount,
    });

    await transaction.save();

    if (amount > 1000) {
      if (user.referredBy) {
        const parent = await User.findById(user.referredBy);
        parent.directEarnings += amount * 0.05;
        await parent.save();

        if (parent.referredBy) {
          const grandparent = await User.findById(parent.referredBy);
          grandparent.indirectEarnings += amount * 0.01;
          await grandparent.save();
        }
      }
    }

    res.status(200).json({ message: 'Transaction created successfully.' });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

export {
  createTransaction,
};
