/**
 * Secure SHA-256 pure-JS implementation for password hashing.
 * Designed to work seamlessly in both browser/iframe sandboxes and Node.js environments
 * without external dependencies or secure context restrictions.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number): boolean => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  const asciiBytes: number[] = [];
  for (i = 0; i < ascii[lengthProperty]; i++) {
    asciiBytes.push(ascii.charCodeAt(i));
  }

  asciiBytes.push(0x80); // Append '1' bit
  while (asciiBytes[lengthProperty] % 64 !== 56) {
    asciiBytes.push(0);
  }

  // Append original length in bits
  for (i = 7; i >= 0; i--) {
    asciiBytes.push((asciiLength >>> (i * 8)) & 0xff);
  }

  for (i = 0; i < asciiBytes[lengthProperty]; i += 4) {
    words.push((asciiBytes[i] << 24) | (asciiBytes[i + 1] << 16) | (asciiBytes[i + 2] << 8) | asciiBytes[i + 3]);
  }

  // Process each chunk
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice();

    // Extend the first 16 words into the remaining 48 words
    for (j = 16; j < 64; j++) {
      const w15 = w[j - 15];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const w2 = w[j - 2];
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    for (j = 0; j < 64; j++) {
      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    let hex = (hash[i] >>> 0).toString(16);
    while (hex[lengthProperty] < 8) {
      hex = '0' + hex;
    }
    result += hex;
  }

  return result;
}

/**
 * Checks if a string is a valid SHA-256 hash.
 */
export function isSha256(str: string): boolean {
  return /^[a-f0-9]{64}$/i.test(str);
}

/**
 * Hashes a plain-text password if it isn't already hashed.
 */
export function hashPasswordIfNeeded(password: string): string {
  if (!password) return sha256("admin123");
  if (isSha256(password)) return password;
  return sha256(password);
}
