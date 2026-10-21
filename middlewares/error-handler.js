const moment = require("moment");

const isProduction = process.env.NODE_ENV === "production";

const ErrorHandler = (err, req, res, next) => {
    let statusCode = err?.statusCode || err?.status || 500;
    let message = err?.message || "Internal Server Error";
    let errorsData = err?.errorsData || null;

    // Map common library errors to meaningful HTTP responses.
    if (err?.name === "ValidationError" && err?.errors) {
        statusCode = 400;
        errorsData = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        message = "Validation failed.";
    } else if (err?.name === "CastError") {
        statusCode = 404;
        message = "Resource not found.";
    } else if (err?.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0];
        message = field ? `${field} is already in use.` : "Duplicate value.";
    } else if (err?.type === "entity.parse.failed") {
        statusCode = 400;
        message = "Malformed JSON body.";
    } else if (err?.name === "MulterError") {
        statusCode = 400;
    }

    if (statusCode >= 500) {
        console.error("Unhandled error:", err);
    } else if (!isProduction) {
        console.log(`[${statusCode}] ${req.method} ${req.originalUrl} -> ${message}`);
    }

    res.status(statusCode).json({
        status: "Error",
        statusCode,
        name: err?.name || "Error",
        message: statusCode >= 500 && isProduction ? "Internal Server Error" : message,
        errors: errorsData,
        ...(isProduction ? {} : { stack: err?.stack }),
        timestamp: moment().format(),
    });
};

module.exports = {
    ErrorHandler,
};
