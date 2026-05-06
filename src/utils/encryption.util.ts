import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!!'; // Must be 32 bytes

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY.slice(0, 32)), iv);
  
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Format: iv:tag:encrypted (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string encrypted with AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  
  try {
    const [ivHex, tagHex, encryptedHex] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY.slice(0, 32)), iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return original if decryption fails (might be unencrypted)
  }
}
