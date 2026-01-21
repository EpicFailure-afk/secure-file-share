# 🛡️ SecureVault

### **Enterprise-Grade Encrypted File Management Platform**

> *"Your Files. Your Security. Your Control."*

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Security Implementation](#-security-implementation)
- [Installation](#-installation)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Future Enhancements](#-future-enhancements)

---

## 🎯 Overview

**SecureVault** is a comprehensive web-based platform designed for secure file management in both personal and enterprise environments. The platform provides end-to-end file encryption, real-time malware detection, role-based access control, and complete audit trails for compliance.

In an era where data breaches cost organizations millions of dollars and compromise sensitive information, SecureVault addresses the critical need for secure file storage and sharing. Whether you're an individual protecting personal documents or an organization managing sensitive data, SecureVault delivers enterprise-level security without compromising on user experience.

### 🔑 Core Capabilities

| Capability | Description |
|------------|-------------|
| **Secure Storage** | AES-256 encrypted file storage with unique encryption keys per file |
| **Safe Sharing** | Password-protected sharing links with customizable expiration controls |
| **Threat Protection** | Real-time ClamAV malware scanning on both upload and download |
| **Access Control** | Role-based permissions with organization hierarchy support |
| **File Integrity** | SHA-256 hash verification to detect any file tampering |
| **Complete Audit Trail** | Comprehensive logging of all file operations with IP tracking |
| **Organization Support** | Multi-tenant architecture supporting teams and departments |

---

## ❓ Problem Statement

Modern organizations and individuals face significant challenges when it comes to file sharing:

### Security Challenges
- **Data Breaches**: Traditional file sharing methods expose sensitive data to unauthorized access
- **Malware Threats**: Files shared online can carry viruses, ransomware, and other malicious software
- **Unauthorized Access**: Lack of proper access controls leads to data leaks
- **Compliance Requirements**: Many industries require audit trails and encryption for sensitive data

### Usability Challenges
- **Complex Security Tools**: Existing secure solutions often sacrifice user experience
- **Fragmented Solutions**: Organizations use multiple tools for encryption, sharing, and scanning
- **No Visibility**: Lack of tracking for who accessed files and when
- **File Tampering**: No way to verify if files have been modified during transfer

### Organizational Challenges
- **Team Collaboration**: Difficulty managing file access across teams and departments
- **Centralized Control**: No unified platform for organizational file management
- **Compliance Auditing**: Lack of detailed logs for regulatory compliance

---

## 💡 Solution

SecureVault addresses all these challenges through an integrated platform that combines:

### 1. Military-Grade Encryption
Every file uploaded to SecureVault is automatically encrypted using AES-256-CBC, the same encryption standard used by governments and financial institutions. Each file receives a unique encryption key, ensuring that even if one key is compromised, other files remain secure.

### 2. Real-Time Threat Detection
Integrated ClamAV virus scanning analyzes every file during upload and again before download. Infected files are automatically quarantined, protecting users from malware, ransomware, and other threats.

### 3. Granular Access Control
Role-based permissions allow organizations to define exactly who can access, modify, or share files. File locking with passwords adds an additional security layer for highly sensitive documents.

### 4. Complete Transparency
Every file operation is logged with timestamps, user information, and IP addresses. This creates a complete audit trail for compliance requirements and security investigations.

### 5. Intuitive User Experience
Despite its comprehensive security features, SecureVault maintains a clean, modern interface that doesn't require security expertise to use effectively.

---

## ✨ Key Features

### 🔐 Security & Encryption

| Feature | Description |
|---------|-------------|
| **AES-256-CBC Encryption** | Military-grade encryption algorithm for all files at rest |
| **Unique File Keys** | Each file encrypted with its own randomly generated key |
| **Secure Key Storage** | Encryption keys stored separately from encrypted files |
| **Password Hashing** | bcrypt algorithm with salt for secure credential storage |
| **JWT Authentication** | Stateless, secure token-based session management |
| **HTTPS/TLS** | All data encrypted during transmission |

### 🛡️ Threat Protection

| Feature | Description |
|---------|-------------|
| **Upload Scanning** | ClamAV scans every file immediately upon upload |
| **Download Verification** | Secondary scan performed before file delivery |
| **Malware Quarantine** | Automatic isolation of infected files with user notification |
| **Virus Signature Updates** | Regular updates to detect latest threats |
| **Input Validation** | Server-side validation prevents injection attacks |
| **XSS Protection** | Sanitization of all user inputs |

### 📁 File Management

| Feature | Description |
|---------|-------------|
| **Drag & Drop Upload** | Intuitive file upload with progress tracking |
| **File Locking** | Password-protect individual files for extra security |
| **Expiration Control** | Set automatic deletion dates for temporary files |
| **Integrity Verification** | SHA-256 hash comparison to detect tampering |
| **Secure Download** | Decryption and delivery through secure streams |
| **File Preview** | View file details without downloading |

### 🔗 Secure Sharing

| Feature | Description |
|---------|-------------|
| **Shareable Links** | Generate encrypted URLs for file access |
| **Password Protection** | Require password to access shared files |
| **Expiration Dates** | Links automatically expire after set duration |
| **Access Tracking** | Monitor who accessed shared files and when |
| **Revocable Access** | Instantly revoke sharing permissions |

### 👥 Organizations & Teams

| Feature | Description |
|---------|-------------|
| **Multi-Tenant Support** | Isolated environments for different organizations |
| **Role Hierarchy** | Owner → Admin → Manager → Member permission levels |
| **Team Management** | Invite members, assign roles, manage access |
| **Invite Codes** | Secure organization joining via invite codes |
| **Department Organization** | Organize files by teams or departments |

### 📊 Audit & Compliance

| Feature | Description |
|---------|-------------|
| **Activity Logging** | Record all file operations with timestamps |
| **IP Tracking** | Log source IP addresses for all actions |
| **User Attribution** | Track which user performed each action |
| **Access History** | Complete history of file access attempts |
| **Exportable Logs** | Generate reports for compliance audits |

### 🖥️ User Experience

| Feature | Description |
|---------|-------------|
| **Modern React UI** | Clean, intuitive interface with responsive design |
| **Real-Time Updates** | Instant feedback on all operations |
| **Mobile Responsive** | Full functionality on tablets and smartphones |
| **Progress Indicators** | Visual feedback for uploads and downloads |
| **Notification System** | Alerts for shares, access requests, and security events |
| **Dark Theme** | Modern dark color scheme for reduced eye strain |

---

## 🛠️ Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | 18.x | Component-based UI framework |
| **Vite** | 5.x | Fast development and build tool |
| **CSS Modules** | - | Scoped component styling |
| **Framer Motion** | 10.x | Smooth animations and transitions |
| **React Router** | 6.x | Client-side routing and navigation |
| **React Icons** | 5.x | Comprehensive icon library |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime environment |
| **Express.js** | 4.x | Web application framework |
| **MongoDB** | 7.x | NoSQL document database |
| **Mongoose** | 8.x | MongoDB object modeling (ODM) |
| **Multer** | 1.x | Multipart file upload handling |
| **Nodemailer** | 6.x | Email notification service |

### Security Technologies

| Technology | Purpose |
|------------|---------|
| **Node.js Crypto** | AES-256-CBC file encryption/decryption |
| **bcryptjs** | Password hashing with salt |
| **jsonwebtoken** | JWT token generation and verification |
| **ClamAV** | Open-source antivirus engine |
| **helmet** | HTTP security headers |
| **cors** | Cross-origin resource sharing |

### DevOps Technologies

| Technology | Purpose |
|------------|---------|
| **Docker** | Application containerization |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy and load balancing |
| **Shell Scripts** | Automated installation (Linux/macOS) |
| **PowerShell** | Automated installation (Windows) |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SecureVault Platform                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐      │
│    │   Client    │  HTTPS  │   Nginx     │         │   Backend   │      │
│    │   Browser   │◄───────►│   Proxy     │◄───────►│   Server    │      │
│    │   (React)   │         │             │         │  (Express)  │      │
│    └─────────────┘         └─────────────┘         └──────┬──────┘      │
│                                                           │              │
│                                    ┌──────────────────────┼──────────┐  │
│                                    │                      │          │  │
│                                    ▼                      ▼          │  │
│                            ┌─────────────┐        ┌─────────────┐    │  │
│                            │  Security   │        │   MongoDB   │    │  │
│                            │   Layer     │        │  Database   │    │  │
│                            ├─────────────┤        ├─────────────┤    │  │
│                            │ • AES-256   │        │ • Users     │    │  │
│                            │ • ClamAV    │        │ • Files     │    │  │
│                            │ • JWT Auth  │        │ • Audit Logs│    │  │
│                            │ • bcrypt    │        │ • Sessions  │    │  │
│                            │ • SHA-256   │        │ • Tokens    │    │  │
│                            └──────┬──────┘        └─────────────┘    │  │
│                                   │                                   │  │
│                                   ▼                                   │  │
│                            ┌─────────────┐                           │  │
│                            │  Encrypted  │                           │  │
│                            │   File      │                           │  │
│                            │  Storage    │                           │  │
│                            └─────────────┘                           │  │
│                                                                       │  │
└───────────────────────────────────────────────────────────────────────┘  
```

### Component Interaction

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Request Flow                                  │
└──────────────────────────────────────────────────────────────────────┘

User Request → Authentication Middleware → Route Handler → Business Logic
                      │                          │               │
                      ▼                          ▼               ▼
              JWT Validation            Input Validation    Database/Storage
                      │                          │               │
                      └──────────────────────────┴───────────────┘
                                         │
                                         ▼
                                   Response to User
```

### File Upload Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───►│ Upload  │───►│  Virus  │───►│ Encrypt │───►│  Store  │
│         │    │  File   │    │  Scan   │    │  File   │    │  File   │
└─────────┘    └─────────┘    └────┬────┘    └─────────┘    └─────────┘
                                   │
                              ┌────┴────┐
                              │ Infected │
                              │    ?     │
                              └────┬────┘
                                   │ Yes
                                   ▼
                            ┌─────────────┐
                            │  Quarantine │
                            │  & Notify   │
                            └─────────────┘
```

### File Download Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───►│ Request │───►│  Auth   │───►│ Decrypt │───►│ Deliver │
│         │    │  File   │    │  Check  │    │  File   │    │  File   │
└─────────┘    └─────────┘    └────┬────┘    └────┬────┘    └─────────┘
                                   │              │
                              ┌────┴────┐    ┌────┴────┐
                              │  Has    │    │  Verify │
                              │ Access? │    │  Scan   │
                              └─────────┘    └─────────┘
```

---

## 🔒 Security Implementation

### Encryption Process

#### File Encryption (Upload)

```javascript
// Simplified encryption flow
1. Generate random 32-byte encryption key
2. Generate random 16-byte initialization vector (IV)
3. Create AES-256-CBC cipher with key and IV
4. Read file in chunks, encrypt each chunk
5. Write encrypted chunks to storage
6. Calculate SHA-256 hash of encrypted file
7. Store metadata (key, IV, hash) in database
```

#### File Decryption (Download)

```javascript
// Simplified decryption flow
1. Retrieve encryption key and IV from database
2. Create AES-256-CBC decipher with key and IV
3. Stream encrypted file through decipher
4. Deliver decrypted content to user
```

### Password Security

| Layer | Implementation |
|-------|----------------|
| **Hashing Algorithm** | bcrypt with cost factor 10 |
| **Salt** | Unique random salt per password |
| **Comparison** | Timing-safe comparison function |
| **Minimum Requirements** | 8 characters, mixed case, numbers |

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "user_id",
    "email": "user@example.com",
    "role": "user",
    "iat": 1234567890,
    "exp": 1234654290
  },
  "signature": "HMACSHA256(base64(header) + '.' + base64(payload), secret)"
}
```

### ClamAV Integration

```
┌─────────────────────────────────────────────────────────┐
│                  ClamAV Scanning Flow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. File uploaded to temporary storage                   │
│  2. ClamAV daemon receives file stream                   │
│  3. Signature matching against virus database            │
│  4. Heuristic analysis for unknown threats               │
│  5. Return scan result (clean/infected)                  │
│  6. If clean: proceed with encryption                    │
│  7. If infected: quarantine and notify user              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | nosniff | Prevent MIME sniffing |
| `X-Frame-Options` | DENY | Prevent clickjacking |
| `X-XSS-Protection` | 1; mode=block | XSS filter |
| `Strict-Transport-Security` | max-age=31536000 | Force HTTPS |
| `Content-Security-Policy` | default-src 'self' | Prevent injection |

