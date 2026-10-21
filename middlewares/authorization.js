const JWT = require("jsonwebtoken");
const Bcrypt = require("bcrypt");

// Model
const UserModel = require("../libs/mongodb/schema/users");

// Utils
const { CryptoDecrpyter } = require("../utils/setup/generate");

const ADMIN_ROLES = ["admin", "super_admin"];

const unauthorized = (status = 401, message = "Unauthorized!") => ({
    name: "Error",
    status,
    message,
});

const CheckAuthorization = async (req, res, next) => {
    try {
        const header = req.headers?.authorization;
        if (!header) throw unauthorized();

        const [scheme, token] = header.split(" ");
        if (!token || scheme.toLowerCase() !== "bearer") throw unauthorized();

        req.TokenAuth = token;
        next();
    } catch (error) {
        next(error);
    }
};

const parseAccessToken = async (token) => {
    let parsedToken;
    try {
        parsedToken = JWT.verify(token, process.env.SECRET_KEY);
    } catch (e) {
        throw unauthorized(401, e.name === "TokenExpiredError" ? "jwt expired" : "Unauthorized!");
    }

    if (!parsedToken?.sub || !parsedToken?.usiv || !parsedToken?.scrf) {
        throw unauthorized();
    }

    const isAccessToken = await Bcrypt.compare("access_token", parsedToken.scrf);
    if (!isAccessToken) throw unauthorized();

    let userData;
    try {
        userData = JSON.parse(
            CryptoDecrpyter({ textCode: parsedToken.sub, iv: parsedToken.usiv }),
        );
    } catch (e) {
        throw unauthorized();
    }

    if (!userData?.id || !userData?.username) throw unauthorized();
    return userData;
};

// Attaches the authenticated user to req.user (never to process.env: that is
// shared by every concurrent request).
const VerifyAuthorization = async (req, res, next) => {
    try {
        if (!req.TokenAuth) throw unauthorized();

        const tokenUser = await parseAccessToken(req.TokenAuth);

        const user = await UserModel.findOne({
            _id: tokenUser.id,
            username: tokenUser.username,
        }).select("username email role fullname phonenumber avatar isActive");

        if (!user) throw unauthorized();
        if (user.isActive === false) throw unauthorized(403, "Account is not active.");

        req.user = {
            id: String(user._id),
            username: user.username,
            email: user.email,
            role: user.role || "user",
            fullname: user.fullname,
            phonenumber: user.phonenumber,
            avatar: user.avatar,
        };

        next();
    } catch (error) {
        next(error);
    }
};

// Optional auth: sets req.user when a valid token is present, never fails.
const OptionalAuthorization = async (req, res, next) => {
    const header = req.headers?.authorization;
    const token = header?.split(" ")?.[1];
    if (!token) return next();

    try {
        const tokenUser = await parseAccessToken(token);
        const user = await UserModel.findOne({ _id: tokenUser.id }).select("username email role");
        if (user) {
            req.user = {
                id: String(user._id),
                username: user.username,
                email: user.email,
                role: user.role || "user",
            };
        }
    } catch (e) {
        // ignore invalid token for optional auth
    }
    next();
};

const RequireRole = (...roles) => (req, res, next) => {
    const allowed = roles.length ? roles : ADMIN_ROLES;
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) {
        return next(unauthorized(403, "Forbidden: insufficient permission."));
    }
    next();
};

const RequireAdmin = RequireRole(...ADMIN_ROLES);

const VerifyAuthorizationFunction = async ({ refresh_token }) => {
    try {
        if (!refresh_token) return null;

        const parsedToken = JWT.verify(refresh_token, process.env.SECRET_KEY);
        if (!parsedToken?.sub || !parsedToken?.usiv || !parsedToken?.scrf) return null;

        const isRefreshToken = await Bcrypt.compare("refresh_token", parsedToken.scrf);
        if (!isRefreshToken) return null;

        return JSON.parse(
            CryptoDecrpyter({ textCode: parsedToken.sub, iv: parsedToken.usiv }),
        );
    } catch (error) {
        return null;
    }
};

module.exports = {
    CheckAuthorization,
    VerifyAuthorization,
    OptionalAuthorization,
    RequireRole,
    RequireAdmin,
    VerifyAuthorizationFunction,
    ADMIN_ROLES,
};
