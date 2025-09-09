import type { Request, Response } from 'express';
import { DiscountRuleService } from '../services/discountRule.service.js';

const service = new DiscountRuleService();

export const createDiscountRule = async (req: Request, res: Response) => {
  try {
    const result = await service.create(req.body);
    res.status(result.statuscode).json(result.Content);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating discount rule', 
      error: error.message 
    });
  }
};

export const getDiscountRules = async (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.query.id || "";
    const filters = {
      type: req.query.type,
      active: req.query.active,
      product: req.query.product,
      category: req.query.category
    };
    
    const result = await service.get(id as string, filters);
    res.status(result.statuscode).json(result.Content);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching discount rules', 
      error: error.message 
    });
  }
};

export const getDiscountTypeSuggestions = async (req: Request, res: Response) => {
  try {
    const suggestions = service.getDiscountTypeSuggestions(req.query);
    res.status(200).json({
      message: 'Discount type suggestions fetched',
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching suggestions', 
      error: error.message 
    });
  }
};

export const getApplicableRules = async (req: Request, res: Response) => {
  try {
    const { cartItems, cartTotal } = req.body;
    const result = await service.getApplicableRules(cartItems, cartTotal);
    res.status(result.statuscode).json(result.Content);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching applicable rules', 
      error: error.message 
    });
  }
};

export const updateDiscountRule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = await service.update(id, req.body);
    res.status(result.statuscode).json(result.Content);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating discount rule', 
      error: error.message 
    });
  }
};

export const deleteDiscountRule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = await service.remove(id);
    res.status(result.statuscode).json(result.Content);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting discount rule', 
      error: error.message 
    });
  }
};

// Discount calculation engine for cart
export const calculateCartDiscounts = async (req: Request, res: Response) => {
  try {
    const { cartItems, userId } = req.body;
    
    // Calculate cart total
    const cartTotal = cartItems.reduce((total: number, item: any) => 
      total + (item.product.price * item.quantity), 0
    );
    
    // Get applicable rules
    const rulesResult = await service.getApplicableRules(cartItems, cartTotal);
    const applicableRules = rulesResult.Content.data;
    
    let totalDiscount = 0;
    const appliedDiscounts = [];
    
    // Apply discounts based on priority
    for (const rule of applicableRules) {
      const discount = calculateRuleDiscount(rule, cartItems, cartTotal);
      
      if (discount > 0) {
        totalDiscount += discount;
        appliedDiscounts.push({
          ruleId: rule._id,
          name: rule.name,
          type: rule.type,
          discount: discount,
          description: getDiscountDescription(rule, discount)
        });
        
        // Increment usage count
        await service.incrementUsage(rule._id);
      }
    }
    
    res.status(200).json({
      message: 'Cart discounts calculated',
      data: {
        originalTotal: cartTotal,
        totalDiscount: totalDiscount,
        finalTotal: cartTotal - totalDiscount,
        appliedDiscounts: appliedDiscounts
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: 'Error calculating discounts', 
      error: error.message 
    });
  }
};

// Helper functions for discount calculation
function calculateRuleDiscount(rule: any, cartItems: any, cartTotal: number): number {
  switch (rule.type) {
    case 'FIXED_AMOUNT':
      return Math.min(rule.fixedAmount, cartTotal);
      
    case 'PERCENT_CATEGORY':
      const categoryItems = cartItems.filter((item: any) => 
        item.product.category && item.product.category.toString() === rule.category.toString()
      );
      const categoryTotal = categoryItems.reduce((total: number, item: any) => 
        total + (item.product.price * item.quantity), 0
      );
      return (categoryTotal * rule.percentage) / 100;
      
    case 'PERCENT_PRODUCT':
      const productItems = cartItems.filter((item: any) => 
        item.product._id.toString() === rule.product.toString()
      );
      const productTotal = productItems.reduce((total: number, item: any) => 
        total + (item.product.price * item.quantity), 0
      );
      return (productTotal * rule.percentage) / 100;
      
    case 'BOGO':
      const bogoItems = cartItems.filter((item: any) => 
        (rule.product && item.product._id.toString() === rule.product.toString()) ||
        (rule.category && item.product.category && item.product.category.toString() === rule.category.toString())
      );
      let bogoDiscount = 0;
      bogoItems.forEach((item: any) => {
        const freeItems = Math.floor(item.quantity / 2);
        bogoDiscount += freeItems * item.product.price;
      });
      return bogoDiscount;
      
    case 'TWO_FOR_ONE':
      const twoForOneItems = cartItems.filter((item: any) => 
        (rule.product && item.product._id.toString() === rule.product.toString()) ||
        (rule.category && item.product.category && item.product.category.toString() === rule.category.toString())
      );
      let twoForOneDiscount = 0;
      twoForOneItems.forEach((item: any) => {
        if (item.quantity >= 2) {
          const setsOfTwo = Math.floor(item.quantity / 2);
          twoForOneDiscount += setsOfTwo * item.product.price;
        }
      });
      return twoForOneDiscount;
      
    default:
      return 0;
  }
}

function getDiscountDescription(rule: any, discount: number): string {
  switch (rule.type) {
    case 'FIXED_AMOUNT':
      return `$${discount} off your order`;
    case 'PERCENT_CATEGORY':
      return `${rule.percentage}% off ${rule.category?.name || 'category items'}`;
    case 'PERCENT_PRODUCT':
      return `${rule.percentage}% off ${rule.product?.name || 'product'}`;
    case 'BOGO':
      return `Buy one, get one free on ${rule.product?.name || rule.category?.name}`;
    case 'TWO_FOR_ONE':
      return `Two for one price on ${rule.product?.name || rule.category?.name}`;
    default:
      return rule.name;
  }
}