import mongoose from 'mongoose';
import { ERROR_MSG } from '../constants/messege.js';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, ERROR_MSG.REQUIRED('category name')],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
    default: '',
  },
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);
