const fs = require("fs")
const os = require("os")
const path = require("path")
const crypto = require("crypto")

// Storage abstraction for ENCRYPTED file blobs. The route/util layer above this
// owns all encryption — this layer only moves opaque bytes, which keeps the
// pipeline crypto-agnostic (so Phase 5 client-side E2E can slot in unchanged).
//
// Two drivers, chosen by STORAGE_DRIVER (default "local"):
//   - local: blobs live on the local filesystem (the historical behavior; the
//     storage key IS the absolute file path).
//   - minio: blobs live in a MinIO/S3 bucket (the storage key is the object
//     name). For backward compatibility the minio driver is "read-through": if a
//     key resolves to an existing local file (a pre-MinIO upload), it is served
//     from disk, so switching drivers never orphans existing files.

const DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase()
const UPLOADS_DIR = path.join(__dirname, "../uploads")

let minioClient = null
let bucket = null

const isMinio = () => DRIVER === "minio"

// Lazily construct the MinIO client (so local mode needs no MinIO config).
const getMinio = () => {
  if (minioClient) return minioClient
  const { Client } = require("minio")
  minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || "minio",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: String(process.env.MINIO_USE_SSL || "false") === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  })
  bucket = process.env.MINIO_BUCKET || "securevault"
  return minioClient
}

// Ensure the bucket exists. Safe to call on startup; no-op for local driver.
const init = async () => {
  if (!isMinio()) return
  const client = getMinio()
  const exists = await client.bucketExists(bucket).catch(() => false)
  if (!exists) {
    await client.makeBucket(bucket)
    console.log(`MinIO bucket "${bucket}" created`)
  }
  console.log(`Storage driver: minio (bucket "${bucket}")`)
}

// True if the key refers to an existing local file (legacy/local blob).
const isLocalKey = (key) => Boolean(key) && fs.existsSync(key)

// Persist an encrypted blob that currently lives at localPath. Returns the
// storage key to record on the File document.
//   - local: the file already sits in uploads/, so the key is its path.
//   - minio: upload it as an object, delete the local temp, return the object name.
const save = async (localPath) => {
  if (!isMinio()) {
    return localPath
  }
  const client = getMinio()
  const objectName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${path.basename(localPath)}`
  await client.fPutObject(bucket, objectName, localPath, {})
  fs.unlink(localPath, () => {})
  return objectName
}

// Materialize a blob to a local temp file (needed for streaming decryption,
// which reads the IV header by offset). Returns { path, cleanup }.
//   - local/legacy key: returns the path as-is with a no-op cleanup.
//   - minio object: downloads to a temp file the caller must clean up.
const fetchToTemp = async (key) => {
  if (isLocalKey(key)) {
    return { path: key, cleanup: () => {} }
  }
  if (!isMinio()) {
    // local driver but the file is missing
    throw new Error("File not found on disk")
  }
  const client = getMinio()
  const tmp = path.join(os.tmpdir(), `dl_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`)
  await client.fGetObject(bucket, key, tmp)
  return {
    path: tmp,
    cleanup: () => fs.unlink(tmp, () => {}),
  }
}

// A readable stream of the raw (still-encrypted) blob — used for hashing.
const getStream = async (key) => {
  if (isLocalKey(key)) {
    return fs.createReadStream(key)
  }
  if (!isMinio()) {
    throw new Error("File not found on disk")
  }
  const client = getMinio()
  return client.getObject(bucket, key)
}

// Delete a blob. Best-effort; never throws on "already gone".
const remove = async (key) => {
  if (!key) return
  if (isLocalKey(key)) {
    fs.unlink(key, () => {})
    return
  }
  if (isMinio()) {
    try {
      await getMinio().removeObject(bucket, key)
    } catch {
      // object already absent — fine
    }
  }
}

// Whether a blob exists (local file or minio object).
const exists = async (key) => {
  if (!key) return false
  if (isLocalKey(key)) return true
  if (!isMinio()) return false
  try {
    await getMinio().statObject(bucket, key)
    return true
  } catch {
    return false
  }
}

module.exports = { init, save, fetchToTemp, getStream, remove, exists, DRIVER, UPLOADS_DIR }
