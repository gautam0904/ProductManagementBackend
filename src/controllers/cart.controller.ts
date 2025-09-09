import type { Request, Response } from 'express';
import { CartService } from '../services/cart.service.js';

const service = new CartService();

export const addToCart = async (req: Request, res: Response) => {
  const userId = (req.headers.USERID as string) || (req.body.userId as string);
  const { productId, qty } = req.body as { productId: string; qty: number };
  const result = await service.addItem(userId, productId, Number(qty || 1));
  res.status(result.statuscode).json(result.Content);
};

export const getCart = async (req: Request, res: Response) => {
  const userId = (req.params.userId as string) || (req.headers.USERID as string);
  const result = await service.getWithDiscount(userId);
  res.status(result.statuscode).json(result.Content);
};
