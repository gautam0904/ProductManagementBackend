import { DiscountRule } from '../models/discountRule.model.js';
import type { IDiscountRule } from '../interfaces/model.interface.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';
import { statuscode } from '../constants/status.js';

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

  async getApplicableRules(cartItems : any, cartTotal: any) {
    const activeRules = await DiscountRule.find({ 
      active: true,
      $or: [
        { startDate: { $exists: false } },
        { startDate: { $lte: new Date() } },
        { endDate: { $exists: false } },
        { endDate: { $gte: new Date() } }
      ]
    }).populate('product category').sort({ priority: -1 });

    const applicableRules = activeRules.filter(rule => {
      // Check usage limits
      if (rule.maxUses && rule.currentUses >= rule.maxUses) return false;
      
      // Check minimum cart value
      if (rule.minCartValue && cartTotal < rule.minCartValue) return false;
      
      // Check if rule applies to items in cart
      return this.ruleAppliestoCart(rule, cartItems);
    });

    return { 
      statuscode: statuscode.OK, 
      Content: { 
        message: MSG.SUCCESS('Applicable rules fetched'), 
        data: applicableRules 
      } 
    };
  }

  ruleAppliestoCart(rule: any, cartItems: any) {
    switch (rule.type) {
      case 'FIXED_AMOUNT':
        return true; // Cart-wide discount
        
      case 'PERCENT_CATEGORY':
        return cartItems.some((item : any) => 
          item.product.category && item.product.category.toString() === rule.category.toString()
        );
        
      case 'PERCENT_PRODUCT':
      case 'BOGO':
      case 'TWO_FOR_ONE':
      case 'BUY_X_GET_Y':
        return cartItems.some((item: any) => 
          item.product._id.toString() === rule.product.toString()
        );
        
      default:
        return false;
    }
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

  async incrementUsage(id: any) {
    const result = await DiscountRule.findByIdAndUpdate(
      id,
      { $inc: { currentUses: 1 } },
      { new: true }
    );
    
    return result;
  }
}