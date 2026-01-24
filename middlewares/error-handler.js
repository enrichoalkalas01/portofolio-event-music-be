const moment = require("moment");

const ErrorHandler = (err, req, res, next) => {
    // console.error(err);
    const statusCode = err?.statusCode || err?.status || 500;
    const message = err.message || "Internal Server Error";
    const nameError = err.name || "Error";
    const stack = process.env.NODE_ENV === "production" ? err.stack : "";
    const errorsData = err.errors || null;

    console.log("Error Handler caught an error:", {
        name: nameError,
        message: message,
        stack: stack,
        errorsData: errorsData,
    });

    res.status(statusCode).json({
        status: "Error",
        statusCode: statusCode,
        name: nameError,
        message: message,
        errors: errorsData,
        timestamp: moment().format(),
    });
};

module.exports = {
    ErrorHandler
};