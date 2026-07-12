import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

export const DUMMY_PASSWORD_HASH =
  '6647e67b1fac0cc0f1d3ff5481c9e0e0.d297166ebb2070ca44ab100278a91fbba173771e90047cf49879cee178729750';

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
