const schema = {
    title: { type: "string", optional: false },
    sku_product: { type: "string", optional: true },
    slug: { type: "string", optional: true },
    excerpt: { type: "string", optional: true },
    description: { type: "string", optional: true },
    prices: [
        {
            type: "string",
            optional: true,
        },
        {
            type: "object",
            properties: {
                price: {
                    type: "number",
                    positive: true,
                    min: 1,
                    optional: true,
                },
                price_discounted: {
                    type: "number",
                    positive: true,
                    min: 0,
                    optional: true,
                },
                price_range: {
                    start: {
                        type: "number",
                        positive: true,
                        min: 0,
                        optional: true,
                    },
                    end: {
                        type: "number",
                        positive: true,
                        min: 0,
                        optional: true,
                    },
                },
            },
        },
    ],
    // prices: {
    //     type: "multi",
    //     rules: [
    //         {
    //             type: "object",
    //             properties: {
    //                 price: {
    //                     type: "number",
    //                     positive: true,
    //                     min: 1,
    //                     optional: true,
    //                 },
    //                 price_discounted: {
    //                     type: "number",
    //                     positive: true,
    //                     min: 0,
    //                     optional: true,
    //                 },
    //                 price_range: {
    //                     start: {
    //                         type: "number",
    //                         positive: true,
    //                         min: 0,
    //                         optional: true,
    //                     },
    //                     end: {
    //                         type: "number",
    //                         positive: true,
    //                         min: 0,
    //                         optional: true,
    //                     },
    //                 },
    //             },
    //         },
    //         // {
    //         //     type: "string",
    //         //     custom: (value, errors, schema, name) => {
    //         //         return value;
    //         //     },
    //         // },
    //     ],
    // },
    // discounts: {
    //     discount_product: { type: "string", optional: true },
    //     discount_date: {
    //         start: { type: "string", optional: true },
    //         end: { type: "string", optional: true },
    //     },
    // },
    // categories: { type: "string", optional: true },
    // brands: { type: "string", optional: true },
    // images: {
    //     thumbnail: {},
    //     images: [{}],
    // },
    // additional_informations: {
    //     table_of_description: {
    //         type: "object",
    //         properties: {
    //             price: {
    //                 type: "number",
    //                 positive: true,
    //                 min: 1,
    //                 optional: true,
    //             },
    //         },
    //     },
    // },
    // status: {},
    // stock: {
    //     quantity: { type: "number", optional: true },
    //     low_stock_threshold: { type: "nuber", optional: true },
    // },
    // seo: {
    //     meta_title: { type: "string", optional: true },
    //     meta_description: { type: "string", optional: true },
    //     keywords: { type: "string", optional: true },
    // },
};
