const ImagesModel = require("../libs/mongodb/schema/images");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const {
    BuildQueryOptions2,
    BuildQueryOptions3,
} = require("../libs/mongodb/functions/filters");

// http://localhost:5550/api/v1/images?size=1&page=2&search=

const GetImagesList = async (req, res, next) => {
    try {
        let query = {
            req,
            QueryFields: ["name"],
            requiredFilters: [],
            optionalFilters: ["name"],
            customFilters: {},
            fieldMapping: {
                search: "name",
            },
            defaultSort: { createdAt: -1 },
        };

        const QueryOptions2 = BuildQueryOptions3(query);

        const [getData, totalCount] = await Promise.all([
            ImagesModel.find(QueryOptions2.query)
                .sort(QueryOptions2.sort)
                .limit(QueryOptions2.pagination.size)
                .skip(
                    (QueryOptions2.pagination.page - 1) *
                        QueryOptions2.pagination.size,
                ),
            ImagesModel.countDocuments(QueryOptions2.query),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            total: totalCount,
            message: "Successfull to get list images",
        });
    } catch (error) {
        next(error);
    }
};

const GetImagesDetail = async (req, res, next) => {
    const { id } = req.params;
    try {
        let getData = await ImagesModel.findOne({
            _id: id,
        });

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            message: `Successfull to get detail images | ${id}`,
        });
    } catch (error) {
        next(error);
    }
};

const DeleteImagesByID = async (req, res, next) => {
    const { id } = req.params;

    try {
        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            message: `Successfull to delete detail images | ${id}`,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    GetImagesList,
    GetImagesDetail,
    DeleteImagesByID,
};
