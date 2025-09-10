import type mongoose from "mongoose";


export interface Iproduct {
    id?: string;
    name: string;
    description: string;
    productimage: string;
    price: number;
    stock: number;
    category: string;
    owner: string;
}

export interface Icategory {
    id?: string;
    name: string;
    description: string;
}

export interface Icoupon {
    id?: string;
    code: string;
    type: string;
    discountValue: number;
    isActive: boolean;
    startDate: Date;
    endDate: Date;
    usageLimit: number;
    conditions: [
        {
            conditionType: string;
            conditionValue: number,
            project_id? : string;
            category_id? : string;
        }
    ],
    payableprice?:number

}

// Cart and Order related interfaces
export interface ICartItem {
    toObject(): any;
    product: string; // Product ID
    qty: number;
    priceAtAdd?: number; // snapshot price if needed
}

export interface ICart {
    id?: string;
    userId: string;
    items: ICartItem[];
}

export type DiscountType = 'BOGO' | 'TWO_FOR_ONE' | 'PERCENT_CATEGORY';

export interface IDiscountRule {
    id?: string;
    name: string;
    type: DiscountType;
    product?: string; // for product specific rules
    category?: string; // for category percentage rules
    percentage?: number; // for PERCENT_CATEGORY
    active: boolean;
}

export interface IOrderItem {
    product: string;
    qty: number;
    unitPrice: number;
    discount: number; // total discount amount on this line
    finalPrice: number; // qty * unitPrice - discount
    breakdown?: string[]; // optional discount notes
}

export interface IOrder {
    id?: string;
    userId: string;
    items: IOrderItem[];
    subtotal: number;
    totalDiscount: number;
    totalPayable: number;
}

export interface Iuser {
    id?: string;
    name: string;
    email: string;
    profilepic: string;
    password: string;
    role: 'user' | 'creater' | 'admin';
}

export interface ICartItem {
    product: string ;
    qty: number;
    unitPrice: number;
    finalPrice?: number;
    discount?: number;
    paidQty?: number;
    breakdown?: string[];
  }
  
  export interface ICart extends Document {
    userId: string;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
  }

  interface DiscountResult {
    appliedDiscounts: Array<{
      ruleId: string;
      ruleName: string;
      discountAmount: number;
      description: string;
    }>;
  }
  
  interface CartItem {
    product: string;
    qty: number;
    unitPrice: number;
  }