// Vercel Serverless Function - Send OTP via Email
// Replaces: salaries/send-otp-working.php

const nodemailer = require('nodemailer');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const {
      email,
      name = 'User',
      otp,
      type = 'signup',
      smtpHost = 'smtp.gmail.com',
      smtpPort = 587,
      smtpEmail,
      smtpPassword,
      senderName = 'East Boundary Systems'
    } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check SMTP configuration
    if (!smtpEmail || !smtpPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email system not configured. Please configure SMTP settings.',
        needsConfig: true
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // Use STARTTLS
      auth: {
        user: smtpEmail,
        pass: smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Prepare email subject and body
    const subject = type === 'signup'
      ? 'Verify Your Email - East Boundary Systems'
      : 'Login Verification - East Boundary Systems';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 3px dashed #667eea; padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px; }
        .otp-code { font-size: 42px; font-weight: bold; color: #667eea; letter-spacing: 10px; font-family: 'Courier New', monospace; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 East Boundary Systems</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
        </div>
        <div class="content">
            <h2 style="color: #2c3e50; margin-top: 0;">Hello ${name}!</h2>
            <p>Thank you for registering with East Boundary Systems. To complete your registration, please use the OTP code below:</p>
            
            <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your OTP Code:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 15px 0 0 0; color: #666; font-size: 13px;">⏰ Valid for 10 minutes</p>
            </div>
            
            <div class="info-box">
                <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⚠️ Important Security Notes:</strong></p>
                <ul style="margin: 10px 0 0 20px; padding: 0; color: #856404; font-size: 13px;">
                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>This is an automated email, please do not reply</li>
                </ul>
            </div>
            
            <p style="margin-top: 20px;">After entering this OTP, you'll be able to access your account immediately.</p>
            
            <p style="margin-top: 25px;">Best regards,<br><strong>East Boundary Systems Team</strong></p>
        </div>
        <div class="footer">
            <p style="margin: 5px 0;">© 2025 East Boundary Systems. All rights reserved.</p>
            <p style="margin: 5px 0;">Developer: Chinyama Richard | 0962299100</p>
            <p style="margin: 5px 0; font-size: 11px; color: #999;">chinyamarichard2019@gmail.com</p>
        </div>
    </div>
</body>
</html>`;

    // Send email
    const info = await transporter.sendMail({
      from: `"${senderName}" <${smtpEmail}>`,
      to: email,
      subject: subject,
      html: htmlBody
    });

    console.log('Email sent:', info.messageId);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      email: email,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email error:', error);

    let errorMessage = 'Failed to send email';
    if (error.message.includes('auth')) {
      errorMessage = 'Authentication failed. Check your Gmail App Password.';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Cannot connect to email server. Check your internet connection.';
    } else {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
