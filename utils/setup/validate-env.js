const { Logger } = require("../../config/logger");

function ValidateEnvirontment() {
    const RequiredVars = [
        "PORT",
        "NODE_ENV",
        "MONGODB_URI",
        "MONGODB_URI_SESSION",
        "SESSION_SECRET",
        "SECRET_KEY",
    ];

    const MissingVars = [];

    for (const EnvVar of RequiredVars) {
        if (!process.env[EnvVar]) {
            MissingVars.push(EnvVar);
        }
    }

    if (MissingVars.length > 0) {
        const ErrorMessage = `Missing required environtment variables : ${MissingVars.join(
            ", "
        )}`;

        Logger.error(ErrorMessage);
        throw new Error(ErrorMessage);
    }

    if (isNaN(parseInt(process.env.PORT))) {
        throw new Error("PORT must be a valid number.");
    }

    Logger.info("Environtment variables validated successfully.");
}

module.exports = { ValidateEnvirontment };
