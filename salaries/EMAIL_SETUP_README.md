# Gmail SMTP Email Setup for Payroll System

## ✅ Real-Time Email Sending with Gmail

This payroll system now sends **real-time emails** using Gmail SMTP. No third-party services like EmailJS are used.

---

## 📋 Setup Instructions

### Step 1: Enable Gmail App Password

1. Go to your **Google Account**: [https://myaccount.google.com](https://myaccount.google.com)
2. Navigate to **Security** → [https://myaccount.google.com/security](https://myaccount.google.com/security)
3. Enable **2-Step Verification** (if not already enabled)
4. Scroll down to **App Passwords**
5. Click **App Passwords**
6. Select **Mail** as the app
7. Select **Other** as the device and type "Payroll System"
8. Click **Generate**
9. **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)

### Step 2: Configure Email Settings in the System

1. Open the Payroll System
2. Go to **Payroll Processing** tab
3. Click the **Settings** button (⚙️)
4. Scroll to **Email Configuration (Gmail SMTP)** section
5. Fill in:
   - **Gmail Address**: Your Gmail email (e.g., `youremail@gmail.com`)
   - **Gmail App Password**: Paste the 16-character password from Step 1
   - **Sender Name**: E.g., "East Boundary Systems - Payroll"
   - **Company Email**: Your company reply-to email
   - **Email Subject Template**: Customize as needed
   - **Email Message Template**: Customize as needed

6. Click **Test Email Connection** button to verify setup
7. Check your Gmail inbox for the test email
8. If successful, click **Save Email Settings**

---

## 🚀 Sending Payslips

### Send All Payslips
1. Go to **Payroll Processing** tab
2. Run or Load a payroll
3. Click **Approve Payroll**
4. Click **Generate All Payslips**
5. Click **Send All Payslips via Email**
6. Confirm the action
7. Emails will be sent **in real-time** to all employees

### Send Individual Payslip
1. Go to **Payslips** tab
2. Find the employee's payslip
3. Click the envelope icon (✉️) to send email
4. Email will be sent immediately

---

## 🔧 Technical Details

### Email Backend
- **File**: `send-email.php`
- **Method**: PHP SMTP socket connection to Gmail
- **Port**: 587 (TLS encryption)
- **Server**: smtp.gmail.com

### Security
- Gmail App Password is stored in browser localStorage (encrypted by browser)
- Password is never sent to any external service
- All emails are sent directly via Gmail SMTP
- PDF payslips are attached as base64-encoded attachments

### Email Features
- ✅ Real-time sending (no delays)
- ✅ PDF payslip attachment
- ✅ HTML formatted emails
- ✅ Professional design
- ✅ Error handling and retry logic
- ✅ Email delivery confirmation
- ✅ Email status tracking

---

## ⚠️ Troubleshooting

### Error: "Gmail authentication failed"
- **Cause**: Wrong Gmail address or App Password
- **Solution**: Double-check your Gmail and regenerate App Password

### Error: "Failed to connect to Gmail SMTP"
- **Cause**: Internet connection issue or firewall blocking
- **Solution**: Check internet connection and firewall settings

### Error: "Gmail SMTP not configured"
- **Cause**: Settings not saved
- **Solution**: Go to Settings and save your Gmail configuration

### Emails not arriving
- **Check**: Gmail Sent folder
- **Check**: Recipient's spam/junk folder
- **Check**: Email address is correct in employee records

### Test Email Not Working
1. Verify 2-Step Verification is enabled
2. Regenerate App Password
3. Copy password exactly (no spaces)
4. Check internet connection
5. Try from a different browser

---

## 📧 Email Template Variables

You can use these variables in your email templates:

- `{employee_name}` - Employee's full name
- `{month}` - Month name
- `{year}` - Year
- `{net_pay}` - Net pay amount
- `{gross_salary}` - Gross salary amount

---

## 🛡️ Security Best Practices

1. **Never share your Gmail App Password** with anyone
2. Keep your Gmail account secure with strong password
3. Enable 2-Step Verification on your Gmail
4. Regularly review Google Account activity
5. Use a dedicated Gmail account for the payroll system (recommended)

---

## 📝 System Requirements

- PHP 7.0 or higher
- `fsockopen()` enabled in PHP
- OpenSSL extension enabled
- Internet connection
- Gmail account with 2-Step Verification

---

## ✨ Developer Credits

**System Developed by:** Chinyama Richard  
**Phone:** 0962299100  
**Email:** chinyamarichard2019@gmail.com

---

## 📞 Support

For any issues or questions, contact:
- **Developer**: Chinyama Richard
- **Phone**: 0962299100
- **Email**: chinyamarichard2019@gmail.com

---

Last Updated: October 2025
