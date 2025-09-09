import { User } from '../models/user.model.js';
import type { Iuser } from '../interfaces/model.interface.js';
import { uploadOnCloudinary, deleteonCloudinary } from '../utils/cloudinary.js';
import { ApiError } from '../utils/apiError.js';
import { statuscode } from '../constants/status.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class UserService {
  private cloudUrl: string = '';

  async register(data: Iuser) {
    try {
      const exists = await User.findOne({ email: data.email.toLowerCase() });
      if (exists) throw new ApiError(statuscode.CONFLICT, ERROR_MSG.EXISTS('user'));

      let profileUrl = '';
      if (data.profilepic) {
        const up = await uploadOnCloudinary(data.profilepic);
        this.cloudUrl = up?.data?.url || '';
        profileUrl = this.cloudUrl;
      }

      const user = await User.create({
        name: data.name,
        email: data.email.toLowerCase(),
        profilepic: profileUrl,
        password: data.password,
        role: data.role || 'user',
      } as any);
      this.cloudUrl = '';

      return { statuscode: statuscode.CREATED, Content: { message: MSG.SUCCESS('User created'), data: user } };
    } catch (e: any) {
      if (this.cloudUrl) await deleteonCloudinary(this.cloudUrl);
      this.cloudUrl = '';
      return { statuscode: e.statuscode || statuscode.INTERNALSERVERERROR, Content: { message: e.message || ERROR_MSG.DEFAULT_ERROR } };
    }
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(statuscode.NOTFOUND, ERROR_MSG.USER_NOT_FOUND);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new ApiError(statuscode.NOTACCEPTABLE, ERROR_MSG.PASSWORD_MISMATCH || 'Password mismatch');

    const secret = process.env.ACCESSTOKENSECRET || process.env.ACCESS_TOKEN_SECRET || 'secret';
    const expiresIn = process.env.ACCESSEXPIRE || process.env.ACCESS_EXPIRE || '1d';

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      secret,
      { expiresIn: expiresIn as string | number | undefined }
    );

    return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('User logged in'), data: { token, user } } };
  }
}
