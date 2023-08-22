import { scrypt, randomBytes, timingSafeEqual } from 'crypto';

const keyLength = 32;

export const hashPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, keyLength, (err, key) => {
      if (err) reject(err);
      resolve(`${salt}.${key.toString('hex')}`);
    });
  });
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, hashKey] = hash.split('.');
    const hashKeyBuffer = Buffer.from(hashKey, 'hex');
    scrypt(password, salt, keyLength, (err, key) => {
      if (err) reject(err);
      resolve(timingSafeEqual(hashKeyBuffer, key));
    });
  });
};
