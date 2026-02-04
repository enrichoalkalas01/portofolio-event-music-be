const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

console.log("🔧 Initializing Sentry...");

Sentry.init({
    dsn: "https://7f76b9c8b13dc78d649d9e65009ae951@sentry.enrichoalkalas.my.id/6",
    environment: process.env.NODE_ENV || "development",
    sendDefaultPii: true,
    enableLogs: true,
    debug: false, // Tambahkan ini untuk debugging

    integrations: [
        // Gunakan integrations default dulu
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        nodeProfilingIntegration(),
    ],

    // Performance monitoring
    tracesSampleRate: 1.0, // Set ke 1.0 untuk testing

    // Set sampling rate for profiling - this is evaluated only once per SDK.init call
    profileSessionSampleRate: 1.0,

    // Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: "trace",

    // Release tracking (opsional)
    release: process.env.npm_package_version || "unknown",

    // Server name
    serverName: process.env.SERVER_NAME || require("os").hostname(),

    // Initial scope
    initialScope: {
        tags: {
            component: "backend",
            service: "api",
        },
    },

    // Temporary: Disable filtering untuk testing
    beforeSend(event, hint) {
        console.log("📤 Sentry beforeSend called:", {
            level: event.level,
            message: event.message,
            tags: event.tags,
        });
        return event; // Return semua event untuk testing
    },
});

// Test Sentry connection
console.log("✅ Sentry initialized successfully");

// Send test event
setTimeout(() => {
    console.log("🧪 Sending test event to Sentry...");
    Sentry.captureMessage("Test message from instrument.js", "info");
}, 1000);

module.exports = { Sentry };
