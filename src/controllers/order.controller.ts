import type { Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';

const service = new OrderService();

export const checkout = async (req: Request, res: Response) => {
  const userId = (req.headers.USERID as string) || (req.body.userId as string);
  const result = await service.checkout(userId);
  res.status(result.statuscode).json(result.Content);
};
