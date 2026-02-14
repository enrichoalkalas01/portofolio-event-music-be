const Moment = require("moment");
const validator = require("fastest-validator");
const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const {
    BuildQueryOptions2,
    BuildQueryOptions3,
} = require("../libs/mongodb/functions/filters");

const EventsModel = require("../libs/mongodb/schema/events");

const v = new validator();
const schemaValidation = {
    title: {
        type: "string",
        min: 3, // minimal 3 karakter
        max: 100, // maksimal 100 karakter
        empty: false, // tidak boleh kosong
        trim: true, // hapus spasi di awal/akhir
    },
    excerpt: { type: "string", min: 1, optional: true },
    description: { type: "string", optional: true },
    event_date_start: { type: "date", convert: true, optional: false },
    event_date_end: { type: "date", convert: true, optional: false },
    location: { type: "string", optional: true },
    vendor: { type: "string", optional: true },
    sponsor: { type: "array", optional: true },
    status: { type: "string", optional: true },
    max_participants: {
        type: "number",
        positive: true, // harus positif
        integer: true, // harus integer
        min: 1,
    },
    price: {
        type: "number",
        min: 0,
        default: 0,
        optional: false,
    },
    coming_soon: { type: "string", optional: true },
};

const Create = async (req, res, next) => {
    const {
        title,
        excerpt,
        description,
        event_date_start,
        event_date_end,
        location,
        vendor,
        sponsor,
        status,
        max_participants,
        price,
        coming_soon,
    } = req.body;

    try {
        console.log(req.body);
        let Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw {
                status: 401,
                message: "Unauthorized!",
            };
        }

        const validate = v.compile(schemaValidation);
        const resultValidate = validate(req.body);
        if (resultValidate?.length > 0) {
            throw {
                message: "error request validation",
                errorsData: resultValidate,
            };
        }

        const DataPassing = {
            title: title || "",
            excerpt: excerpt || "",
            description: description || "",
            eventDate: {
                start: event_date_start || "", // Date
                end: event_date_end || "", // Date
            },
            location: location || "",
            vendor: vendor || "",
            sponsor: sponsor || [],
            thumbnail: "",
            images: [],
            categories: [],
            status: status || "active", // ["active", "cancelled", "completed"]
            createdBy: Authorization?.username,
            updatedBy: Authorization?.username,
            max_participants: max_participants,
            price: price,
            others: {
                coming_soon: coming_soon || "NO",
            },
        };

        await EventsModel.create(DataPassing);

        ResponseHandlerSuccess({
            req,
            res,
            message: "Create  Success",
        });
    } catch (error) {
        next(error);
    }
};

const Update = async (req, res, next) => {
    const { id } = req.params;
    const {
        title,
        excerpt,
        description,
        event_date_start,
        event_date_end,
        location,
        vendor,
        sponsor,
        status,
        max_participants,
        price,
        categories,

        images,
        thumbnail,
        coming_soon,
    } = req.body;

    try {
        let Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw {
                status: 401,
                message: "Unauthorized!",
            };
        }

        const validate = v.compile(schemaValidation);
        const resultValidate = validate(req.body);
        if (resultValidate?.length > 0) {
            throw {
                message: "error request validation",
                errorsData: resultValidate,
            };
        }

        let DataPassing = {};
        if (title) DataPassing["title"] = title;
        if (excerpt) DataPassing["excerpt"] = excerpt;
        if (description) DataPassing["description"] = description;
        if (event_date_start) DataPassing["eventDate.start"] = event_date_start;
        if (event_date_end) DataPassing["eventDate.end"] = event_date_end;
        if (location) DataPassing["location"] = location;
        if (vendor) DataPassing["vendor"] = vendor;
        if (sponsor) DataPassing["sponsor"] = sponsor;
        if (status) DataPassing["status"] = status;
        if (max_participants)
            DataPassing["max_participants"] = max_participants;
        if (price) DataPassing["price"] = price;
        if (categories) DataPassing["categories"] = categories;

        if (images) DataPassing["images"] = images;
        if (thumbnail) DataPassing["thumbnail"] = thumbnail;
        if (coming_soon)
            DataPassing["others.coming_soon"] = coming_soon || "NO";

        await EventsModel.findOneAndUpdate(
            {
                _id: new ObjectId(id),
            },
            {
                $set: DataPassing,
            },
        );

        ResponseHandlerSuccess({
            req,
            res,
            message: "Update Success",
        });
    } catch (error) {
        next(error);
    }
};

