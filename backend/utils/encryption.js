const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

// Algorithms
// - AES-256-GCM is the ACTIVE algorithm for all new uploads. It is an AEAD
//   cipher: decryption fails loudly if the ciphertext was tampered with.
// - AES-256-CBC is kept for DECRYPTION ONLY, so files uploaded before the
//   GCM migration remain readable. CBC is never used for new encryption.
const GCM_ALGORITHM = "aes-256-gcm"
const CBC_ALGORITHM = "aes-256-cbc"
const GCM_IV_LENGTH = 12 // NIST-recommended 96-bit IV for GCM
const CBC_IV_LENGTH = 16 // AES block size

/**
 * Resolves the 32-byte AES-256 key from the ENCRYPTION_KEY env var.
 * There is intentionally NO fallback key: encrypting with a hardcoded,
 * publicly known constant is equivalent to not encrypting at all, so a
 * missing key must fail loudly instead of silently degrading.
 * @returns {Buffer} 32-byte key
 */
const getEncryptionKey = () => {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Refusing to start file encryption with no key — set a 64-char hex key in the environment.",
    )
  }

  // 64-character hex string → use the raw 32 bytes
  if (raw.length === 64 && /^[0-9a-f]+$/i.test(raw)) {
    return Buffer.from(raw, "hex")
  }

  // Any other string → derive a consistent 32-byte key
  return crypto.createHash("sha256").update(raw).digest()
}

// Fail fast at startup (module load) rather than on the first upload.
getEncryptionKey()

/**
 * Encrypts a file using AES-256-GCM (authenticated encryption).
 * Output layout on disk: [12-byte IV][ciphertext]. The GCM auth tag is
 * returned (hex) for storage in the File document (`encryptionAuthTag`).
 * @param {string} filePath - Path to the plaintext file
 * @param {string} destinationPath - Path for the encrypted output
 * @returns {Promise<{encryptedPath: string, iv: string, authTag: string, algorithm: string}>}
 */
const encryptFile = (filePath, destinationPath, key) => {
  return new Promise((resolve, reject) => {
    try {
      const iv = crypto.randomBytes(GCM_IV_LENGTH)
      // `key` is the per-file DEK (envelope encryption). Falls back to the
      // master key only for callers that don't supply one.
      const cipher = crypto.createCipheriv(GCM_ALGORITHM, key || getEncryptionKey(), iv)

      const readStream = fs.createReadStream(filePath)
      const writeStream = fs.createWriteStream(destinationPath)

      // IV is not secret — store it at the start of the encrypted file
      writeStream.write(iv)

      readStream.pipe(cipher).pipe(writeStream)

      writeStream.on("finish", () => {
        // The auth tag is only available after the cipher has been finalized,
        // which has happened by the time the write stream finishes.
        const authTag = cipher.getAuthTag()

        // Delete the original plaintext file after encryption
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting original file:", err)

          resolve({
            encryptedPath: destinationPath,
            iv: iv.toString("hex"),
            authTag: authTag.toString("hex"),
            algorithm: GCM_ALGORITHM,
          })
        })
      })

      readStream.on("error", reject)
      cipher.on("error", reject)
      writeStream.on("error", reject)
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Reads the IV header (first `ivLength` bytes) of an encrypted file.
 * @returns {Promise<Buffer>}
 */
const readIvHeader = (encryptedFilePath, ivLength) => {
  return new Promise((resolve, reject) => {
    fs.open(encryptedFilePath, "r", (openErr, fd) => {
      if (openErr) return reject(openErr)
      const buffer = Buffer.alloc(ivLength)
      fs.read(fd, buffer, 0, ivLength, 0, (readErr, bytesRead) => {
        fs.close(fd, () => {})
        if (readErr) return reject(readErr)
        if (bytesRead < ivLength) return reject(new Error("Encrypted file is truncated (missing IV header)"))
        resolve(buffer)
      })
    })
  })
}

/**
 * Decrypts a file. Defaults to legacy AES-256-CBC for files uploaded before
 * the GCM migration; pass the file's stored algorithm/authTag for GCM files.
 *
 * NOTE: this replaces the previous implementation, which fed the first read
 * chunk through the decipher TWICE (once via decipher.update and again via a
 * second read stream), corrupting every decrypted download. Decryption now
 * streams the file exactly once, starting after the IV header.
 *
 * @param {string} encryptedFilePath - Path to the encrypted file
 * @param {string} outputPath - Path for the decrypted output
 * @param {{algorithm?: string, authTag?: string|null}} [options]
 * @returns {Promise<string>} - Path to decrypted file
 */
const decryptFile = (encryptedFilePath, outputPath, options = {}) => {
  const algorithm = options.algorithm === GCM_ALGORITHM ? GCM_ALGORITHM : CBC_ALGORITHM
  const ivLength = algorithm === GCM_ALGORITHM ? GCM_IV_LENGTH : CBC_IV_LENGTH

  return new Promise((resolve, reject) => {
    readIvHeader(encryptedFilePath, ivLength)
      .then((iv) => {
        // `options.key` is the per-file DEK; legacy files omit it and fall back
        // to the master key.
        const decipher = crypto.createDecipheriv(algorithm, options.key || getEncryptionKey(), iv)

        if (algorithm === GCM_ALGORITHM) {
          if (!options.authTag) {
            return reject(new Error("Missing GCM auth tag — cannot verify and decrypt this file"))
          }
          decipher.setAuthTag(Buffer.from(options.authTag, "hex"))
        }

        // Stream the ciphertext exactly once, starting after the IV header
        const readStream = fs.createReadStream(encryptedFilePath, { start: ivLength })
        const writeStream = fs.createWriteStream(outputPath)

        readStream.pipe(decipher).pipe(writeStream)

        writeStream.on("finish", () => resolve(outputPath))

        readStream.on("error", reject)
        // For GCM, tampering is detected here: decipher.final() throws
        // "Unsupported state or unable to authenticate data".
        decipher.on("error", reject)
        writeStream.on("error", reject)
      })
      .catch(reject)
  })
}

/**
 * Decrypts a file to a temporary location and returns a read stream.
 * @param {string} encryptedFilePath - Path to the encrypted file
 * @param {{algorithm?: string, authTag?: string|null}} [options]
 * @returns {Promise<{stream: fs.ReadStream, cleanup: Function}>}
 */
const decryptFileToStream = (encryptedFilePath, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary file for the decrypted content
      const tempFilePath = path.join(
        path.dirname(encryptedFilePath),
        `temp_${Date.now()}_${path.basename(encryptedFilePath)}`,
      )

      decryptFile(encryptedFilePath, tempFilePath, options)
        .then((decryptedPath) => {
          const stream = fs.createReadStream(decryptedPath)

          const cleanup = () => {
            fs.unlink(decryptedPath, (err) => {
              if (err) console.error("Error deleting temporary file:", err)
            })
          }

          resolve({ stream, cleanup })
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  encryptFile,
  decryptFile,
  decryptFileToStream,
}
