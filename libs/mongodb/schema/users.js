// User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
            index: true,
        },
        fullname: {
            type: String,
            trim: true,
            default: null,
        },
        phonenumber: {
            type: String,
            trim: true,
            default: null,
        },
        avatar: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ["guest", "user", "admin", "super_admin", "member"],
            default: "user",
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        address: {
            street: { type: String, default: "" },
            city: { type: String, default: "" },
            province: { type: String, default: "" },
            postalCode: { type: String, default: "" },
            country: { type: String, default: "" },
        },
        activationToken: {
            type: String,
            default: null,
        },
        activationExpires: {
            type: Date,
            default: null,
        },
        others: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("User", UserSchema);