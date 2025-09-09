import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { Cart } from '../models/cart.model.js';
import { CartService } from './cart.service.js';
import { statuscode } from '../constants/status.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';

export class OrderService {
  private cartService = new CartService();

  async checkout(userId: string) {
    // Compute discounts and totals
    const computed = await this.cartService.computeCart(userId);

    if (!computed.items || computed.items.length === 0) {
      return { statuscode: statuscode.BADREQUEST, Content: { message: 'Cart is empty' } };
    }

    // Stock validation
    for (const item of computed.items as any[]) {
      const prod = await Product.findById(item.product);
      if (!prod) return { statuscode: statuscode.NOTFOUND, Content: { message: ERROR_MSG.NOT_FOUND('Product') } };
      if ((prod.stock ?? 0) < item.paidQty) {
        return { statuscode: statuscode.CONFLICT, Content: { message: `Insufficient stock for ${prod.name}. Available ${prod.stock}, required ${item.paidQty}` } };
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Deduct stock for paid quantities
      for (const item of computed.items as any[]) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: -item.paidQty } }, { session });
      }

      // Create order
      const orderDoc = await Order.create([
        {
          userId,
          items: computed.items.map((i: any) => ({
            product: i.product,
            qty: i.qty,
            unitPrice: i.unitPrice,
            discount: i.discount,
            finalPrice: i.finalPrice,
            breakdown: i.breakdown,
          })),
          subtotal: computed.totals.subtotal,
          totalDiscount: computed.totals.discount,
          totalPayable: computed.totals.payable,
        },
      ], { session });

      // Clear cart
      await Cart.updateOne({ userId }, { $set: { items: [] } }, { session });

      await session.commitTransaction();
      session.endSession();

      return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('Order placed'), data: orderDoc[0] } };
    } catch (e: any) {
      await session.abortTransaction();
      session.endSession();
      return { statuscode: statuscode.INTERNALSERVERERROR, Content: { message: e.message || ERROR_MSG.DEFAULT_ERROR } };
    }
  }
}
