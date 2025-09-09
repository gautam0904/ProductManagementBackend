import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { statuscode } from '../constants/status.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new ApiError(statuscode.UNAUTHORIZED, 'No token provided');

    const secret = process.env.ACCESSTOKENSECRET || process.env.ACCESS_TOKEN_SECRET || 'secret';
    const decoded: any = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) throw new ApiError(statuscode.UNAUTHORIZED, 'User not found');

    req.user = user;
    next();
  } catch (e: any) {
    next(new ApiError(statuscode.UNAUTHORIZED, 'Invalid or expired token'));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(statuscode.FORBIDDEN, 'You do not have permission to perform this action'));
    }
    next();
  };
};
