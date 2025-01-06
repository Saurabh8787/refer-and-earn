import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";

const generateReferralCode = () => {
  return uuidv4().substring(0, 8).toUpperCase();
};

const signup = async (req, res) => {
  const { username, password, referralCode } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser)
    return res.status(400).json({ message: "Username already exists." });

  let referredBy = null;

  if (referralCode) {
    referredBy = await User.findOne({ referralCode });
    if (!referredBy)
      return res.status(400).json({ message: "Invalid referral code." });
    if (referredBy.referrals.length >= 8)
      return res.status(400).json({ message: "Referral limit reached." });
  }

  let user = new User({
    username,
    password,
    referralCode: generateReferralCode(),
    referredBy: referredBy ? referredBy._id : null,
  });

  if (referredBy) referredBy.referrals.push(user._id);

  await user.save();
  if (referredBy) await referredBy.save();

  res.status(200).json({ message: "User registered successfully." });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  if (!user)
    return res.status(400).json({ message: "Invalid username or password." });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid username or password." });

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY);
  res
    .cookie("token", token, { httpOnly: true })
    .status(200)
    .json({ message: "Logged in successfully." });
};

const getUserDetails = async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "referredBy referrals"
  );
  res.status(200).json({
    referralCode: user.referralCode,
    directEarnings: user.directEarnings,
    indirectEarnings: user.indirectEarnings,
    referredBy: user.referredBy,
    referrals: user.referrals,
  });
};

const getParent = async (req, res) => {
  const user = await User.findById(req.user._id).populate("referredBy");
  if (!user.referredBy)
    return res.status(404).json({ message: "No parent referral found." });

  const parent = user.referredBy;
  const grandparent = parent.referredBy
    ? await User.findById(parent.referredBy)
    : null;

  res.status(200).json({
    parent: {
      username: parent.username,
      referralCode: parent.referralCode,
    },
    grandparent: grandparent
      ? {
          username: grandparent.username,
          referralCode: grandparent.referralCode,
        }
      : null,
  });
};

const getChildren = async (req, res) => {
  const user = await User.findById(req.user._id).populate("referrals");
  const children = user.referrals;

  const grandchildren = await User.find({
    referredBy: { $in: children.map((child) => child._id) },
  });

  res.status(200).json({
    children: children.map((child) => ({
      username: child.username,
      referralCode: child.referralCode,
    })),
    grandchildren: grandchildren.map((grandchild) => ({
      username: grandchild.username,
      referralCode: grandchild.referralCode,
    })),
  });
};

export { signup, login, getUserDetails, getParent, getChildren };
