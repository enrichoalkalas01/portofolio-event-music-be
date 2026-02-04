const handleSizeParameter = (sizeParam) => {
    // Jika size adalah "all" atau "-1", return undefined (no limit)
    if (
        sizeParam === "all" ||
        sizeParam === "-1" ||
        sizeParam === "unlimited"
    ) {
        return undefined;
    }

    // Jika size adalah "0", juga bisa diartikan unlimited
    if (sizeParam === "0") {
        return undefined;
    }

    // Parse normal size
    const parsedSize = parseInt(sizeParam, 10);
    return !Number.isNaN(parsedSize) && parsedSize > 0 ? parsedSize : 10;
};

const BuildQueryOptions = ({ req, QueryFields = [] }) => {
    let { page, size, search, sort, order } = req.query;
    // console.log(page, size, search, sort, order);

    // Handle Pagination
    const Page = !Number.isNaN(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    // const Size = !Number.isNaN(parseInt(size, 10)) ? parseInt(size, 10) : 5;
    const Size = handleSizeParameter(size);

    // Handle Search Query
    let Query = {};
    if (search && QueryFields.length > 0) {
        const searchWords = search.trim().split(/\s+/); // Pisahkan berdasarkan spasi

        if (searchWords.length > 1) {
            // Jika lebih dari satu kata, gunakan $and untuk memastikan semua kata cocok
            Query = {
                $and: searchWords.map((word) => ({
                    $or: QueryFields.map((field) => ({
                        [field]: { $regex: word, $options: "i" },
                    })),
                })),
            };
        } else {
            // Jika hanya satu kata, gunakan $or biasa
            Query = {
                $or: QueryFields.map((field) => ({
                    [field]: { $regex: search, $options: "i" },
                })),
            };
        }
    }

    // Handle Sorting
    let SortQuery;

    if (order && typeof order === "string") {
        const SortFields = order.split(",");
        const SortOrders = Array.isArray(sort) ? sort : [sort];

        if (SortFields.length === SortOrders.length) {
            SortQuery = SortFields.map((field, index) => [
                field,
                SortOrders[index] === "asc" ? 1 : -1,
            ]);
        }
    }

    // Default Sort jika SortQuery kosong
    if (!SortQuery || SortQuery.length === 0) {
        SortQuery = { createdAt: 1 };
    }

    // Final Query Object
    return {
        pagination: { page: Page, size: Size },
        query: Query,
        sort: SortQuery,
    };
};

const BuildQueryOptions2 = ({
    req,
    QueryFields = [],
    customFilters = {}, // ← Parameter untuk custom filters
    optionalFilters = [], // ← Parameter untuk optional filters
    requiredFilters = [], // ← Parameter untuk required filters
    fieldMapping = {}, // ← Parameter untuk mapping field URL ke database
    sortMapping = {}, // ← Parameter BARU untuk mapping sort field URL ke database
    allowedSortFields = [], // ← Parameter BARU untuk restrict field yang boleh di-sort
    defaultSort = "",
}) => {
    let { page, size, search, sort, order, ...otherParams } = req.query;

    // Handle Pagination
    const Page = !Number.isNaN(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    // const Size = !Number.isNaN(parseInt(size, 10)) ? parseInt(size, 10) : 10;
    const Size = handleSizeParameter(size);

    // Build Query Object
    let Query = {};
    let queryConditions = [];

    // 1. Handle Search Query (tetap seperti sebelumnya)
    if (search && QueryFields.length > 0) {
        const searchWords = search.trim().split(/\s+/); // Pisahkan berdasarkan spasi

        if (searchWords.length > 1) {
            // Jika lebih dari satu kata, gunakan $and untuk memastikan semua kata cocok
            queryConditions.push({
                $and: searchWords.map((word) => ({
                    $or: QueryFields.map((field) => ({
                        [field]: { $regex: word, $options: "i" },
                    })),
                })),
            });
        } else {
            // Jika hanya satu kata, gunakan $or biasa
            queryConditions.push({
                $or: QueryFields.map((field) => ({
                    [field]: { $regex: search, $options: "i" },
                })),
            });
        }
    }

    // Handle Custom Filters
    const customQueryFilters = {};

    // Helper function untuk convert field name
    const getDbFieldName = (urlFieldName) => {
        return fieldMapping[urlFieldName] || urlFieldName;
    };

    // Helper function untuk convert sort field name
    const getDbSortFieldName = (urlSortFieldName) => {
        return (
            sortMapping[urlSortFieldName] ||
            fieldMapping[urlSortFieldName] ||
            urlSortFieldName
        );
    };

    // 2. Handle Required Filters (jika tidak ada, return query kosong)
    let hasRequiredFilters = true;
    if (requiredFilters.length > 0) {
        hasRequiredFilters = requiredFilters.every((filterName) => {
            const filterValue = req.query[filterName];
            return (
                filterValue !== undefined &&
                filterValue !== null &&
                filterValue !== ""
            );
        });

        // Jika ada required filters yang tidak terpenuhi, return early dengan query kosong
        if (!hasRequiredFilters) {
            return {
                pagination: { page: Page, size: Size },
                query: {},
                sort: SortQuery || { createdAt: 1 },
            };
        }

        // Jika semua required filters ada, tambahkan ke query
        requiredFilters.forEach((filterName) => {
            const filterValue = req.query[filterName];
            const dbFieldName = getDbFieldName(filterName); // ← Convert ke database field

            if (typeof filterValue === "string") {
                customQueryFilters[dbFieldName] = {
                    $regex: filterValue,
                    $options: "i",
                };
            } else {
                customQueryFilters[dbFieldName] = filterValue;
            }
        });
    }

    // 3. Handle Optional Filters (HANYA JIKA ADA)
    optionalFilters.forEach((filterName) => {
        const filterValue = req.query[filterName];
        if (
            filterValue !== undefined &&
            filterValue !== null &&
            filterValue !== ""
        ) {
            const dbFieldName = getDbFieldName(filterName); // ← Convert ke database field

            if (typeof filterValue === "string") {
                customQueryFilters[dbFieldName] = {
                    $regex: filterValue,
                    $options: "i",
                };
            } else {
                customQueryFilters[dbFieldName] = filterValue;
            }
        }
    });

    // 4. Handle Custom Filters dari parameter (override req.query)
    Object.keys(customFilters).forEach((key) => {
        const filterValue = customFilters[key];
        if (
            filterValue !== undefined &&
            filterValue !== null &&
            filterValue !== ""
        ) {
            const dbFieldName = getDbFieldName(key); // ← Convert ke database field

            if (typeof filterValue === "string") {
                customQueryFilters[dbFieldName] = {
                    $regex: filterValue,
                    $options: "i",
                };
            } else {
                customQueryFilters[dbFieldName] = filterValue;
            }
        }
    });

    // 5. Handle other parameters (selain page, size, search, sort, order, dan yang sudah didefinisikan)
    const excludedParams = [
        "page",
        "size",
        "search",
        "sort",
        "order",
        ...optionalFilters,
        ...requiredFilters,
    ];
    Object.keys(otherParams).forEach((key) => {
        if (!excludedParams.includes(key)) {
            const paramValue = otherParams[key];
            if (
                paramValue !== undefined &&
                paramValue !== null &&
                paramValue !== ""
            ) {
                if (typeof paramValue === "string") {
                    customQueryFilters[key] = {
                        $regex: paramValue,
                        $options: "i",
                    };
                } else {
                    customQueryFilters[key] = paramValue;
                }
            }
        }
    });

    // 6. Combine all conditions
    if (Object.keys(customQueryFilters).length > 0) {
        queryConditions.push(customQueryFilters);
    }

    // 7. Build final query
    if (queryConditions.length > 1) {
        Query = { $and: queryConditions };
    } else if (queryConditions.length === 1) {
        Query = queryConditions[0];
    }

    // Handle Sorting with field mapping and restrictions
    let SortQuery;

    // Check if order is a direction-only value (ascending/descending/asc/desc)
    const isDirectionOnly =
        order &&
        (order === "ascending" ||
            order === "asc" ||
            order === "descending" ||
            order === "desc");

    if (isDirectionOnly && defaultSort) {
        // Handle direction-only order using defaultSort as field
        const sortDirection = order === "ascending" || order === "asc" ? 1 : -1;

        // Jika defaultSort adalah object
        if (typeof defaultSort === "object" && !Array.isArray(defaultSort)) {
            const firstField = Object.keys(defaultSort)[0];
            SortQuery = { [firstField]: sortDirection };
        }
        // Jika defaultSort adalah array
        else if (Array.isArray(defaultSort)) {
            const firstField = defaultSort[0][0];
            SortQuery = [[firstField, sortDirection]];
        }
        // Jika defaultSort adalah string
        else if (typeof defaultSort === "string") {
            SortQuery = { [defaultSort]: sortDirection };
        }
    } else if (order && typeof order === "string" && !isDirectionOnly) {
        // Handle normal field-based sorting
        const SortFields = order.split(",");
        const SortOrders = Array.isArray(sort) ? sort : [sort];

        if (SortFields.length === SortOrders.length) {
            // Filter only allowed sort fields (jika allowedSortFields didefinisikan)
            const validSortFields =
                allowedSortFields.length > 0
                    ? SortFields.filter((field) =>
                          allowedSortFields.includes(field)
                      )
                    : SortFields;

            if (validSortFields.length > 0) {
                SortQuery = validSortFields.map((field, index) => {
                    const dbFieldName = getDbSortFieldName(field); // ← Convert ke database field
                    const sortOrder =
                        SortOrders[SortFields.indexOf(field)] === "asc"
                            ? 1
                            : -1;
                    return [dbFieldName, sortOrder];
                });
            }
        }
    }

    // Default Sort jika SortQuery kosong
    if (!SortQuery || SortQuery.length === 0) {
        if (defaultSort) {
            // Jika defaultSort adalah object: { field: order }
            if (
                typeof defaultSort === "object" &&
                !Array.isArray(defaultSort)
            ) {
                SortQuery = defaultSort;
            }
            // Jika defaultSort adalah array: [["field", order], ["field2", order2]]
            else if (Array.isArray(defaultSort)) {
                SortQuery = defaultSort;
            }
            // Jika defaultSort adalah string: "fieldName" (default asc)
            else if (typeof defaultSort === "string") {
                SortQuery = { [defaultSort]: 1 };
            }
        } else {
            // Fallback ke createdAt jika tidak ada defaultSort
            SortQuery = { createdAt: 1 };
        }
    }

    // Final Query Object
    return {
        pagination: { page: Page, size: Size },
        query: Query,
        sort: SortQuery,
    };
};

const BuildQueryOptions3 = ({
    req,
    QueryFields = [],
    customFilters = {},
    optionalFilters = [],
    requiredFilters = [],
    fieldMapping = {},
    fieldTypeMapping = {}, // New parameter for field type mapping
    sortMapping = {},
    allowedSortFields = [],
    defaultSort = "",
    arrayFilters = [],
    excludeFields = [],
}) => {
    let { page, size, search, sort, order, ...otherParams } = req.query;

    // Pagination
    const Page = Math.max(1, parseInt(page, 10) || 1);
    const Size = handleSizeParameter(size);

    // Query building
    let queryConditions = [];

    // Helper function to check if string is valid ObjectId
    const isValidObjectId = (str) => {
        return /^[0-9a-fA-F]{24}$/.test(str);
    };

    // Helper function to process search value based on field type
    const processSearchValue = (searchTerm, field) => {
        const fieldType = fieldTypeMapping[field] || "string"; // Default to string

        switch (fieldType) {
            case "objectid":
                if (isValidObjectId(searchTerm)) {
                    try {
                        return {
                            [field]: new mongoose.Types.ObjectId(searchTerm),
                        };
                    } catch (e) {
                        return null; // Skip if conversion fails
                    }
                }
                return null; // Skip if not valid ObjectId

            case "number":
                const numValue = parseFloat(searchTerm);
                if (!isNaN(numValue)) {
                    // For numbers, you can choose different strategies:
                    // 1. Exact match
                    return { [field]: numValue };

                    // 2. Or range search (uncomment below and comment above)
                    // const tolerance = numValue * 0.1; // 10% tolerance
                    // return { [field]: { $gte: numValue - tolerance, $lte: numValue + tolerance } };
                }
                return null; // Skip if not a valid number

            case "boolean":
                const boolValue = searchTerm.toLowerCase();
                if (
                    boolValue === "true" ||
                    boolValue === "1" ||
                    boolValue === "yes"
                ) {
                    return { [field]: true };
                } else if (
                    boolValue === "false" ||
                    boolValue === "0" ||
                    boolValue === "no"
                ) {
                    return { [field]: false };
                }
                return null; // Skip if not a valid boolean

            case "date":
                const dateValue = new Date(searchTerm);
                if (!isNaN(dateValue.getTime())) {
                    // Search for dates on the same day
                    const startOfDay = new Date(dateValue);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(dateValue);
                    endOfDay.setHours(23, 59, 59, 999);

                    return { [field]: { $gte: startOfDay, $lte: endOfDay } };
                }
                return null; // Skip if not a valid date

            case "string":
            default:
                // Handle _id field specially for backward compatibility
                if (field === "_id" && isValidObjectId(searchTerm)) {
                    try {
                        return {
                            [field]: new mongoose.Types.ObjectId(searchTerm),
                        };
                    } catch (e) {
                        return null;
                    }
                }
                // Regular string search with regex
                return { [field]: { $regex: searchTerm, $options: "i" } };
        }
    };

    // Search handling
    if (search && QueryFields.length > 0) {
        const searchWords = search.trim().split(/\s+/);

        if (searchWords.length > 1) {
            queryConditions.push({
                $and: searchWords.map((word) => ({
                    $or: QueryFields.map((field) =>
                        processSearchValue(word, field)
                    ).filter((condition) => condition !== null), // Remove null conditions
                })),
            });
        } else {
            const searchConditions = QueryFields.map((field) =>
                processSearchValue(search, field)
            ).filter((condition) => condition !== null); // Remove null conditions

            if (searchConditions.length > 0) {
                queryConditions.push({
                    $or: searchConditions,
                });
            }
        }
    }

    // Helper functions
    const getDbFieldName = (urlFieldName) => {
        return fieldMapping[urlFieldName] || urlFieldName;
    };

    const getDbSortFieldName = (urlSortFieldName) => {
        return (
            sortMapping[urlSortFieldName] ||
            fieldMapping[urlSortFieldName] ||
            urlSortFieldName
        );
    };

    const processFilterValue = (filterValue, fieldName) => {
        if (arrayFilters.includes(fieldName)) {
            if (Array.isArray(filterValue)) {
                return { $in: filterValue };
            }
            if (typeof filterValue === "string" && filterValue.includes(",")) {
                return { $in: filterValue.split(",").map((v) => v.trim()) };
            }
        }

        if (typeof filterValue === "string") {
            return { $regex: filterValue, $options: "i" };
        }
        return filterValue;
    };

    const customQueryFilters = {};

    // Required filters validation
    if (requiredFilters.length > 0) {
        const hasAllRequired = requiredFilters.every((filterName) => {
            const filterValue = req.query[filterName];
            return (
                filterValue !== undefined &&
                filterValue !== null &&
                filterValue !== ""
            );
        });

        if (!hasAllRequired) {
            return {
                pagination: { page: Page, size: Size },
                query: {},
                sort: defaultSort || { createdAt: 1 },
            };
        }

        requiredFilters.forEach((filterName) => {
            const filterValue = req.query[filterName];
            const dbFieldName = getDbFieldName(filterName);
            customQueryFilters[dbFieldName] = processFilterValue(
                filterValue,
                filterName
            );
        });
    }

    // Optional filters
    optionalFilters.forEach((filterName) => {
        const filterValue = req.query[filterName];
        if (
            filterValue !== undefined &&
            filterValue !== null &&
            filterValue !== ""
        ) {
            const dbFieldName = getDbFieldName(filterName);
            customQueryFilters[dbFieldName] = processFilterValue(
                filterValue,
                filterName
            );
        }
    });

    // Custom filters (override)
    Object.keys(customFilters).forEach((key) => {
        const filterValue = customFilters[key];
        if (
            filterValue !== undefined &&
            filterValue !== null &&
            filterValue !== ""
        ) {
            const dbFieldName = getDbFieldName(key);
            customQueryFilters[dbFieldName] = processFilterValue(
                filterValue,
                key
            );
        }
    });

    // Other parameters
    const excludedParams = [
        "page",
        "size",
        "search",
        "sort",
        "order",
        ...optionalFilters,
        ...requiredFilters,
        ...excludeFields,
    ];
    Object.keys(otherParams).forEach((key) => {
        if (!excludedParams.includes(key)) {
            const paramValue = otherParams[key];
            if (
                paramValue !== undefined &&
                paramValue !== null &&
                paramValue !== ""
            ) {
                customQueryFilters[key] = processFilterValue(paramValue, key);
            }
        }
    });

    // Combine conditions
    if (Object.keys(customQueryFilters).length > 0) {
        queryConditions.push(customQueryFilters);
    }

    // Build final query
    let Query = {};
    if (queryConditions.length > 1) {
        Query = { $and: queryConditions };
    } else if (queryConditions.length === 1) {
        Query = queryConditions[0];
    }

    // Sorting logic (unchanged)
    let SortQuery;
    const isDirectionOnly =
        order && ["ascending", "asc", "descending", "desc"].includes(order);

    if (isDirectionOnly && defaultSort) {
        const sortDirection = ["ascending", "asc"].includes(order) ? 1 : -1;

        if (typeof defaultSort === "object" && !Array.isArray(defaultSort)) {
            const firstField = Object.keys(defaultSort)[0];
            SortQuery = { [firstField]: sortDirection };
        } else if (Array.isArray(defaultSort)) {
            const firstField = defaultSort[0][0];
            SortQuery = { [firstField]: sortDirection };
        } else if (typeof defaultSort === "string") {
            SortQuery = { [defaultSort]: sortDirection };
        }
    } else if (order && typeof order === "string" && !isDirectionOnly) {
        const SortFields = order.split(",");
        const SortOrders = Array.isArray(sort) ? sort : [sort];

        if (SortFields.length === SortOrders.length) {
            const validSortFields =
                allowedSortFields.length > 0
                    ? SortFields.filter((field) =>
                          allowedSortFields.includes(field)
                      )
                    : SortFields;

            if (validSortFields.length > 0) {
                SortQuery = {};
                validSortFields.forEach((field, index) => {
                    const dbFieldName = getDbSortFieldName(field);
                    const sortOrder =
                        SortOrders[SortFields.indexOf(field)] === "asc"
                            ? 1
                            : -1;
                    SortQuery[dbFieldName] = sortOrder;
                });
            }
        }
    }

    // Default sort fallback
    if (!SortQuery) {
        if (defaultSort) {
            if (
                typeof defaultSort === "object" &&
                !Array.isArray(defaultSort)
            ) {
                SortQuery = defaultSort;
            } else if (Array.isArray(defaultSort)) {
                SortQuery = defaultSort.reduce((acc, [field, order]) => {
                    acc[field] = order;
                    return acc;
                }, {});
            } else if (typeof defaultSort === "string") {
                SortQuery = { [defaultSort]: 1 };
            }
        } else {
            SortQuery = { createdAt: 1 };
        }
    }

    return {
        pagination: { page: Page, size: Size },
        query: Query,
        sort: SortQuery,
    };
};

module.exports = { BuildQueryOptions, BuildQueryOptions2, BuildQueryOptions3 };