const Delete = async (req, res, next) => {
    const { id } = req.params;

    try {
        let Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw {
                status: 401,
                message: "Unauthorized!",
            };
        }

        await EventsModel.deleteOne({ _id: id });

        ResponseHandlerSuccess({
            req,
            res,
            message: "Delete Success",
        });
    } catch (error) {
        next(error);
    }
};

const Get = async (req, res, next) => {
    try {
        let sortingFilter = {};
        let andFilters = [];
        const QueryDataPassing = {
            req,
            QueryFields: ["title"],
            requiredFilters: [],
            optionalFilters: ["title"],
            arrayFilters: [""],
            customFilters: andFilters.length > 0 ? { $and: andFilters } : {},
            fieldMapping: {
                search: "title",
            },
            excludeFields: [],
            // defaultSort: {},
        };

        const QueryOptions2 = BuildQueryOptions3(QueryDataPassing);
        const [getData, total] = await Promise.all([
            EventsModel.find(QueryOptions2.query)
                .sort(sortingFilter)
                .limit(QueryOptions2.pagination.size)
                .skip(
                    (QueryOptions2.pagination.page - 1) *
                        QueryOptions2.pagination.size,
                ),
            EventsModel.countDocuments(QueryOptions2.query),
        ]);

        console.log(getData);

        ResponseHandlerSuccess({
            req,
            res,
            data: getData || [],
            total: total,
            message: "Get list data Success",
        });
    } catch (error) {
        next(error);
    }
};

const GetDetailByID = async (req, res, next) => {
    const { id } = req.params;
    try {
        const getData = await EventsModel.findOne({ _id: id });

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            message: "Get By ID  Success",
        });
    } catch (error) {
        next(error);
    }
};

const GetListlByComingSoon = async (req, res, next) => {
    const { sort } = req.query;
    try {
        // let sortingFilter = { createdAt: -1 };
        let sortingFilter = {};
        let andFilters = [
            {
                "others.coming_soon": "YES",
            },
        ];

        const QueryDataPassing = {
            req,
            QueryFields: ["title"],
            requiredFilters: [],
            optionalFilters: ["title"],
            arrayFilters: [""],
            customFilters: andFilters.length > 0 ? { $and: andFilters } : {},
            fieldMapping: {
                search: "title",
            },
            excludeFields: [],
            // defaultSort: {},
        };

        const QueryOptions2 = BuildQueryOptions3(QueryDataPassing);
        const [getData, total] = await Promise.all([
            EventsModel.find(QueryOptions2.query)
                .sort(sortingFilter)
                .limit(QueryOptions2.pagination.size)
                .skip(
                    (QueryOptions2.pagination.page - 1) *
                        QueryOptions2.pagination.size,
                ),
            EventsModel.countDocuments(QueryOptions2.query),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            total: total,
            message: "Get list data Success",
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
};

/*

const Schema = {
    title: "",
    excerpt: "",
    description: "",
    eventDate: {
        start: "", // Date
        end: "", // Date
    },
    location: "",
    vendor: "",
    sponsor: [],
    thumbnail: "",
    images: [],
    status: "active", // ["active", "cancelled", "completed"]
    createdBy: "",
    updatedBy: "",
    others: {},
}

*/

// const Schema = {
//     "title": "big bang tour 2025",
//     "excerpt": "big bang tour 2025",
//     "description": "big bang tour 2025",
//     "eventDate": {
//         "start": "2025-12-12", // Date
//         "end": "2025-12-12", // Date
//     },
//     "location": "jakarta",
//     "vendor": "events community",
//     "sponsor": [],
//     "thumbnail": "",
//     "images": [],
//     "status": "active", // ["active", "cancelled", "completed"]
//     "createdBy": "",
//     "updatedBy": "",
//     "others": {},
// }
