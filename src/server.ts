import app from './app';
import { connectDB } from './db';
import { config } from './config';
import { logger } from './modules/common/utils/logger';

let isShuttingDown = false;

const registerGlobalErrorHandlers = (): void => {
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

/**
 * Start server
 * Connects to database and starts Express server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📝 API available at http://localhost:${config.port}/api/v1`);
      logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
    });

    const gracefulShutdown = (signal: string): void => {
      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;
      logger.info(`${signal} signal received: closing HTTP server`);

      // Ensure process exits even if some requests never complete.
      const forceCloseTimeout = setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);

      server.close(() => {
        clearTimeout(forceCloseTimeout);
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

registerGlobalErrorHandlers();

// Start the server
startServer();

