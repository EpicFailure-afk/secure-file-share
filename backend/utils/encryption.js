const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
// If no key is provided, generate a warning but use a fallback for development
if (!ENCRYPTION_KEY) {
  console.warn("WARNING: ENCRYPTION_KEY environment variable not set. Using fallback key for development only.")
  // This is just a fallback for development - in production, always use an environment variable
}

const IV_LENGTH = 16 // For AES, this is always 16 bytes

/**
 * Properly formats the encryption key to ensure it's a 32-byte buffer
 * @returns {Buffer} A 32-byte buffer for AES-256
 */
const getEncryptionKey = () => {
  if (ENCRYPTION_KEY) {
    // If the key is a 64-character hex string (32 bytes when converted from hex)
    if (ENCRYPTION_KEY.length === 64 && /^[0-9a-f]+$/i.test(ENCRYPTION_KEY)) {
      return Buffer.from(ENCRYPTION_KEY, "hex")
    }

    // If it's a regular string, hash it to get a consistent length key
    const hash = crypto.createHash("sha256")
    hash.update(ENCRYPTION_KEY)
    return hash.digest()
  }

  // Fallback key for development only
  return Buffer.from(generateFallbackKey(), "utf8")
}

/**
 * Encrypts a file using AES-256-CBC
 * @param {string} filePath - Path to the file to encrypt
 * @param {string} destinationPath - Path where to save the encrypted file
 * @returns {Promise<{encryptedPath: string, iv: string}>} - Path to encrypted file and the IV used
 */
const encryptFile = (filePath, destinationPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH)

      // Create cipher using AES-256-CBC with properly formatted key
      const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv)

      // Create read and write streams
      const readStream = fs.createReadStream(filePath)
      const writeStream = fs.createWriteStream(destinationPath)

      // Write the IV at the beginning of the output file
      writeStream.write(iv)

      // Pipe the input file through the cipher and into the output file
      readStream.pipe(cipher).pipe(writeStream)

      writeStream.on("finish", () => {
        // Delete the original file after encryption
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting original file:", err)

          resolve({
            encryptedPath: destinationPath,
            iv: iv.toString("hex"),
          })
        })
      })

      writeStream.on("error", (err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Decrypts a file using AES-256-CBC
 * @param {string} encryptedFilePath - Path to the encrypted file
 * @param {string} outputPath - Path where to save the decrypted file
 * @returns {Promise<string>} - Path to decrypted file
 */
const decryptFile = (encryptedFilePath, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Create read stream for the encrypted file
      const readStream = fs.createReadStream(encryptedFilePath)

      // We need to read the IV from the first 16 bytes of the file
      const chunks = []

      readStream.on("data", (chunk) => {
        chunks.push(chunk)

        // Once we have enough data to extract the IV
        if (Buffer.concat(chunks).length >= IV_LENGTH) {
          // Stop collecting chunks
          readStream.destroy()

          // Extract the IV from the beginning of the file
          const buffer = Buffer.concat(chunks)
          const iv = buffer.slice(0, IV_LENGTH)
          const encryptedData = buffer.slice(IV_LENGTH)

          // Create decipher with properly formatted key
          const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv)

          // Create write stream for the decrypted file
          const writeStream = fs.createWriteStream(outputPath)

          // Write the initial encrypted data (minus the IV)
          writeStream.write(decipher.update(encryptedData))

          // Create a new read stream starting after the IV
          const remainingReadStream = fs.createReadStream(encryptedFilePath, {
            start: IV_LENGTH,
          })

          // Pipe the remaining data through the decipher
          remainingReadStream.pipe(decipher).pipe(writeStream)

          writeStream.on("finish", () => {
            resolve(outputPath)
          })

          writeStream.on("error", (err) => {
            reject(err)
          })
        }
      })

      readStream.on("error", (err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Decrypts a file to a temporary location and returns a read stream
 * @param {string} encryptedFilePath - Path to the encrypted file
 * @returns {Promise<{stream: fs.ReadStream, cleanup: Function}>} - Read stream of decrypted file and cleanup function
 */
const decryptFileToStream = (encryptedFilePath) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary file for the decrypted content
      const tempFilePath = path.join(
        path.dirname(encryptedFilePath),
        `temp_${Date.now()}_${path.basename(encryptedFilePath)}`,
      )

      // Decrypt the file to the temporary location
      decryptFile(encryptedFilePath, tempFilePath)
        .then((decryptedPath) => {
          // Create a read stream for the decrypted file
          const stream = fs.createReadStream(decryptedPath)

          // Create a cleanup function to delete the temporary file
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

/**
 * Generate a fallback key for development purposes only
 * WARNING: This should never be used in production
 * @returns {string} - A 32-byte key derived from the app name
 */
const generateFallbackKey = () => {
  // This is just for development - NEVER use this in production
  const baseKey = "SecureFileSharing-Development-Only-Key"
  return crypto.createHash("sha256").update(baseKey).digest("hex").slice(0, 32)
}

module.exports = {
  encryptFile,
  decryptFile,
  decryptFileToStream,
}

