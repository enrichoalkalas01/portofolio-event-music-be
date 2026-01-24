const multer = require('multer');
const path = require('path');

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filter file
const fileFilter = (req, file, cb) => {
    // Ekstensi yang diizinkan
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|json|csv/;
    
    // MIME types yang diizinkan
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/pdf',
        'application/json',
        'text/json',
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel' // CSV kadang dideteksi sebagai ini
    ];

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error(`File tidak diizinkan! Tipe yang diterima: jpeg, jpg, png, gif, pdf, json, csv`), false);
    }
};

// Inisialisasi multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 125 * 1024 * 1024 // Maksimal 125MB
    },
    fileFilter: fileFilter
});

module.exports = upload;