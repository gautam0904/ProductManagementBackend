import type { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';

export class UserController {
  private service = new UserService();

  register = async (req: Request, res: Response) => {
    const result = await this.service.register(req.body);
    res.status(result.statuscode).json(result.Content);
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const result = await this.service.login(email, password);
    res.status(result.statuscode).json(result.Content);
  };
}

export const userController = new UserController();
