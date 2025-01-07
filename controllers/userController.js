import bcrypt from "bcryptjs"; 
import jwt from "jsonwebtoken"; 
import { v4 as uuidv4 } from "uuid"; 
import User from "../models/User.js"; 


const generateReferralCode = () => {
  return uuidv4().substring(0, 8).toUpperCase(); 
};


const signup = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error." }); 
  }
};


const login = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error." }); 
  }
};


const logout = (req, res) => {
  res.clearCookie("token"); 
  res.status(200).json({ message: "Logged out successfully." }); 
};

const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "referredBy referrals"
    ); 
    res.status(200).json({
      username: user.username,
      referralCode: user.referralCode, 
      directEarnings: user.directEarnings, 
      indirectEarnings: user.indirectEarnings, 
      referredBy: user.referredBy, 
      referrals: user.referrals,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." }); 
  }
};


const getParent = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error." }); 
  }
};


const getChildren = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error." }); 
  }
};

export { signup, login, getUserDetails, getParent, getChildren, logout }; 
