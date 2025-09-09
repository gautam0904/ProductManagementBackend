import type { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';

const service = new CategoryService();

export const createCategory = async (req: Request, res: Response) => {
  const result = await service.create(req.body);
  res.status(result.statuscode).json(result.Content);
};

export const getCategories = async (req: Request, res: Response) => {
  const id = (req.query.id as string) || undefined;
  const result = await service.get(id);
  res.status(result.statuscode).json(result.Content);
};

export const updateCategory = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const result = await service.update(id, req.body);
  res.status(result.statuscode).json(result.Content);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const result = await service.remove(id);
  res.status(result.statuscode).json(result.Content);
};
