/* eslint-disable no-console */
// Seed dev data: users, system params, events (with MinIO thumbnails) and sample transactions.
// Usage: pnpm seed            -> upsert seed data (safe to re-run)
//        pnpm seed -- --reset -> also wipe events, transactions and saved events first
const path = require("path");
const fs = require("fs");
const Dotenv = require("dotenv");
const mongoose = require("mongoose");
const Bcrypt = require("bcrypt");
const Minio = require("minio");
const { ObjectId } = require("mongodb");

Dotenv.config({ path: path.join(__dirname, "../../.env") });

const UserModel = require("../../libs/mongodb/schema/users");
const EventsModel = require("../../libs/mongodb/schema/events");
const TransactionsModel = require("../../libs/mongodb/schema/transactions");
const SavedEventsModel = require("../../libs/mongodb/schema/saved");
const SystemParamsTypeModel = require("../../libs/mongodb/schema/system-params-type");
const SystemParamsModel = require("../../libs/mongodb/schema/system-params");

const RESET = process.argv.includes("--reset");
const SEED_TAG = { seed: true };

// IDs are hardcoded in the FE admin event form (event-categories/sponsor/vendor/status.tsx)
const PARAM_TYPES = {
    categories: "6982d71bbc92135272282994",
    sponsor: "6982e6ca3f5ebc11efd5018c",
    vendor: "6982e6d93f5ebc11efd50190",
    status: "6982e78a3f5ebc11efd501b0",
};

const PARAMS = {
    categories: ["Konser", "Festival", "Jazz", "Rock", "Pop", "EDM", "Indie", "Hip Hop"],
    sponsor: ["Spotify", "Telkomsel", "BCA", "Pocari Sweat", "Gojek", "Tokopedia"],
    vendor: ["Ismaya Live", "Ravel Entertainment", "Dyandra Promosindo", "PK Entertainment"],
    status: ["ACTIVE", "DRAFT", "CANCELLED", "COMPLETED"],
};

const USERS = [
    {
        username: "admin",
        password: "Admin123!",
        email: "admin@eventmusic.id",
        fullname: "Administrator",
        phonenumber: "081200000001",
        role: "admin",
    },
    {
        username: "user",
        password: "User123!",
        email: "user@eventmusic.id",
        fullname: "Budi Santoso",
        phonenumber: "081200000002",
        role: "user",
        address: {
            street: "Jl. Sudirman No. 10",
            city: "Jakarta Selatan",
            province: "DKI Jakarta",
            postalCode: "12190",
            country: "Indonesia",
        },
    },
];

const FE_PUBLIC = path.join(__dirname, "../../../portofolio-event-music-fe/public");
const IMAGES = [
    "music-event-banner-1.jpg",
    "music-event-banner-2.jpg",
    "bg-event-music.jpg",
];

const daysFromNow = (days, hour = 19) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
};

