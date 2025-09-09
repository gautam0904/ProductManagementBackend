import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
  finalPrice: { type: Number, required: true },
  breakdown: [{ type: String }],
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, required: true },
  totalPayable: { type: Number, required: true },
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
