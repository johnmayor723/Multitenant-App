const { v4: uuidv4 } = require('uuid');
const Tenant = require('../models/Tenant');
const TenantEmail = require('../models/TenantEmail');
const User = require('../models/User');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET || "supersecret";

// 🔧 Mail transport (Zoho or replace with another SMTP)
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: "admin@marketspick.com",
      pass: "A1sha@2025",
  },
});

// ✉️ Utility: Send email
const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: `"EasyApps" <admin@marketspick.com>`,
    to,
    subject,
    text,
  });
};

/**
 * 📌 Tenant Sign Up (creates tenant + owner user)
 */
exports.requestOtp = async (req, res) => {
  try {
    console.log("---- requestOtp called ----");

    const { email } = req.body;
    console.log("Request body:", req.body);

    if (!email) {
      console.log("No email provided in request body");
      return res.status(400).json({ error: "Email is required" });
    }

    console.log("Looking up user by email:", email);
    let user = await User.findOne({ email });
    console.log(user ? `User found: ${user._id}` : "No user found");

    if (user && user.isEmailVerified) {
      console.log("Email already verified — cannot request OTP again.");
      return res.status(400).json({ error: "Email already in use" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);

    if (!user) {
      console.log("No existing user, creating new one...");
      user = new User({ email });
    } else {
      console.log("Updating existing user with OTP...");
    }

    // Save OTP and expiry
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    console.log("Saving user with OTP and expiry:", user);
    await user.save();
    console.log("User saved successfully");

    // Send OTP
    console.log(`Sending OTP email to: ${email}`);
    await sendEmail(email, "Your OTP Code", `Your verification code is: ${otp}`);
    console.log("OTP email sent successfully");

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Error in requestOtp:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ error: "No OTP requested" });
    }

    if (Date.now() > user.otpExpires) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
exports.completeSignup = async (req, res) => {
  try {
    const { name, email, password, slug, domain, plan } = req.body;
    console.log("➡️ Incoming signup request:", { name, email, slug, domain, plan });

    const user = await User.findOne({ email });
    console.log("🔍 Found user:", user ? user._id : "not found");

    if (!user || !user.isEmailVerified) {
      console.log("❌ Email not verified for:", email);
      return res.status(400).json({ error: "Email not verified" });
    }

    // Check if tenant slug or domain already exists
    let existingTenant = await Tenant.findOne({ $or: [{ slug }, { domain }] });
    console.log("🔍 Existing tenant check:", existingTenant ? existingTenant._id : "none");

    if (existingTenant) {
      return res.status(400).json({ error: "Tenant slug or domain already in use" });
    }

    // Update user with signup details
    user.name = name;
    user.password = password;
    user.isVerified = true;
    user.roles = ["tenant_admin"];
    await user.save();
    console.log("✅ User updated:", user._id);

    // Generate tenantId once and use it for both tenant + user
    const tenantId = uuidv4();
    console.log("🆔 Generated tenantId:", tenantId);

    // Create tenant
    let tenant = new Tenant({
      name,
      slug,
      domain,
      owner: {
        userId: user._id,
        name,
        email,
      },
      tenantId,
      plan,
      provider: "paystack",
      status: "pending",
      email, // also store tenant email
    });

    await tenant.save();
    console.log("✅ Tenant created:", tenant._id);

    // Link tenantId to user
    user.tenantId = tenant._Id;
    await user.save();
    console.log("✅ User linked with tenantId:", user.tenantId);

    res.status(201).json({
      message: "Tenant created successfully",
      tenant: { id: tenant._id, slug: tenant.slug, domain: tenant.domain, tenantId: tenant.tenantId },
      owner: { id: user._id, email: user.email, tenantId: user.tenantId },
    });
  } catch (error) {
    console.error("🔥 Complete signup error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.tenantSignup = async (req, res) => {
  try {
    const { name, email, password, slug, domain, plan } = req.body;

    // Check if tenant slug or domain already exists
    let existingTenant = await Tenant.findOne({ $or: [{ slug }, { domain }] });
    if (existingTenant) {
      return res.status(400).json({ error: "Tenant slug or domain already in use" });
    }

    // Create the owner user
    let ownerUser = new User({
      name,
      email,
      password,
      roles: ["tenant_admin"],
      verificationToken: crypto.randomBytes(32).toString("hex"),
    });

    await ownerUser.save();

    // Create tenant and link to owner
    let tenant = new Tenant({
      name,
      slug,
      domain,
      owner: {
        userId: ownerUser._id,
        name,
        email,
      },
      plan: plan || { provider: "paystack", status: "pending" },
    });

    await tenant.save();

    // Assign tenantId to ownerUser
    ownerUser.tenantId = tenant._id;
    await ownerUser.save();

    // Send verification email
    const verifyUrl = `http://yourdomain.com/api/tenant-auth/verify-email/${ownerUser.verificationToken}`;
    await sendEmail(ownerUser.email, "Verify Your Tenant Account", `Click here to verify: ${verifyUrl}`);

    res.status(201).json({
      message: "Tenant created. Please verify your email.",
      tenant: { id: tenant._id, slug: tenant.slug, domain: tenant.domain },
      owner: { id: ownerUser._id, email: ownerUser.email },
    });
  } catch (error) {
    console.error("Tenant signup error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 📌 Tenant Login
 */
exports.tenantLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const ownerUser = await User.findOne({ email, roles: { $in: ["tenant_admin"] } });
    if (!ownerUser) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await ownerUser.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    if (!ownerUser.isVerified) {
      return res.status(403).json({ error: "Please verify your email first." });
    }

    const token = jwt.sign(
      { userId: ownerUser._id, tenantId: ownerUser.tenantId, roles: ownerUser.roles },
      jwtSecret,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: ownerUser._id,
        email: ownerUser.email,
        tenantId: ownerUser.tenantId,
        roles: ownerUser.roles,
      },
    });
  } catch (error) {
    console.error("Tenant login error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 📌 Verify Email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.redirect("https://mfbyforesythebrand.com/verified-email-login");
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 📌 Request Password Reset
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, roles: { $in: ["tenant_admin"] } });

    if (!user) return res.status(404).json({ error: "User not found" });

    user.resetPasswordToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `http://yourdomain.com/api/tenant-auth/reset-password/${user.resetPasswordToken}`;
    await sendEmail(user.email, "Tenant Password Reset", `Click here to reset your password: ${resetUrl}`);

    res.json({ message: "Password reset link sent." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * 📌 Reset Password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.selectPlan = async (req, res) => {
  try {
    const { plan, email } = req.body;

    if (!plan || !email) {
      return res.status(400).send("Plan and email are required");
    }

    // ✅ Just update the user's plan
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { plan },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send("User not found");
    }

    // Render profile with updated data
    return res.render("profile", { data: updatedUser });
  } catch (err) {
    console.error("❌ Select plan error:", err.message);
    return res.status(500).send("Server error");
  }
};
