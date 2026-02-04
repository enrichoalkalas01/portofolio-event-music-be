const Minio = require("minio");
const Moment = require("moment");
const crypto = require("crypto");
const path = require("path");
const FS = require("fs");

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL === "true" ? true : false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

const MinioPORT = process.env.MINIO_PORT;
const MinioEndPoint = process.env.MINIO_ENDPOINT;
const MinioDefaultBucket = process.env.MINIO_DEFAULT_BUCKET;
const MinioSSL = process.env.MINIO_USE_SSL === "true" ? true : false;

// ===== Setup Tools =====
function GenerateFileName(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString("hex");
    const extension = path.extname(originalName);
    return `${timestamp}-${randomString}${extension}`;
}

function GetContentType(extension) {
    const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
        ".zip": "application/zip",
    };

    return mimeTypes[extension] || "application/octet-stream";
}

function MakePublicURL(objectName) {
    const protocol = MinioSSL ? "https" : "http";
    const port =
        MinioPORT && MinioPORT !== "80" && MinioPORT !== "443"
            ? `:${MinioPORT}`
            : "";

    // URL bersih tanpa signature
    return `${protocol}://${MinioEndPoint}${port}/${MinioDefaultBucket}/${objectName}`;
}

async function SetBucketPublic() {
    const policy = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { AWS: ["*"] },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${MinioDefaultBucket}/*`],
            },
        ],
    };

    try {
        await minioClient.setBucketPolicy(
            MinioDefaultBucket,
            JSON.stringify(policy)
        );
        console.log("Bucket set to public successfully");
        return true;
    } catch (error) {
        console.error("Error setting bucket policy:", error);
        return false;
    }
}

async function GetFileUrl({ objectName, expiry = 24 * 60 * 60 }) {
    try {
        return await minioClient.presignedGetObject(
            process.env.MINIO_DEFAULT_BUCKET,
            objectName,
            expiry
        );
    } catch (error) {
        throw new Error(`Gagal mendapatkan URL: ${error.message}`);
    }
}

// Presigned URL dengan custom expiry (jika tetap butuh private)
async function GetSignedUrl(objectName, expiry = 24 * 60 * 60) {
    try {
        return await minioClient.presignedGetObject(
            MinioDefaultBucket,
            objectName,
            expiry
        );
    } catch (error) {
        throw new Error(`Gagal mendapatkan signed URL: ${error.message}`);
    }
}

// Custom proxy URL melalui Express (RECOMMENDED)
function MakeProxyURL(objectName) {
    // URL melalui aplikasi Express Anda sebagai proxy
    const baseURL =
        process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT}`;
    return `${baseURL}/api/v1/files/view/${encodeURIComponent(objectName)}`;
}

// ===== End Of Setup Tools =====

// Initialize Bucket
// ===== Initialize Bucket (Jalankan sekali) =====
async function InitializeBucket() {
    try {
        // Check bucket exists
        const bucketExists = await minioClient.bucketExists(MinioDefaultBucket);

        if (!bucketExists) {
            // Create bucket
            await minioClient.makeBucket(MinioDefaultBucket, "us-east-1");
            console.log(`✅ Bucket ${MinioDefaultBucket} berhasil dibuat`);
        }

        // Set bucket public untuk URL bersih
        await SetBucketPublic();
    } catch (error) {
        console.error("❌ Error initializing bucket:", error.message);
    }
}

// Jalankan inisialisasi
InitializeBucket();

// ===== Used By Controllers =====
const UploadFromLocalFile = async ({
    LocalFilePath,
    ObjectName,
    Folder,
    UsePublicURL = true,
}) => {
    try {
        // Check if file exists
        if (!FS.existsSync(LocalFilePath)) {
            throw new Error(`File tidak ditemukan: ${LocalFilePath}`);
        }

        // Get file info
        const Stats = FS.statSync(LocalFilePath);
        const FileName =
            ObjectName || GenerateFileName(path.basename(LocalFilePath));
        const FileObjectName = Folder ? `${Folder}/${FileName}` : FileName;

        // console.log("Upload details:", {
        //     FileName,
        //     FileObjectName,
        //     Folder,
        //     OriginalObjectName: ObjectName,
        // });

        // Get file extension and set content type
        const Ext = path.extname(LocalFilePath)?.toLowerCase();
        const ContentType = GetContentType(Ext);

        // Metadata
        const Metadata = {
            "Content-Type": ContentType,
            "Original-Name": path.basename(LocalFilePath),
            "Upload-Date": Moment().toISOString(),
            "File-Size": Stats.size.toString(),
        };

        // Upload file into minio
        const UploadResult = await minioClient.fPutObject(
            process.env.MINIO_DEFAULT_BUCKET,
            FileObjectName,
            LocalFilePath,
            Metadata
        );

        let fileURL;
        if (UsePublicURL) {
            fileURL = MakePublicURL(FileObjectName);
        } else {
            fileURL = await GetSignedUrl(FileObjectName);
        }

        // ✅ FIX: Use FileObjectName consistently for object_name
        const StatusResult = {
            status: true,
            file_name: FileName, // Just filename: "swarna-tactical-1-images-Welcome To Swarna Tactical"
            object_name: FileObjectName, // ✅ FIXED: Full path: "banners/swarna-tactical-1-images-Welcome To Swarna Tactical"
            etag: UploadResult.etag || null,
            size: Stats.size,
            content_type: ContentType,
            url: fileURL,
            urls: {
                public: MakePublicURL(FileObjectName), // URL bersih
                proxy: MakeProxyURL(FileObjectName), // Via Express proxy
                signed: await GetSignedUrl(FileObjectName, 3600), // 1 jam expiry
            },
            // public: MakePublicURL(FileObjectName), // URL bersih
            // proxy: MakeProxyURL(FileObjectName), // Via Express proxy
            // signed: await GetSignedUrl(FileObjectName, 3600), // 1 jam expiry
        };

        // console.log("✅ Upload result structure:", {
        //     status: StatusResult.status,
        //     object_name: StatusResult.object_name,
        //     urls_keys: Object.keys(StatusResult.urls),
        //     proxy_url: StatusResult.urls.proxy,
        // });

        return StatusResult;
    } catch (error) {
        console.error("❌ Upload error:", error);
        return {
            status: false,
            message: error?.message || "Failed to upload file into minio.",
            error: error.message,
        };
    }
};

const UploadFromBufferFile = async ({ BufferFile, ObjectName, Folder }) => {
    try {
        console.log("asd");
    } catch (error) {
        let StatusResult = {
            status: true,
            message:
                error?.message ||
                error?.response?.message ||
                "Failed to upload file into minio.",
        };

        return StatusResult;
    }
};

// const GetFileData = async ({ objectName }) => {
//     try {
//         // Stream file dari MinIO ke response
//         const stream = await minioClient.getObject(
//             process.env.MINIO_DEFAULT_BUCKET,
//             objectName
//         );

//         // Set headers
//         const fileInfo = await minioClient.statObject(
//             process.env.MINIO_DEFAULT_BUCKET,
//             objectName
//         );

//         console.log(`File found: ${objectName}, size: ${fileInfo.size}`);

//         return { status: true, fileInfo: fileInfo, stream: stream };
//     } catch (error) {
//         return { status: false, message: "failed to generate file stream." };
//     }
// };

const GetFileData = async ({ objectName }) => {
    try {
        // ✅ Hapus leading slash jika ada
        const cleanObjectName = objectName.startsWith("/")
            ? objectName.slice(1)
            : objectName;

        console.log(`Getting file: ${cleanObjectName}`);

        // Get file info dulu untuk validasi
        const fileInfo = await minioClient.statObject(
            process.env.MINIO_DEFAULT_BUCKET,
            cleanObjectName
        );

        // Stream file dari MinIO
        const stream = await minioClient.getObject(
            process.env.MINIO_DEFAULT_BUCKET,
            cleanObjectName
        );

        console.log(
            `✅ File found: ${cleanObjectName}, size: ${fileInfo.size}`
        );

        return { status: true, fileInfo, stream };
    } catch (error) {
        console.error(
            `❌ GetFileData error for "${objectName}":`,
            error.message
        );
        return {
            status: false,
            message:
                error.code === "NotFound"
                    ? "File not found"
                    : "Failed to get file stream",
            error: error.message,
        };
    }
};

const DeleteFile = async ({ objectName }) => {
    try {
        await minioClient.deletObject(
            process.env.MINIO_DEFAULT_BUCKET,
            objectName
        );

        return { status: true, message: "successfull to delete object file" };
    } catch (error) {
        return { status: false, message: "failed to delete object file" };
    }
};

// ===== End Of Used By Controllers =====

async function listObjectsPaginated(bucketName, limit = 100, offset = 0) {
    try {
        const allObjects = [];
        const stream = minioClient.listObjects(bucketName, "", true);

        return new Promise((resolve, reject) => {
            let count = 0;
            let skipped = 0;

            stream.on("data", (obj) => {
                // Skip objects sesuai offset
                if (skipped < offset) {
                    skipped++;
                    return;
                }

                // Stop jika sudah mencapai limit
                if (count >= limit) {
                    stream.destroy(); // Stop stream
                    return;
                }

                allObjects.push(obj);
                count++;
            });

            stream.on("end", () => {
                resolve({
                    objects: allObjects,
                    hasMore: count === limit, // Indicates ada data lagi
                    nextOffset: offset + count,
                });
            });

            stream.on("error", (err) => {
                reject(err);
            });
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

// Penggunaan
async function getAllObjectsPaginated(bucketName, pageSize = 100) {
    let offset = 10;
    let allObjects = [];
    let hasMore = true;

    console.log("Start Get Bucket List File");

    while (hasMore) {
        const result = await listObjectsPaginated(bucketName, pageSize, offset);
        allObjects = allObjects.concat(result.objects);

        console.log(
            `Page ${Math.floor(offset / pageSize) + 1}: ${
                result.objects.length
            } objects`
        );

        result.objects.forEach((obj) => {
            console.log(`- ${obj.name} (${obj.size} bytes)`);
        });

        hasMore = result.hasMore;
        offset = result.nextOffset;

        // Optional: Add delay between requests
        if (hasMore) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    // console.log(allObjects);

    return allObjects;
}

// Call function
getAllObjectsPaginated(process.env.MINIO_DEFAULT_BUCKET, 50)
    .then((objects) => {
        console.log(`Total objects: ${objects.length}`);
    })
    .catch((err) => console.log(err));

module.exports = {
    UploadFromLocalFile,
    UploadFromBufferFile,
    GetFileData,
    DeleteFile,
    minioClient,
};
