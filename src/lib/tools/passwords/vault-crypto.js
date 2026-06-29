const VAULT_CRYPTO_VERSION = 1;
const PBKDF2_ITERATIONS = 390000;
const encoder = new TextEncoder();

export function bytesToBase64(bytes) {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(bin);
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function deriveVaultKey(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return crypto.subtle.importKey(
    'raw',
    bits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function aesEncrypt(key, dataBytes) {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBytes,
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher)),
  };
}

async function aesDecrypt(key, payload) {
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new Uint8Array(plain);
}

async function wrapVaultKey(wrappingKey, vaultKeyBytes) {
  return aesEncrypt(wrappingKey, vaultKeyBytes);
}

async function unwrapVaultKey(wrappingKey, wrapped) {
  const bytes = await aesDecrypt(wrappingKey, wrapped);
  return crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function generateRecoveryKey() {
  const bytes = randomBytes(20);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const groups = hex.match(/.{1,5}/g) || [];
  return `VRDN-${groups.join('-')}`;
}

export function normalizeRecoveryKey(input) {
  return (input || '').replace(/\s+/g, '').toUpperCase();
}

export async function createVaultEnvelope(masterPassword, vaultPayload) {
  const salt = randomBytes(16);
  const recoverySalt = randomBytes(16);
  const vaultKeyBytes = randomBytes(32);
  const masterKey = await deriveVaultKey(masterPassword, salt);

  const vaultKey = await crypto.subtle.importKey(
    'raw',
    vaultKeyBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const wrappedMaster = await wrapVaultKey(masterKey, vaultKeyBytes);
  const recoveryKey = generateRecoveryKey();
  const recoveryDerived = await deriveVaultKey(normalizeRecoveryKey(recoveryKey), recoverySalt);
  const wrappedRecovery = await wrapVaultKey(recoveryDerived, vaultKeyBytes);

  const vaultCipher = await aesEncrypt(
    vaultKey,
    encoder.encode(JSON.stringify(vaultPayload)),
  );

  return {
    envelope: {
      version: VAULT_CRYPTO_VERSION,
      kdf: {
        algorithm: 'PBKDF2-SHA256',
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt),
      },
      recoveryKdf: {
        algorithm: 'PBKDF2-SHA256',
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(recoverySalt),
      },
      wrappedVaultKey: wrappedMaster,
      recoveryWrappedVaultKey: wrappedRecovery,
      vault: vaultCipher,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    recoveryKey,
    vaultKey,
  };
}

export async function unlockVaultWithMasterPassword(masterPassword, envelope) {
  const salt = base64ToBytes(envelope.kdf.salt);
  const masterKey = await deriveVaultKey(masterPassword, salt, envelope.kdf.iterations);
  try {
    const vaultKey = await unwrapVaultKey(masterKey, envelope.wrappedVaultKey);
    const plain = await aesDecrypt(vaultKey, envelope.vault);
    const payload = JSON.parse(new TextDecoder().decode(plain));
    return { vaultKey, payload };
  } catch {
    throw new Error('Incorrect master password.');
  }
}

export async function unlockVaultWithRecoveryKey(recoveryKeyInput, envelope) {
  const salt = base64ToBytes(envelope.recoveryKdf.salt);
  const recoveryDerived = await deriveVaultKey(
    normalizeRecoveryKey(recoveryKeyInput),
    salt,
    envelope.recoveryKdf.iterations,
  );
  try {
    const vaultKey = await unwrapVaultKey(recoveryDerived, envelope.recoveryWrappedVaultKey);
    const plain = await aesDecrypt(vaultKey, envelope.vault);
    const payload = JSON.parse(new TextDecoder().decode(plain));
    return { vaultKey, payload };
  } catch {
    throw new Error('Invalid recovery key.');
  }
}

export async function encryptVaultPayload(vaultKey, vaultPayload) {
  const exported = await crypto.subtle.exportKey('raw', vaultKey);
  const key = await crypto.subtle.importKey(
    'raw',
    exported,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  return aesEncrypt(key, encoder.encode(JSON.stringify(vaultPayload)));
}

export async function rewrapEnvelopeWithNewMasterPassword(
  oldVaultKey,
  newMasterPassword,
  envelope,
  vaultPayload,
) {
  const salt = randomBytes(16);
  const newMasterKey = await deriveVaultKey(newMasterPassword, salt);
  const vaultKeyBytes = await crypto.subtle.exportKey('raw', oldVaultKey);
  const wrappedMaster = await wrapVaultKey(newMasterKey, new Uint8Array(vaultKeyBytes));
  const vaultCipher = await encryptVaultPayload(oldVaultKey, vaultPayload);

  return {
    ...envelope,
    kdf: {
      algorithm: 'PBKDF2-SHA256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    wrappedVaultKey: wrappedMaster,
    vault: vaultCipher,
    updatedAt: Date.now(),
  };
}

export function estimateMasterPasswordStrength(password) {
  const p = password || '';
  if (!p.length) return { score: 0, label: 'Enter a master password', className: 'weak' };

  let score = 0;
  if (p.length >= 12) score += 1;
  if (p.length >= 16) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^a-zA-Z0-9]/.test(p)) score += 1;
  if (p.length >= 20 && /\s/.test(p)) score += 1;

  if (score <= 2) return { score, label: 'Weak — use a longer passphrase', className: 'weak' };
  if (score <= 4) return { score, label: 'Good', className: 'good' };
  return { score, label: 'Strong', className: 'strong' };
}
