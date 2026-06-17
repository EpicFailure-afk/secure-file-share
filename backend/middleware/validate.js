const { ZodError } = require("zod")

// Request validation middleware factory. Pass an object of Zod schemas keyed by
// the request part to validate: { body, params, query }. On success the parsed
// (and coerced/stripped) values replace the originals so downstream handlers
// only ever see clean, expected data. On failure it responds 400 with the list
// of field errors — these are client (4xx) errors, so the messages are safe to
// return directly.
//
// Schemas use .strict() where defined, so unexpected/extra fields are rejected
// rather than silently passed through to Mongoose.
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params)
    if (schemas.query) {
      // req.query is a getter-only property on newer Express; mutate in place
      const parsedQuery = schemas.query.parse(req.query)
      Object.keys(req.query).forEach((k) => delete req.query[k])
      Object.assign(req.query, parsedQuery)
    }
    if (schemas.body) req.body = schemas.body.parse(req.body)
    next()
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.issues.map((i) => ({
          field: i.path.join(".") || "(root)",
          message: i.message,
        })),
      })
    }
    next(err)
  }
}

module.exports = { validate }
