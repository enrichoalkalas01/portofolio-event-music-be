const Express = require("express");
const App = Express();
const Cors = require("cors");
const Dotenv = require("dotenv");
const Morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const { rateLimit } = require("express-rate-limit");

Dotenv.config({ path: "./.env" });

const mongoConnect = require("./libs/mongodb/connection");

const PORT = process.env.PORT || 5800;
const isProduction = process.env.NODE_ENV === "production";

// CORS: comma separated list in CORS_ORIGINS, "*" when unset (dev).
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : "*";

App.set("trust proxy", 1);
App.disable("x-powered-by");

App.use(
    Cors({
        origin: corsOrigins,
        credentials: corsOrigins !== "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
);

App.use(Morgan(isProduction ? "combined" : "dev"));
App.use(Express.urlencoded({ extended: true, limit: "5mb" }));
App.use(Express.json({ limit: "5mb" }));
App.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { status: "Error", statusCode: 429, message: "Too many requests, please try again later." },
    }),
);

// Stricter limit for credential endpoints.
App.use(
    "/api/v1/authentication",
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { status: "Error", statusCode: 429, message: "Too many attempts, please try again later." },
    }),
);

const uploadsDir = path.join(__dirname, "public");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

App.use("/public", Express.static("public"));

App.get(["/", "/health"], (req, res) => {
    res.json({ status: "ok", service: "portofolio-event-music-be", time: new Date().toISOString() });
});

const Routes = require("./routes/index");
App.use("/api/v1", Routes);

App.use((req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
});

const ErrorHandler = require("./middlewares/error-handler");
App.use(ErrorHandler.ErrorHandler);

mongoConnect().then(() => {
    App.listen(PORT, () => {
        console.log(`Server is running in port : ${PORT}`);
    });
});
