// Events.js
const { min } = require("moment");
const mongoose = require("mongoose");

const EventsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        excerpt: {
            type: String,
            required: false,
        },
        description: {
            type: String,
            required: false,
        },
        eventDate: {
            start: {
                type: Date,
                required: false,
            },
            end: {
                type: Date,
                required: false,
            },
        },
        location: {
            type: String,
            required: false,
        },
        vendor: {
            type: String,
            required: false,
        },
        sponsor: {
            type: Array,
            required: false,
        },
        thumbnail: {
            type: String,
            required: false,
        },
        images: {
            type: Array,
            required: false,
        },
        categories: {
            type: Array,
            required: false,
        },
        status: {
            type: String,
            enum: ["active", "cancelled", "completed", "draft"],
            default: "active",
        },
        max_participants: {
            type: Number,
            default: 1,
            required: false,
            min: 1,
        },
        price: {
            type: Number,
            min: 0,
            default: 0,
            required: false,
        },
        createdBy: {
            type: String,
            required: false,
        },
        updatedBy: {
            type: String,
            required: false,
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

module.exports = mongoose.model("Events", EventsSchema);