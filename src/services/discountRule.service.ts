import { DiscountRule } from '../models/discountRule.model.js';
import type { ICartItem, IDiscountRule } from '../interfaces/model.interface.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';
import { statuscode } from '../constants/status.js';
import { ApiError } from '../utils/apiError.js';

export class DiscountRuleService {
  
  // Get discount type suggestions based on context
  getDiscountTypeSuggestions(context = {}) {
    const suggestions = {
      BOGO: {
        name: 'Buy One Get One',
        description: 'Customer gets one free item for every item purchased',
        requiredFields: ['product OR category'],
        example: 'Buy 1 T-shirt, get 1 free',
        useCase: 'Inventory clearance, promoting specific products'
      },
      TWO_FOR_ONE: {
        name: 'Two for One Price',
        description: 'Customer pays for one item when buying two or more',
        requiredFields: ['product OR category', 'minQuantity'],
        example: 'Buy 2 shoes, pay for 1',
        useCase: 'Bulk sales, encouraging larger purchases'
      },
      PERCENT_CATEGORY: {
        name: 'Category Percentage Discount',
        description: 'Percentage off all items in a category',
        requiredFields: ['category', 'percentage'],
        example: '50% off all jackets',
        useCase: 'Seasonal sales, category promotions'
      },
      PERCENT_PRODUCT: {
        name: 'Product Percentage Discount',
        description: 'Percentage off specific product',
        requiredFields: ['product', 'percentage'],
        example: '20% off specific T-shirt',
        useCase: 'Product-specific promotions'
      },
      FIXED_AMOUNT: {
        name: 'Fixed Amount Discount',
        description: 'Fixed dollar amount off cart or product',
        requiredFields: ['fixedAmount'],
        example: '$10 off orders over $50',
        useCase: 'Cart-wide discounts, shipping promotions'
      },
      BUY_X_GET_Y: {
        name: 'Buy X Get Y',
        description: 'Buy certain quantity, get different quantity free/discounted',
        requiredFields: ['buyQuantity', 'getQuantity', 'product OR category'],
        example: 'Buy 3, get 2 free',
        useCase: 'Complex promotional offers'
      }
    };

    return suggestions;
  }

  async create(data: any) {
    // Validate the discount rule configuration
    const tempRule : any= new DiscountRule(data);
    const validationErrors = tempRule.validateConfiguration();
    
    if (validationErrors.length > 0) {
      return { 
        statuscode: statuscode.BADREQUEST, 
        Content: { 
          message: ERROR_MSG.DEFAULT_ERROR, 
          errors: validationErrors 
        } 
      };
    }

    const result = await DiscountRule.create(data);
    return { 
      statuscode: statuscode.CREATED, 
      Content: { 
        message: MSG.SUCCESS('Discount rule created'), 
        data: result 
      } 
    };
  }

  async get(id : string, filters: any = {}) {
    let query: any = {};
    
    if (id) {
      query._id = id;
    } else {
      // Apply filters
      if (filters.type) query.type = filters.type;
      if (filters.active !== undefined) query.active = filters.active;
      if (filters.product) query.product = filters.product;
      if (filters.category) query.category = filters.category;
    }

    const data = id 
      ? await DiscountRule.findById(id).populate('product category')
      : await DiscountRule.find(query).populate('product category').sort({ priority: -1, createdAt: -1 });
    
    if (id && !data) {
      return { 
        statuscode: statuscode.NOTFOUND, 
        Content: { message: ERROR_MSG.NOT_FOUND('Discount rule') } 
      };
    }

    return { 
      statuscode: statuscode.OK, 
      Content: { 
        message: MSG.SUCCESS('Discount rules fetched'), 
        data 
      } 
    };
  }


  async update(id: any, data: any) {
    // Validate updated configuration if type or key fields changed
    if (data.type || data.product || data.category || data.percentage || data.fixedAmount) {
      const existingRule = await DiscountRule.findById(id);
      if (!existingRule) {
        return { 
          statuscode: statuscode.NOTFOUND, 
          Content: { message: ERROR_MSG.NOT_FOUND('Discount rule') } 
        };
      }
      
      const updatedRule = { ...existingRule.toObject(), ...data };
      const tempRule: any = new DiscountRule(updatedRule);
      const validationErrors = tempRule.validateConfiguration();
      
      if (validationErrors.length > 0) {
        return { 
          statuscode: statuscode.BADREQUEST, 
          Content: { 
            message: ERROR_MSG.DEFAULT_ERROR, 
            errors: validationErrors 
          } 
        };
      }
    }

    const result = await DiscountRule.findByIdAndUpdate(
      id, 
      { $set: data }, 
      { new: true, runValidators: true }
    ).populate('product category');
    
    if (!result) {
      return { 
        statuscode: statuscode.NOTFOUND, 
        Content: { message: ERROR_MSG.NOT_FOUND('Discount rule') } 
      };
    }
    
    return { 
      statuscode: statuscode.OK, 
      Content: { 
        message: MSG.SUCCESS('Discount rule updated'), 
        data: result 
      } 
    };
  }

  async remove(id: any) {
    const result = await DiscountRule.findByIdAndDelete(id);
    if (!result) {
      return { 
        statuscode: statuscode.NOTFOUND, 
        Content: { message: ERROR_MSG.NOT_FOUND('Discount rule') } 
      };
    }
    
    return { 
      statuscode: statuscode.OK, 
      Content: { 
        message: MSG.SUCCESS('Discount rule deleted'), 
        data: result 
      } 
    };
  }


