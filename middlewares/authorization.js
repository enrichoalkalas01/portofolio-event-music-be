const JWT = require("jsonwebtoken");
const Moment = require("moment");
const Bcrypt = require("bcrypt");

// Model
const UserModel = require("../libs/mongodb/schema/users");

// Utils
const {
    CryptoEncrypter,
    CryptoDecrpyter,
} = require("../utils/setup/generate");

const CheckAuthorization = async (req, res, next) => {
    try {
        if (!req.headers?.authorization) {
            throw {
                name: "Error",
                status: 401,
                message: "Unauthorized!",
            };
        } else {
            let tokenAuth = req.headers?.authorization.split(" ");
            // console.log(tokenAuth);
            if (tokenAuth[0].toLowerCase() !== "bearer") {
                throw {
                    name: "Error",
                    status: 401,
                    message: "Unauthorized!",
                };
            } else {
                req.TokenAuth = tokenAuth[1];
                next();
            }
        }
    } catch (error) {
        next(error);
    }
};

const VerifyAuthorization = async (req, res, next) => {
    try {
        if (!req.TokenAuth) {
            const error = {
                name: "Error.",
                status: 400,
                message: "Unauthorized!",
            };

            console.log(error);
            throw error;
        } else {
            let parsedToken = JWT.verify(req.TokenAuth, process.env.SECRET_KEY);
            if (!parsedToken) {
                const error = {
                    name: "Error..",
                    status: 400,
                    message: "Unauthorized!",
                };

                console.log(error);
                throw error;
            } else {
                if (
                    !parsedToken.sub ||
                    !parsedToken.usiv ||
                    !parsedToken.scrf
                ) {
                    const error = {
                        name: "Error...",
                        status: 400,
                        message: "Unauthorized!",
                    };

                    console.log(error);
                    throw error;
                } else {
                    let checkSourceFrom = await Bcrypt.compare(
                        "access_token",
                        parsedToken.scrf
                    );

                    if (!checkSourceFrom) {
                        const error = {
                            name: "Error....",
                            status: 400,
                            message: "Unauthorized!",
                        };

                        console.log(error);
                        throw error;
                    } else {
                        let UserData = CryptoDecrpyter({
                            textCode: parsedToken.sub,
                            iv: parsedToken.usiv,
                        });

                        let ParsedUserData = JSON.parse(UserData);
                        if (!UserData || !ParsedUserData) {
                            const error = {
                                name: "Error.....",
                                status: 400,
                                message: "Unauthorized!",
                            };

                            console.log(error);
                            throw error;
                        }

                        let CheckUser = await UserModel.findOne({
                            _id: ParsedUserData?.id,
                            username: ParsedUserData?.username,
                        });

                        if (!CheckUser) {
                            const error = {
                                name: "Error......",
                                status: 400,
                                message: "Unauthorized!",
                            };

                            console.log(error);
                            throw error;
                        }

                        process.env.authorization = UserData;

                        next();
                    }
                }
            }
        }
    } catch (error) {
        next(error);
    }
};


const VerifyAuthorizationFunction = async ({ refresh_token }) => {
    try {
        if (!refresh_token) {
            throw {
                name: "Error",
                status: 400,
                message: "Unauthorized!",
            };
        } else {
            let parsedToken = JWT.verify(refresh_token, process.env.SECRET_KEY);
            if (!parsedToken) {
                throw {
                    name: "Error",
                    status: 400,
                    message: "Unauthorized!",
                };
            } else {
                if (
                    !parsedToken.sub ||
                    !parsedToken.usiv ||
                    !parsedToken.scrf
                ) {
                    throw {
                        name: "Error",
                        status: 400,
                        message: "Unauthorized!",
                    };
                } else {
                    let checkSourceFrom = await Bcrypt.compare(
                        "refresh_token",
                        parsedToken.scrf
                    );
                    if (!checkSourceFrom) {
                        throw {
                            name: "Error",
                            status: 400,
                            message: "Unauthorized!",
                        };
                    } else {
                        let UserData = CryptoDecrpyter({
                            textCode: parsedToken.sub,
                            iv: parsedToken.usiv,
                        });
                        return JSON.parse(UserData);
                    }
                }
            }
        }
    } catch (error) {
        return null;
    }
};

module.exports = {
    CheckAuthorization,
    VerifyAuthorization,
    VerifyAuthorizationFunction,
};
