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
    
    // Convert cart items to ICartItem format
    const formattedItems = cartItems.map((item: any) => ({
      product: item.product?._id || item.productId,
      qty: item.qty || item.quantity,
      unitPrice: item.unitPrice || item.product?.price || 0
    }));
    
    // Calculate cart total
    const cartTotal = formattedItems.reduce((total: number, item: any) => 
      total + (item.unitPrice * item.qty), 0
    );
    
    // Use the service's calculateDiscounts method
    const discountResult = await service.calculateDiscounts(formattedItems);
    const appliedDiscounts = discountResult.appliedDiscounts || [];
    
    const totalDiscount = appliedDiscounts.reduce((sum: number, discount: any) => 
      sum + discount.discountAmount, 0
    );
    
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
