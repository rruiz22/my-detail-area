/**
 * Enterprise-Grade Encryption Utilities
 *
 * Provides AES-256-GCM encryption for sensitive data storage
 * Used for encrypting OAuth tokens, API keys, and webhook secrets
 *
 * @module crypto/encryption
 */

/**
 * Generate a random encryption key (32 bytes for AES-256)
 * Should be stored securely in environment variables
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt
 * @param keyHex - 32-byte encryption key in hex format
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptAES(
  plaintext: string,
  keyHex: string
): Promise<string> {
  try {
    // Convert hex key to bytes
    const keyBytes = new Uint8Array(
      keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Import key for WebCrypto API
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt AES-256-GCM encrypted data
 *
 * @param encryptedBase64 - Base64-encoded encrypted data with IV prepended
 * @param keyHex - 32-byte encryption key in hex format
 * @returns Decrypted plaintext
 */
export async function decryptAES(
  encryptedBase64: string,
  keyHex: string
): Promise<string> {
  try {
    // Convert hex key to bytes
    const keyBytes = new Uint8Array(
      keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Import key
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decode base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a value using SHA-256 (for signatures, not passwords)
 *
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate HMAC-SHA256 signature for webhook verification
 *
 * @param payload - Webhook payload
 * @param secret - Webhook secret key
 * @returns Hex-encoded HMAC signature
 */
export async function generateWebhookSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, payloadData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify webhook signature in constant time (timing attack prevention)
 *
 * @param payload - Webhook payload
 * @param signature - Provided signature
 * @param secret - Webhook secret key
 * @returns True if signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await generateWebhookSignature(payload, secret);

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate cryptographically secure random token
 *
 * @param length - Token length in bytes (default 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate OAuth state token with embedded metadata
 *
 * @param dealerId - Dealership ID
 * @param userId - User ID
 * @returns Base64-encoded state token
 */
export function generateOAuthState(dealerId: number, userId: string): string {
  const state = {
    dealer_id: dealerId,
    user_id: userId,
    timestamp: Date.now(),
    nonce: generateSecureToken(16)
  };

  return btoa(JSON.stringify(state));
}

/**
 * Validate and decode OAuth state token
 *
 * @param stateToken - Base64-encoded state token
 * @param maxAge - Maximum age in milliseconds (default 10 minutes)
 * @returns Decoded state or null if invalid
 */
export function validateOAuthState(
  stateToken: string,
  maxAge: number = 600000
): { dealer_id: number; user_id: string; timestamp: number } | null {
  try {
    const decoded = JSON.parse(atob(stateToken));

    // Validate timestamp
    if (Date.now() - decoded.timestamp > maxAge) {
      return null;
    }

    // Validate required fields
    if (!decoded.dealer_id || !decoded.user_id || !decoded.timestamp) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Mask sensitive data for logging (show first/last 4 chars only)
 *
 * @param data - Sensitive string (token, API key, etc.)
 * @returns Masked string
 */
export function maskSensitiveData(data: string): string {
  if (data.length <= 8) {
    return '***';
  }
  return `${data.slice(0, 4)}...${data.slice(-4)}`;
}
