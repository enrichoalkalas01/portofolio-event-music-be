const ResponseHandlerSuccess = ({
    req,
    res,
    status = 200,
    message = "Request Successful",
    data = {},
    total = 0,
}) => {
    let DataPassing = {
        status: "Success",
        statusCode: status,
        message: message,
    }

    if (data && Object.keys(data).length > 0) {
        DataPassing["data"] = data;
    }

    if (total) {
        DataPassing["total"] = total;
    }

    return res.status(status).json(DataPassing);
}

const ResponseHandlerFailed = ({
    req,
    res,
    status = 405,
    message = "Method Not Allowed",
    errors = [],
}) => {
    let DataPassing = {
        status: "Failed",
        statusCode: status,
        message: message,
    }

    if (errors && Array.isArray(errors) && errors.length > 0) {
        DataPassing["errors"] = errors;
    }

    return res.status(status).json(DataPassing);
}

module.exports = {
    ResponseHandlerSuccess,
    ResponseHandlerFailed,
};
