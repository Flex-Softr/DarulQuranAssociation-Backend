import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { ApiError } from '../common/middleware/error.middleware';
import { HTTP_STATUS } from '../../constants';
import { asyncHandler } from '../common/middleware/async.handler';

export class UserController {
  /**
   * Get current user profile
   * GET /api/users/me
   */
  getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
    }

    const user = await userService.findById(req.user.id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        // avatar: user.avatar,
        // address: user.address,
        pictures: user.pictures || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  /**
   * Get all users (admin only)
   * GET /api/users
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const users = await userService.getAllUsers();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: users,
    });
  });

  /**
   * Create admin or editor user
   * POST /api/users/create-admin
   */
  createAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, email, password, role } = req.body;

    const user = await userService.createAdminUser({
      fullName,
      email,
      password,
      role,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  /**
   * Get all users with pagination, search, and filters
   * GET /api/users (updated version)
   */
  getUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10, searchTerm, role } = req.query;

    const result = await userService.getUsersWithPagination({
      page: typeof page === 'number' ? page : Number(page) || 1,
      limit: typeof limit === 'number' ? limit : Number(limit) || 10,
      searchTerm: searchTerm as string | undefined,
      role: role as any,
    });

    // Format users according to spec
    const formattedUsers = result.users.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      // companyName: user.companyName || '',
      // fullAddress: user.fullAddress || '',
      // images: user.images || [],
      totalDonate: user.totalDonate || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: formattedUsers,
      pagination: result.pagination,
    });
  });

  /**
   * Update user by ID
   * PUT /api/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { fullName, email, role, phone } = req.body;
    
    // Prevent self-deletion check is not needed for update, but we can add other validations
    const user = await userService.updateUserById(id, {
      fullName,
      email,
      role,
      phone,
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User updated successfully',
      data: {
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        // companyName: user.companyName || '',
        // fullAddress: user.fullAddress || '',
        // images: user.images || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  /**
   * Delete user by ID
   * DELETE /api/users/:id
   */
  deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    // Prevent users from deleting their own account
    if (req.user && req.user.id === id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot delete your own account');
    }

    await userService.deleteUserById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User deleted successfully',
    });
  });

  /**
   * Update user profile
   * PATCH /api/users/me
   */
  updateMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
    }

    const { fullName, email, phone } = req.body;

    const user = await userService.updateUser(req.user.id, {
      ...(fullName && { fullName }),
      ...(email && { email }),
      ...(phone && { phone }),
      
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        // avatar: user.avatar,
        // address: user.address,
       // pictures: user.pictures || [],
        updatedAt: user.updatedAt,
      },
    });
  });

  /**
   * Change password
   * POST /api/users/me/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
    }

    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(req.user.id, currentPassword, newPassword);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password updated successfully',
    });
  });
}

export const userController = new UserController();

