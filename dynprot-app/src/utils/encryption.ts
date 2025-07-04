/**
 * Secure encryption utility for localStorage data using crypto-js AES
 * Provides strong encryption with random salt and secure key derivation
 */

import CryptoJS from 'crypto-js';
import { ENCRYPTION_CONFIG } from '@/config/env';

// Application-specific encryption key derivation from environment
const APP_SECRET = ENCRYPTION_CONFIG.secret;

/**
 * Generate a secure encryption key using PBKDF2 with random salt
 */
const generateSecureKey = (salt: string): string => {
  // Use PBKDF2 with high iteration count for key derivation
  const key = CryptoJS.PBKDF2(APP_SECRET, salt, {
    keySize: 256 / 32, // 256-bit key
    iterations: ENCRYPTION_CONFIG.iterations,  // Configurable iteration count
    hasher: CryptoJS.algo.SHA256
  });
  
  return key.toString();
};

/**
 * Generate a random salt for key derivation
 */
const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(256 / 8).toString();
};

/**
 * Get or create a persistent salt for the user session
 */
const getOrCreateSalt = (): string => {
  const saltKey = `${ENCRYPTION_CONFIG.secret.includes('LocalDev') ? 'dynprot-dev' : 'dynprot'}-encryption-salt`;
  let salt = sessionStorage.getItem(saltKey);
  
  if (!salt) {
    salt = generateSalt();
    sessionStorage.setItem(saltKey, salt);
  }
  
  return salt;
};

/**
 * Encrypt data for localStorage storage using AES-256
 */
export const encryptData = (data: string): string => {
  try {
    if (!data || data.length === 0) {
      return data;
    }

    // Get or create session salt
    const salt = getOrCreateSalt();
    
    // Generate secure key
    const key = generateSecureKey(salt);
    
    // Generate random IV for this encryption
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Encrypt data using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combine IV and encrypted data
    const combined = iv.concat(encrypted.ciphertext);
    
    // Return base64 encoded result with prefix for identification
    return 'DYNPROT_ENC_' + combined.toString(CryptoJS.enc.Base64);
    
  } catch (error) {
    // Return original data if encryption fails
    return data;
  }
};

/**
 * Decrypt data from localStorage using AES-256
 */
export const decryptData = (encryptedData: string): string => {
  try {
    // Check if data is encrypted by our system
    if (!encryptedData.startsWith('DYNPROT_ENC_')) {
      // Handle legacy encrypted data or plain text
      return handleLegacyData(encryptedData);
    }
    
    // Remove prefix and decode base64
    const encodedData = encryptedData.substring('DYNPROT_ENC_'.length);
    const combined = CryptoJS.enc.Base64.parse(encodedData);
    
    // Extract IV (first 16 bytes) and encrypted data
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const encrypted = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    // Get session salt
    const salt = getOrCreateSalt();
    
    // Generate the same key used for encryption
    const key = generateSecureKey(salt);
    
    // Decrypt data
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted } as any,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    // Convert to UTF-8 string
    return decrypted.toString(CryptoJS.enc.Utf8);
    
  } catch (error) {
    // Return original data if decryption fails
    return encryptedData;
  }
};

/**
 * Handle legacy encrypted data or detect plain text
 */
const handleLegacyData = (data: string): string => {
  try {
    // Check if it's base64 encoded (legacy Web Crypto API format)
    if (/^[A-Za-z0-9+/]+=*$/.test(data) && data.length > 20) {
      // This might be legacy encrypted data - try to decrypt with old method
      // For now, return as-is to maintain compatibility
      return data;
    }
    
    // Check if it looks like JSON (unencrypted)
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      return data;
    }
    
    // Return as-is for other formats
    return data;
    
  } catch (error) {
    return data;
  }
};

/**
 * Check if encryption is supported (crypto-js is always available)
 */
export const isEncryptionSupported = (): boolean => {
  return true; // crypto-js is always available
};

/**
 * Clear session encryption salt (forces new salt generation)
 */
export const clearEncryptionSalt = (): void => {
  const saltKey = `${ENCRYPTION_CONFIG.secret.includes('LocalDev') ? 'dynprot-dev' : 'dynprot'}-encryption-salt`;
  sessionStorage.removeItem(saltKey);
};

/**
 * Test encryption/decryption functionality
 */
export const testEncryption = (): boolean => {
  try {
    const testData = 'DynProt encryption test data 🔒';
    const encrypted = encryptData(testData);
    const decrypted = decryptData(encrypted);
    
    return decrypted === testData && encrypted !== testData;
  } catch (error) {
    return false;
  }
};