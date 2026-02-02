const Multer = require("multer");
const Path = require("path");
const Sharp = require("sharp");
const Fs = require("fs");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
// const GoogleStorage = new Storage({
//     keyFilename: Path.join(__dirname + "/../../config/ServiceKeyCredentialsEndless.json"),
//     projectId: 'endless-creative-corp-apps',
// })

// Variable Config
const bucketName = "endless-experimental";
const destinationFile = "endless-crative-corps/";

// Middleware Storage Direction From Uploaded Req Body
const storageMulter = Multer.diskStorage({
    destination: function (req, file, cb) {
        // Buat folder berdasarkan jenis file
        let folder = "public/files"; // default folder

        if (file.mimetype.startsWith("image/")) {
            // folder = 'public/images'
            folder = "public/files";
        } else if (file.mimetype.startsWith("video/")) {
            // folder = 'public/videos'
            folder = "public/files";
        } else if (file.mimetype.includes("pdf")) {
            // folder = 'public/documents'
            folder = "public/files";
        } else if (
            file.mimetype.includes("word") ||
            file.mimetype.includes("document")
        ) {
            // folder = 'public/documents'
            folder = "public/files";
        } else if (
            file.mimetype.includes("excel") ||
            file.mimetype.includes("spreadsheet")
        ) {
            // folder = 'public/documents'
            folder = "public/files";
        }

        cb(null, Path.join(__dirname, "../..", folder));
    },

    filename: function (req, file, cb) {
        // Dapatkan ekstensi file dari originalname
        let extFile = Path.extname(file.originalname);

        if (!extFile) {
            const mimeExtensions = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp",
                "image/svg+xml": ".svg",
                "video/mp4": ".mp4",
                "video/avi": ".avi",
                "video/mov": ".mov",
                "application/pdf": ".pdf",
                "application/msword": ".doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    ".docx",
                "application/vnd.ms-excel": ".xls",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                    ".xlsx",
                "text/plain": ".txt",
                "application/zip": ".zip",
                "application/x-rar-compressed": ".rar",
            };
            extFile = mimeExtensions[file.mimetype] || "";
        }

        let prefix = file.fieldname === "thumbnail" ? "thumb" : "file";
        let title = req.body.title || "upload";

        // COMPREHENSIVE CLEANING - Langkah demi langkah
        title = title
            // 1. Hapus karakter kontrol dan invisible characters
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "")

            // 2. Hapus Unicode characters yang berbahaya
            .replace(
                /[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g,
                ""
            )

            // 3. Hapus semua symbol dan karakter khusus, HANYA sisakan: huruf, angka, spasi, underscore, dash
            .replace(/[^a-zA-Z0-9\s_-]/g, "")

            // 4. Normalisasi spasi dan karakter pemisah
            .replace(/[\s_-]+/g, "_") // Ganti spasi, underscore, dash berturut-turut dengan single underscore

            // 5. Hapus underscore di awal dan akhir
            .replace(/^_+|_+$/g, "")

            // 6. Convert ke lowercase untuk konsistensi
            .toLowerCase()

            // 7. Trim whitespace
            .trim();

        // 8. Validasi final dan fallback
        if (!title || title.length === 0 || /^[_\s]*$/.test(title)) {
            title = "upload";
        }

        // 9. Batasi panjang untuk menghindari path terlalu panjang
        if (title.length > 100) {
            title = title.substring(0, 100).replace(/_+$/, ""); // Hapus trailing underscore
        }

        // 10. Pastikan tidak ada reserved filename (Windows)
        const reservedNames = [
            "CON",
            "PRN",
            "AUX",
            "NUL",
            "COM1",
            "COM2",
            "COM3",
            "COM4",
            "COM5",
            "COM6",
            "COM7",
            "COM8",
            "COM9",
            "LPT1",
            "LPT2",
            "LPT3",
            "LPT4",
            "LPT5",
            "LPT6",
            "LPT7",
            "LPT8",
            "LPT9",
        ];
        if (reservedNames.includes(title.toUpperCase())) {
            title = "file_" + title;
        }

        console.log("Original title:", req.body.title);
        console.log("Cleaned title:", title);

        cb(null, `${title}--${prefix}--${Date.now()}${extFile}`);
    },
});

// Daftar MIME types yang diizinkan
const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",

    // Videos
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/webm",

    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",

    // Archives
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",

    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp3",
];

// Middleware Upload Files
const upload = Multer({
    storage: storageMulter,
    fileFilter: function (req, file, cb) {
        console.log("File mimetype:", file.mimetype);
        console.log(file);

        // Cek apakah file type diizinkan
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed!`), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

// // Upload Files Into Google Cloud Storage With Signed URL
// const uploadToGoogleClousStorage = async ({
//     typeFileUpload = "multiple", // multiple / single
//     filesMetadata = [], // Value Must Be : [] / {}
// }) => {
//     try {
//         let successFiles = []

//         // For Multiple Upload
//         if ( typeFileUpload === "multiple" ) {
//             for ( let i in filesMetadata ) {

//                 let filename = filesMetadata[i]?.filename
//                 let [createFileUpload] = await GoogleStorage.bucket(bucketName).upload(filesMetadata[i]?.path, {
//                     destination: destinationFile + filename,
//                 })

//                 let now = Date.now()
//                 let expiredTime = now + 1000 * 60 * 60 * 24 * 365 * 25

//                 const metadata = await createFileUpload.getMetadata()
//                 const [signedURL] = await createFileUpload.getSignedUrl({
//                     action: "read",
//                     expires: expiredTime,
//                 })

//                 successFiles.push({ metadata: metadata[0], urlImages: signedURL }) // Metdata + Signed URL For Public Access
//             }
//         }

//         // For Single Upload
//         if ( typeFileUpload === "single" ) {
//             let filename = filesMetadata?.filename
//             let [createFileUpload] = await GoogleStorage.bucket(bucketName).upload(filesMetadata?.path, {
//                 destination: destinationFile + filename,
//             })

//             let now = Date.now()
//             let expiredTime = now + 1000 * 60 * 60 * 24 * 365 * 25

//             const metadata = await createFileUpload.getMetadata()
//             const [signedURL] = await createFileUpload.getSignedUrl({
//                 action: "read",
//                 expires: expiredTime,
//             })

//             successFiles.push({ metadata: metadata[0], urlImages: signedURL }) // Metdata + Signed URL For Public Access
//         }

//         return { status: true, data: successFiles }
//     } catch (error) {
//         console.log(error)
//         return false
//     }
// }

// // Delet Files Local
// const deleteFiles = async ({
//     typeFileUpload = "multiple", // multiple / single
//     filesMetadata = [], // Value Must Be : [] / {}
// }) => {
//     try {
//         if ( typeFileUpload === "multiple" ) {
//             for ( let i in filesMetadata ) {
//                 await Fs.unlinkSync(filesMetadata[i]?.path)
//             }
//         }

//         if ( typeFileUpload === "single" ) {
//             await Fs.unlinkSync(filesMetadata?.path)
//         }

//         return true
//     } catch (error) {
//         console.log(error)
//         return false
//     }
// }

// // Delete Files In Google Cloud Storage
// const deleteFileGoogleCloudStorage = async ({
//     filename = null,
// }) => {
//     try {
//         if ( filename ) {
//             let deleteData = await GoogleStorage.bucket(bucketName).file(filename).delete()
//             return true
//         }
//     } catch (error) {
//         console.log(error)
//         return false
//     }
// }

module.exports = {
    storageMulter,
    upload,
    // uploadToGoogleClousStorage,
    // deleteFiles,
    // deleteFileGoogleCloudStorage,
};
