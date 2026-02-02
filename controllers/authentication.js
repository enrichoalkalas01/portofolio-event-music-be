// Library
const Bcrypt = require("bcrypt");
const cryptr = require("cryptr");
const Cryptr = new cryptr(process.env.SECRET_KEY || "S3cr3tsN0Rump1!!!");
const validator = require("fastest-validator");
const Moment = require("moment");

// Schema
const UserModel = require("../libs/mongodb/schema/users");

// Utils
const {
    CreateTokenJWTCallBack,
    getJWTExpiration,
    calculateTTLFromJWT,
    decodeJWT,
    DecodeJWTCallBack,
    getJWTExpirationInfo,
} = require("../middlewares/token");
const {
    ResponseHandlerSuccess,
} = require("../middlewares/response-handler");

// Setup
const v = new validator();
const schemaValidationCredentials = {
    username: { type: "string", min: 2, max: 255 },
    password: { type: "string", min: 2, max: 255 },
};

const Login = async (req, res, next) => {
    const { username, password } = req.body;

    try {
        const validatedRequest = v.validate(
            { ...req.body },
            schemaValidationCredentials,
        );

        if (!validatedRequest || validatedRequest?.length > 0) {
            throw {
                name: "Error Validation",
                status: 400,
                message: "Error to validate request.",
                errorsData: validatedRequest,
            };
        }

        // Check exist user
        const userData = await UserModel.findOne({
            $or: [
                { username: { $regex: new RegExp(username) } },
                { email: { $regex: new RegExp(username) } },
            ],
        });

        if (!userData) {
            throw {
                name: "Error User",
                status: 400,
                message: "User is not exist",
                errorsData: [],
            };
        }

        const MatchingPassword = await Bcrypt.compare(
            password,
            userData?.password,
        );

        if (!MatchingPassword) {
            throw {
                name: "Error auth.",
                status: 400,
                message: "Failed to login user. Wrong username or password!",
            };
        }

        const Datas = userData.toJSON();

        // Filter data yang akan di pass
        const DataPassing = {
            _id: Datas._id,
            username: Datas.username,
            firstname: Datas.firstname,
            lastname: Datas.lastname,
            fullname: Datas.fullname,
            phonenumber: Datas.phonenumber,
            email: Datas.email,
        };

        const [createRefreshToken, createAccessToken] = await Promise.all([
            CreateTokenJWTCallBack({
                expired_number: 1,
                expired_type: "day",
                source_from: "account",
                token_type: "refresh_token",
                firstname: DataPassing?.firstname,
                id: DataPassing?._id,
                user_data: {
                    id: DataPassing?._id,
                    username: DataPassing?.username,
                    email: DataPassing?.email,
                    type: Datas?.typeUser,
                },
            }),
            CreateTokenJWTCallBack({
                expired_number: 1,
                expired_type: "day",
                source_from: "account",
                token_type: "access_token",
                firstname: DataPassing?.firstname,
                id: DataPassing?._id,
                user_data: {
                    id: DataPassing?._id,
                    username: DataPassing?.username,
                    email: DataPassing?.email,
                    type: Datas?.typeUser,
                },
            }),
        ]);

        if (!createRefreshToken?.status || !createAccessToken?.status) {
            throw {
                name: "Failed to create token!",
                status: 500,
                message: "Failed to create token!",
            };
        }

        DataPassing["token"] = {
            access_token: createAccessToken.data,
            refresh_token: createRefreshToken.data,
            session_token: 0, // SSO session token
            sso_refresh_token: 0, // SSO refresh token
            expired_rf: createRefreshToken.exp,
            expired: createAccessToken.exp,
            type: Datas?.additional_info?.type_user,
        };

        ResponseHandlerSuccess({ req: req, res: res, data: DataPassing });
    } catch (error) {
        next(error);
    }
};

const Register = async (req, res, next) => {
    const {
        username,
        password,
        firstname,
        lastname,
        fullname,
        phonenumber,
        email,
    } = req.body;

    try {
        const validatedRequest = v.validate(
            { ...req.body },
            schemaValidationCredentials
        );

        if (!validatedRequest || validatedRequest?.length > 0) {
            throw {
                name: "Error Validation",
                status: 400,
                message: "Error to validate request.",
                errorsData: validatedRequest,
            };
        }

        // Check Exist Username or Emails
        const checkExistData = await UserModel.findOne({
            $or: [{ username: username }, { email: email }],
        });

        if (checkExistData) {
            throw {
                name: "Error username or email",
                status: 400,
                message: "User or email is exist",
                errorsData: [],
            };
        }

        const GeneratePasswordBcrypt = await Bcrypt.hash(password, 12);
        const GeneratePasswordCryptr = await Cryptr.encrypt(password);
        if (!GeneratePasswordBcrypt || !GeneratePasswordCryptr) {
            throw {
                name: "Error auth.",
                status: 400,
                message: "Failed to generate password.",
                errorsData: [],
            };
        }

        // console.log("Password Bcrypt : ", GeneratePasswordBcrypt);
        // console.log("Password Cryptr : ", GeneratePasswordCryptr);

        const DataPassing = {
            username: username,
            password: GeneratePasswordBcrypt,
            firstname: firstname || null,
            lastname: lastname || null,
            fullname: fullname || null,
            email: email || null,
            phonenumber: phonenumber || null,
            additional_info: {
                visible_password: GeneratePasswordCryptr,
                is_active: false, // active, not_active
                type_user: "guest", // guest, admin, member, user
            },
        };

        let create = await UserModel.create(DataPassing);
        if (!create) {
            throw {
                name: "Error to register",
                status: 500,
                message: "Failed to create user data.",
                errorsData: [],
            };
        }

        ResponseHandlerSuccess({
            req: req,
            res: res,
            message: "Successfull to create data user",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    Login,
    Register
}