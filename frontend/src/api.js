// const API_URL = "http://localhost:5000/api"

// Auth API calls
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    })
    return await response.json()
  } catch (error) {
    console.error("Register Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const requestLoginToken = async (userData) => {
  try {
    const response = await fetch(`/api/auth/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    })
    return await response.json()
  } catch (error) {
    console.error("Login Token Request Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const verifyLoginToken = async (verificationData) => {
  try {
    const response = await fetch(`/api/auth/verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verificationData),
    })
    const data = await response.json()

    if (response.ok) {
      localStorage.setItem("token", data.token)
    }

    return data
  } catch (error) {
    console.error("Login Verification Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const requestPasswordReset = async (resetData) => {
  try {
    const response = await fetch(`/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resetData),
    })
    return await response.json()
  } catch (error) {
    console.error("Password Reset Request Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const verifyPasswordReset = async (resetData) => {
  try {
    const response = await fetch(`/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resetData),
    })
    return await response.json()
  } catch (error) {
    console.error("Password Reset Verification Error:", error)
    return { error: "Network error. Please try again." }
  }
}

//! User profile API calls
export const getUserProfile = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/user/profile`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Profile Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const updateUserProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/user/update-profile`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    })
    return await response.json()
  } catch (error) {
    console.error("Update Profile Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const updateUserPassword = async (passwordData) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/user/update-password`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(passwordData),
    })
    return await response.json()
  } catch (error) {
    console.error("Update Password Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// File API calls
export const getUserFiles = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Files Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const uploadFile = async (formData, progressCallback) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const xhr = new XMLHttpRequest()

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          progressCallback(progress)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"))
      })

      xhr.open("POST", `/api/files/upload`)
      xhr.setRequestHeader("Authorization", token)
      xhr.send(formData)
    })
  } catch (error) {
    console.error("Upload File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const deleteFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Delete File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const downloadFile = async (fileId, fileName) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Unauthorized")
    }

    const response = await fetch(`/api/files/${fileId}/download`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })

    if (!response.ok) {
      throw new Error("Download failed")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Download File Error:", error)
    throw error
  }
}

export const shareFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/share`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Share File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

//! New Share API functions
export const getSharedFileInfo = async (shareToken) => {
  try {
    const response = await fetch(`/api/files/share/${shareToken}/info`, {
      method: "GET",
    })
    return await response.json()
  } catch (error) {
    console.error("Get Shared File Info Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const requestShareAccess = async (shareToken) => {
  try {
    const response = await fetch(`/api/files/share/${shareToken}/request-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Request Share Access Error:", error)
    return { error: "Network error. Please try again." }
  }
}

