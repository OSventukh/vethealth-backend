import { registerAs } from '@nestjs/config';
import { FileConfig } from './config.type';

export default registerAs<FileConfig>('file', () => {
  return {
    maxFileSize: 5242880, // 5mb
  };
});
