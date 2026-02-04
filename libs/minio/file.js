const Minio = require("minio");
const crypto = require("crypto");
const readline = require("readline");

// Konfigurasi MinIO Client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true" || false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

const MinioPORT = process.env.MINIO_PORT;
const MinioEndPoint = process.env.MINIO_ENDPOINT;
const MinioDefaultBucket = process.env.MINIO_DEFAULT_BUCKET;
const MinioSSL = process.env.MINIO_USE_SSL === "true" ? true : false;

/**
 * List objects dengan pagination dan filter file nama panjang
 * @param {string} bucketName - Nama bucket
 * @param {number} limit - Jumlah objects per page
 * @param {number} offset - Skip berapa objects
 * @param {number} maxPathLength - Maximum path length yang diizinkan
 * @returns {Promise<Object>} Result dengan objects, problematic files, dan pagination info
 */
async function listObjectsPaginated(
    bucketName,
    limit = 100,
    offset = 0,
    maxPathLength = 200
) {
    try {
        const allObjects = [];
        const problematicFiles = [];
        const stream = minioClient.listObjects(bucketName, "", true);

        return new Promise((resolve, reject) => {
            let count = 0;
            let skipped = 0;
            let totalProcessed = 0;

            stream.on("data", (obj) => {
                totalProcessed++;

                // Skip objects sesuai offset
                if (skipped < offset) {
                    skipped++;
                    return;
                }

                // Stop jika sudah mencapai limit
                if (count >= limit) {
                    stream.destroy();
                    return;
                }

                // Check untuk nama file yang terlalu panjang
                if (obj.name.length > maxPathLength) {
                    console.warn(
                        `⚠️  File name too long (${
                            obj.name.length
                        } chars): ${obj.name.substring(0, 50)}...`
                    );
                    problematicFiles.push({
                        name: obj.name,
                        size: obj.size,
                        length: obj.name.length,
                        lastModified: obj.lastModified,
                        issue: "name_too_long",
                    });

                    count++;
                    return;
                }

                // Check untuk karakter tidak valid
                const invalidChars = /[<>:"|?*]/;
                if (invalidChars.test(obj.name)) {
                    console.warn(
                        `⚠️  File has invalid characters: ${obj.name.substring(
                            0,
                            50
                        )}...`
                    );
                    problematicFiles.push({
                        name: obj.name,
                        size: obj.size,
                        length: obj.name.length,
                        lastModified: obj.lastModified,
                        issue: "invalid_characters",
                    });

                    count++;
                    return;
                }

                allObjects.push(obj);
                count++;
            });

            stream.on("end", () => {
                resolve({
                    objects: allObjects,
                    problematicFiles: problematicFiles,
                    hasMore: count === limit,
                    nextOffset: offset + count,
                    totalProcessed: totalProcessed,
                    currentPage: Math.floor(offset / limit) + 1,
                });
            });

            stream.on("error", (err) => {
                console.warn("⚠️  Stream error:", err.message);
                resolve({
                    objects: allObjects,
                    problematicFiles: problematicFiles,
                    hasMore: false,
                    nextOffset: offset + count,
                    totalProcessed: totalProcessed,
                    currentPage: Math.floor(offset / limit) + 1,
                    streamError: err.message,
                });
            });
        });
    } catch (error) {
        console.error("❌ Error in listObjectsPaginated:", error);
        throw error;
    }
}

/**
 * Generate nama file baru yang lebih pendek dan aman
 * @param {string} originalName - Nama file original
 * @param {number} maxLength - Maximum length untuk nama file baru
 * @returns {string} Nama file baru
 */
function generateSafeFilename(originalName, maxLength = 150) {
    // Split path dan filename
    const pathParts = originalName.split("/");
    const filename = pathParts.pop();
    const directory = pathParts.join("/");

    // Get file extension
    const lastDotIndex = filename.lastIndexOf(".");
    const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";
    const baseFilename = ext ? filename.replace(ext, "") : filename;

    // Clean invalid characters
    const cleanBase = baseFilename
        .replace(/[<>:"|?*]/g, "_")
        .replace(/[,&]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

    // Calculate available length for filename
    const dirLength = directory ? directory.length + 1 : 0; // +1 untuk '/'
    const extLength = ext.length;
    const hashLength = 9; // 8 chars hash + 1 underscore
    const availableLength = maxLength - dirLength - extLength - hashLength;

    if (availableLength <= 0) {
        throw new Error(`Directory path too long: ${directory}`);
    }

    // Truncate base filename
    const truncatedBase = cleanBase.substring(0, Math.max(10, availableLength));

    // Generate unique hash
    const hash = crypto
        .createHash("md5")
        .update(originalName)
        .digest("hex")
        .substring(0, 8);

    // Construct new filename
    const newFilename = `${truncatedBase}_${hash}${ext}`;
    const newPath = directory ? `${directory}/${newFilename}` : newFilename;

    return newPath;
}

/**
 * Rename file-file bermasalah
 * @param {string} bucketName - Nama bucket
 * @param {Array} problematicFiles - Array file bermasalah
 * @param {boolean} deleteOriginal - Hapus file original setelah copy
 * @returns {Promise<Object>} Summary hasil rename
 */
async function renameProblematicFiles(
    bucketName,
    problematicFiles,
    deleteOriginal = false
) {
    console.log(
        `\n🔧 Starting to rename ${problematicFiles.length} problematic files...`
    );

    const results = {
        success: [],
        failed: [],
        skipped: [],
    };

    for (let i = 0; i < problematicFiles.length; i++) {
        const file = problematicFiles[i];
        const oldName = file.name;

        try {
            const newName = generateSafeFilename(oldName);

            console.log(
                `📝 ${i + 1}/${
                    problematicFiles.length
                } - Processing: ${oldName.substring(0, 50)}...`
            );

            // Check if new name already exists
            try {
                await minioClient.statObject(bucketName, newName);
                console.log(`⏭️  Skipping - target already exists: ${newName}`);
                results.skipped.push({
                    oldName,
                    newName,
                    reason: "target_exists",
                });
                continue;
            } catch (err) {
                // Good, new name doesn't exist
            }

            // Copy object dengan nama baru
            await minioClient.copyObject(
                bucketName,
                newName,
                `${bucketName}/${oldName}`
            );
            console.log(`✅ Copied successfully: ${newName}`);

            // Hapus file lama jika diminta
            if (deleteOriginal) {
                await minioClient.removeObject(bucketName, oldName);
                console.log(`🗑️  Removed original file`);
            }

            results.success.push({
                oldName,
                newName,
                originalLength: oldName.length,
                newLength: newName.length,
                issue: file.issue,
            });
        } catch (error) {
            console.error(
                `❌ Failed to process ${oldName.substring(0, 50)}...: ${
                    error.message
                }`
            );
            results.failed.push({
                oldName,
                error: error.message,
                issue: file.issue,
            });
        }

        // Delay untuk menghindari overwhelming server
        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return results;
}

/**
 * Fungsi utama untuk list semua objects dengan pagination
 * @param {string} bucketName - Nama bucket
 * @param {number} pageSize - Ukuran per page
 * @param {number} maxPathLength - Maximum path length yang diizinkan
 * @returns {Promise<Object>} Result lengkap
 */
async function getAllObjectsPaginated(
    bucketName,
    pageSize = 100,
    maxPathLength = 200
) {
    let offset = 1;
    let allObjects = [];
    let allProblematicFiles = [];
    let hasMore = true;
    let pageNumber = 1;
    let totalProcessed = 0;

    console.log("🚀 Start Get Bucket List File");
    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`📄 Page Size: ${pageSize}`);
    console.log(`📏 Max Path Length: ${maxPathLength}`);
    console.log("=" + "=".repeat(50));

    const startTime = Date.now();

    while (hasMore) {
        try {
            console.log(`\n📖 Processing Page ${pageNumber}...`);
            const result = await listObjectsPaginated(
                bucketName,
                pageSize,
                offset,
                maxPathLength
            );

            allObjects = allObjects.concat(result.objects || []);
            allProblematicFiles = allProblematicFiles.concat(
                result.problematicFiles || []
            );
            totalProcessed += result.totalProcessed || 0;

            console.log(
                `✅ Page ${pageNumber}: ${
                    result.objects?.length || 0
                } valid objects, ${
                    result.problematicFiles?.length || 0
                } problematic files`
            );

            // Log beberapa sample valid objects
            if (result.objects?.length > 0) {
                const sampleSize = Math.min(3, result.objects.length);
                console.log(
                    `   📋 Sample files (showing ${sampleSize}/${result.objects.length}):`
                );
                result.objects.slice(0, sampleSize).forEach((obj, idx) => {
                    const sizeKB = (obj.size / 1024).toFixed(1);
                    console.log(`      ${idx + 1}. ${obj.name} (${sizeKB} KB)`);
                });
                if (result.objects.length > sampleSize) {
                    console.log(
                        `      ... and ${
                            result.objects.length - sampleSize
                        } more files`
                    );
                }
            }

            hasMore = result.hasMore;
            offset = result.nextOffset;
            pageNumber++;

            // Progress indicator
            if (hasMore) {
                console.log(
                    `⏳ Continuing to next page... (Total so far: ${allObjects.length} valid, ${allProblematicFiles.length} problematic)`
                );
                await new Promise((resolve) => setTimeout(resolve, 300));
            }

            // Safety limit untuk menghindari infinite loop
            if (pageNumber > 1000) {
                console.log(
                    "⚠️  Reached safety limit of 1000 pages, stopping..."
                );
                break;
            }
        } catch (error) {
            console.error(`❌ Error on page ${pageNumber}:`, error.message);

            // Try to continue dengan skip page ini
            offset += pageSize;
            pageNumber++;

            // Stop jika terlalu banyak error berturut-turut
            if (pageNumber > 100) {
                console.log("❌ Too many errors, stopping...");
                break;
            }
        }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(60));
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📄 Pages processed: ${pageNumber - 1}`);
    console.log(`📁 Total objects scanned: ${totalProcessed}`);
    console.log(`✅ Valid objects: ${allObjects.length}`);
    console.log(`⚠️  Problematic files: ${allProblematicFiles.length}`);

    if (allProblematicFiles.length > 0) {
        console.log("\n🚨 PROBLEMATIC FILES BREAKDOWN:");

        // Group by issue type
        const issueGroups = {};
        allProblematicFiles.forEach((file) => {
            const issue = file.issue || "unknown";
            if (!issueGroups[issue]) issueGroups[issue] = [];
            issueGroups[issue].push(file);
        });

        Object.entries(issueGroups).forEach(([issue, files]) => {
            console.log(`   ${issue}: ${files.length} files`);
        });

        console.log("\n📝 Sample problematic files (showing first 5):");
        allProblematicFiles.slice(0, 5).forEach((file, index) => {
            console.log(
                `   ${index + 1}. [${file.issue}] ${file.name.substring(
                    0,
                    80
                )}... (${file.length} chars)`
            );
        });

        if (allProblematicFiles.length > 5) {
            console.log(
                `   ... and ${
                    allProblematicFiles.length - 5
                } more problematic files`
            );
        }
    }

    return {
        validObjects: allObjects,
        problematicFiles: allProblematicFiles,
        stats: {
            totalScanned: totalProcessed,
            pagesProcessed: pageNumber - 1,
            duration: duration,
            validCount: allObjects.length,
            problematicCount: allProblematicFiles.length,
        },
    };
}

/**
 * Interactive prompt untuk user decision
 * @param {string} question - Pertanyaan untuk user
 * @returns {Promise<boolean>} true jika user jawab yes
 */
function askUserConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${question} (y/n): `, (answer) => {
            rl.close();
            resolve(
                answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
            );
        });
    });
}

/**
 * Main function
 */
async function main() {
    const bucketName = process.env.MINIO_DEFAULT_BUCKET;

    if (!bucketName) {
        console.error(
            "❌ MINIO_DEFAULT_BUCKET environment variable is required!"
        );
        process.exit(1);
    }

    if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
        console.error(
            "❌ MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables are required!"
        );
        process.exit(1);
    }

    try {
        // Test connection
        console.log("🔍 Testing MinIO connection...");
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            console.error(`❌ Bucket '${bucketName}' does not exist!`);
            process.exit(1);
        }
        console.log("✅ Connection successful!\n");

        // Get all objects with pagination
        const result = await getAllObjectsPaginated(bucketName, 50, 200);

        // Handle problematic files
        if (result.problematicFiles.length > 0) {
            console.log("\n" + "=".repeat(60));
            const shouldRename = await askUserConfirmation(
                `🔧 Found ${result.problematicFiles.length} problematic files. Do you want to rename them?`
            );

            if (shouldRename) {
                const shouldDelete = await askUserConfirmation(
                    "🗑️  Do you want to delete the original files after renaming? (CAREFUL!)"
                );

                console.log("\n🔄 Starting rename process...");
                const renameResults = await renameProblematicFiles(
                    bucketName,
                    result.problematicFiles,
                    shouldDelete
                );

                console.log("\n📋 RENAME SUMMARY:");
                console.log(
                    `✅ Successfully renamed: ${renameResults.success.length}`
                );
                console.log(
                    `❌ Failed to rename: ${renameResults.failed.length}`
                );
                console.log(`⏭️  Skipped: ${renameResults.skipped.length}`);

                if (renameResults.failed.length > 0) {
                    console.log("\n❌ Failed files:");
                    renameResults.failed.forEach((item, idx) => {
                        console.log(
                            `   ${idx + 1}. ${item.oldName.substring(
                                0,
                                50
                            )}... - ${item.error}`
                        );
                    });
                }
            }
        }

        console.log("\n🎉 Process completed successfully!");
    } catch (error) {
        console.error("❌ Main process error:", error);
        process.exit(1);
    }
}

// Export functions untuk digunakan di module lain
module.exports = {
    listObjectsPaginated,
    getAllObjectsPaginated,
    renameProblematicFiles,
    generateSafeFilename,
    minioClient,
};

// Run main function jika file ini dijalankan langsung
if (require.main === module) {
    main().catch(console.error);
}
