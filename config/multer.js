import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadPath = 'uploads';

// cria pasta se não existir
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export default multer({ storage });