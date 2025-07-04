/**
 * Input sanitization utilities to prevent XSS and other injection attacks
 */

/**
 * Sanitize HTML content by removing potentially dangerous elements and attributes
 */
export const sanitizeHtml = (input: string): string => {
  // Basic HTML escaping for React text content
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize user input for safe storage and display
 */
export const sanitizeUserInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit length to prevent abuse
    .slice(0, 1000);
};

/**
 * Validate and sanitize name inputs
 */
export const sanitizeName = (name: string): string => {
  if (typeof name !== 'string') {
    return '';
  }
  
  return name
    .trim()
    // Remove dangerous characters but keep basic punctuation
    .replace(/[<>\"'&\x00-\x1F\x7F]/g, '')
    // Limit length
    .slice(0, 100);
};

/**
 * Validate and sanitize meal descriptions
 */
export const sanitizeMealDescription = (description: string): string => {
  if (typeof description !== 'string') {
    return '';
  }
  
  return description
    .trim()
    // Remove script-related content
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous characters
    .replace(/[<>\"'&\x00-\x1F\x7F]/g, '')
    // Limit length
    .slice(0, 500);
};

/**
 * Validate numeric inputs
 */
export const sanitizeNumber = (value: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
  const num = parseFloat(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return min;
  }
  
  return Math.max(min, Math.min(max, num));
};

/**
 * Validate email addresses (basic validation)
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Sanitize file names for uploads
 */
export const sanitizeFileName = (fileName: string): string => {
  if (typeof fileName !== 'string') {
    return 'file';
  }
  
  return fileName
    .trim()
    // Replace dangerous characters with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove multiple consecutive dots/underscores
    .replace(/[._-]{2,}/g, '_')
    // Limit length
    .slice(0, 100);
};

/**
 * Validate URLs (basic validation for image URLs)
 */
export const isValidImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'data:'].includes(urlObj.protocol) &&
           url.length <= 2048;
  } catch {
    return false;
  }
};

/**
 * Validate image data URL format and size
 */
export const validateImageDataUrl = (dataUrl: string): { isValid: boolean; error?: string } => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { isValid: false, error: 'Invalid image data' };
  }

  // Check if it's a valid data URL
  if (!dataUrl.startsWith('data:image/')) {
    return { isValid: false, error: 'Not a valid image format' };
  }

  // Check for supported image types
  const supportedTypes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];
  const isSupported = supportedTypes.some(type => dataUrl.startsWith(type));
  
  if (!isSupported) {
    return { isValid: false, error: 'Unsupported image format. Please use JPEG, PNG, or WebP' };
  }

  // Estimate size (base64 encoded size is about 1.37x the actual size)
  const base64Data = dataUrl.split(',')[1];
  if (base64Data) {
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB limit
    
    if (sizeInBytes > maxSizeInBytes) {
      return { isValid: false, error: 'Image too large. Maximum size is 10MB' };
    }
  }

  // Basic validation for malicious content patterns
  if (dataUrl.includes('<script') || dataUrl.includes('javascript:') || dataUrl.includes('data:text/html')) {
    return { isValid: false, error: 'Invalid image content detected' };
  }

  return { isValid: true };
};

/**
 * Validate and sanitize image file input
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please use JPEG, PNG, or WebP' };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large. Maximum size is 10MB' };
  }

  // Check filename for suspicious patterns
  const sanitizedName = sanitizeFileName(file.name);
  if (sanitizedName !== file.name) {
    return { isValid: false, error: 'Invalid filename characters detected' };
  }

  return { isValid: true };
};