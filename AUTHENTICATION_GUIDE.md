# East Boundary Systems - Authentication System Guide

## 🔐 Professional Authentication with Advanced Security Features

This system includes enterprise-level security features to protect your school management system.

---

## 🚀 How to Access the System

### **First Time Users**
1. Open your browser and navigate to: `http://localhost/eastboundarysystems/`
2. You'll be automatically redirected to the **Login/Signup** page
3. Click on the **Sign Up** tab to create your account
4. Fill in all required information and create a strong password
5. After successful signup, you'll be redirected to the **Login** tab
6. Enter your email and password to access the system

### **Returning Users**
1. Navigate to: `http://localhost/eastboundarysystems/`
2. Your saved password will automatically log you in if your session is still valid
3. If your session expired, simply enter your email and password again

---

## 🛡️ Security Features Implemented

### **1. Password Requirements & Strength Validation**
All passwords must meet these strict requirements:
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*)

**Visual Feedback:**
- Real-time password strength indicator (Weak/Medium/Strong)
- Color-coded progress bar
- Live checkmarks showing which requirements are met

### **2. Brute Force Protection & Account Lockout**
Prevents unauthorized access through multiple failed login attempts:
- Maximum **5 failed login attempts** allowed
- After 5 failed attempts, account is **locked for 15 minutes**
- User sees remaining attempts after each failed login
- Clear error messages indicating lockout status

**Example:**
```
Failed Login #1: "Incorrect password. 4 attempt(s) remaining."
Failed Login #5: "Account locked due to multiple failed login attempts. Please try again in 15 minutes."
```

### **3. Enhanced Password Hashing**
- Passwords are **never stored in plain text**
- Uses salted hashing algorithm for maximum security
- Even database access won't reveal actual passwords

### **4. Session Management & Auto-Logout**
Smart session handling to protect user data:
- **Session Duration:** 1 hour of inactivity
- **Auto-Refresh:** Session extends automatically with user activity
- **Warning System:** Alert 5 minutes before session expires
- **Secure Logout:** All session data cleared on logout

### **5. Remember Me Functionality**
- Securely saves email address (not password)
- Makes returning login faster
- Can be toggled on/off at login

### **6. Account Security Tracking**
Each user account maintains security metadata:
- Failed login attempt counter
- Account lockout status
- Last successful login timestamp
- Account creation date
- Active/Inactive status

### **7. Activity Logging**
All security-related events are logged:
- User registrations
- Successful logins
- Failed login attempts
- Account lockouts
- User logouts
- Session expirations

Access logs via browser console or future admin panel.

---

## 📊 User Flow Diagram

```
START
  ↓
Open System (index.html)
  ↓
Check Session Valid?
  ├── YES → Redirect to Dashboard
  └── NO → Redirect to Login Page
         ↓
    User Choice?
    ├── Login
    │   ↓
    │   Enter Email & Password
    │   ↓
    │   Account Locked?
    │   ├── YES → Show Lockout Message
    │   └── NO → Verify Credentials
    │       ↓
    │       Correct?
    │       ├── YES → Create Session → Dashboard
    │       └── NO → Increment Failed Attempts
    │           ↓
    │           Attempts ≥ 5?
    │           ├── YES → Lock Account
    │           └── NO → Show Remaining Attempts
    │
    └── Sign Up
        ↓
        Enter User Details & Password
        ↓
        Validate Password Strength
        ↓
        Check Requirements Met?
        ├── YES → Create Account → Switch to Login
        └── NO → Show Validation Errors
```

---

## 🔧 Technical Implementation

### **Files Modified/Created:**

1. **`/index.html`** - Main entry point with session check
2. **`/salaries/auth.html`** - Enhanced login/signup UI with security features
3. **`/salaries/auth.js`** - Complete authentication logic with security
4. **`/salaries/auth-guard.js`** - Session management and protection
5. **`/salaries/index.html`** - Protected with auth-guard.js

### **LocalStorage Keys Used:**

```javascript
ebs_users              // Array of all registered users
ebs_current_user       // Currently logged-in user session
ebs_session_data       // Session expiry and activity tracking
ebs_remembered_email   // Saved email for "Remember Me"
ebs_activity_log       // Security audit trail
```

---

## 🎯 Best Practices for Users

### **Creating Strong Passwords:**
❌ **Bad:** `password123`
❌ **Bad:** `johndoe2024`
✅ **Good:** `EBS@School2025!`
✅ **Good:** `Secure#Pass123$`

### **Account Security Tips:**
1. Never share your password with anyone
2. Use a unique password for this system
3. Log out when using shared computers
4. Keep your browser updated
5. Don't use "Remember Me" on public computers

---

## 🔍 Troubleshooting

### **"Account locked" message**
- **Cause:** Too many failed login attempts
- **Solution:** Wait 15 minutes and try again
- **Prevention:** Ensure you're using the correct password

### **"Session expired" message**
- **Cause:** No activity for 1 hour
- **Solution:** Simply log in again
- **Prevention:** Stay active or save your work regularly

### **"Password does not meet requirements"**
- **Cause:** Password too weak
- **Solution:** Include uppercase, lowercase, numbers, and special characters
- **Check:** Look at the requirement checklist while typing

### **Can't remember password**
- **Solution:** Contact system administrator
- **Future:** Password reset feature coming soon

---

## 📈 Security Metrics

The system tracks these security metrics:
- Total registered users
- Active user sessions
- Failed login attempts (per user)
- Account lockouts (with timestamps)
- Session duration statistics
- Login frequency patterns

---

## 🚨 Security Incident Response

If you suspect unauthorized access:
1. **Immediately logout** from all devices
2. **Contact system administrator**
3. **Review activity logs** for suspicious entries
4. **Change password** after verification

---

## 📞 Support

**Developer:** Chinyama Richard  
**Email:** chinyamarichard2019@gmail.com  
**Phone:** 0962299100

---

## 🔄 Version History

**Version 2.0** - Enhanced Security Update
- ✅ Password strength validation
- ✅ Brute force protection
- ✅ Account lockout mechanism
- ✅ Session timeout management
- ✅ Enhanced password hashing
- ✅ Activity logging
- ✅ Remember me functionality

**Version 1.0** - Initial Release
- Basic login/signup
- Simple password storage

---

## ⚡ Quick Start Commands

```bash
# Start XAMPP Apache Server
# Navigate to: http://localhost/eastboundarysystems/

# First Time Setup:
1. Click "Sign Up"
2. Create account with strong password
3. Login with your credentials
4. Access the system dashboard
```

---

**© 2025 East Boundary Systems. All Rights Reserved.**
