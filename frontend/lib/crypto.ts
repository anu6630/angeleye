/**
 * Cryptography helper service for End-to-End Encryption (E2EE)
 * Using native browser Web Cryptography API (Curve P-256 ECDH & AES-GCM 256)
 */

export interface E2EEKeyPairJwk {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

// Convert ArrayBuffer to Base64 String
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

// Convert Base64 String to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates an ECDH P-256 key pair
 */
export async function generateE2EEKeyPair(): Promise<E2EEKeyPairJwk> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Cryptography API is not available');
  }

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { publicKey, privateKey };
}

/**
 * Gets the current user's E2EE key pair from localStorage, or generates it if missing
 */
export async function getOrGenerateMyKeys(userId: number): Promise<E2EEKeyPairJwk> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access localStorage in non-browser context');
  }

  const key = `e2ee_keys_user_${userId}`;
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      return JSON.parse(stored) as E2EEKeyPairJwk;
    } catch {
      /* Fall through to generate new keys */
    }
  }

  const newPair = await generateE2EEKeyPair();
  localStorage.setItem(key, JSON.stringify(newPair));
  return newPair;
}

/**
 * Imports a private key from JWK format
 */
async function importPrivateKey(privateKeyJwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey']
  );
}

/**
 * Imports a peer public key from JWK format
 */
async function importPublicKey(publicKeyJwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Derives a shared AES-GCM 256-bit key from own private key and peer public key
 */
export async function deriveSharedKey(
  myPrivateKeyJwk: JsonWebKey,
  peerPublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Cryptography API is not available');
  }

  const myPrivateKey = await importPrivateKey(myPrivateKeyJwk);
  const peerPublicKey = await importPublicKey(peerPublicKeyJwk);

  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    myPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plain text using the derived shared AES-GCM key
 * Output format: e2ee:v1:<IV_base64>:<Ciphertext_base64>
 */
export async function encryptMessage(
  plainText: string,
  sharedKey: CryptoKey
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Cryptography API is not available');
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedKey,
    data
  );

  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const ciphertextBase64 = arrayBufferToBase64(encryptedContent);

  // Extensible and versioned envelope format: e2ee:v1:iv:ciphertext
  return `e2ee:v1:${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypts a message using the derived shared AES-GCM key
 */
export async function decryptMessage(
  encryptedPayload: string,
  sharedKey: CryptoKey
): Promise<string> {
  if (!encryptedPayload || typeof window === 'undefined' || !window.crypto?.subtle) {
    return encryptedPayload;
  }

  // Check if the message is encrypted using our protocol version
  if (!encryptedPayload.startsWith('e2ee:v1:')) {
    return encryptedPayload;
  }

  const parts = encryptedPayload.split(':');
  if (parts.length < 4) {
    return encryptedPayload; // Mismatched format safety fallback
  }

  const ivBase64 = parts[2];
  const ciphertextBase64 = parts[3];

  try {
    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      sharedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (err) {
    console.error('E2EE Decryption failed:', err);
    return '🔒 [Decryption failed - keys may have reset or been altered]';
  }
}
