import { diskStorage } from 'multer';
import path from 'path';

const tmpFolder = path.resolve(__dirname, '..', '..', 'tmp');

export default {
  directory: tmpFolder,
  storage: diskStorage({
    destination: tmpFolder,
    filename(request, file, callback) {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.originalname}`;

      callback(null, filename);
    },
  }),
};
