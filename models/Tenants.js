// models/Tenant.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

const TenantSchema = new Schema({
  tenantId: {
    type: String,
    unique: true,
    default: uuidv4, // auto-generate unique ID
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true, // used as subdomain
    lowercase: true,
    trim: true,
  },
  domain: {
    type: String,
    sparse: true, // optional custom domain
    trim: true,
  },
  owner: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  plan: {
    provider: { type: String, enum: ['stripe', 'paystack', 'paypal'], default: 'paystack' },
    planId: { type: String },
    subscriptionId: { type: String },
    status: { type: String, enum: ['pending', 'active', 'canceled'], default: 'pending' },
    currentPeriodEnd: { type: Date },
  },
  branding: {
    logoUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#000000' },
    secondaryColor: { type: String, default: '#FFFFFF' },
    theme: { type: String, default: 'default' },
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // 🔹 Array of customer IDs linked to this tenant
  customers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
