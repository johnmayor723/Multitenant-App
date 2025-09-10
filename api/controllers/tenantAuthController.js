// controllers/TenantAuthController.js
const Tenant = require('../models/Tenant');
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
    user: "info@mfbyforesythebrand.com",
    pass: "#@T1onal", // ⚠️ Move to ENV variable
  },
});

// ✉️ Utility: Send email
const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: `"mfbyforesythebrand" <info@mfbyforesythebrand.com>`,
    to,
    subject,
    text,
  });
};

/**
 * 📌 Tenant Sign Up (creates tenant + owner user)
 */
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
