import { User } from '../models/user.model.js';
import type { Iuser } from '../interfaces/model.interface.js';

interface IUserUpdate {
  name?: string;
  email?: string;
  profilepic?: any;
  role?: string;
  [key: string]: any;
}
import { uploadOnCloudinary, deleteonCloudinary } from '../utils/cloudinary.js';
import { ApiError } from '../utils/apiError.js';
import { statuscode } from '../constants/status.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_SECRET = process.env.ACCESSTOKENSECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRE = process.env.ACCESSEXPIRE || process.env.ACCESS_EXPIRE || '1d';
const REFRESH_TOKEN_SECRET = process.env.REFRESHTOKENSECRET || process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret';
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_EXPIRE || '7d';

export class UserService {
  private cloudUrl: string = '';

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  private generateToken(payload: object | string | Buffer, secret: jwt.Secret, expiresIn: string | number): string {
    return jwt.sign(
      payload,
      secret,
      { 
        expiresIn,
        algorithm: 'HS256' as const
      }
    );
  }

  async register(userData: Iuser) {
    try {
      // Input validation
      if (!userData.email || !userData.password || !userData.name) {
        throw new ApiError(statuscode.BADREQUEST, 'Name, email, and password are required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new ApiError(statuscode.BADREQUEST, 'Invalid email format');
      }

      // Check if user already exists
      const exists = await User.findOne({ email: userData.email.toLowerCase() });
      if (exists) {
        throw new ApiError(statuscode.CONFLICT, ERROR_MSG.EXISTS('user'));
      }

      // Handle profile picture upload
      let profileUrl = '';
      if (userData.profilepic) {
        try {
          const up = await uploadOnCloudinary(userData.profilepic);
          this.cloudUrl = up?.data?.url || '';
          profileUrl = this.cloudUrl;
        } catch (error) {
          console.error('Error uploading profile picture:', error);
          throw new ApiError(statuscode.INTERNALSERVERERROR, 'Failed to upload profile picture');
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const user = await User.create({
        name: userData.name,
        email: userData.email.toLowerCase(),
        profilepic: profileUrl,
        password: hashedPassword,
        role: userData.role || 'user',
      });

      // Generate tokens
      const tokens = this.generateAuthTokens(user);
      
      // Clear cloud URL after successful upload
      this.cloudUrl = '';

      // Omit sensitive data from response
      const { password, ...userWithoutPassword } = user.toObject();
      
      return { 
        statuscode: statuscode.CREATED, 
        Content: { 
          message: MSG.SUCCESS('User created'), 
          data: { user: userWithoutPassword, ...tokens } 
        } 
      };
    } catch (error: any) {
      // Clean up uploaded file if error occurred
      if (this.cloudUrl) {
        try {
          await deleteonCloudinary(this.cloudUrl);
        } catch (cleanupError) {
          console.error('Error cleaning up profile picture:', cleanupError);
        }
        this.cloudUrl = '';
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error.statuscode || statuscode.INTERNALSERVERERROR, 
        error.message || ERROR_MSG.DEFAULT_ERROR
      );
    }
  }

  async login(email: string, password: string) {
    try {
      if (!email || !password) {
        throw new ApiError(statuscode.BADREQUEST, 'Email and password are required');
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new ApiError(statuscode.UNAUTHORIZED, 'Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new ApiError(statuscode.UNAUTHORIZED, 'Invalid credentials');
      }

      // Generate tokens
      const tokens = this.generateAuthTokens(user);
      
      // Omit password from response
      const { password: _, ...userWithoutPassword } = user.toObject();

      return { 
        statuscode: statuscode.OK, 
        Content: { 
          message: MSG.SUCCESS('Login successful'), 
          data: { user: userWithoutPassword, ...tokens } 
        } 
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        statuscode.INTERNALSERVERERROR, 
        'An error occurred during login'
      );
    }
  }

  async getProfile(userId: string) {
    try {
      if (!isValidObjectId(userId)) {
        throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID');
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new ApiError(statuscode.NOTFOUND, 'User not found');
      }

      return { 
        statuscode: statuscode.OK, 
        Content: { 
          message: MSG.SUCCESS('Profile retrieved'), 
          data: user 
        } 
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        statuscode.INTERNALSERVERERROR, 
        'Failed to retrieve profile'
      );
    }
  }

  async updateProfile(userId: string, updateData: IUserUpdate) {
    try {
      if (!isValidObjectId(userId)) {
        throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID');
      }

      // Remove password and email from update data
      const { password, email, ...safeUpdateData } = updateData;
      
      // Handle profile picture update if provided
      if (updateData.profilepic) {
        try {
          const up = await uploadOnCloudinary(updateData.profilepic);
          this.cloudUrl = up?.data?.url || '';
          safeUpdateData.profilepic = this.cloudUrl;
        } catch (error) {
          console.error('Error uploading profile picture:', error);
          throw new ApiError(statuscode.INTERNALSERVERERROR, 'Failed to upload profile picture');
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        throw new ApiError(statuscode.NOTFOUND, 'User not found');
      }

      return { 
        statuscode: statuscode.OK, 
        Content: { 
          message: MSG.SUCCESS('Profile updated'), 
          data: updatedUser 
        } 
      };
    } catch (error: any) {
      // Clean up uploaded file if error occurred
      if (this.cloudUrl) {
        try {
          await deleteonCloudinary(this.cloudUrl);
        } catch (cleanupError) {
          console.error('Error cleaning up profile picture:', cleanupError);
        }
        this.cloudUrl = '';
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        statuscode.INTERNALSERVERERROR, 
        'Failed to update profile'
      );
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      if (!isValidObjectId(userId)) {
        throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(statuscode.NOTFOUND, 'User not found');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new ApiError(statuscode.UNAUTHORIZED, 'Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Update password
      user.password = hashedPassword;
      await user.save();

      return { 
        statuscode: statuscode.OK, 
        Content: { 
          message: MSG.SUCCESS('Password updated successfully') 
        } 
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        statuscode.INTERNALSERVERERROR, 
        'Failed to change password'
      );
    }
  }

  async deleteAccount(userId: string) {
    try {
      if (!isValidObjectId(userId)) {
        throw new ApiError(statuscode.BADREQUEST, 'Invalid user ID');
      }

      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new ApiError(statuscode.NOTFOUND, 'User not found');
      }

      // Clean up profile picture if exists
      if (user.profilepic) {
        try {
          await deleteonCloudinary(user.profilepic);
        } catch (cleanupError) {
          console.error('Error cleaning up profile picture:', cleanupError);
        }
      }

      return { 
        statuscode: statuscode.OK, 
        Content: { 
          message: MSG.SUCCESS('Account deleted successfully') 
        } 
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        statuscode.INTERNALSERVERERROR, 
        'Failed to delete account'
      );
    }
  }

  private generateAuthTokens(user: any) {
    const accessToken = this.generateToken(
      { 
        id: user._id.toString(), 
        role: user.role 
      },
      ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_EXPIRE
    );

    const refreshToken = this.generateToken(
      { 
        id: user._id.toString() 
      },
      REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRE
    );

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ statuscode: number; Content: { accessToken: string; refreshToken: string } }> {
    if (!refreshToken) {
      throw new ApiError(statuscode.UNAUTHORIZED, 'Refresh token is required');
    }
    try {
      if (!refreshToken) {
        throw new ApiError(statuscode.UNAUTHORIZED, 'Refresh token is required');
      }

      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any;
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new ApiError(statuscode.UNAUTHORIZED, 'User not found');
      }

      // Generate new access token
      const accessToken = this.generateToken(
        { 
          id: user._id.toString(), 
          role: user.role 
        },
        ACCESS_TOKEN_SECRET,
        ACCESS_TOKEN_EXPIRE
      );

      return { 
        statuscode: statuscode.OK, 
        Content: { 
          accessToken,
          refreshToken // Optionally issue a new refresh token as well
        } 
      };
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(statuscode.UNAUTHORIZED, 'Invalid refresh token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(statuscode.UNAUTHORIZED, 'Refresh token expired');
      }
      throw new ApiError(
        statuscode.INTERNALSERVERERROR, 
        'Failed to refresh token'
      );
    }
  }
}
