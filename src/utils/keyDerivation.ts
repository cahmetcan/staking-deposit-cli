import { mnemonicToSeedSync } from '@scure/bip39';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { PURPOSE, COIN_TYPE } from '../constants';

const BLS_CURVE_ORDER = BigInt('52435875175126190479447740508185965837690552500527637822603658699938581184513');

/**
 * Derives a master secret key from a mnemonic seed
 * Following EIP-2333: https://eips.ethereum.org/EIPS/eip-2333
 */
function deriveMasterSK(seed: Uint8Array): bigint {
  return hkdfModR(seed, new Uint8Array(0));
}

/**
 * Derives a child secret key from a parent secret key and index
 * Following EIP-2333: https://eips.ethereum.org/EIPS/eip-2333
 */
function deriveChildSK(parentSK: bigint, index: number): bigint {
  if (index < 0 || index >= 2**32) {
    throw new Error(`index should be >= 0 and < 2^32. Got index=${index}`);
  }
  
  const lamportPK = parentSKToLamportPK(parentSK, index);
  return hkdfModR(lamportPK, new Uint8Array(0));
}

/**
 * HKDF-MOD-R as defined in EIP-2333
 */
function hkdfModR(ikm: Uint8Array, keyInfo: Uint8Array): bigint {
  const L = 48; // ceil((3 * ceil(log2(r))) / 16)
  let salt = new TextEncoder().encode('BLS-SIG-KEYGEN-SALT-');
  let SK = BigInt(0);
  
  while (SK === BigInt(0)) {
    salt = sha256(salt);
    
    // IKM + I2OSP(0, 1)
    const ikmWithPostfix = new Uint8Array(ikm.length + 1);
    ikmWithPostfix.set(ikm);
    ikmWithPostfix[ikm.length] = 0x00;
    
    // info = key_info + I2OSP(L, 2)
    const info = new Uint8Array(keyInfo.length + 2);
    info.set(keyInfo);
    // L as 2-byte big-endian
    info[keyInfo.length] = (L >> 8) & 0xff;
    info[keyInfo.length + 1] = L & 0xff;
    
    const okm = hkdf(sha256, ikmWithPostfix, salt, info, L);
    
    // Convert to big integer (big-endian)
    let result = BigInt(0);
    for (let i = 0; i < okm.length; i++) {
      result = result * BigInt(256) + BigInt(okm[i]);
    }
    SK = result % BLS_CURVE_ORDER;
  }
  
  return SK;
}

/**
 * Convert parent SK to Lamport public key
 */
function parentSKToLamportPK(parentSK: bigint, index: number): Uint8Array {
  const salt = new Uint8Array(4);
  const view = new DataView(salt.buffer);
  view.setUint32(0, index, false); // big-endian
  
  const ikm = bigintToBytes32(parentSK);
  
  // Generate lamport_0
  const lamport0 = ikmToLamportSK(ikm, salt);
  
  // Generate lamport_1 with flipped bits
  const notIkm = flipBits256(parentSK);
  const notIkmBytes = bigintToBytes32(notIkm);
  const lamport1 = ikmToLamportSK(notIkmBytes, salt);
  
  // Combine lamport SKs
  const lamportSKs = [...lamport0, ...lamport1];
  
  // Generate lamport PKs by hashing each SK
  const lamportPKs: Uint8Array[] = [];
  for (const sk of lamportSKs) {
    lamportPKs.push(sha256(sk));
  }
  
  // Compress by hashing all PKs together
  const combined = new Uint8Array(lamportPKs.length * 32);
  for (let i = 0; i < lamportPKs.length; i++) {
    combined.set(lamportPKs[i], i * 32);
  }
  
  return sha256(combined);
}

/**
 * Convert IKM to Lamport secret key
 */
function ikmToLamportSK(ikm: Uint8Array, salt: Uint8Array): Uint8Array[] {
  // Generate 255 * 32 = 8160 bytes using HKDF
  const okm = hkdf(sha256, ikm, salt, new Uint8Array(0), 8160);
  
  const lamportSK: Uint8Array[] = [];
  for (let i = 0; i < 255; i++) {
    const sk = okm.slice(i * 32, (i + 1) * 32);
    lamportSK.push(sk);
  }
  
  return lamportSK;
}

/**
 * Flip all 256 bits of input
 */
function flipBits256(input: bigint): bigint {
  return input ^ (BigInt(2) ** BigInt(256) - BigInt(1));
}

/**
 * Convert bigint to 32-byte array (big-endian)
 */
function bigintToBytes32(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let v = value;
  
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(v & BigInt(0xff));
    v = v >> BigInt(8);
  }
  
  return bytes;
}

/**
 * Derives a key from mnemonic and BIP-44 path
 * Following EIP-2334: https://eips.ethereum.org/EIPS/eip-2334
 */
export function mnemonicAndPathToKey(mnemonic: string, path: string, password: string = ''): bigint {
  // Generate seed from mnemonic
  const seed = mnemonicToSeedSync(mnemonic, password);
  
  // Parse the path (e.g., "m/12381/3600/0/0")
  const pathSegments = path.split('/').slice(1); // Remove 'm'
  
  // Start with master key
  let sk = deriveMasterSK(seed);
  
  // Derive through each path segment
  for (const segment of pathSegments) {
    const index = parseInt(segment, 10);
    sk = deriveChildSK(sk, index);
  }
  
  return sk;
}

/**
 * Generate signing and withdrawal keys for a validator
 */
export function generateValidatorKeys(mnemonic: string, validatorIndex: number, password: string = '') {
  const account = validatorIndex.toString();
  const withdrawalKeyPath = `m/${PURPOSE}/${COIN_TYPE}/${account}/0`;
  const signingKeyPath = `${withdrawalKeyPath}/0`;
  
  const withdrawalSK = mnemonicAndPathToKey(mnemonic, withdrawalKeyPath, password);
  const signingSK = mnemonicAndPathToKey(mnemonic, signingKeyPath, password);
  
  return {
    withdrawalSK,
    signingSK,
    withdrawalKeyPath,
    signingKeyPath
  };
}