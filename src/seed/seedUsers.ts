import { User } from '../modules/users/user.model';
import { userService } from '../modules/users/user.service';
import { ROLES } from '../constants';
import { logger } from '../modules/common/utils/logger';
import { seedConfig } from './seedData';

/**
 * Seed users
 * Creates default admin user and optionally sample users based on configuration
 */
export const seedUsers = async (): Promise<void> => {
  try {
    logger.info('👤 Seeding users...');

    // Remove legacy identifier index if it exists
    try {
      await User.collection.dropIndex('identifier_1');
      logger.info('ℹ️  Dropped legacy identifier index');
    } catch (error: unknown) {
      const code = (error as { code?: number }).code;
      if (code !== 27 && code !== 26) {
        logger.warn('ℹ️  Legacy identifier index not dropped (possibly already removed):', error);
      }
    }

    // Seed admin user if enabled
    if (seedConfig.seedAdmin) {
      const identifierQuery = seedConfig.admin.email
        ? { email: seedConfig.admin.email }
        : seedConfig.admin.phone
        ? { phone: seedConfig.admin.phone }
        : null;

      const existingAdmin = identifierQuery ? await User.findOne(identifierQuery) : null;
      if (!existingAdmin) {
        await userService.createUser({
          fullName: seedConfig.admin.fullName,
          email: seedConfig.admin.email,
          phone: seedConfig.admin.phone,
          password: seedConfig.admin.password,
          role: ROLES.ADMIN,
          address: seedConfig.admin.address,
          pictures: seedConfig.admin.pictures,
        });
        const identifier = seedConfig.admin.email || seedConfig.admin.phone || 'N/A';
        logger.info(`✅ Created admin user: ${identifier}`);
        logger.info(`   Default password: ${seedConfig.admin.password}`);
        logger.warn('⚠️  IMPORTANT: Change the default admin password in production!');
      } else {
        const identifier = seedConfig.admin.email || seedConfig.admin.phone || 'N/A';
        existingAdmin.role = ROLES.ADMIN;
        if (seedConfig.admin.password) {
          const { hashPassword } = await import('../modules/common/utils/hash');
          existingAdmin.passwordHash = await hashPassword(seedConfig.admin.password);
          await existingAdmin.save();
          logger.info(`ℹ️  Admin user updated: ${identifier}`);
        } else {
          logger.info(`ℹ️  Admin user already exists: ${identifier}`);
        }
      }
    }

    // Seed sample users if enabled (only in development or if explicitly enabled)
    if (seedConfig.seedSampleUsers || process.env.NODE_ENV === 'development') {
      for (const userData of seedConfig.sampleUsers) {
        const orConditions = [
          ...(userData.email ? [{ email: userData.email }] : []),
          ...(userData.phone ? [{ phone: userData.phone }] : []),
        ];

        const existingUser =
          orConditions.length > 0
            ? await User.findOne({
                $or: orConditions,
              })
            : null;
        if (!existingUser) {
          // Map role string to ROLES constant
          const role =
            userData.role === 'admin'
              ? ROLES.ADMIN
              : userData.role === 'editor'
              ? ROLES.EDITOR
              : ROLES.DONORS;

          await userService.createUser({
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            role,
            address: userData.address,
            pictures: userData.pictures,
          });
          const identifier = userData.email || userData.phone || 'N/A';
          logger.info(`✅ Created sample user: ${identifier} (${role})`);
          logger.info(`   Default password: ${userData.password}`);
        } else {
          const identifier = userData.email || userData.phone || 'N/A';
          logger.info(`ℹ️  User already exists: ${identifier}`);
        }
      }
    }

    logger.info('✅ User seeding completed');
  } catch (error) {
    logger.error('❌ Error seeding users:', error);
    throw error;
  }
};

