// routes/tenantAuthRoute.js
const express = require("express");
const router = express.Router();
const TenantAuthController = require("../controllers/tenantAuthController");

// 📌 Tenant signup (creates tenant + owner user)
router.post("/signup", TenantAuthController.tenantSignup);

// 📌 Tenant login
router.post("/login", TenantAuthController.tenantLogin);

// 📌 Verify tenant email
router.get("/verify-email/:token", TenantAuthController.verifyEmail);

// 📌 Request password reset (tenant admin only)
router.post("/request-password-reset", TenantAuthController.requestPasswordReset);

// 📌 Reset password (tenant admin only)
router.post("/reset-password", TenantAuthController.resetPassword);

module.exports = router;
