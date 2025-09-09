import express from 'express';
import {
  createDiscountRule,
  getDiscountRules,
  updateDiscountRule,
  deleteDiscountRule,
  getDiscountTypeSuggestions,
  getApplicableRules,
  calculateCartDiscounts
} from '../controllers/discountRule.controller.js';

const router = express.Router();

// CRUD Operations
router.post('/', createDiscountRule);
router.get('/', getDiscountRules);
router.get('/:id', getDiscountRules);
router.put('/:id', updateDiscountRule);
router.delete('/:id', deleteDiscountRule);

// Utility endpoints
router.get('/utils/suggestions', getDiscountTypeSuggestions);
router.post('/utils/applicable', getApplicableRules);
router.post('/utils/calculate', calculateCartDiscounts);

export default router;