const winston = require("winston");
const { redactForLogs } = require("../utils/redaction");

const environment = process.env.NODE_ENV || "development";
const isProduction = environment === "production";
const configuredLevel =
  process.env.LOG_LEVEL || (isProduction ? "info" : "debug");
const configuredFormat = String(
  process.env.LOG_FORMAT || (isProduction ? "json" : "pretty"),
).toLowerCase();
const serviceName = process.env.LOG_SERVICE_NAME || "fyatta-backend";

const redactLogPayloadFormat = winston.format((info) => {
  return redactForLogs(info);
});

const prettyLogFormat = winston.format.printf((info) => {
  const { timestamp, level, message, stack, ...metadata } = info;

  const metadataString =
    Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : "";
  const stackString = stack ? `\n${stack}` : "";

  return `${timestamp} ${level}: ${message}${metadataString}${stackString}`;
});

const createLoggerFormat = () => {
  const sharedFormats = [
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    redactLogPayloadFormat(),
  ];

  if (configuredFormat === "json") {
    return winston.format.combine(...sharedFormats, winston.format.json());
  }

  return winston.format.combine(
    ...sharedFormats,
    winston.format.colorize({ all: true }),
    prettyLogFormat,
  );
};

const logger = winston.createLogger({
  level: configuredLevel,
  defaultMeta: {
    service: serviceName,
    environment,
  },
  format: createLoggerFormat(),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

logger.on("error", (error) => {
  try {
    process.stderr.write(`Logger transport error: ${error.message}\n`);
  } catch (_writeError) {
    // Swallow transport reporting failures to avoid recursion loops.
  }
});

module.exports = logger;
