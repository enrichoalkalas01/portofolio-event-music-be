const JWT = require("jsonwebtoken");
const Moment = require("moment");
const Bcrypt = require("bcrypt");

const {
    CryptoEncrypter,
    CryptoDecrpyter,
} = require("../utils/setup/generate");

const CreateTokenJWTCallBack = async (
    params = {
        expired_number: 1,
        expired_type: "day", // second, minute, hour, day, month, year
        source_from: "default", // source from services
        access: [], // access services array
        token_type: "access_token", // access_token, refresh_token
        data: {},
        id: null,
        firstname: null,
        user_data: null,
    },
) => {
    const {
        expired_number,
        expired_type,
        source_from,
        access,
        token_type,
        data,
        id,
        firstname,
        user_data,
    } = params;

    try {
        let now = Moment();
        let newDateData = null;

        // Calculate expiration time
        if (expired_type.includes("second")) {
            newDateData = Moment(now).add(expired_number, "seconds");
        } else if (expired_type.includes("minute")) {
            newDateData = Moment(now).add(expired_number, "minutes");
        } else if (expired_type.includes("hour")) {
            newDateData = Moment(now).add(expired_number, "hours");
        } else if (expired_type.includes("day")) {
            newDateData = Moment(now).add(expired_number, "days");
        } else if (expired_type.includes("month")) {
            newDateData = Moment(now).add(expired_number, "months");
        } else if (expired_type.includes("year")) {
            newDateData = Moment(now).add(expired_number, "years");
        } else {
            newDateData = Moment(now).add(expired_number, "hours");
        }

        console.log("Moment Date : ", newDateData);

        // Prepare user data for encryption
        let UserData = {
            id: user_data?.id,
            username: user_data?.username,
            email: user_data?.email,
            type: user_data?.type,
        };

        let createCrypter = CryptoEncrypter({
            textData: JSON.stringify(UserData),
        });

        // 🔥 FIX: Convert to Unix timestamp (seconds, not milliseconds)
        const tokenExpired = Math.floor(newDateData.valueOf() / 1000); // Convert to seconds
        const issuedAt = Math.floor(now.valueOf() / 1000); // Convert to seconds

        // Hash the token type for security
        let sourceFromEncrypt = await Bcrypt.hash(token_type, 10);

        // Validate SECRET_KEY exists
        if (!process.env.SECRET_KEY) {
            throw new Error(
                "SECRET_KEY is not defined in environment variables",
            );
        }

        // Create JWT with proper timestamp format
        let createToken = JWT.sign(
            {
                // Standard JWT claims (Unix timestamp in seconds)
                exp: tokenExpired,
                iat: issuedAt,

                // Custom claims
                sub: createCrypter?.encryptedText,
                usiv: createCrypter?.iv,
                scrf: sourceFromEncrypt,

                // Additional metadata
                token_type: token_type,
                source_from: source_from,
            },
            process.env.SECRET_KEY,
            {
                algorithm: "HS256",
            },
        );

        console.log(
            `✅ JWT Created - Type: ${token_type}, Expires: ${new Date(
                tokenExpired * 1000,
            ).toISOString()}`,
        );

        return {
            status: true,
            data: createToken,
            exp: tokenExpired,
            debug: {
                issued_at: issuedAt,
                expires_at: tokenExpired,
                expires_date: new Date(tokenExpired * 1000).toISOString(),
                token_type: token_type,
            },
        };
    } catch (error) {
        console.error("❌ JWT Creation Error:", error.message);
        return {
            status: false,
            data: null,
            message: error.message,
            statusText: error.name,
            statusCode: error.status || 500,
        };
    }
};

function getJWTExpiration(token) {
    try {
        const decoded = JWT.decode(token);
        return decoded?.exp; // Unix timestamp (seconds)
    } catch (error) {
        return null;
    }
}

function calculateTTLFromJWT(token) {
    const exp = getJWTExpiration(token);
    if (!exp) return null;

    // Convert exp (unix timestamp) ke moment object
    const expirationTime = Moment.unix(exp);
    const now = Moment();

    // Hitung selisih dalam detik
    const ttl = expirationTime.diff(now, "seconds");

    // Return 0 jika sudah expired, atau ttl jika masih valid
    return ttl > 0 ? ttl : 0;
}

function getJWTExpirationInfo(token) {
    const exp = getJWTExpiration(token);
    if (!exp) return null;

    const expirationTime = Moment.unix(exp);
    const now = Moment();
    const ttl = expirationTime.diff(now, "seconds");

    return {
        exp: exp,
        ttl: Math.max(0, ttl),
        expiredAt: expirationTime.format("YYYY-MM-DD HH:mm:ss"),
        expiredAtISO: expirationTime.toISOString(),
        isExpired: ttl <= 0,
        timeRemaining: {
            days: Math.floor(ttl / 86400),
            hours: Math.floor((ttl % 86400) / 3600),
            minutes: Math.floor((ttl % 3600) / 60),
            seconds: ttl % 60,
        },
        humanReadable: expirationTime.fromNow(), // "in 6 hours"
    };
}

const DecodeJWTCallBack = (token) => {
    try {
        if (!token) {
            return {
                status: false,
                data: null,
                message: "Token tidak diberikan",
            };
        }

        const decoded = JWT.decode(token, { complete: true });

        if (!decoded) {
            return { status: false, data: null, message: "Token tidak valid" };
        }

        const { payload, header } = decoded;

        // Decrypt user data
        let userData = null;
        let decryptError = null;

        if (payload.sub && payload.usiv) {
            try {
                // Berdasarkan CryptoEncrypter yang return { encryptedText, iv }
                // Maka CryptoDecrpyter kemungkinan expect parameter serupa
                const decrypted = CryptoDecrpyter({
                    textCode: payload.sub,
                    iv: payload.usiv,
                });

                // Cek apakah return string langsung atau object
                if (typeof decrypted === "string") {
                    userData = JSON.parse(decrypted);
                } else if (decrypted?.decryptedText) {
                    userData = JSON.parse(decrypted.decryptedText);
                } else if (decrypted?.data) {
                    userData = JSON.parse(decrypted.data);
                }
            } catch (decryptErr) {
                decryptError = decryptErr.message;
            }
        }

        return {
            status: true,
            data: {
                header,
                payload: {
                    exp: payload.exp,
                    iat: payload.iat,
                    token_type: payload.token_type,
                    source_from: payload.source_from,
                    scrf: payload.scrf,
                },
                user_data: userData,
                decrypt_error: decryptError,
                issued_at: new Date(payload.iat * 1000).toISOString(),
                expires_at: new Date(payload.exp * 1000).toISOString(),
                is_expired: Date.now() > payload.exp * 1000,
            },
        };
    } catch (error) {
        return {
            status: false,
            data: null,
            message: error.message,
        };
    }
};

function decodeJWT(token) {
    try {
        const decoded = JWT.decode(token, process.env.SECRET_KEY);
        return { status: true, data: decoded };
    } catch (error) {
        return { status: false, data: null };
    }
}

module.exports = {
    CreateTokenJWTCallBack,

    getJWTExpiration,
    calculateTTLFromJWT,
    getJWTExpirationInfo,
    decodeJWT,
    DecodeJWTCallBack,
};
