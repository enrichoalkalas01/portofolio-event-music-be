const cryptr = require('cryptr')
const Cryptr = new cryptr(process.env.SECRET_KEY)
const crypto = require('crypto')

// ## Cryptr ##
const CryptrEncrypter = (filter = { textData: null }) => {
    const { textData } = filter
    let createCode = Cryptr.encrypt(textData)
    return createCode
}

const CryptrDecrypter = (filter = { textCode: null }) => {
    const { textCode } = filter
    let decryptCode = Cryptr.decrypt(textCode)
    return decryptCode
}

// ## Crypto Node Modules LibUV ##
const CryptoEncrypter = (filter = { textData: null }) => {
    const { textData } = filter

    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(process.env.SECRET_KEY, 'salt', 32)
    const iv = crypto.randomBytes(16)

    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(textData, 'utf-8', 'hex')
    encrypted += cipher.final('hex')
    return { iv: iv.toString('hex'), encryptedText: encrypted }
}

const CryptoDecrpyter = (filter = { textCode: null, iv: null }) => {
    const { textCode, iv } = filter

    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(process.env.SECRET_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'))

    let decrypted = decipher.update(textCode, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')
    return decrypted
}

// ## Base64 ##

// ## Others ##

module.exports = {
    CryptrEncrypter,
    CryptrDecrypter,
    CryptoEncrypter,
    CryptoDecrpyter,
}