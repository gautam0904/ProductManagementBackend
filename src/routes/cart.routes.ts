// routes/cart.routes.ts
import express from 'express';
import { 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart, 
  getCart 
} from '../controllers/cart.controller.js';

const router = express.Router();

// Add item to cart
router.post('/add', addToCart);

// Update item quantity
router.put('/:userId/items/:productId', updateCartItem);

// Remove item from cart
router.delete('/:userId/items/:productId', removeFromCart);

// Clear cart
router.delete('/:userId/clear', clearCart);

// Get cart with discounts
router.get('/:userId', getCart);

export default router;