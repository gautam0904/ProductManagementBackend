import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICartItem {
  product: Types.ObjectId;
  qty: number;
  priceAtAdd?: number;
  addedAt?: Date;
}

const cartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtAdd: {
    type: Number,
    required: false,
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

export interface ICart extends Document {
  userId: string;
  items: Types.DocumentArray<ICartItem & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>({
  userId: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  items: [cartItemSchema],
}, { 
  timestamps: true 
});

// Add type for document with methods
interface ICartDocument extends ICart, Document {}

// Create and export the model
export const Cart = mongoose.model<ICartDocument>('Cart', cartSchema);

// Export the document type
export type CartDocument = ICartDocument;