---

## 🚀 Installation

### Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| Node.js | 20.x LTS |
| MongoDB | 7.x |
| Docker | 24.x (optional) |
| ClamAV | 1.0+ |

### Option 1: Automated Installation

#### Linux / macOS

```bash
# Clone the repository
git clone https://github.com/your-repo/securevault.git
cd securevault

# Make the installer executable
chmod +x install.sh

# Run the installation script
./install.sh

# The script will:
# - Install Node.js if not present
# - Install MongoDB if not present
# - Install ClamAV for virus scanning
# - Install all npm dependencies
# - Create default configuration
# - Start the application
```

#### Windows (PowerShell as Administrator)

```powershell
# Clone the repository
git clone https://github.com/your-repo/securevault.git
cd securevault

# Allow script execution
Set-ExecutionPolicy Bypass -Scope Process -Force

# Run the installation script
.\install.ps1

# The script will:
# - Install Node.js via winget
# - Install MongoDB via winget
# - Install Docker Desktop
# - Configure all dependencies
# - Start the application
```

### Option 2: Docker Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/securevault.git
cd securevault

# Build and start all containers
docker compose up --build -d

# The containers include:
# - Frontend (React + Nginx)
# - Backend (Node.js + Express)
# - Database (MongoDB)
# - Antivirus (ClamAV)
```

### Option 3: Manual Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/securevault.git
cd securevault

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Create environment configuration
cd ..
cp .env.example .env

# Edit .env with your settings (see below)

# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

### Environment Configuration

Create a `.env` file in the root directory:

```ini
# ===========================================
# Database Configuration
# ===========================================
MONGO_URI=mongodb://localhost:27017/securevault

