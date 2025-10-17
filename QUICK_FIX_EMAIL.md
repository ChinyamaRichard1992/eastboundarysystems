# 🚨 QUICK FIX - Email Not Sending

## ⚡ IMMEDIATE SOLUTION (5 Minutes)

### **Step 1: Run Diagnostic (30 seconds)**
```
Open: http://localhost/eastboundarysystems/salaries/email-diagnostic.html
Click: "Run Complete Diagnostic"
```

This will tell you EXACTLY what's wrong.

---

### **Step 2: Most Common Issues**

#### **Issue A: SMTP Not Configured** ❌
**Symptom:** Diagnostic shows "SMTP not configured"

**Fix:**
1. Open: http://localhost/eastboundarysystems/salaries/email-config.html
2. Get Gmail App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Create App Password for "Mail"
   - Copy 16-character password (e.g., `abcd efgh ijkl mnop`)
3. Enter in configuration:
   - Gmail: your-email@gmail.com
   - Password: (paste 16-char password, remove spaces)
   - Example: `abcdefghijklmnop` (no spaces!)
4. Click "Save Configuration"
5. Click "Send Test Email"
6. Check your Gmail inbox

#### **Issue B: Wrong App Password** ❌
**Symptom:** "SMTP authentication failed"

**Fix:**
1. Your App Password is wrong
2. Go to: https://myaccount.google.com/apppasswords
3. DELETE old App Password
4. CREATE new App Password
5. Copy it (it looks like: `abcd efgh ijkl mnop`)
6. **REMOVE ALL SPACES:** `abcdefghijklmnop`
7. Update in email-config.html
8. Save and test again

#### **Issue C: XAMPP Not Running** ❌
**Symptom:** "Cannot connect" or "Failed to fetch"

**Fix:**
1. Open XAMPP Control Panel
2. Make sure Apache is RUNNING (green)
3. Make sure Apache says "Started" not "Stopped"
4. If not, click "Start" button for Apache
5. Try again

#### **Issue D: PHP Not Working** ❌
**Symptom:** HTTP 500 error or blank page

**Fix:**
1. Check XAMPP PHP is enabled
2. Test PHP:
   - Create file: `test.php`
   - Content: `<?php phpinfo(); ?>`
   - Open: http://localhost/eastboundarysystems/salaries/test.php
   - Should show PHP info page
3. If not working, reinstall XAMPP

---

### **Step 3: Quick Test**

Open browser console (F12) and run:

```javascript
// Check configuration
console.log('SMTP Email:', localStorage.getItem('ebs_smtp_email'));
console.log('SMTP Password Length:', (localStorage.getItem('ebs_smtp_password') || '').length);

// Should show:
// SMTP Email: your-email@gmail.com
// SMTP Password Length: 16
```

If password length is NOT 16, you need to remove spaces from App Password!

---

## 🎯 Test Right Now

### **Console Test:**
```javascript
// Open browser console (F12) and paste this:

fetch('send-otp-working.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: localStorage.getItem('ebs_smtp_email'),
        name: 'Test User',
        otp: '123456',
        type: 'signup',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpEmail: localStorage.getItem('ebs_smtp_email'),
        smtpPassword: localStorage.getItem('ebs_smtp_password'),
        senderName: 'Test'
    })
})
.then(r => r.json())
.then(data => console.log('Result:', data))
.catch(err => console.error('Error:', err));

// Check output:
// If success: true → Email system working! ✅
// If success: false → Read error message
```

---

## 📋 Checklist

Before signup works, verify:

- [ ] XAMPP Apache is running
- [ ] PHP is working (test with phpinfo)
- [ ] Gmail App Password generated (16 characters)
- [ ] App Password saved in email-config.html
- [ ] App Password has NO SPACES
- [ ] Test email sent successfully
- [ ] Test email received in Gmail inbox
- [ ] Diagnostic shows all green checkmarks

---

## 🔥 Still Not Working?

### **Check Debug Log:**

Location: `c:\xampp\htdocs\eastboundarysystems\salaries\email_debug.log`

Open this file and check the last lines. It will show the exact error.

Common errors:
- **"Cannot connect"** → Check internet, firewall
- **"Authentication failed"** → Wrong App Password
- **"Connection refused"** → XAMPP not running
- **"500 error"** → PHP error, check PHP logs

### **Enable Detailed Logging:**

In `send-otp-working.php`, line 2-4 already has:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
```

This logs everything to `email_debug.log`

---

## ✅ When It Works

You'll see:
1. Diagnostic: All green checkmarks ✅
2. Test email: Received in Gmail inbox ✅
3. Console: `success: true` ✅
4. Log file: "Email sent successfully" ✅

Then signup will work perfectly!

---

## 🎓 Complete Setup (If Starting Fresh)

```bash
1. Make sure XAMPP is running
   → Apache: Started (green)

2. Get Gmail App Password
   → https://myaccount.google.com/apppasswords
   → Create for "Mail"
   → Copy: abcdefghijklmnop (no spaces!)

3. Configure
   → http://localhost/eastboundarysystems/salaries/email-config.html
   → Enter Gmail: your@gmail.com
   → Enter Password: abcdefghijklmnop
   → Save

4. Test
   → Click "Send Test Email"
   → Check inbox
   → Should receive OTP: 123456

5. Verify
   → http://localhost/eastboundarysystems/salaries/email-diagnostic.html
   → Run diagnostic
   → All should be green ✅

6. Signup
   → http://localhost/eastboundarysystems/
   → Sign Up tab
   → Fill form
   → Click "Verify Email & Continue"
   → OTP sent to email ✅
   → Enter OTP
   → Account created ✅
```

---

## 📞 Emergency Contacts

**Developer:** Chinyama Richard  
**Email:** chinyamarichard2019@gmail.com  
**Phone:** 0962299100

---

## 🔍 Debug Commands

```javascript
// Clear all settings (start fresh)
localStorage.clear();

// View all settings
Object.keys(localStorage)
  .filter(k => k.startsWith('ebs_'))
  .forEach(k => console.log(k, localStorage.getItem(k)));

// Set settings manually
localStorage.setItem('ebs_smtp_host', 'smtp.gmail.com');
localStorage.setItem('ebs_smtp_port', '587');
localStorage.setItem('ebs_smtp_email', 'your@gmail.com');
localStorage.setItem('ebs_smtp_password', 'abcdefghijklmnop');
localStorage.setItem('ebs_sender_name', 'East Boundary Systems');

// Test immediately
window.location.reload();
```

---

**Bottom Line:** The diagnostic page will tell you exactly what's wrong. Run it first!

**© 2025 East Boundary Systems**
