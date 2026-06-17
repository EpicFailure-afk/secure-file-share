const { z } = require("zod")

// ---- Reusable primitives ----------------------------------------------------

// Mongo ObjectId as a 24-char hex string
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

const email = z.string().trim().toLowerCase().email("A valid email is required")

// Login compares against whatever is stored, so we must NOT impose a minimum
// length here or existing users with short passwords could no longer log in.
const loginPassword = z.string().min(1, "Password is required").max(200)

// New passwords (register / reset / change) must meet a real strength floor.
const strongPassword = z.string().min(8, "Password must be at least 8 characters").max(200)

const shortText = (max = 200) => z.string().trim().max(max)

// ---- Param schemas ----------------------------------------------------------

const idParam = z.object({ id: objectId })

// ---- Auth -------------------------------------------------------------------

const auth = {
  register: z.object({
    username: z.string().trim().min(1, "Username is required").max(60),
    email,
    password: strongPassword,
    // `role` is accepted for backward compatibility but is IGNORED by the
    // handler — the role is decided entirely server-side (createOrg => manager,
    // otherwise => staff). We accept any string (rather than rejecting) so a
    // tampered role=manager/admin is silently dropped instead of 400-ing the
    // request, and the user still becomes staff. This closes the old
    // privilege-escalation hole without breaking the org-create flow.
    role: z.string().trim().max(40).optional(),
    inviteCode: z.string().trim().max(64).optional(),
    jobTitle: shortText(120).optional(),
    department: shortText(120).optional(),
    createOrg: z.boolean().optional(),
    organizationName: z.string().trim().max(120).optional(),
  }),

  requestToken: z.object({ email, password: loginPassword }),

  verifyToken: z.object({
    email,
    token: z.string().trim().min(1, "Verification code is required").max(64),
  }),

  forgotPassword: z.object({ email }),

  resetPassword: z.object({
    email,
    token: z.string().trim().min(1, "Reset code is required").max(64),
    newPassword: strongPassword,
  }),

  logout: z.object({ sessionId: z.string().trim().max(200).optional().nullable() }).partial(),

  refresh: z.object({ refreshToken: z.string().min(1, "Refresh token is required").max(500) }),
}

// ---- Contact ----------------------------------------------------------------

const contact = {
  send: z.object({
    name: z.string().trim().min(1).max(120),
    email,
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
  }),
}

// ---- Files ------------------------------------------------------------------

const files = {
  expiration: z.object({
    // Supports both { value, unit } and the legacy { expiresIn } (days)
    value: z.coerce.number().int().positive().max(100000).optional(),
    unit: z.enum(["minutes", "hours", "days", "weeks", "months"]).optional(),
    expiresIn: z.coerce.number().int().positive().max(100000).optional(),
  }),

  lockPassword: z.object({
    password: z.string().min(4, "Password must be at least 4 characters").max(200),
  }),

  unlockPassword: z.object({ password: z.string().min(1, "Password is required").max(200) }),

  revoke: z.object({ reason: shortText(500).optional() }).partial(),

  downloadLimit: z.object({
    maxDownloads: z.coerce.number().int().positive().max(1000000),
  }),

  verifyAccess: z.object({
    verificationCode: z.string().trim().min(1, "Verification code is required").max(32),
  }),

  // Chunked/resumable upload session initialization
  uploadInit: z.object({
    fileName: z.string().trim().min(1, "File name is required").max(255),
    fileType: z.string().trim().max(255).optional(),
    fileSize: z.coerce.number().int().positive().max(5 * 1024 * 1024 * 1024), // ≤5 GB
    totalChunks: z.coerce.number().int().positive().max(100000),
    folderId: objectId.nullable().optional(),
    expiresIn: z.coerce.number().int().positive().max(100000).optional(),
    maxDownloads: z.coerce.number().int().positive().max(1000000).optional(),
  }),
}

// ---- Folders ----------------------------------------------------------------

const folders = {
  create: z.object({
    name: z.string().trim().min(1, "Folder name is required").max(120),
    parentFolder: objectId.nullable().optional(),
  }),
  update: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    parentFolder: objectId.nullable().optional(),
  }),
}

// ---- Organization -----------------------------------------------------------

const orgRole = z.enum(["staff", "manager"])

const organization = {
  create: z.object({
    name: z.string().trim().min(1, "Organization name is required").max(120),
    description: shortText(1000).optional(),
    industry: shortText(120).optional(),
  }),
  join: z.object({
    inviteCode: z.string().trim().min(1, "Invite code is required").max(64),
    role: z.literal("staff").optional(),
    jobTitle: shortText(120).optional(),
    department: shortText(120).optional(),
  }),
  approve: z.object({ action: z.enum(["approve", "reject"]) }),
  changeRole: z.object({ role: orgRole }),
  regenerateInvite: z
    .object({ expiresInHours: z.coerce.number().int().positive().max(8760).optional() })
    .partial(),
  updateSettings: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    description: shortText(1000).optional(),
    industry: shortText(120).optional(),
    settings: z.record(z.string(), z.any()).optional(),
  }),
  transferOwnership: z.object({ newOwnerId: objectId }),
}

// ---- User -------------------------------------------------------------------

const user = {
  updateProfile: z.object({ username: z.string().trim().min(1, "Username is required").max(60) }),
  changePassword: z.object({
    currentPassword: z.string().min(1, "Current password is required").max(200),
    newPassword: strongPassword,
  }),
}

// ---- Admin ------------------------------------------------------------------

const admin = {
  changeRole: z.object({ role: z.enum(["staff", "manager", "owner", "superadmin"]) }),
  setStorage: z.object({ storageLimit: z.coerce.number().int().nonnegative() }),
  revoke: z.object({ reason: shortText(500).optional() }).partial(),
  setExpiration: z.object({
    expiresAt: z.coerce.date().optional(),
    value: z.coerce.number().int().positive().optional(),
  }),
  deleteFile: z.object({ deleteFromDisk: z.boolean().optional() }).partial(),
}

module.exports = {
  objectId,
  idParam,
  auth,
  contact,
  files,
  folders,
  organization,
  user,
  admin,
}