# ===========================================
# Authentication
# ===========================================
JWT_SECRET=your-secure-random-string-minimum-32-chars
JWT_EXPIRES_IN=24h

# ===========================================
# Encryption
# ===========================================
ENCRYPTION_KEY=your-32-character-encryption-key

# ===========================================
# Server Configuration
# ===========================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ===========================================
# ClamAV Configuration
# ===========================================
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
ENABLE_VIRUS_SCAN=true

# ===========================================
# Email Configuration (Optional)
# ===========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@securevault.com

# ===========================================
# File Storage
# ===========================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
```

### Verify Installation

```bash
# Check backend health
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","message":"SecureVault API is running"}

# Access frontend
# Open http://localhost:5173 in your browser
```

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user account |
| POST | `/api/auth/login` | Authenticate and receive JWT |
| POST | `/api/auth/logout` | Invalidate current session |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### File Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List user's files |
| POST | `/api/files/upload` | Upload and encrypt file |
| GET | `/api/files/download/:id` | Download and decrypt file |
| DELETE | `/api/files/:id` | Delete file permanently |
| POST | `/api/files/:id/share` | Generate share link |
| POST | `/api/files/:id/lock` | Lock file with password |
| POST | `/api/files/:id/unlock` | Unlock password-protected file |
| GET | `/api/files/:id/verify` | Verify file integrity |
| PUT | `/api/files/:id/expiration` | Set file expiration date |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get current user profile |
| PUT | `/api/user/profile` | Update user profile |
| PUT | `/api/user/password` | Change password |
| GET | `/api/user/activity` | Get user activity log |

### Organization Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/organization/create` | Create new organization |
| POST | `/api/organization/join` | Join with invite code |
| GET | `/api/organization` | Get organization details |
| PUT | `/api/organization` | Update organization |
| GET | `/api/organization/members` | List organization members |
| PUT | `/api/organization/members/:id/role` | Update member role |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/files` | List all files |
| GET | `/api/admin/logs` | Get system audit logs |
| PUT | `/api/admin/users/:id` | Update user status |
| DELETE | `/api/admin/users/:id` | Delete user account |

---

## 📁 Project Structure

```
securevault/
├── frontend/                        # React Frontend Application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Images, fonts, etc.
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.jsx           # Navigation bar
│   │   │   ├── Footer.jsx           # Page footer
│   │   │   └── *.module.css         # Component styles
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.jsx             # Landing page
│   │   │   ├── Login.jsx            # Login page
│   │   │   ├── Register.jsx         # Registration page
│   │   │   ├── Dashboard.jsx        # Main file dashboard
│   │   │   ├── SharePage.jsx        # Shared file access
│   │   │   ├── AdminDashboard.jsx   # Admin panel
│   │   │   ├── OrgDashboard.jsx     # Organization management
│   │   │   └── *.module.css         # Page styles
│   │   ├── api.js                   # API client functions
│   │   ├── App.jsx                  # Main app component
│   │   ├── App.css                  # Global styles
│   │   └── main.jsx                 # Entry point
│   ├── index.html                   # HTML template
│   ├── vite.config.js               # Vite configuration
│   └── package.json                 # Frontend dependencies
│
├── backend/                         # Express Backend Application
│   ├── middleware/                  # Express middleware
│   │   └── auth.js                  # JWT authentication
│   ├── models/                      # MongoDB schemas
│   │   ├── User.js                  # User model
│   │   ├── File.js                  # File metadata model
│   │   ├── Token.js                 # Password reset tokens
│   │   ├── AuditLog.js              # Audit trail model
│   │   ├── ActivityFeed.js          # Activity tracking
│   │   ├── Organization.js          # Organization model
│   │   ├── UserSession.js           # Session tracking
│   │   └── WorkLog.js               # Work logging
│   ├── routes/                      # API route handlers
│   │   ├── auth.js                  # Authentication routes
│   │   ├── files.js                 # File operation routes
│   │   ├── user.js                  # User management routes
│   │   ├── admin.js                 # Admin routes
│   │   ├── organization.js          # Organization routes
│   │   └── contact.js               # Contact form routes
│   ├── utils/                       # Utility functions
│   │   ├── encryption.js            # AES encryption/decryption
│   │   ├── fileIntegrity.js         # SHA-256 hash verification
│   │   ├── virusScanner.js          # ClamAV integration
│   │   ├── fileExpiration.js        # Expiration handling
│   │   ├── activityTracker.js       # Activity logging
│   │   ├── shareNotification.js     # Share notifications
│   │   ├── email.js                 # Email sending
│   │   └── emailTemplates.js        # Email templates
│   ├── uploads/                     # Encrypted file storage
│   ├── server.js                    # Express entry point
│   └── package.json                 # Backend dependencies
│
├── nginx/                           # Nginx configuration
│   ├── conf/
│   │   └── nginx.conf               # Reverse proxy config
│   └── ssl/                         # SSL certificates
│
├── docker-compose.yml               # Container orchestration
├── Dockerfile                       # Backend container
├── install.sh                       # Linux/macOS installer
├── install.ps1                      # Windows installer
├── .env.example                     # Environment template
└── README.md                        # This documentation
```

---

## 🔮 Future Enhancements

### Planned Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Two-Factor Authentication** | TOTP-based 2FA for enhanced security | High |
| **File Versioning** | Keep history of file modifications | High |
| **Bulk Operations** | Select and operate on multiple files | Medium |
| **File Preview** | In-browser preview for images and PDFs | Medium |
| **API Rate Limiting** | Prevent abuse with request throttling | Medium |
| **Webhooks** | Notify external systems of events | Low |
| **S3 Storage** | Cloud storage backend option | Low |
| **Mobile App** | Native iOS and Android applications | Low |

### Security Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Key Rotation** | Periodic encryption key updates |
| **HSM Integration** | Hardware security module for key storage |
| **Zero-Knowledge Proof** | Enhanced privacy for shared files |
| **Blockchain Audit** | Immutable audit trail |

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Frontend Components** | 15+ React components |
| **API Endpoints** | 25+ REST endpoints |
| **Security Layers** | 4 (Encryption, Scanning, Auth, Validation) |
| **Database Models** | 8 MongoDB schemas |
| **Utility Modules** | 8 backend utilities |

---

## ✅ Completed Features

- ✅ User Authentication (Login, Register, JWT)
- ✅ File Upload/Download with AES-256 Encryption
- ✅ File Sharing with Secure Links
- ✅ File Locking/Unlocking Mechanism
- ✅ File Integrity Verification (SHA-256)
- ✅ Virus Scanning with ClamAV
- ✅ Dockerized Application with Install Scripts
- ✅ Activity and Audit Logging System
- ✅ Organization Management with Roles
- ✅ File Expiration System
- ✅ Password-Protected File Sharing
- ✅ Cross-Platform Installation Scripts (Linux/Windows)
- ✅ Email Notification System
- ✅ Admin Dashboard for User Management

---

## 📄 License

This project is developed for academic and educational purposes.

---

<div align="center">

## **SecureVault**
### *Enterprise-Grade Encrypted File Management*

*Protecting your files with military-grade security*

🔐 **Encrypted** • 🛡️ **Protected** • ✅ **Verified**

</div>
