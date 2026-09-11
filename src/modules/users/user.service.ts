import { FilterQuery } from 'mongoose';
import { User, IUser } from './user.model';
import { hashPassword, comparePassword, compareToken } from '../common/utils/hash';
import { ApiError } from '../common/middleware/error.middleware';
import { HTTP_STATUS, ROLES, Role } from '../../constants';
import { Donation } from '../donations/donation.model';
import { DONATION_STATUS } from '../donations/donation.model';

export class UserService {
  /**
   * Create a new user
   */
  async createUser(
    input: {
      fullName: string;
      email?: string;
      phone?: string;
      password: string;
      role?: string;
      address?: string;
      pictures?: string[];
      avatar?: string;
    }
  ): Promise<IUser> {
    const { fullName, email, phone, password, role, address, pictures, avatar } = input;

    const sanitizedEmail = email?.trim().toLowerCase() || undefined;
    const sanitizedPhone = phone?.trim() || undefined;
    const sanitizedAddress = address?.trim() || undefined;

    if (!sanitizedEmail && !sanitizedPhone) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Either email or phone must be provided');
    }

    // Check if user already exists via email or phone
    if (sanitizedEmail) {
      const existingEmail = await User.findOne({ email: sanitizedEmail }).select('+passwordHash');
      if (existingEmail) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Email already in use');
      }
    }

    if (sanitizedPhone) {
      const existingPhone = await User.findOne({ phone: sanitizedPhone }).select('+passwordHash');
      if (existingPhone) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Phone already in use');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      fullName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      passwordHash,
      role: role || ROLES.DONORS,
      address: sanitizedAddress,
      pictures: pictures ?? [],
      avatar,
    });

    return user;
  }

  /**
   * Find user by identifier (email or phone)
   */
  async findByIdentifier(identifier: string, includePassword = false): Promise<IUser | null> {
    const trimmedIdentifier = identifier.trim();
    const conditions: FilterQuery<IUser>[] = [];

    if (trimmedIdentifier.includes('@')) {
      conditions.push({ email: trimmedIdentifier.toLowerCase() });
    } else {
      conditions.push({ phone: trimmedIdentifier });
      // Also attempt email fallback in case phone-like string is actually stored as email
      conditions.push({ email: trimmedIdentifier.toLowerCase() });
    }

    const query: FilterQuery<IUser> =
      conditions.length > 1
        ? { $or: conditions }
        : conditions.length === 1
        ? conditions[0]
        : {};

    if (includePassword) {
      const user = await User.findOne(query)
        .select('+passwordHash +refreshTokenHash')
        .exec();
      return user as IUser | null;
    }

    const user = await User.findOne(query).exec();
    return user as IUser | null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  /**
   * Get all users (admin only)
   * Note: This method is kept for backward compatibility
   * For pagination, search, and filters, use getUsersWithPagination instead
   */
  async getAllUsers(): Promise<IUser[]> {
    return User.find({ isDeleted: { $ne: true } })
      .select('-passwordHash -refreshTokenHash')
      .lean();
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    updates: Partial<{
      fullName: string;
      email: string;
      phone: string;
      role: string;
      //avatar: string;
      //address: string;
      //pictures: string[];
    }>
  ): Promise<IUser | null> {
    const updateData: Partial<IUser> = {};

    if (updates.fullName) {
      updateData.fullName = updates.fullName.trim();
    }

    if (updates.email) {
      const normalizedEmail = updates.email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser && existingUser.id !== id) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Email already taken');
      }
      updateData.email = normalizedEmail;
    }

    if (updates.phone) {
      const normalizedPhone = updates.phone.trim();
      const existingUser = await User.findOne({ phone: normalizedPhone });
      if (existingUser && existingUser.id !== id) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Phone already taken');
      }
      updateData.phone = normalizedPhone;
    }

    if (updates.role) {
      updateData.role = updates.role as Role;
    }

    // if (updates.avatar !== undefined) {
    //   updateData.avatar = updates.avatar;
    // }

    // if (updates.address !== undefined) {
    //   updateData.address = updates.address?.trim();
    // }

    // if (updates.pictures !== undefined) {
    //   updateData.pictures = updates.pictures;
    // }

    return User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Change user password
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(id).select('+passwordHash');
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Current password is incorrect');
    }

    // Hash and update password
    const newPasswordHash = await hashPassword(newPassword);
    user.passwordHash = newPasswordHash;
    await user.save();
  }

  /**
   * Update refresh token hash (for token rotation)
   */
  async updateRefreshTokenHash(userId: string, tokenHash: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: tokenHash });
  }

  /**
   * Clear refresh token hash (for logout)
   */
  async clearRefreshTokenHash(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: undefined });
  }

  /**
   * Verify refresh token hash matches stored hash
   */
  async verifyRefreshTokenHash(userId: string, token: string): Promise<boolean> {
    const user = await User.findById(userId).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      return false;
    }

    return compareToken(token, user.refreshTokenHash);
  }

  /**
   * Create admin or editor user
   */
  async createAdminUser(input: {
    fullName: string;
    email: string;
    password: string;
    role: 'admin' | 'editor';
  }): Promise<IUser> {
    const { fullName, email, password, role } = input;

    const sanitizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      fullName,
      email: sanitizedEmail,
      passwordHash,
      role: role as Role,
    });

    return user;
  }

  /**
   * Get users with pagination, search, and filters
   */
  async getUsersWithPagination(params: {
    page: number;
    limit: number;
    searchTerm?: string;
    role?: Role;
  }): Promise<{
    users: Array<IUser & { totalDonate: number }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const { page, limit, searchTerm, role } = params;
    const skip = (page - 1) * limit;

    // Build query
    const query: FilterQuery<IUser> = {
      isDeleted: { $ne: true }, // Exclude soft-deleted users
    };

    if (role) {
      query.role = role;
    }

    if (searchTerm) {
      query.email = { $regex: searchTerm, $options: 'i' };
    }

    // Get users
    const users = await User.find(query)
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const totalItems = await User.countDocuments(query);

    // Calculate totalDonate for each user
    const usersWithDonations = await Promise.all(
      users.map(async (user) => {
        let totalDonate = 0;

        // Calculate total donations from completed donations
        if (user.email || user.phone) {
          const contact = user.email || user.phone || '';
          const donations = await Donation.find({
            contact,
            status: DONATION_STATUS.COMPLETED,
          }).select('amount');

          totalDonate = donations.reduce((sum, donation) => sum + donation.amount, 0);
        }

        return {
          ...user,
          totalDonate,
        };
      })
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      users: usersWithDonations as Array<IUser & { totalDonate: number }>,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Update user by ID (admin only)
   */
  async updateUserById(
    id: string,
    updates: Partial<{
      fullName: string;
      email: string;
      phone: string;
      role: Role;
    }>
  ): Promise<IUser | null> {
    const updateData: Partial<IUser> = {};

    if (updates.fullName) {
      updateData.fullName = updates.fullName.trim();
    }

    if (updates.email) {
      const normalizedEmail = updates.email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });
      if (existingUser && existingUser.id !== id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email already exists');
      }
      updateData.email = normalizedEmail;
    }

    if (updates.phone) {
      const normalizedPhone = updates.phone.trim();
      const existingUser = await User.findOne({ phone: normalizedPhone, isDeleted: { $ne: true } });
      if (existingUser && existingUser.id !== id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Phone already exists');
      }
      updateData.phone = normalizedPhone;
    }

    if (updates.role) {
      updateData.role = updates.role;
    }

    // if (updates.companyName !== undefined) {
    //   updateData.companyName = updates.companyName?.trim() || '';
    // }

    // if (updates.fullAddress !== undefined) {
    //   updateData.fullAddress = updates.fullAddress?.trim() || '';
    // }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return user;
  }

  /**
   * Delete user by ID (permanent delete)
   */
  async deleteUserById(id: string): Promise<void> {
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }
    
    // Permanent delete
    await User.findByIdAndDelete(id);
  }
}

export const userService = new UserService();

