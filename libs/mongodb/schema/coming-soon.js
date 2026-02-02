// ComingSoon.js
const mongoose = require("mongoose");

const ComingSoonSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Events",
            required: true,
        },
        releaseDate: {
            type: Date,
            required: true,
        },
        notifyUsers: {
            type: Boolean,
            default: false,
        },
        others: {
            type: Object,
            required: false,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("ComingSoon", ComingSoonSchema);