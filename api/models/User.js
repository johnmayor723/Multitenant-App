const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// Address sub-schema
const addressSchema = new Schema({
  flatNumber: String, // Optional
  street: String, // Optional
  city: String, // Optional
  postCode: {
    type: String,
    match: [/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, 'Please enter a valid UK postcode'],
  }, // Optional but validated
  country: {
    type: String,
    default: 'United Kingdom',
  }, // Optional, defaults to UK
});

// User schema with tenant reference
const userSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    index: true, // indexed for faster lookup
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  verificationToken: { type: String },
  addresses: {
    type: [addressSchema], // Optional array of addresses
    default: [],
  },
  roles: {
    type: [String], // e.g. ['tenant_admin', 'customer']
    default: ['customer'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔐 Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
