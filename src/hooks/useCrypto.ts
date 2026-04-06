"use client";

// Derives an AES-GCM key from a password string using PBKDF2
export const deriveKey = async (password: string, salt: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const useCrypto = () => {
  // Using GCM for built-in integrity check instead of manual HMAC
  const encrypt = async (key: CryptoKey, plaintext: string): Promise<string> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);
    const payload = new Uint8Array(iv.length + ciphertext.length);
    payload.set(iv, 0);
    payload.set(ciphertext, iv.length);
    
    // Convert to Base64 for Firestore storage
    const binary = Array.from(payload).map((b) => String.fromCharCode(b)).join('');
    return btoa(binary);
  };

  const decrypt = async (key: CryptoKey, packedPayloadBase64: string): Promise<string> => {
    const binary = atob(packedPayloadBase64);
    const payload = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        payload[i] = binary.charCodeAt(i);
    }

    const iv = payload.slice(0, 12);
    const ciphertext = payload.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  };

  return { encrypt, decrypt };
};