  async calculateDiscounts(items: ICartItem[]) {
    const appliedDiscounts = [];
    
    // Get all active discount rules
    const rules = await DiscountRule.find({ active: true });
    
    // Apply each rule and collect discounts
    for (const rule of rules) {
      const discount = await this.applyRule(rule, items);
      if (discount) {
        appliedDiscounts.push(discount);
      }
    }

    return { appliedDiscounts };
  }

  private async applyRule(rule: any, items: ICartItem[]) {
    // Check if rule is currently valid
    if (!rule.isCurrentlyValid) {
      return null;
    }

    // Check minimum cart value requirement
    const cartTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    if (rule.minCartValue && cartTotal < rule.minCartValue) {
      return null;
    }

    let discountAmount = 0;
    let description = '';

    switch (rule.type) {
      case 'FIXED_AMOUNT':
        discountAmount = Math.min(rule.fixedAmount || 0, cartTotal);
        description = `$${discountAmount} off your order`;
        break;

      case 'PERCENT_CATEGORY':
        if (!rule.category) return null;
        const categoryItems = items.filter(item => 
          item.product && item.product.toString() === rule.category.toString()
        );
        const categoryTotal = categoryItems.reduce((sum, item) => 
          sum + (item.unitPrice * item.qty), 0
        );
        discountAmount = (categoryTotal * (rule.percentage || 0)) / 100;
        description = `${rule.percentage}% off category items`;
        break;

      case 'PERCENT_PRODUCT':
        if (!rule.product) return null;
        const productItems = items.filter(item => 
          item.product && item.product.toString() === rule.product.toString()
        );
        const productTotal = productItems.reduce((sum, item) => 
          sum + (item.unitPrice * item.qty), 0
        );
        discountAmount = (productTotal * (rule.percentage || 0)) / 100;
        description = `${rule.percentage}% off product`;
        break;

      case 'BOGO':
        const bogoItems = items.filter(item => 
          (rule.product && item.product && item.product.toString() === rule.product.toString()) ||
          (rule.category && item.product && item.product.toString() === rule.category.toString())
        );
        
        bogoItems.forEach(item => {
          const freeItems = Math.floor(item.qty / 2);
          discountAmount += freeItems * item.unitPrice;
        });
        description = 'Buy one, get one free';
        break;

      case 'TWO_FOR_ONE':
        const twoForOneItems = items.filter(item => 
          (rule.product && item.product && item.product.toString() === rule.product.toString()) ||
          (rule.category && item.product && item.product.toString() === rule.category.toString())
        );
        
        twoForOneItems.forEach(item => {
          if (item.qty >= 2) {
            const setsOfTwo = Math.floor(item.qty / 2);
            discountAmount += setsOfTwo * item.unitPrice;
          }
        });
        description = 'Two for one price';
        break;

      case 'BUY_X_GET_Y':
        const buyXGetYItems = items.filter(item => 
          (rule.product && item.product && item.product.toString() === rule.product.toString()) ||
          (rule.category && item.product && item.product.toString() === rule.category.toString())
        );
        
        buyXGetYItems.forEach(item => {
          if (item.qty >= rule.buyQuantity) {
            const eligibleSets = Math.floor(item.qty / rule.buyQuantity);
            const freeItems = eligibleSets * rule.getQuantity;
            discountAmount += Math.min(freeItems, item.qty) * item.unitPrice;
          }
        });
        description = `Buy ${rule.buyQuantity}, get ${rule.getQuantity} free`;
        break;

      default:
        return null;
    }

    // Apply maximum discount limit if set
    if (rule.maxDiscount && discountAmount > rule.maxDiscount) {
      discountAmount = rule.maxDiscount;
    }

    // Check minimum quantity requirement
    if (rule.minQuantity) {
      const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);
      if (totalQuantity < rule.minQuantity) {
        return null;
      }
    }

    if (discountAmount > 0) {
      return {
        ruleId: rule._id,
        ruleName: rule.name,
        discountAmount,
        description
      };
    }

    return null;
  }

  // Get applicable rules for a cart
  async getApplicableRules(cartItems: any[], cartTotal: number) {
    try {
      const rules = await DiscountRule.find({ active: true })
        .populate('product', 'name price')
        .populate('category', 'name')
        .sort({ priority: -1 });

      const applicableRules = rules.filter(rule => {
        // Check date validity
        const now = new Date();
        if (rule.startDate && rule.startDate > now) return false;
        if (rule.endDate && rule.endDate < now) return false;
        
        // Check usage limits
        if (rule.maxUses && rule.currentUses >= rule.maxUses) return false;
        
        // Check minimum cart value
        if (rule.minCartValue && cartTotal < rule.minCartValue) return false;
        
        // Check minimum quantity
        if (rule.minQuantity) {
          const totalQuantity = cartItems.reduce((sum, item) => sum + (item.qty || 0), 0);
          if (totalQuantity < rule.minQuantity) return false;
        }

        return true;
      });

      return {
        statuscode: statuscode.OK,
        Content: {
          message: MSG.SUCCESS('Applicable rules retrieved'),
          data: applicableRules
        }
      };
    } catch (error) {
      throw new ApiError(
        statuscode.INTERNALSERVERERROR,
        error.message || ERROR_MSG.DEFAULT_ERROR
      );
    }
  }

  // Increment usage count for a rule
  async incrementUsage(ruleId: string) {
    try {
      await DiscountRule.findByIdAndUpdate(
        ruleId,
        { $inc: { currentUses: 1 } }
      );
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }
}