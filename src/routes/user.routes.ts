import express from 'express';
import { userController } from '../controllers/user.controller.js';

const router = express.Router();

router.post('/signup', userController.register);
router.post('/login', userController.login);

export default router;
