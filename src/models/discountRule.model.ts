import mongoose from 'mongoose';
import { ERROR_MSG } from '../constants/messege.js';

const discountRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, ERROR_MSG.REQUIRED('discount rule name')],
    trim: true,
  },
  type: {
    type: String,
    required: [true, ERROR_MSG.REQUIRED('discount type')],
    enum: {
      values: ['BOGO', 'TWO_FOR_ONE', 'PERCENT_CATEGORY', 'PERCENT_PRODUCT', 'FIXED_AMOUNT', 'BUY_X_GET_Y'],
      message: 'Invalid discount type'
    }
  },
  // Product-specific discounts
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
  },
  // Category-specific discounts
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
  },
  // Percentage for percentage-based discounts
  percentage: {
    type: Number,
    required: false,
    min: 0,
    max: 100,
    default: 0,
  },
  // Fixed amount for fixed discounts
  fixedAmount: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  // For complex rules like "Buy X Get Y"
  buyQuantity: {
    type: Number,
    required: false,
    min: 1,
    default: 1,
  },
  getQuantity: {
    type: Number,
    required: false,
    min: 1,
    default: 1,
  },
  // Minimum cart value or quantity requirements
  minCartValue: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  minQuantity: {
    type: Number,
    required: false,
    min: 1,
    default: 1,
  },
  // Maximum discount limit
  maxDiscount: {
    type: Number,
    required: false,
    min: 0,
  },
  // Usage limits
  maxUses: {
    type: Number,
    required: false,
    min: 1,
  },
  currentUses: {
    type: Number,
    default: 0,
  },
  // Date constraints
  startDate: {
    type: Date,
    required: false,
  },
  endDate: {
    type: Date,
    required: false,
  },
  // Priority for applying multiple discounts
  priority: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
  // Description for admin reference
  description: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

// Index for better query performance
discountRuleSchema.index({ type: 1, active: 1 });
discountRuleSchema.index({ product: 1, active: 1 });
discountRuleSchema.index({ category: 1, active: 1 });

// Virtual for checking if discount is currently valid
discountRuleSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  const startValid = !this.startDate || this.startDate <= now;
  const endValid = !this.endDate || this.endDate >= now;
  const usageValid = !this.maxUses || this.currentUses < this.maxUses;
  
  return this.active && startValid && endValid && usageValid;
});

// Method to validate discount rule configuration
discountRuleSchema.methods.validateConfiguration = function() {
  const errors = [];
  
  switch (this.type) {
    case 'BOGO':
      if (!this.product && !this.category) {
        errors.push('BOGO discount requires either product or category');
      }
      break;
      
    case 'TWO_FOR_ONE':
      if (!this.product && !this.category) {
        errors.push('Two for one discount requires either product or category');
      }
      break;
      
    case 'PERCENT_CATEGORY':
      if (!this.category || !this.percentage) {
        errors.push('Category percentage discount requires category and percentage');
      }
      break;
      
    case 'PERCENT_PRODUCT':
      if (!this.product || !this.percentage) {
        errors.push('Product percentage discount requires product and percentage');
      }
      break;
      
    case 'FIXED_AMOUNT':
      if (!this.fixedAmount) {
        errors.push('Fixed amount discount requires fixedAmount value');
      }
      break;
      
    case 'BUY_X_GET_Y':
      if (!this.buyQuantity || !this.getQuantity || (!this.product && !this.category)) {
        errors.push('Buy X Get Y discount requires buyQuantity, getQuantity, and either product or category');
      }
      break;
  }
  
  return errors;
};

export const DiscountRule = mongoose.model('DiscountRule', discountRuleSchema);

