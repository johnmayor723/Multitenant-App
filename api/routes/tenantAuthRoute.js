// routes/tenantAuthRoute.js
const express = require("express");
const router = express.Router();
const TenantAuthController = require("../controllers/tenantAuthController");

// 📌 Tenant signup (creates tenant + owner user)
router.post("/request-otp", TenantAuthController.requestOtp);
router.post("/verify-otp", TenantAuthController.verifyOtp);
router.post("/signup", TenantAuthController.completeSignup);
// 📌 Tenant login
router.post("/email-login", TenantAuthController.tenantLogin); 

// 📌 Verify tenant email
router.get("/verify-email/:token", TenantAuthController.verifyEmail); 

// 📌 Request password reset (tenant admin only)
router.post("/request-password-reset", TenantAuthController.requestPasswordReset);

// 📌 Reset password (tenant admin only)
router.post("/reset-password", TenantAuthController.resetPassword);
router.post('/complete-signup', TenantAuthController.completeSignup);
router.post('/select-plan', TenantAuthController.selectPlan);

module.exports = router;
