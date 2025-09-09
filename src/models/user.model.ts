import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ERROR_MSG } from '../constants/messege.js';

const roleValues = ['user', 'creater', 'admin'] as const;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, ERROR_MSG.REQUIRED('name')],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: [true, ERROR_MSG.REQUIRED('email')],
    trim: true,
    lowercase: true,
  },
  profilepic: {
    type: String,
    required: false,
    default: '',
  },
  password: {
    type: String,
    required: [true, ERROR_MSG.REQUIRED('password')],
    minlength: 6,
  },
  role: {
    type: String,
    enum: roleValues,
    required: [true, ERROR_MSG.REQUIRED('role')],
    default: 'user',
  },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  const doc: any = this;
  if (!doc.isModified('password')) return next();
  doc.password = await bcrypt.hash(doc.password, 12);
  next();
});

export interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  profilepic: string;
  password: string;
  role: string;
}

export const User = mongoose.model<UserDoc>('User', userSchema);
