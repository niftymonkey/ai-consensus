/**
 * Structured logging utility with environment-aware verbosity
 *
 * In production: Logs are sanitized to avoid exposing sensitive information
 * In development: Full details are logged for debugging
 *
 * Security consideration (SEC-009):
 * Verbose error messages can leak information about system internals.
 * This logger ensures production logs are safe while dev logs remain useful.
 */

const isProduction = process.env.NODE_ENV === "production";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

/**
 * Sanitize context for production logging
 * Removes or masks potentially sensitive fields
 */
function sanitizeContext(context: LogContext): LogContext {
  if (!isProduction) {
    return context;
  }

  const sanitized: LogContext = {};
  const sensitivePatterns = ["key", "token", "secret", "password", "auth", "credential"];

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitivePatterns.some((pattern) => lowerKey.includes(pattern));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 100) {
      // Truncate long strings in production
      sanitized[key] = value.substring(0, 100) + "...";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(sanitizeContext(context))}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!isProduction) {
      console.debug(formatMessage("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    console.info(formatMessage("info", message, context));
  },

  warn(message: string, context?: LogContext): void {
    console.warn(formatMessage("warn", message, context));
  },

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.errorMessage = isProduction ? "An error occurred" : error.message;
      if (!isProduction && error.stack) {
        errorContext.stack = error.stack;
      }
    }

    console.error(formatMessage("error", message, errorContext));
  },
};
