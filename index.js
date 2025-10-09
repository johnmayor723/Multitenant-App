// server.js
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const MongoStore = require("connect-mongo");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");

// ===== Routes =====
const authRoutes = require("./api/routes/AuthRoute");
const productRoutes = require("./api/routes/productRoutes");
const orderRoutes = require("./api/routes/orderRoutes");
const cartRoutes = require("./api/routes/cartRoutes");
const categoryRoutes = require("./api/routes/categoryRoutes");
const blogRoutes = require("./api/routes/blogRoute");
const commentRoutes = require("./api/routes/commentRoute");
const tenantAuthRoutes = require("./api/routes/tenantAuthRoute");

// ===== Client-side Routes =====
const clientIndexRouter = require("./routes/index");
const clientCartRouter = require("./routes/cart");
const clientPaymentRouter = require("./routes/payment");
const clientOrderRouter = require("./routes/Order");
const clientManagementRouter = require("./routes/management");
const clientMultitenantRouter = require("./routes/multitenant");

// ===== Database & Middleware =====
const connectDB = require("./api/config/database");
const tenantResolver = require("./api/middleware/tenantResolver");

// ===== App Variables =====
const PORT = process.env.PORT || 3060;
const DBURL =
  process.env.DBURL ||
  "mongodb+srv://fooddeck3:majoje1582@cluster0.smhy0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// ===== Connect Database =====
connectDB();

// ===== View Engine Setup =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// ===== Middleware =====
app.use(cors());
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(methodOverride("_method"));

// ===== Static Files =====
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "public")));

// ===== Sessions =====
app.use(
  session({
    secret: "mysupersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: DBURL }),
  })
);

// ===== Flash Messages =====
app.use(flash());

// ===== Global Middleware =====

// Make session accessible in all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Initialize cart if not present
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = {
      items: [],
      totalQty: 0,
      totalAmount: 0,
    };
  }
  next();
});

// Global flash variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

// ===== API Routes =====
app.use("/api/products", tenantResolver, productRoutes);
app.use("/api/orders", tenantResolver, orderRoutes);
app.use("/api/carts", tenantResolver, cartRoutes);
app.use("/api/categories", tenantResolver, categoryRoutes);
app.use("/api/blogs", tenantResolver, blogRoutes);
app.use("/api/comments", tenantResolver, commentRoutes);
app.use("/api/tenant-auth", tenantAuthRoutes);
app.use("/api/auth", authRoutes);

// ===== Client Routes =====
app.use("/multitenant", clientMultitenantRouter);
app.use("/index", clientIndexRouter);
app.use("/cart", clientCartRouter);
app.use("/payment", clientPaymentRouter);
app.use("/orders", clientOrderRouter);
app.use("/management", clientManagementRouter);

// ===== Root Route =====
app.get("/", (req, res) => {
  res.send("🚀 Multitenant Server running successfully!");
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