const EVENTS = [
    {
        title: "Jakarta Jazz Night 2026",
        excerpt: "Malam jazz intim bersama musisi jazz ternama tanah air di bawah langit Jakarta.",
        description:
            "Jakarta Jazz Night kembali hadir dengan line-up spesial: Tulus, Maliq & D'Essentials, dan Tohpati Bertiga. Nikmati suasana outdoor dengan tata suara kelas dunia, food court kurasi, dan area lounge eksklusif untuk pemegang tiket VIP.\n\nGerbang dibuka pukul 17.00 WIB. Tiket tidak dapat dikembalikan.",
        start: 14, end: 14, endHour: 23,
        location: "Hutan Kota GBK, Jakarta",
        vendor: "Ismaya Live",
        sponsor: ["Spotify", "BCA"],
        categories: ["Jazz", "Konser"],
        status: "ACTIVE",
        max_participants: 500,
        price: 350000,
        image: 0,
    },
    {
        title: "Synchronize Fest 2026",
        excerpt: "Festival musik lintas genre terbesar dengan 100+ penampil dalam 3 hari.",
        description:
            "Synchronize Fest merayakan keberagaman musik Indonesia. Dari dangdut, rock, hip hop, hingga elektronik, semua ada di 6 panggung berbeda. Day pass berlaku untuk satu hari penuh.",
        start: 30, end: 32, startHour: 14, endHour: 23,
        location: "Gambir Expo, Kemayoran, Jakarta",
        vendor: "Dyandra Promosindo",
        sponsor: ["Telkomsel", "Gojek", "Tokopedia"],
        categories: ["Festival", "Rock", "Pop", "Hip Hop"],
        status: "ACTIVE",
        max_participants: 5000,
        price: 550000,
        image: 1,
    },
    {
        title: "Bandung Indie Sessions",
        excerpt: "Showcase band indie Bandung: The Panturas, Pijar, dan Bedchamber.",
        description:
            "Sesi intim 300 orang di venue heritage Bandung. Datang lebih awal untuk merchandise terbatas dan meet & greet.",
        start: 7, end: 7, endHour: 22,
        location: "Gedung Sate Lawn, Bandung",
        vendor: "Ravel Entertainment",
        sponsor: ["Pocari Sweat"],
        categories: ["Indie", "Konser"],
        status: "ACTIVE",
        max_participants: 300,
        price: 150000,
        image: 2,
    },
    {
        title: "Djakarta Warehouse Project",
        excerpt: "Festival musik elektronik terbesar di Asia Tenggara kembali ke Jakarta.",
        description:
            "DWP menghadirkan DJ kelas dunia dengan produksi panggung spektakuler. Tiket early bird terbatas.",
        start: 60, end: 61, startHour: 16, endHour: 23,
        location: "JIExpo Kemayoran, Jakarta",
        vendor: "Ismaya Live",
        sponsor: ["Spotify", "Telkomsel"],
        categories: ["EDM", "Festival"],
        status: "ACTIVE",
        max_participants: 10000,
        price: 1250000,
        comingSoon: true,
        image: 1,
    },
    {
        title: "Dewa 19 Reunion Tour: Surabaya",
        excerpt: "Konser reuni lengkap Dewa 19 bersama semua vokalis lintas era.",
        description:
            "Setelah sukses di Jakarta, Dewa 19 melanjutkan tur ke Surabaya. Nyanyikan kembali hits dari Kangen hingga Risalah Hati.",
        start: 45, end: 45, endHour: 23,
        location: "Stadion Gelora Bung Tomo, Surabaya",
        vendor: "PK Entertainment",
        sponsor: ["BCA", "Gojek"],
        categories: ["Rock", "Konser"],
        status: "ACTIVE",
        max_participants: 20000,
        price: 450000,
        comingSoon: true,
        image: 0,
    },
    {
        title: "Yogyakarta Acoustic Garden",
        excerpt: "Sore santai dengan musik akustik di taman kota Yogyakarta.",
        description:
            "Nadin Amizah, Hindia, dan Sal Priadi membawakan set akustik eksklusif. Bawa tikar, nikmati senja.",
        start: 21, end: 21, startHour: 16, endHour: 21,
        location: "Taman Budaya Yogyakarta",
        vendor: "Ravel Entertainment",
        sponsor: ["Pocari Sweat", "Tokopedia"],
        categories: ["Pop", "Indie"],
        status: "ACTIVE",
        max_participants: 800,
        price: 200000,
        image: 2,
    },
    {
        title: "Bali Sunset Beats",
        excerpt: "Beach party dengan DJ internasional saat matahari terbenam di Seminyak.",
        description:
            "Seri sunset party tahunan di tepi pantai Seminyak. Dress code: white. Usia 18+.",
        start: 90, end: 90, startHour: 15, endHour: 23,
        location: "Potato Head Beach Club, Bali",
        vendor: "Ismaya Live",
        sponsor: ["Spotify"],
        categories: ["EDM"],
        status: "ACTIVE",
        max_participants: 1500,
        price: 750000,
        comingSoon: true,
        image: 1,
    },
    {
        title: "Hip Hop Block Party Medan",
        excerpt: "Rapper lokal dan nasional satu panggung: Ramengvrl, Ben Utomo, dan lainnya.",
        description:
            "Block party pertama di Medan dengan 10 penampil, battle freestyle, dan graffiti wall.",
        start: 3, end: 3, startHour: 18, endHour: 23,
        location: "Lapangan Merdeka, Medan",
        vendor: "Dyandra Promosindo",
        sponsor: ["Telkomsel"],
        categories: ["Hip Hop", "Konser"],
        status: "ACTIVE",
        max_participants: 50,
        price: 100000,
        soldOut: true,
        image: 0,
    },
    {
        title: "Classic Rock Legends 2025",
        excerpt: "Tribute night untuk legenda rock dunia bersama band tribute terbaik Indonesia.",
        description: "Event telah selesai. Terima kasih sudah hadir!",
        start: -20, end: -20, endHour: 23,
        location: "Tennis Indoor Senayan, Jakarta",
        vendor: "PK Entertainment",
        sponsor: ["BCA"],
        categories: ["Rock", "Konser"],
        status: "COMPLETED",
        max_participants: 3000,
        price: 300000,
        image: 2,
    },
    {
        title: "Semarang Jazz Festival (Draft)",
        excerpt: "Draft event yang belum dipublikasikan.",
        description: "Line-up dan harga masih dalam penyusunan.",
        start: 120, end: 121, endHour: 23,
        location: "Kota Lama, Semarang",
        vendor: "Ravel Entertainment",
        sponsor: [],
        categories: ["Jazz", "Festival"],
        status: "DRAFT",
        max_participants: 2000,
        price: 0,
        image: 0,
    },
];

