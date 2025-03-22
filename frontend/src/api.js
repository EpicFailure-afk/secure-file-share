const API_URL = "http://localhost:5000/api"

// Auth API calls
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
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
    const response = await fetch(`${API_URL}/auth/request-token`, {
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
    const response = await fetch(`${API_URL}/auth/verify-token`, {
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
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
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
    const response = await fetch(`${API_URL}/auth/reset-password`, {
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

// File API calls
export const getUserFiles = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`${API_URL}/files`, {
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

      xhr.open("POST", `${API_URL}/files/upload`)
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

    const response = await fetch(`${API_URL}/files/${fileId}`, {
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

    const response = await fetch(`${API_URL}/files/${fileId}/download`, {
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

    const response = await fetch(`${API_URL}/files/${fileId}/share`, {
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

export const getUserProfile = async () => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      return { error: "Unauthorized" }
    }

    const response = await fetch(`${API_URL}/user/profile`, {
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

