// SavedEvents.js
const mongoose = require("mongoose");

const SavedEventsSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Events",
            required: true,
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

// Mencegah user menyimpan event yang sama 2x
SavedEventsSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model("SavedEvents", SavedEventsSchema);