async function uploadThumbnails() {
    const required = ["MINIO_ENDPOINT", "MINIO_PORT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_DEFAULT_BUCKET"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        console.warn(`! MinIO env missing (${missing.join(", ")}), events will be seeded without thumbnails`);
        return [];
    }

    const client = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT, 10),
        useSSL: process.env.MINIO_USE_SSL === "true",
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
    });
    const bucket = process.env.MINIO_DEFAULT_BUCKET;

    const results = [];
    for (const file of IMAGES) {
        const local = path.join(FE_PUBLIC, file);
        if (!fs.existsSync(local)) {
            console.warn(`! image not found, skipped: ${local}`);
            continue;
        }
        const objectName = `seed/${file}`;
        try {
            await client.fPutObject(bucket, objectName, local, { "Content-Type": "image/jpeg" });
            const stat = fs.statSync(local);
            results.push({
                name: objectName,
                size: stat.size,
                contentType: "image/jpeg",
                url_proxy: `/api/v1/files/view/${objectName}`,
            });
            console.log(`  uploaded ${objectName}`);
        } catch (e) {
            console.warn(`! failed to upload ${objectName}: ${e.message}`);
        }
    }
    return results;
}

async function seedParams() {
    for (const [key, id] of Object.entries(PARAM_TYPES)) {
        await SystemParamsTypeModel.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    paramsLabel: key[0].toUpperCase() + key.slice(1),
                    paramsValue: key,
                    paramsDescription: `Event ${key} options`,
                    others: SEED_TAG,
                },
            },
            { upsert: true },
        );
        for (const value of PARAMS[key]) {
            await SystemParamsModel.updateOne(
                { paramsType: new ObjectId(id), paramsValue: value },
                { $set: { paramsLabel: value, paramsDescription: "", others: SEED_TAG } },
                { upsert: true },
            );
        }
    }
    console.log(`  ${Object.keys(PARAM_TYPES).length} param types, ${Object.values(PARAMS).flat().length} params`);
}

