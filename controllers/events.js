const validator = require("fastest-validator");
const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");
const { BuildQueryOptions3 } = require("../libs/mongodb/functions/filters");

const EventsModel = require("../libs/mongodb/schema/events");
const TransactionModel = require("../libs/mongodb/schema/transactions");

const EVENT_STATUS = ["ACTIVE", "CANCELLED", "COMPLETED", "DRAFT"];
const ADMIN_ROLES = ["admin", "super_admin"];
// Tickets held by these statuses count against capacity.
const OCCUPYING_STATUSES = ["success", "pending"];

const v = new validator();
const schemaValidation = {
    title: { type: "string", min: 3, max: 150, empty: false, trim: true },
    excerpt: { type: "string", max: 300, optional: true },
    description: { type: "string", optional: true },
    event_date_start: { type: "date", convert: true },
    event_date_end: { type: "date", convert: true },
    location: { type: "string", optional: true },
    vendor: { type: "string", optional: true },
    sponsor: { type: "array", optional: true },
    categories: { type: "array", optional: true },
    status: { type: "enum", values: EVENT_STATUS, optional: true },
    max_participants: { type: "number", integer: true, min: 1, convert: true },
    price: { type: "number", min: 0, convert: true },
    coming_soon: { type: "enum", values: ["YES", "NO"], optional: true },
    $$strict: "remove",
};

const isValidId = (id) => ObjectId.isValid(id) && String(new ObjectId(id)) === String(id);

const notFound = () => ({ status: 404, message: "Event not found." });

const normalizeStatus = (status) =>
    typeof status === "string" ? status.toUpperCase() : status;

// Attach tickets_sold / tickets_remaining / is_sold_out / is_past to plain event objects.
const attachTicketStats = async (events) => {
    const list = Array.isArray(events) ? events : [events];
    if (!list.length) return events;

    const ids = list.map((e) => String(e._id));
    const sold = await TransactionModel.aggregate([
        {
            $match: {
                event_id: { $in: ids },
                status_transaction: { $in: OCCUPYING_STATUSES },
            },
        },
        {
            $group: {
                _id: "$event_id",
                count: { $sum: { $ifNull: ["$request.qty", 1] } },
            },
        },
    ]);
    const soldMap = Object.fromEntries(sold.map((s) => [s._id, s.count]));
    const now = new Date();

    const decorate = (e) => {
        const capacity = Number(e.max_participants) || 0;
        const ticketsSold = soldMap[String(e._id)] || 0;
        const remaining = Math.max(capacity - ticketsSold, 0);
        const end = e.eventDate?.end ? new Date(e.eventDate.end) : null;
        return {
            ...e,
            tickets_sold: ticketsSold,
            tickets_remaining: remaining,
            is_sold_out: capacity > 0 && remaining === 0,
            is_past: !!end && end < now,
        };
    };

    return Array.isArray(events) ? list.map(decorate) : decorate(events);
};

const buildListQuery = (req, extraFilters = []) => {
    const { upcoming, category, status } = req.query;
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    const andFilters = [...extraFilters];

    // Public listings only expose ACTIVE (or COMPLETED) events; admins may filter any status.
    const wantAll = typeof status === "string" && status.toLowerCase() === "all";
    const requested = normalizeStatus(status);
    if (wantAll) {
        if (!isAdmin) andFilters.push({ status: { $in: ["ACTIVE", "COMPLETED"] } });
    } else if (requested && (isAdmin || ["ACTIVE", "COMPLETED"].includes(requested))) {
        andFilters.push({ status: requested });
    } else if (!isAdmin) {
        andFilters.push({ status: "ACTIVE" });
    }

    if (upcoming === "true") {
        andFilters.push({ "eventDate.end": { $gte: new Date() } });
    } else if (upcoming === "false") {
        andFilters.push({ "eventDate.end": { $lt: new Date() } });
    }

    if (category) {
        andFilters.push({ categories: { $in: String(category).split(",").map((c) => c.trim()) } });
    }

    return BuildQueryOptions3({
        req,
        QueryFields: ["title", "location", "vendor"],
        customFilters: andFilters.length > 0 ? { $and: andFilters } : {},
        fieldMapping: { search: "title" },
        excludeFields: ["upcoming", "category", "status", "search"],
        allowedSortFields: ["title", "price", "createdAt", "eventDate.start", "max_participants"],
        defaultSort: { "eventDate.start": 1 },
    });
};

const listEvents = async (req, extraFilters) => {
    const options = buildListQuery(req, extraFilters);
    const query = EventsModel.find(options.query).sort(options.sort).lean();
    if (options.pagination.size) {
        query
            .limit(options.pagination.size)
            .skip((options.pagination.page - 1) * options.pagination.size);
    }
    const [data, total] = await Promise.all([
        query,
        EventsModel.countDocuments(options.query),
    ]);
    return { data: await attachTicketStats(data), total };
};

