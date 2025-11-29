const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // Organization reference
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    
    // Role within organization
    role: { 
      type: String, 
      enum: ["staff", "manager", "admin", "owner", "superadmin"], 
      default: "staff" 
    },
    
    // Job title/position
    jobTitle: {
      type: String,
      default: "",
    },
    
    // Department
    department: {
      type: String,
      default: "",
    },
    
    // Approval status for organization join
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    
    // Who approved/invited this user
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    storageUsed: {
      type: Number,
      default: 0, // in bytes
    },
    storageLimit: {
      type: Number,
      default: 1073741824, // 1GB default limit
    },
    
    // Profile info
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: "",
    },
    
    // Permissions (granular access control)
    permissions: {
      canUpload: { type: Boolean, default: true },
      canDownload: { type: Boolean, default: true },
      canShare: { type: Boolean, default: true },
      canDelete: { type: Boolean, default: true },
      canManageUsers: { type: Boolean, default: false },
      canViewAuditLogs: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Index for organization queries
userSchema.index({ organization: 1, role: 1 });
userSchema.index({ organization: 1, approvalStatus: 1 });

// Set default permissions based on role
userSchema.pre("save", function (next) {
  if (this.isModified("role")) {
    switch (this.role) {
      case "owner":
      case "superadmin":
        this.permissions = {
          canUpload: true,
          canDownload: true,
          canShare: true,
          canDelete: true,
          canManageUsers: true,
          canViewAuditLogs: true,
          canManageSettings: true,
        };
        break;
      case "admin":
        this.permissions = {
          canUpload: true,
          canDownload: true,
          canShare: true,
          canDelete: true,
          canManageUsers: true,
          canViewAuditLogs: true,
          canManageSettings: false,
        };
        break;
      case "manager":
        this.permissions = {
          canUpload: true,
          canDownload: true,
          canShare: true,
          canDelete: true,
          canManageUsers: false,
          canViewAuditLogs: true,
          canManageSettings: false,
        };
        break;
      case "staff":
      default:
        this.permissions = {
          canUpload: true,
          canDownload: true,
          canShare: true,
          canDelete: false,
          canManageUsers: false,
          canViewAuditLogs: false,
          canManageSettings: false,
        };
        break;
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
