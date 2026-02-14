const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const SavedEventsModel = require("../libs/mongodb/schema/saved");
const EventsModel = require("../libs/mongodb/schema/events");

// Save event (toggle)
const SaveEvent = async (req, res, next) => {
    const { id } = req.params;
    try {
        const Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw { status: 401, message: "Unauthorized!" };
        }

        const event = await EventsModel.findOne({ _id: new ObjectId(id) });
        if (!event) {
            throw { status: 404, message: "Event not found" };
        }

        // Check if already saved
        const existingSaved = await SavedEventsModel.findOne({
            user: new ObjectId(Authorization.id),
            event: new ObjectId(id),
        });

        if (existingSaved) {
            // Already saved, remove it (toggle)
            await SavedEventsModel.deleteOne({ _id: existingSaved._id });

            ResponseHandlerSuccess({
                req,
                res,
                data: { isSaved: false },
                message: "Event removed from saved",
            });
        } else {
            // Save the event
            const savedEvent = await SavedEventsModel.create({
                user: new ObjectId(Authorization.id),
                event: new ObjectId(id),
            });

            ResponseHandlerSuccess({
                req,
                res,
                data: { isSaved: true, savedEvent },
                message: "Event saved successfully",
            });
        }
    } catch (error) {
        next(error);
    }
};

// Get all saved events for the authenticated user
const GetSavedEvents = async (req, res, next) => {
    try {
        const Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw { status: 401, message: "Unauthorized!" };
        }

        const [getData, total] = await Promise.all([
            SavedEventsModel.find({
                user: new ObjectId(Authorization.id),
            })
                .populate({
                    path: "event",
                    select: "title excerpt description eventDate location vendor thumbnail images categories status max_participants price createdAt",
                })
                .sort({ createdAt: -1 }),
            SavedEventsModel.countDocuments({
                user: new ObjectId(Authorization.id),
            }),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            total: total,
            message: "Get saved events Success",
        });
    } catch (error) {
        next(error);
    }
};

// Remove saved event
const RemoveSavedEvent = async (req, res, next) => {
    const { id } = req.params;
    try {
        const Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw { status: 401, message: "Unauthorized!" };
        }

        const savedEvent = await SavedEventsModel.findOne({
            user: new ObjectId(Authorization.id),
            event: new ObjectId(id),
        });

        if (!savedEvent) {
            throw { status: 404, message: "Saved event not found" };
        }

        await SavedEventsModel.deleteOne({ _id: savedEvent._id });

        ResponseHandlerSuccess({
            req,
            res,
            message: "Saved event removed successfully",
        });
    } catch (error) {
        next(error);
    }
};

// Check if event is saved by user
const CheckSaved = async (req, res, next) => {
    const { id } = req.params;
    try {
        const Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw { status: 401, message: "Unauthorized!" };
        }

        const existingSaved = await SavedEventsModel.findOne({
            user: new ObjectId(Authorization.id),
            event: new ObjectId(id),
        });

        ResponseHandlerSuccess({
            req,
            res,
            data: { isSaved: !!existingSaved },
            message: "Check saved status Success",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    SaveEvent,
    GetSavedEvents,
    RemoveSavedEvent,
    CheckSaved,
};
