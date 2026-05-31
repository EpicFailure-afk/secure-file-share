const fs = require("fs")
const sharp = require("sharp")
const { PDFDocument } = require("pdf-lib")

// Maximum thumbnail edge in pixels
const THUMB_SIZE = 220

/**
 * Best-effort extraction of preview metadata from an UNencrypted file on disk.
 * Must be called before the file is encrypted/deleted. Never throws — on any
 * failure it returns an empty object so uploads are never blocked.
 *
 * @param {string} filePath - path to the original (decrypted) file on disk
 * @param {string} mimeType - the file's mime type
 * @returns {Promise<{imageWidth?:number, imageHeight?:number, thumbnail?:string, pageCount?:number}>}
 */
const extractFileMetadata = async (filePath, mimeType = "") => {
  const meta = {}
  try {
    if (mimeType.startsWith("image/")) {
      try {
        const info = await sharp(filePath).metadata()
        if (info.width) meta.imageWidth = info.width
        if (info.height) meta.imageHeight = info.height

        // Generate a small webp thumbnail as a base64 data URL
        const buf = await sharp(filePath)
          .rotate() // respect EXIF orientation
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer()
        meta.thumbnail = `data:image/webp;base64,${buf.toString("base64")}`
      } catch (imgErr) {
        console.error("Thumbnail/dimension extraction failed:", imgErr.message)
      }
    } else if (mimeType === "application/pdf") {
      try {
        const bytes = fs.readFileSync(filePath)
        const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
        meta.pageCount = pdf.getPageCount()
      } catch (pdfErr) {
        console.error("PDF page-count extraction failed:", pdfErr.message)
      }
    }
  } catch (err) {
    console.error("File metadata extraction error:", err.message)
  }
  return meta
}

module.exports = { extractFileMetadata }
