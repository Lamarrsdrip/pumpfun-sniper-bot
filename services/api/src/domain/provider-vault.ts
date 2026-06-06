import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type ProviderCredentials = Record<string, string>;

export interface ProviderVault {
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  set(key: string, credentials: ProviderCredentials): Promise<void>;
  get(key: string): Promise<ProviderCredentials | undefined>;
}

type VaultPayload = Record<string, ProviderCredentials>;
type EncryptedPayload = { version: 1; iv: string; tag: string; ciphertext: string };

export function createEncryptedProviderVault(filePath: string, encryptionSecret: string): ProviderVault {
  const key = createHash('sha256').update(encryptionSecret).digest();

  async function readPayload(): Promise<VaultPayload> {
    try {
      const encoded = JSON.parse(await readFile(filePath, 'utf8')) as EncryptedPayload;
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encoded.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(encoded.tag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encoded.ciphertext, 'base64')),
        decipher.final()
      ]);
      return JSON.parse(plaintext.toString('utf8')) as VaultPayload;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw new Error('Provider credential vault could not be decrypted.');
    }
  }

  async function writePayload(payload: VaultPayload) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final()
    ]);
    const encoded: EncryptedPayload = {
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64')
    };
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(encoded), { mode: 0o600 });
  }

  return {
    async has(providerKey) {
      return Boolean((await readPayload())[providerKey]);
    },
    async keys() {
      return Object.keys(await readPayload());
    },
    async set(providerKey, credentials) {
      const payload = await readPayload();
      payload[providerKey] = credentials;
      await writePayload(payload);
    },
    async get(providerKey) {
      return (await readPayload())[providerKey];
    }
  };
}

export function createMemoryProviderVault(initial: VaultPayload = {}): ProviderVault {
  const state = structuredClone(initial);
  return {
    async has(key) { return Boolean(state[key]); },
    async keys() { return Object.keys(state); },
    async set(key, credentials) { state[key] = structuredClone(credentials); },
    async get(key) { return state[key] ? structuredClone(state[key]) : undefined; }
  };
}
