import * as bls from '@noble/bls12-381';

/**
 * Convert secret key to public key
 */
export function skToPk(secretKey: bigint): Uint8Array {
  const skBytes = secretKeyToBytes(secretKey);
  const publicKey = bls.PointG1.fromPrivateKey(skBytes);
  return publicKey.toRawBytes(true); // compressed format
}

/**
 * Sign a message with a secret key
 */
export async function sign(secretKey: bigint, message: Uint8Array): Promise<Uint8Array> {
  const skBytes = secretKeyToBytes(secretKey);
  const signature = await bls.sign(message, skBytes);
  return new Uint8Array(signature);
}

/**
 * Verify a signature
 */
export async function verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
  try {
    return await bls.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

/**
 * Convert bigint secret key to 32-byte array
 */
function secretKeyToBytes(secretKey: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let sk = secretKey;
  
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(sk & BigInt(0xff));
    sk = sk >> BigInt(8);
  }
  
  return bytes;
}

/**
 * Convert bytes to bigint
 */
export function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}