async function seedUsers() {
    const out = {};
    for (const u of USERS) {
        const password = await Bcrypt.hash(u.password, 12);
        const doc = await UserModel.findOneAndUpdate(
            { username: u.username },
            {
                $set: {
                    password,
                    email: u.email,
                    fullname: u.fullname,
                    phonenumber: u.phonenumber,
                    role: u.role,
                    isActive: true,
                    address: u.address || undefined,
                    others: SEED_TAG,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        out[u.username] = doc;
        console.log(`  ${u.role.padEnd(5)} ${u.username} / ${u.password}`);
    }
    return out;
}

async function seedEvents(thumbnails, adminUsername) {
    await EventsModel.deleteMany({ "others.seed": true });
    const docs = EVENTS.map((e) => ({
        title: e.title,
        excerpt: e.excerpt,
        description: e.description,
        eventDate: {
            start: daysFromNow(e.start, e.startHour ?? 19),
            end: daysFromNow(e.end, e.endHour ?? 22),
        },
        location: e.location,
        vendor: e.vendor,
        sponsor: e.sponsor,
        thumbnail: thumbnails[e.image] ? [thumbnails[e.image]] : [],
        images: thumbnails.length ? thumbnails : [],
        categories: e.categories,
        status: e.status,
        max_participants: e.max_participants,
        price: e.price,
        createdBy: adminUsername,
        updatedBy: adminUsername,
        others: { ...SEED_TAG, coming_soon: e.comingSoon ? "YES" : "NO", sold_out: !!e.soldOut },
    }));
    const created = await EventsModel.insertMany(docs);
    console.log(`  ${created.length} events`);
    return created;
}

async function seedTransactions(events, user) {
    await TransactionsModel.deleteMany({ "others.seed": true });
    await SavedEventsModel.deleteMany({ user: user._id });

    const tokenUser = { id: String(user._id), username: user.username, email: user.email, type: user.role };
    const request = (ev) => ({
        firstname: "Budi",
        lastname: "Santoso",
        email: user.email,
        phonenumber: user.phonenumber,
        address: "Jl. Sudirman No. 10",
        city: "Jakarta Selatan",
        state: "indonesia",
        zip_code: "12190",
        qty: 1,
        subtotal: ev.price,
        tax_total: ev.price * 0.11,
        total_payment: ev.price * 1.11,
    });

    const byTitle = (t) => events.find((e) => e.title.startsWith(t));
    const jazz = byTitle("Jakarta Jazz");
    const sync = byTitle("Synchronize");
    const soldOut = byTitle("Hip Hop Block");
    const past = byTitle("Classic Rock");

    const docs = [
        {
            event_id: String(jazz._id),
            status_transaction: "success",
            request: request(jazz),
            payment: { order_id: `INV-${jazz._id}-seed`, enabled_payments: ["qris"], expiry: { unit: "hours", duration: 1 } },
            settlement: {
                transaction_status: "settlement",
                payment_type: "qris",
                settlement_time: daysFromNow(-2, 10).toISOString(),
                gross_amount: String(jazz.price * 1.11),
            },
            user: tokenUser,
            others: SEED_TAG,
        },
        {
            event_id: String(past._id),
            status_transaction: "success",
            request: request(past),
            payment: { order_id: `INV-${past._id}-seed`, enabled_payments: ["gopay"], expiry: { unit: "hours", duration: 1 } },
            settlement: {
                transaction_status: "settlement",
                payment_type: "gopay",
                settlement_time: daysFromNow(-25, 10).toISOString(),
                gross_amount: String(past.price * 1.11),
            },
            user: tokenUser,
            others: SEED_TAG,
        },
        {
            event_id: String(sync._id),
            status_transaction: "pending",
            request: request(sync),
            payment: { order_id: `INV-${sync._id}-seed`, enabled_payments: ["bca_va"], expiry: { unit: "hours", duration: 1 } },
            settlement: null,
            user: tokenUser,
            others: SEED_TAG,
        },
    ];

    // Fill the "sold out" event with success transactions from synthetic buyers
    for (let i = 0; i < soldOut.max_participants; i++) {
        docs.push({
            event_id: String(soldOut._id),
            status_transaction: "success",
            request: { ...request(soldOut), firstname: `Buyer${i + 1}` },
            payment: null,
            settlement: { transaction_status: "settlement", payment_type: "qris", gross_amount: String(soldOut.price * 1.11) },
            user: { id: String(new ObjectId()), username: `buyer${i + 1}`, email: `buyer${i + 1}@mail.test`, type: "user" },
            others: SEED_TAG,
        });
    }

    const created = await TransactionsModel.insertMany(docs);
    await SavedEventsModel.insertMany([
        { user: user._id, event: sync._id, others: SEED_TAG },
        { user: user._id, event: byTitle("Bali Sunset")._id, others: SEED_TAG },
    ]);
    console.log(`  ${created.length} transactions, 2 saved events`);
}

(async () => {
    const uri = process.env.MONGO_DB_URI;
    if (!uri) throw new Error("MONGO_DB_URI is not set in .env");

    await mongoose.connect(uri);
    console.log(`Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

    if (RESET) {
        console.log("Reset: clearing events, transactions, saved events");
        await Promise.all([
            EventsModel.deleteMany({}),
            TransactionsModel.deleteMany({}),
            SavedEventsModel.deleteMany({}),
        ]);
    }

    console.log("Thumbnails:");
    const thumbnails = await uploadThumbnails();
    console.log("System params:");
    await seedParams();
    console.log("Users:");
    const users = await seedUsers();
    console.log("Events:");
    const events = await seedEvents(thumbnails, users.admin.username);
    console.log("Transactions:");
    await seedTransactions(events, users.user);

    await mongoose.disconnect();
    console.log("Done.");
})().catch(async (e) => {
    console.error("Seed failed:", e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
