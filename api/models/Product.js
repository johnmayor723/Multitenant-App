const mongoose = require('mongoose');
const { Schema } = mongoose;

// Buying Options sub-schema
const buyingOptionSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sizes: {
    type: [String],
  },
  price: {
    type: Number,
  },
  colors: {
    type: [String],
  },
  image: {
    type: [String],
    required: true
  }
}, { _id: false });

// Product schema with tenant reference
const productSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true, // helps queries like Product.find({ tenantId })
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: [String],
  },
  price: {
    type: Number,
    required: true
  },
  colors: {
    type: [String],
  },
  images: {
    type: [String],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    required: true,
    trim: true
  },
  buyingOptions: {
    type: [buyingOptionSchema],
    default: [],
    validate: {
      validator: function (arr) {
        return Array.isArray(arr);
      },
      message: 'Buying options must be an array'
    }
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
