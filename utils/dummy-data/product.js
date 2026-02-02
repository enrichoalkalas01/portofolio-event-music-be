const ProductDummys = [
    {
        title: "Samsung Galaxy S24 Ultra",
        sku_product: "SGS24U-256-BLK",
        slug: "samsung-galaxy-s24-ultra-256gb-black",
        excerpt: "Flagship smartphone dengan kamera 200MP dan S Pen terbaru",
        description:
            "Samsung Galaxy S24 Ultra adalah smartphone flagship terbaru dengan layar Dynamic AMOLED 6.8 inci, kamera utama 200MP, prosesor Snapdragon 8 Gen 3, dan fitur S Pen yang sempurna untuk produktivitas.",
        prices: {
            price: 18999000,
            price_discounted: 17099000,
            price_range: {
                start: 16999000,
                end: 18999000,
            },
        },
        discounts: {
            discount_product: 10,
            discount_date: {
                start: "2025-05-24T00:00:00.000Z",
                end: "2025-06-30T23:59:59.000Z",
            },
        },
        categories: ["Smartphone", "Electronics", "Mobile Devices"],
        brands: ["Samsung"],
        images: {
            thumbnail: "https://example.com/images/samsung-s24-ultra-thumb.jpg",
            images: [
                "https://example.com/images/samsung-s24-ultra-1.jpg",
                "https://example.com/images/samsung-s24-ultra-2.jpg",
                "https://example.com/images/samsung-s24-ultra-3.jpg",
            ],
        },
        additional_informations: {
            table_of_description:
                'Display: 6.8" Dynamic AMOLED<br>RAM: 12GB<br>Storage: 256GB<br>Camera: 200MP + 50MP + 12MP + 10MP<br>Battery: 5000mAh',
            weight: 232,
            dimensions: {
                length: 162.3,
                width: 79.0,
                height: 8.6,
            },
            tags: ["flagship", "premium", "5G", "s-pen"],
        },
        status: "active",
        stock: {
            quantity: 50,
            low_stock_threshold: 10,
        },
        seo: {
            meta_title: "Samsung Galaxy S24 Ultra 256GB - Smartphone Premium",
            meta_description:
                "Beli Samsung Galaxy S24 Ultra 256GB dengan harga terbaik. Kamera 200MP, S Pen, layar 6.8 inci. Garansi resmi.",
            keywords: [
                "samsung",
                "galaxy s24 ultra",
                "smartphone",
                "256gb",
                "s pen",
            ],
        },
    },
];

module.exports = {
    ProductDummys,
};
