/**
 * PM2 Ecosystem Configuration
 * Manages the Node.js application process in production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'darunquran-backend',
      script: './dist/server.js',
      // Use ts-node + tsconfig-paths so that TypeScript path aliases (@/...) work in production
   //   node_args: '-r ts-node/register -r tsconfig-paths/register',
      instances: 1, // For single server, use 1. For multi-core, use 'max' or specific number
      exec_mode: 'fork', // Use 'cluster' mode for multiple instances
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart on crash
      autorestart: true,
      max_restarts: 20,
      min_uptime: '30s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      
      // Memory management
      max_memory_restart: '500M',
      
      // Watch mode (disable in production)
      watch: false,
      
      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000,
      
      // Environment variables (override with .env file)
      env_file: '.env',
    },
  ],
};

