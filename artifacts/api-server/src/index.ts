import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Graceful shutdown — finish in-flight requests before exiting.
// This is critical for zero-downtime deploys: Docker sends SIGTERM,
// we stop accepting new connections and wait for current ones to finish.
function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(() => {
    logger.info("All connections closed, exiting");
    process.exit(0);
  });
  // Force-kill after 10 s if connections are still held open
  setTimeout(() => {
    logger.warn("Graceful shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