const Create = async (req, res, next) => {
    try {
        if (req.body?.status) req.body.status = normalizeStatus(req.body.status);
        const validate = v.compile(schemaValidation);
        const result = validate(req.body);
        if (result !== true) {
            throw { status: 400, message: "Request validation failed.", errorsData: result };
        }

        const b = req.body;
        if (new Date(b.event_date_end) < new Date(b.event_date_start)) {
            throw { status: 400, message: "Event end date must be after start date." };
        }

        const created = await EventsModel.create({
            title: b.title,
            excerpt: b.excerpt || "",
            description: b.description || "",
            eventDate: { start: b.event_date_start, end: b.event_date_end },
            location: b.location || "",
            vendor: b.vendor || "",
            sponsor: b.sponsor || [],
            thumbnail: Array.isArray(b.thumbnail) ? b.thumbnail : [],
            images: Array.isArray(b.images) ? b.images : [],
            categories: b.categories || [],
            status: normalizeStatus(b.status) || "DRAFT",
            max_participants: b.max_participants,
            price: b.price,
            createdBy: req.user.username,
            updatedBy: req.user.username,
            others: { coming_soon: b.coming_soon || "NO" },
        });

        ResponseHandlerSuccess({ req, res, status: 201, data: created, message: "Create Success" });
    } catch (error) {
        next(error);
    }
};

const Update = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw notFound();

        if (req.body?.status) req.body.status = normalizeStatus(req.body.status);
        const validate = v.compile(schemaValidation);
        const result = validate(req.body);
        if (result !== true) {
            throw { status: 400, message: "Request validation failed.", errorsData: result };
        }

        const b = req.body;
        if (new Date(b.event_date_end) < new Date(b.event_date_start)) {
            throw { status: 400, message: "Event end date must be after start date." };
        }

        const set = {
            title: b.title,
            eventDate: { start: b.event_date_start, end: b.event_date_end },
            max_participants: b.max_participants,
            price: b.price,
            updatedBy: req.user.username,
        };
        const optional = ["excerpt", "description", "location", "vendor", "sponsor", "categories", "images", "thumbnail"];
        for (const key of optional) {
            if (b[key] !== undefined) set[key] = b[key];
        }
        if (b.status) set.status = normalizeStatus(b.status);
        if (b.coming_soon) set["others.coming_soon"] = b.coming_soon;

        const updated = await EventsModel.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: set },
            { new: true },
        );
        if (!updated) throw notFound();

        ResponseHandlerSuccess({ req, res, data: updated, message: "Update Success" });
    } catch (error) {
        next(error);
    }
};

const Delete = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw notFound();

        const hasTransactions = await TransactionModel.exists({
            event_id: id,
            status_transaction: { $in: OCCUPYING_STATUSES },
        });
        if (hasTransactions) {
            throw {
                status: 409,
                message: "Event has active transactions. Set status to CANCELLED instead of deleting.",
            };
        }

        const deleted = await EventsModel.deleteOne({ _id: id });
        if (!deleted.deletedCount) throw notFound();

        ResponseHandlerSuccess({ req, res, message: "Delete Success" });
    } catch (error) {
        next(error);
    }
};

const Get = async (req, res, next) => {
    try {
        const { data, total } = await listEvents(req);
        ResponseHandlerSuccess({ req, res, data, total, message: "Get list data Success" });
    } catch (error) {
        next(error);
    }
};

const GetListlByComingSoon = async (req, res, next) => {
    try {
        const { data, total } = await listEvents(req, [{ "others.coming_soon": "YES" }]);
        ResponseHandlerSuccess({ req, res, data, total, message: "Get list data Success" });
    } catch (error) {
        next(error);
    }
};

const GetCategories = async (req, res, next) => {
    try {
        const data = await EventsModel.aggregate([
            { $match: { status: "ACTIVE" } },
            { $unwind: "$categories" },
            { $group: { _id: "$categories", total: { $sum: 1 } } },
            { $sort: { total: -1, _id: 1 } },
            { $project: { _id: 0, name: "$_id", total: 1 } },
        ]);
        ResponseHandlerSuccess({ req, res, data, total: data.length, message: "Get categories Success" });
    } catch (error) {
        next(error);
    }
};

const GetDetailByID = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw notFound();

        const event = await EventsModel.findOne({ _id: id }).lean();
        if (!event) throw notFound();

        const isAdmin = ADMIN_ROLES.includes(req.user?.role);
        if (event.status === "DRAFT" && !isAdmin) throw notFound();

        const related = await EventsModel.find({
            _id: { $ne: event._id },
            status: "ACTIVE",
            "eventDate.end": { $gte: new Date() },
            ...(event.categories?.length ? { categories: { $in: event.categories } } : {}),
        })
            .sort({ "eventDate.start": 1 })
            .limit(4)
            .lean();

        // Fall back to any upcoming events when the category match is thin.
        if (related.length < 4) {
            const fill = await EventsModel.find({
                _id: { $nin: [event._id, ...related.map((r) => r._id)] },
                status: "ACTIVE",
                "eventDate.end": { $gte: new Date() },
            })
                .sort({ "eventDate.start": 1 })
                .limit(4 - related.length)
                .lean();
            related.push(...fill);
        }

        const [data, relatedWithStats] = await Promise.all([
            attachTicketStats(event),
            attachTicketStats(related),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: { ...data, related: relatedWithStats },
            message: "Get By ID Success",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    Create,
    Update,
    Delete,
    Get,
    GetDetailByID,
    GetListlByComingSoon,
    GetCategories,
    attachTicketStats,
    OCCUPYING_STATUSES,
};
