import mongoose from 'mongoose';
import { Cart } from '../models/cart.model.js';
import { Product } from '../models/product.model.js';
import { DiscountRule } from '../models/discountRule.model.js';
import type { IOrderItem } from '../interfaces/model.interface.js';
import { statuscode } from '../constants/status.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';

export class CartService {
  async addItem(userId: string, productId: string, qty: number) {
    const product = await Product.findById(productId);
    if (!product) return { statuscode: statuscode.NOTFOUND, Content: { message: ERROR_MSG.NOT_FOUND('Product') } };

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    const existing = cart.items.find((i: any) => i.product.toString() === productId);
    if (existing) existing.qty += qty;
    else cart.items.push({ product: new mongoose.Types.ObjectId(productId), qty, priceAtAdd: product.price });

    await cart.save();
    return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('Item added to cart'), data: cart } };
  }

  async getWithDiscount(userId: string) {
    const computed = await this.computeCart(userId);
    return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('Cart fetched'), data: computed } };
  }

  // Helper to compute discounts and totals. Includes paidQty for stock updates.
  async computeCart(userId: string) {
    const cart = await Cart.findOne({ userId }).populate({ path: 'items.product', populate: { path: 'category' } });
    if (!cart) {
      return { items: [], totals: { subtotal: 0, discount: 0, payable: 0 }, discountApplied: false };
    }

    const rules = await DiscountRule.find({ active: true });
    const responseItems: (IOrderItem & { paidQty: number })[] = [] as any;
    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of cart.items as any[]) {
      const prod = item.product as any;
      const unitPrice = prod.price;
      const qty = item.qty;
      subtotal += unitPrice * qty;

      let paidQty = qty;
      let discountAmount = 0;
      const breakdown: string[] = [];

      // Apply quantity rules (BOGO / TWO_FOR_ONE) - both behave as every second item free per task
      const applicableQtyRule = rules.find(r => (r.type === 'BOGO' || r.type === 'TWO_FOR_ONE') && r.product?.toString() === prod._id.toString());
      if (applicableQtyRule) {
        const free = Math.floor(qty / 2);
        if (free > 0) {
          discountAmount += free * unitPrice;
          breakdown.push(`${applicableQtyRule.type} applied → ${free} free`);
          paidQty = qty - free;
        }
      }

      // Apply percentage category rule
      const categoryRule = rules.find(r => r.type === 'PERCENT_CATEGORY' && r.category?.toString() === prod.category?.toString());
      if (categoryRule && categoryRule.percentage && categoryRule.percentage > 0) {
        const pctDisc = paidQty * unitPrice * (categoryRule.percentage / 100);
        discountAmount += pctDisc;
        breakdown.push(`${categoryRule.percentage}% off category`);
      }

      const lineFinal = Math.max(0, paidQty * unitPrice - discountAmount + 0);
      totalDiscount += discountAmount;
      responseItems.push({
        product: prod._id.toString(),
        qty,
        unitPrice,
        discount: Number(discountAmount.toFixed(2)),
        finalPrice: Number(lineFinal.toFixed(2)),
        breakdown,
        paidQty,
      });
    }

    const totalPayable = Math.max(0, subtotal - totalDiscount);
    return {
      items: responseItems,
      totals: { subtotal: Number(subtotal.toFixed(2)), discount: Number(totalDiscount.toFixed(2)), payable: Number(totalPayable.toFixed(2)) },
      discountApplied: totalDiscount > 0,
    };
  }
}
