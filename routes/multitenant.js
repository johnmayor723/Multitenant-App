const express = require('express');
const axios = require('axios');
//const { use } = require('react');

const router = express.Router();

router.get("/", (req, res) => {
    res.render("multitenant/index", { layout: false });
});
router.get("/adbeaconhope", (req, res) => {
  res.render("multitenant/adbeaconhope-signin", { layout: false });
});

router.post("/adbeaconhope", (req, res) => {
  console.log(req.body);
  const { email, password } = req.body;

  // Simple hardcoded authentication (replace with real logic)
  if (email === "adedoyinbeaconofhopefoundation@gmail.com" && password === "Hope2025") {
    // Redirect to admin page
    return res.redirect("https://www.adedoyinbeaconofhopefoundation.com.ng/management");
  } else {
    // If login fails
    res.send("Invalid credentials. Please try again with valid credentials.");
  }
});
router.get("/dashboard", (req, res) => {
    res.render("multitenant/tenant-dashboard", { layout: false });
});

router.get("/signup", (req, res) => {
    res.render("multitenant/signup", { layout: false });
});
router.get("/signin", (req, res) => {
    res.render("multitenant/signin", { layout: false });
});

// Handle request OTP form
router.post("/multitenant/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const response = await axios.post("http://localhost:3060/api/tenant-auth/request-otp", { email });
    console.log(response.data);   
    res.render("multitenant/post-otp", { message: response.data.message ,  layout: false , email: email });

  } catch (err) {
    console.error(err);
    res.render("multitenant/signup", { message: err.response?.data?.error || "Error sending OTP" ,layout: false });
  }
});

// Render verify OTP page
router.get("/multitent/verify-otp", (req, res) => {
  res.render("multitenant/verify-otp", { message: null });
});

// Handle verify OTP form
router.post("/multitenant/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const response = await axios.post("http://localhost:3060/api/tenant-auth/verify-otp", { email, otp });
    console.log(response.data);
    res.render("multitenant/create-store", { message: response.data.message, layout: false, email });
  } catch (err) {
    console.log(err);
    res.render("multitenant/verify-otp", { message: err.response?.data?.error || "Error verifying OTP", layout: false});
  }
});

// create-store
router.get("/multitenant/create-store", (req, res) => {
  res.render("multitenant/create-store", { message: null, layout: false });
});
router.get("/multitenant/select-domain", (req, res) => {
  res.render("multitenant/select-domain", { message: null, layout: false });
});
// Render complete signup page
router.get("/multitenant/complete", (req, res) => {
  res.render("multitenant/complete", { message: null });
});

// Handle complete signup form
router.post("/multitenant/complete-signup", async (req, res) => {
  try {
    const { name, email, password, slug, domain, plan } = req.body;
    const response = await axios.post("http://localhost:3060/api/tenant-auth/complete-signup", 
     payload = { 
     name: name || slug, 
     email,
     password,
     slug,
     domain: domain || '',
     plan: plan || 'free'
    });
    console.log(response.data);
    const data = response.data;
    console.log(data);
    res.render("multitenant/compareplans", {layout:false, message: response.data.message, data, email }); 
  } catch (err) {
    console.log(err);
    res.render("signup/complete", { message: err.response?.data?.error || "Error completing signup" });
  }
});
router.post("/select-plan", async (req, res) => {
  try {
    const { plan, price, email } = req.body;

    // ✅ Free plan flow
    if (plan.toLowerCase() === "free") {
      const response = await axios.post("http://localhost:5000/api/tenant-auth/select-plan", {
        plan,
        price: 0, // force free price
        email
      });

      if (response.status === 200 || response.status === 201) {
        return res.render("dashboard", { data: response.data });
      }

      return res.status(response.status).send("Free plan selection failed.");
    }

    // 💳 Paid plan flow → render payment page
    return res.render("payment", { plan, email, price });

  } catch (error) {
    console.error("❌ Select plan error:", error.message);

    if (error.response) {
      return res
        .status(error.response.status)
        .send(error.response.data?.error || "API error");
    }

    return res.status(500).send("Server error while selecting plan.");
  }
});

router.get("/compare-plans", (req, res) => {
    res.render("multitenant/compareplans", { layout: false });
})
router.get("/enroll", (req, res) => {
    res.render("multitenant/enroll", { layout: false });
})
router.get("/login", (req, res) => {
    res.render("multitenant/login", { layout: false });
});

// Handle email + password sign-in
router.post("/multitenant/email-sign", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Send to backend API
    const response = await axios.post("http://localhost:3060/api/tenant-auth/email-sign", {
      email,
      password,
    });

    console.log(response.data.use);
    const user = response.data.user;
    console.log("User data:", user);
    // ✅ Save user into session
    req.session.user = user;

    // Render dashboard or success page after login
    res.render("multitenant/dashboard", { 
      message: response.data.message || "Login successful",
      email: email,
      layout: false,
      user
    });

  } catch (err) {
    console.error(err);

    // Render login page again with error message
    res.render("multitenant/signin", { 
      message: err.response?.data?.error || "Invalid credentials",
      layout: false 
    });
  }
});

router.post("/multinant/admin", (req, res) => {
    const user = req.session.user;
    console.log(user);
    if (!user) {
        return res.redirect('/multitenant/signin');
    }
    res.render("management/dashboard", { user });
});

router.get("/congratulations", (req, res) => {
    res.render("multitenant/congratulations", { layout: false });
});

module.exports = router;
