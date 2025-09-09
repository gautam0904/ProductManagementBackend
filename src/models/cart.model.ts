import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
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
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  items: [cartItemSchema],
}, { timestamps: true });

export const Cart = mongoose.model('Cart', cartSchema);
