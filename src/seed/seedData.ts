/**
 * Seed data configuration
 * Modify these values to customize seeding or use environment variables
 */

export interface SeedConfig {
  seedAdmin: boolean;
  seedSampleUsers: boolean;
  admin: {
    fullName: string;
    email?: string;
    phone?: string;
    password: string;
    address?: string;
    pictures: string[];
  };
  sampleUsers: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    password: string;
    role: string;
    address?: string;
    pictures: string[];
  }>;
}

/**
 * Default seed configuration
 * Override with environment variables or modify here
 * 
 * Environment variables:
 * - SEED_ADMIN: boolean (default: true)
 * - SEED_ADMIN_NAME: string (default: 'Admin User')
 * - SEED_ADMIN_EMAIL: string (default: 'admin@darunquran.com')
 * - SEED_ADMIN_PASSWORD: string (default: 'Admin@123')
 * - SEED_SAMPLE_USERS: boolean (default: false)
 */
export const seedConfig: SeedConfig = {
  seedAdmin: process.env.SEED_ADMIN !== 'false', // Default: true
  seedSampleUsers: process.env.SEED_SAMPLE_USERS === 'true', // Default: false
  admin: {
    fullName: process.env.SEED_ADMIN_NAME || 'Admin User',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@darunquran.com',
    phone: process.env.SEED_ADMIN_PHONE || undefined,
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
    address: process.env.SEED_ADMIN_ADDRESS || undefined,
    pictures: process.env.SEED_ADMIN_PICTURES
      ? process.env.SEED_ADMIN_PICTURES.split(',').map((item) => item.trim()).filter(Boolean)
      : [],
  },
  sampleUsers: [
    {
      fullName: 'Editor User',
      email: 'editor@example.com',
      phone: process.env.SEED_SAMPLE_EDITOR_PHONE || undefined,
      password: 'Editor@123',
      role: 'editor', // Use ROLES.EDITOR in seedUsers.ts
      address: '123 Editor Street',
      pictures: [],
    },
    {
      fullName: 'Donor User',
      email: 'donor@example.com',
      phone: process.env.SEED_SAMPLE_DONOR_PHONE || undefined,
      password: 'Donor@123',
      role: 'donors', // Use ROLES.DONORS in seedUsers.ts
      address: '456 Donor Avenue',
      pictures: [],
    },
    {
      fullName: 'Additional Admin',
      email: 'admin@example.com',
      phone: process.env.SEED_SAMPLE_ADMIN_PHONE || undefined,
      password: 'Admin@123',
      role: 'admin', // Use ROLES.ADMIN in seedUsers.ts
      address: '789 Admin Plaza',
      pictures: [],
    },
  ],
};