export const verifyShareAccess = async (shareToken, verificationCode) => {
  try {
    const response = await fetch(`/api/files/share/${shareToken}/verify-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verificationCode }),
    })
    return await response.json()
  } catch (error) {
    console.error("Verify Share Access Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Contact form API
export const sendContactForm = async (formData) => {
  try {
    const response = await fetch(`/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
    return await response.json()
  } catch (error) {
    console.error("Contact Form Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// ============== ADMIN API CALLS ==============

// Get admin dashboard stats
export const getAdminDashboard = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/dashboard`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Admin Dashboard Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get all users (admin)
export const getAdminUsers = async (page = 1, limit = 20, search = "") => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({ page, limit, search })
    const response = await fetch(`/api/admin/users?${params}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Admin Users Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get user details (admin)
export const getAdminUserDetails = async (userId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Admin User Details Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Update user role (admin)
export const updateUserRole = async (userId, role) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    })
    return await response.json()
  } catch (error) {
    console.error("Update User Role Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Deactivate user (admin)
export const deactivateUser = async (userId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
      method: "PUT",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Deactivate User Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Activate user (admin)
export const activateUser = async (userId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/users/${userId}/activate`, {
      method: "PUT",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Activate User Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Delete user (admin)
export const deleteUser = async (userId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Delete User Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get all files (admin)
export const getAdminFiles = async (page = 1, limit = 20, filters = {}) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({ page, limit, ...filters })
    const response = await fetch(`/api/admin/files?${params}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Admin Files Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Revoke file (admin)
export const adminRevokeFile = async (fileId, reason) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/files/${fileId}/revoke`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    })
    return await response.json()
  } catch (error) {
    console.error("Admin Revoke File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Restore file (admin)
export const adminRestoreFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/files/${fileId}/restore`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Admin Restore File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Delete file (admin)
export const adminDeleteFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Admin Delete File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Scan file for virus (admin)
export const scanFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/files/${fileId}/scan`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Scan File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Verify file integrity (admin)
export const verifyFileIntegrity = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/files/${fileId}/verify-integrity`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Verify Integrity Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Quarantine file (admin)
export const quarantineFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/files/${fileId}/quarantine`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Quarantine File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Run system integrity check (admin)
export const runIntegrityCheck = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/integrity-check`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Integrity Check Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Scan pending files (admin)
export const scanPendingFiles = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/scan/pending`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Scan Pending Files Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Cleanup expired files (admin)
export const cleanupExpiredFiles = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/cleanup/expired`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deleteFromDisk: true }),
    })
    return await response.json()
  } catch (error) {
    console.error("Cleanup Expired Files Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get audit logs (admin)
export const getAuditLogs = async (page = 1, limit = 50, filters = {}) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({ page, limit, ...filters })
    const response = await fetch(`/api/admin/audit-logs?${params}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Audit Logs Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get system settings (admin)
export const getSystemSettings = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/settings`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("System Settings Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Update system setting (admin)
export const updateSystemSetting = async (key, value) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/admin/settings/${key}`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    })
    return await response.json()
  } catch (error) {
    console.error("Update System Setting Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// ============== FILE MANAGEMENT API CALLS ==============

// Set file expiration with flexible time units
export const setFileExpiration = async (fileId, value, unit = "days") => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/expiration`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value, unit }),
    })
    return await response.json()
  } catch (error) {
    console.error("Set File Expiration Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Pre-scan file before download
export const preScanFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/pre-scan`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Pre-Scan File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Download file with scan verification
export const downloadFileWithScan = async (fileId, fileName, skipScan = false) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Unauthorized")
    }

    const url = skipScan 
      ? `/api/files/${fileId}/download?skipScan=true`
      : `/api/files/${fileId}/download`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })

    // Extract scan info from headers
    const scanInfo = {
      safe: response.headers.get("X-Scan-Safe") === "true",
      scanStatus: response.headers.get("X-Scan-Status"),
      scanTime: response.headers.get("X-Scan-Time"),
      message: response.headers.get("X-Scan-Message")
    }

    if (!response.ok) {
      const errorData = await response.json()
      return { 
        error: errorData.error || "Download failed",
        scanResult: errorData.scanResult,
        scanInfo
      }
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    
    return { success: true, scanInfo }
  } catch (error) {
    console.error("Download File Error:", error)
    return { error: error.message || "Download failed" }
  }
}

// Revoke file access
export const revokeFileAccess = async (fileId, reason) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/revoke`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    })
    return await response.json()
  } catch (error) {
    console.error("Revoke File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Set download limit
export const setDownloadLimit = async (fileId, maxDownloads) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/download-limit`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ maxDownloads }),
    })
    return await response.json()
  } catch (error) {
    console.error("Set Download Limit Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get file scan status
export const getFileScanStatus = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/scan-status`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Scan Status Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Verify user file integrity
export const verifyUserFileIntegrity = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/files/${fileId}/verify-integrity`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Verify File Integrity Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// ==================== ORGANIZATION API ====================

// Create organization
export const createOrganization = async (orgData) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/create`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orgData),
    })
    return await response.json()
  } catch (error) {
    console.error("Create Organization Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get organization details
export const getOrganizationDetails = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/details`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Organization Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Join organization with invite code
export const joinOrganization = async (joinData) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/join`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(joinData),
    })
    return await response.json()
  } catch (error) {
    console.error("Join Organization Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Leave organization
export const leaveOrganization = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/leave`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Leave Organization Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get organization members
export const getOrganizationMembers = async (page = 1, limit = 20, filters = {}) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({ page, limit, ...filters })
    const response = await fetch(`/api/organization/members?${params}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Members Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Approve/reject member
export const approveMember = async (memberId, action) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/members/${memberId}/approve`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    })
    return await response.json()
  } catch (error) {
    console.error("Approve Member Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Update member role
export const updateMemberRole = async (memberId, role) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/members/${memberId}/role`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    })
    return await response.json()
  } catch (error) {
    console.error("Update Member Role Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Remove member from organization
export const removeMember = async (memberId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/members/${memberId}`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Remove Member Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Regenerate invite code
export const regenerateInviteCode = async (expiresInHours = 72) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/invite-code/regenerate`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresInHours }),
    })
    return await response.json()
  } catch (error) {
    console.error("Regenerate Invite Code Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Update organization settings
export const updateOrganizationSettings = async (settings) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/settings`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    })
    return await response.json()
  } catch (error) {
    console.error("Update Organization Settings Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get organization stats
export const getOrganizationStats = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/stats`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Organization Stats Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Transfer ownership
export const transferOwnership = async (newOwnerId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/transfer-ownership`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newOwnerId }),
    })
    return await response.json()
  } catch (error) {
    console.error("Transfer Ownership Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Delete organization
export const deleteOrganization = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Delete Organization Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// ==================== MANAGER MONITORING API ====================

// Get live dashboard data
export const getMonitorLive = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/monitor/live`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor Live Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get activity feed
export const getMonitorActivity = async (page = 1, limit = 50, filters = {}) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({
      page,
      limit,
      ...filters,
    })

    const response = await fetch(`/api/organization/monitor/activity?${params}`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor Activity Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get sessions
export const getMonitorSessions = async (page = 1, limit = 50, filters = {}) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({
      page,
      limit,
      ...filters,
    })

    const response = await fetch(`/api/organization/monitor/sessions?${params}`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor Sessions Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get work logs
export const getMonitorWorkLogs = async (page = 1, limit = 50, filters = {}) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const params = new URLSearchParams({
      page,
      limit,
      ...filters,
    })

    const response = await fetch(`/api/organization/monitor/worklogs?${params}`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor Work Logs Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get user details
export const getMonitorUser = async (userId, days = 7) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/monitor/user/${userId}?days=${days}`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor User Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get organization stats
export const getMonitorStats = async (period = "week") => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/monitor/stats?period=${period}`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor Stats Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Get file activity
export const getMonitorFile = async (fileId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`/api/organization/monitor/file/${fileId}`, {
      headers: {
        Authorization: token,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("Get Monitor File Error:", error)
    return { error: "Network error. Please try again." }
  }
}

// Send heartbeat to keep session alive
export const sendHeartbeat = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "No session" }
    }

    const response = await fetch(`/api/auth/heartbeat`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      return { error: "Heartbeat failed" }
    }
    
    return await response.json()
  } catch (error) {
    console.error("Send Heartbeat Error:", error)
    return { error: "Network error" }
  }
}

// Logout with session end
export const logoutUser = async (sessionId) => {
  try {
    const token = localStorage.getItem("token")

    await fetch(`/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: token || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    })
    
    localStorage.removeItem("token")
    localStorage.removeItem("sessionId")
    return { success: true }
  } catch (error) {
    console.error("Logout Error:", error)
    localStorage.removeItem("token")
    localStorage.removeItem("sessionId")
    return { success: true }
  }
}
