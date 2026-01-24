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

App.use(
    Cors({
        origin: "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
);

App.use(Morgan("dev"));
App.use(Express.urlencoded({ extended: true }));
App.use(Express.json({ limit: "50mb" }));
App.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10000, // limit each IP to 10.000 requests per windowMs
        message: "Too many requests from this IP, please try again later.",
    }),
);

App.use(Express.json());

const uploadsDir = path.join(__dirname, "public");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

App.use("/public", Express.static("public"));
App.listen(PORT, () => {
    console.log(`Server is running in port : ${PORT}`);
});

mongoConnect();

const Routes = require("./routes/index");
App.use("/api/v1", Routes);

App.use((req, res, next) => {
    const error = new Error("Not Found");
    error.statusCode = 404;
    next(error);
});

const ErrorHandler = require("./middlewares/error-handler");
App.use(ErrorHandler.ErrorHandler);
