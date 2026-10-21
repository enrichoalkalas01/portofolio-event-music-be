// Library
const Bcrypt = require("bcrypt");
const validator = require("fastest-validator");

// Schema
const UserModel = require("../libs/mongodb/schema/users");

// Utils
const { CreateTokenJWTCallBack } = require("../middlewares/token");
const { VerifyAuthorizationFunction } = require("../middlewares/authorization");
const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

// Setup
const v = new validator();
const schemaLogin = {
    username: { type: "string", min: 2, max: 255, trim: true },
    password: { type: "string", min: 2, max: 255 },
    $$strict: "remove",
};
const schemaRegister = {
    username: {
        type: "string",
        min: 3,
        max: 30,
        trim: true,
        lowercase: true,
        pattern: /^[a-z0-9._-]+$/i,
        messages: { stringPattern: "Username may only contain letters, numbers, dot, dash and underscore." },
    },
    password: { type: "string", min: 6, max: 255 },
    email: { type: "email", normalize: true },
    firstname: { type: "string", max: 100, optional: true },
    lastname: { type: "string", max: 100, optional: true },
    fullname: { type: "string", max: 200, optional: true },
    phonenumber: { type: "string", max: 30, optional: true },
    $$strict: "remove",
};

const publicUser = (user) => ({
    _id: user._id,
    username: user.username,
    fullname: user.fullname,
    phonenumber: user.phonenumber,
    email: user.email,
    avatar: user.avatar,
    role: user.role || "user",
});

const issueTokens = async (user) => {
    const user_data = {
        id: user._id,
        username: user.username,
        email: user.email,
        type: user.role || "user",
    };

    const [refresh, access] = await Promise.all([
        CreateTokenJWTCallBack({
            expired_number: 7,
            expired_type: "day",
            source_from: "account",
            token_type: "refresh_token",
            id: user._id,
            user_data,
        }),
        CreateTokenJWTCallBack({
            expired_number: 1,
            expired_type: "day",
            source_from: "account",
            token_type: "access_token",
            id: user._id,
            user_data,
        }),
    ]);

    if (!refresh?.status || !access?.status) {
        throw { name: "Failed to create token!", status: 500, message: "Failed to create token!" };
    }

    return {
        access_token: access.data,
        refresh_token: refresh.data,
        session_token: 0,
        sso_refresh_token: 0,
        expired_rf: refresh.exp,
        expired: access.exp,
        type: user.role || "user",
    };
};

const Login = async (req, res, next) => {
    try {
        const errors = v.validate(req.body, schemaLogin);
        if (errors !== true) {
            throw { name: "Error Validation", status: 400, message: "Error to validate request.", errorsData: errors };
        }

        const identifier = String(req.body.username).trim().toLowerCase();
        const userData = await UserModel.findOne({
            $or: [{ username: identifier }, { email: identifier }],
        });

        // Same message for unknown user and wrong password: do not leak which one failed.
        const invalid = { name: "Error auth.", status: 401, message: "Wrong username or password!" };
        if (!userData) throw invalid;

        const matching = await Bcrypt.compare(req.body.password, userData.password);
        if (!matching) throw invalid;

        if (userData.isActive === false) {
            throw { name: "Error auth.", status: 403, message: "Account is not active." };
        }

        const token = await issueTokens(userData);

        ResponseHandlerSuccess({
            req,
            res,
            data: { ...publicUser(userData), token },
            message: "Login Success",
        });
    } catch (error) {
        next(error);
    }
};

const Register = async (req, res, next) => {
    try {
        const errors = v.validate(req.body, schemaRegister);
        if (errors !== true) {
            throw { name: "Error Validation", status: 400, message: "Error to validate request.", errorsData: errors };
        }

        const { username, password, firstname, lastname, fullname, phonenumber, email } = req.body;

        const exists = await UserModel.findOne({
            $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
        });
        if (exists) {
            throw { name: "Error username or email", status: 409, message: "Username or email is already registered." };
        }

        const hashed = await Bcrypt.hash(password, 12);
        const name = fullname || [firstname, lastname].filter(Boolean).join(" ") || null;

        const created = await UserModel.create({
            username,
            password: hashed,
            email,
            fullname: name,
            phonenumber: phonenumber || null,
            role: "user",
            isActive: true,
        });

        ResponseHandlerSuccess({
            req,
            res,
            status: 201,
            data: publicUser(created),
            message: "Successfull to create data user",
        });
    } catch (error) {
        next(error);
    }
};

// POST /authentication/refresh-token { rftc }
const RefreshToken = async (req, res, next) => {
    try {
        const tokenUser = await VerifyAuthorizationFunction({ refresh_token: req.body?.rftc });
        if (!tokenUser?.id) throw { status: 401, message: "Invalid refresh token." };

        const user = await UserModel.findOne({ _id: tokenUser.id, username: tokenUser.username });
        if (!user || user.isActive === false) throw { status: 401, message: "Invalid refresh token." };

        const token = await issueTokens(user);
        ResponseHandlerSuccess({ req, res, data: token, message: "Refresh Success" });
    } catch (error) {
        next(error);
    }
};

// GET /authentication/me
const Me = async (req, res, next) => {
    try {
        const user = await UserModel.findOne({ _id: req.user.id }).select(
            "-password -activationToken -activationExpires",
        );
        if (!user) throw { status: 404, message: "User not found" };
        ResponseHandlerSuccess({ req, res, data: user, message: "Get Me Success" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    Login,
    Register,
    RefreshToken,
    Me,
};
