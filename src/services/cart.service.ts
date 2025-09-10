import { Types } from 'mongoose';
import type { CartDocument, ICartItem } from '../models/cart.model.js';
import { Cart } from '../models/cart.model.js';
import { Product } from '../models/product.model.js';
import { statuscode } from '../constants/status.js';
import { ERROR_MSG } from '../constants/messege.js';
import { DiscountRuleService } from './discountRule.service.js';
import { ApiError } from '../utils/apiError.js';

interface IDiscountResult {
  discountAmount: number;
  freeItems: number;
  breakdown: string[];
}

interface ICartItemWithProduct extends Omit<ICartItem, 'product'> {
  product: {
    _id: Types.ObjectId;
    name: string;
    price: number;
    stock?: number;
    images?: string[];
    category?: {
      _id: Types.ObjectId;
      name: string;
    };
  };
  unitPrice: number;
  discount: number;
  finalPrice: number;
  paidQty: number;
  breakdown?: string[];
  image?: string;
}

interface ICartWithDiscounts {
  items: Array<{
    product: Types.ObjectId;
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    finalPrice: number;
    paidQty: number;
    breakdown?: string[];
    stock?: number;
    image?: string;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    payable: number;
    savings?: number;
  };
  discountApplied: boolean;
  cartId?: string | undefined;
  updatedAt?: Date;
}

export class CartService {
  private discountService: DiscountRuleService;
  private readonly CART_EXPIRY_DAYS = 30;

  constructor() {
    this.discountService = new DiscountRuleService();
  }

  private isExpired(cart: CartDocument): boolean {
    if (!cart.updatedAt) return false;
    const expiryDate = new Date(cart.updatedAt);
    expiryDate.setDate(expiryDate.getDate() + this.CART_EXPIRY_DAYS);
    return new Date() > expiryDate;
  }

  private async getCartWithDiscounts(cart: CartDocument): Promise<ICartWithDiscounts> {
    const populatedCart = await cart.populate({
      path: 'items.product',
      select: 'name price stock images category',
      populate: { path: 'category', select: 'name' }
    });

    const items = await Promise.all(populatedCart.items.map(async (item) => {
      const product = item.product as any;
      const unitPrice = item.priceAtAdd || product?.price || 0;
      const totalPrice = unitPrice * item.qty;

      const cartItemForDiscount = {
        product: product?._id?.toString() || '',
        qty: item.qty,
        unitPrice: unitPrice,
        toObject: () => ({
          product: product?._id?.toString() || '',
          qty: item.qty,
          unitPrice: unitPrice
        })
      };
      
      const discountResponse = await this.discountService.calculateDiscounts([cartItemForDiscount]);
      
      const discountResult: IDiscountResult = {
        discountAmount: discountResponse?.appliedDiscounts?.[0]?.discountAmount || 0,
        freeItems: 0, // Update this if your discount service provides free items
        breakdown: discountResponse?.appliedDiscounts?.map(d => d.description) || []
      };

      return {
        product: product?._id,
        name: product?.name || 'Unknown Product',
        qty: item.qty,
        unitPrice,
        discount: discountResult?.discountAmount || 0,
        finalPrice: totalPrice - (discountResult?.discountAmount || 0),
        paidQty: item.qty - (discountResult?.freeItems || 0),
        breakdown: discountResult?.breakdown || [],
        stock: product?.stock,
        image: product?.images?.[0]
      };
    }));

    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const payable = subtotal - totalDiscount;

    return {
      items,
      totals: {
        subtotal,
        discount: totalDiscount,
        payable,
        ...(totalDiscount > 0 && { savings: totalDiscount })
      },
      discountApplied: totalDiscount > 0,
      cartId: cart._id?.toString(),
      updatedAt: cart.updatedAt
    };
  }

  async addItem(userId: string, productId: string, quantity: number = 1): Promise<ICartWithDiscounts> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) {
      throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID or product ID');
    }

    if (quantity <= 0) {
      throw new ApiError(statuscode.BADREQUEST, 'Quantity must be greater than 0');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(statuscode.NOTFOUND, ERROR_MSG.NOT_FOUND('Product'));
    }

    if (product.stock && product.stock < quantity) {
      throw new ApiError(statuscode.BADREQUEST, 'Insufficient stock available');
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    } else if (this.isExpired(cart)) {
      cart.items.splice(0, cart.items.length);
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex >= 0) {
      const existingItem = cart.items[existingItemIndex];
      if (!existingItem) {
        throw new ApiError(statuscode.INTERNALSERVERERROR, 'Cart item not found');
      }
      const newQuantity = existingItem.qty + quantity;
      if (product.stock && newQuantity > product.stock) {
        throw new ApiError(statuscode.BADREQUEST, 'Requested quantity exceeds available stock');
      }
      existingItem.qty = newQuantity;
    } else {
      cart.items.push({
        product: new Types.ObjectId(productId),
        qty: quantity,
        priceAtAdd: product.price || 0,
        addedAt: new Date()
      });
    }

    cart.updatedAt = new Date();
    await cart.save();

    return this.getCartWithDiscounts(cart);
  }

  async removeItem(userId: string, productId: string): Promise<ICartWithDiscounts> {
    return this.updateItem(userId, productId, 0);
  }

  async getCart(userId: string): Promise<ICartWithDiscounts> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID');
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return this.getEmptyCartResponse();
    }

    if (this.isExpired(cart)) {
      cart.items.splice(0, cart.items.length);
      await cart.save();
      return this.getEmptyCartResponse();
    }

    return this.getCartWithDiscounts(cart);
  }

  private getEmptyCartResponse(): ICartWithDiscounts {
    return {
      items: [],
      totals: {
        subtotal: 0,
        discount: 0,
        payable: 0
      },
      discountApplied: false
    };
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<ICartWithDiscounts> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) {
      throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID or product ID');
    }

    if (quantity < 0) {
      throw new ApiError(statuscode.BADREQUEST, 'Quantity cannot be negative');
    }

    if (quantity === 0) {
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return this.getEmptyCartResponse();
      }

      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex >= 0) {
        cart.items.splice(itemIndex, 1);
        cart.updatedAt = new Date();
        await cart.save();
      }

      return this.getCartWithDiscounts(cart);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(statuscode.NOTFOUND, ERROR_MSG.NOT_FOUND('Product'));
    }

    if (product.stock && product.stock < quantity) {
      throw new ApiError(statuscode.BADREQUEST, 'Insufficient stock available');
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    } else if (this.isExpired(cart)) {
      cart.items.splice(0, cart.items.length);
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex >= 0) {
      const existingItem = cart.items[existingItemIndex];
      if (!existingItem) {
        throw new ApiError(statuscode.INTERNALSERVERERROR, 'Cart item not found');
      }
      existingItem.qty = quantity;
      existingItem.priceAtAdd = product.price || 0;
    } else {
      cart.items.push({
        product: new Types.ObjectId(productId),
        qty: quantity,
        priceAtAdd: product.price || 0,
        addedAt: new Date()
      });
    }

    cart.updatedAt = new Date();
    await cart.save();

    return this.getCartWithDiscounts(cart);
  }

  async clearCart(userId: string): Promise<ICartWithDiscounts> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return this.getEmptyCartResponse();
    }

    cart.items.splice(0, cart.items.length);
    cart.updatedAt = new Date();
    await cart.save();

    return this.getEmptyCartResponse();
  }
}