import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://650aaf0372fb3c59f137954fc0bd23ea@o4512271472590848.ingest.de.sentry.io/4512271472853072",
});

try {
  throw new Error("GitHub Actions Test Run: Sentry Integration Verified!");
} catch (error) {
  Sentry.captureException(error);
}

// Flush ensures the network request sends before the script exits
await Sentry.flush(5000);
console.log("Sentry event sent!");
