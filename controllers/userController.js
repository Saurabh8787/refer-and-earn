import bcrypt from "bcryptjs"; // Import bcryptjs for password hashing and comparison
import jwt from "jsonwebtoken"; // Import jsonwebtoken for generating JWT tokens
import { v4 as uuidv4 } from "uuid"; // Import uuid for generating unique referral codes
import User from "../models/User.js"; // Import User model

// Function to generate a referral code
const generateReferralCode = () => {
  return uuidv4().substring(0, 8).toUpperCase(); // Generate a UUID, take the first 8 characters, and convert to uppercase
};

// Signup function to register a new user
const signup = async (req, res) => {
  try {
    const { username, password, referralCode } = req.body; // Extract username, password, and referralCode from request body

    const existingUser = await User.findOne({ username }); // Check if a user with the same username already exists
    if (existingUser)
      return res.status(400).json({ message: "Username already exists." }); // If user exists, return error

    let referredBy = null; // Initialize referredBy as null

    if (referralCode) {
      referredBy = await User.findOne({ referralCode }); // Find the user who referred by referralCode
      if (!referredBy)
        return res.status(400).json({ message: "Invalid referral code." }); // If referral code is invalid, return error
      if (referredBy.referrals.length >= 8)
        return res.status(400).json({ message: "Referral limit reached." }); // If referral limit is reached, return error
    }

    let user = new User({
      username,
      password,
      referralCode: generateReferralCode(), // Generate a new referral code for the user
      referredBy: referredBy ? referredBy._id : null, // Set referredBy to the referring user's ID if exists
    });

    if (referredBy) referredBy.referrals.push(user._id); // Add the new user's ID to the referring user's referrals

    await user.save(); // Save the new user to the database
    if (referredBy) await referredBy.save(); // Save the referring user to the database if exists

    res.status(200).json({ message: "User registered successfully." }); // Return success message
  } catch (error) {
    res.status(500).json({ message: "Server error." }); // Return server error
  }
};

// Login function to authenticate a user
const login = async (req, res) => {
  try {
    const { username, password } = req.body; // Extract username and password from request body
    const user = await User.findOne({ username }).select("+password"); // Find the user by username and include password in the result
    if (!user)
      return res.status(400).json({ message: "Invalid username or password." }); // If user not found, return error

    const validPassword = await bcrypt.compare(password, user.password); // Compare the provided password with the stored hashed password
    if (!validPassword)
      return res.status(400).json({ message: "Invalid username or password." }); // If password is invalid, return error

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY); // Generate a JWT token with the user's ID
    res
      .cookie("token", token, { httpOnly: true }) // Set the token as an HTTP-only cookie
      .status(200)
      .json({ message: "Logged in successfully." }); // Return success message
  } catch (error) {
    res.status(500).json({ message: "Server error." }); // Return server error
  }
};

// Logout function
const logout = (req, res) => {
  res.clearCookie("token"); // Clear the token cookie
  res.status(200).json({ message: "Logged out successfully." }); // Return success message
};
// Function to get user details
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "referredBy referrals"
    ); // Find the user by ID and populate referredBy and referrals fields
    res.status(200).json({
      referralCode: user.referralCode, // Return user's referral code
      directEarnings: user.directEarnings, // Return user's direct earnings
      indirectEarnings: user.indirectEarnings, // Return user's indirect earnings
      referredBy: user.referredBy, // Return the user who referred this user
      referrals: user.referrals, // Return the users referred by this user
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." }); // Return server error
  }
};

// Function to get parent and grandparent details
const getParent = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("referredBy"); // Find the user by ID and populate referredBy field
    if (!user.referredBy)
      return res.status(404).json({ message: "No parent referral found." }); // If no parent referral found, return error

    const parent = user.referredBy; // Get the parent user
    const grandparent = parent.referredBy
      ? await User.findById(parent.referredBy)
      : null; // Get the grandparent user if exists

    res.status(200).json({
      parent: {
        username: parent.username, // Return parent's username
        referralCode: parent.referralCode, // Return parent's referral code
      },
      grandparent: grandparent
        ? {
            username: grandparent.username, // Return grandparent's username if exists
            referralCode: grandparent.referralCode, // Return grandparent's referral code if exists
          }
        : null, // If no grandparent, return null
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." }); // Return server error
  }
};

// Function to get children and grandchildren details
const getChildren = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("referrals"); // Find the user by ID and populate referrals field
    const children = user.referrals; // Get the children users

    const grandchildren = await User.find({
      referredBy: { $in: children.map((child) => child._id) },
    }); // Find the grandchildren users

    res.status(200).json({
      children: children.map((child) => ({
        username: child.username, // Return children's usernames
        referralCode: child.referralCode, // Return children's referral codes
      })),
      grandchildren: grandchildren.map((grandchild) => ({
        username: grandchild.username, // Return grandchildren's usernames
        referralCode: grandchild.referralCode, // Return grandchildren's referral codes
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." }); // Return server error
  }
};

export { signup, login, getUserDetails, getParent, getChildren, logout }; // Export the functions
