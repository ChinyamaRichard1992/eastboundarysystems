<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);

// Simple SMTP Email Sender Function
function sendSMTPEmail($to, $subject, $htmlMessage, $smtpConfig) {
    $from = $smtpConfig['email'];
    $fromName = $smtpConfig['senderName'];
    $host = $smtpConfig['host'];
    $port = $smtpConfig['port'];
    $username = $smtpConfig['email'];
    $password = $smtpConfig['password'];
    
    try {
        $socket = @fsockopen($host, $port, $errno, $errstr, 30);
        
        if (!$socket) {
            throw new Exception("Cannot connect to SMTP server: $errstr ($errno)");
        }
        
        // Read server response
        $response = fgets($socket, 515);
        
        // Send EHLO
        fputs($socket, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
        $response = fgets($socket, 515);
        
        // Start TLS
        fputs($socket, "STARTTLS\r\n");
        $response = fgets($socket, 515);
        
        // Enable crypto
        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        
        // Send EHLO again after TLS
        fputs($socket, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
        $response = fgets($socket, 515);
        
        // Authenticate
        fputs($socket, "AUTH LOGIN\r\n");
        $response = fgets($socket, 515);
        
        fputs($socket, base64_encode($username) . "\r\n");
        $response = fgets($socket, 515);
        
        fputs($socket, base64_encode($password) . "\r\n");
        $response = fgets($socket, 515);
        
        // Check if authentication failed
        if (substr($response, 0, 3) != '235') {
            throw new Exception("SMTP Authentication failed");
        }
        
        // Send email
        fputs($socket, "MAIL FROM: <$from>\r\n");
        $response = fgets($socket, 515);
        
        fputs($socket, "RCPT TO: <$to>\r\n");
        $response = fgets($socket, 515);
        
        fputs($socket, "DATA\r\n");
        $response = fgets($socket, 515);
        
        // Email headers and body
        $headers = "From: $fromName <$from>\r\n";
        $headers .= "Reply-To: $from\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        $email_content = $headers;
        $email_content .= "To: $to\r\n";
        $email_content .= "Subject: $subject\r\n\r\n";
        $email_content .= $htmlMessage;
        $email_content .= "\r\n.\r\n";
        
        fputs($socket, $email_content);
        $response = fgets($socket, 515);
        
        // Quit
        fputs($socket, "QUIT\r\n");
        fclose($socket);
        
        return true;
    } catch (Exception $e) {
        error_log("SMTP Error: " . $e->getMessage());
        return false;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = $input['email'] ?? '';
    $name = $input['name'] ?? 'User';
    $otp = $input['otp'] ?? '';
    $type = $input['type'] ?? 'signup';
    
    // Get SMTP configuration
    $smtpHost = $input['smtpHost'] ?? 'smtp.gmail.com';
    $smtpPort = $input['smtpPort'] ?? 587;
    $smtpEmail = $input['smtpEmail'] ?? '';
    $smtpPassword = $input['smtpPassword'] ?? '';
    $senderName = $input['senderName'] ?? 'East Boundary Systems';
    
    if (empty($email) || empty($otp)) {
        echo json_encode([
            'success' => false, 
            'error' => 'Email and OTP are required'
        ]);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false, 
            'error' => 'Invalid email format'
        ]);
        exit;
    }
    
    // Check if SMTP is configured
    if (empty($smtpEmail) || empty($smtpPassword)) {
        echo json_encode([
            'success' => false,
            'error' => 'Email system not configured. Please configure SMTP settings in email-config.html',
            'needsConfig' => true
        ]);
        exit;
    }
    
    // Prepare email content based on type
    if ($type === 'signup') {
        $subject = "Verify Your Email - East Boundary Systems";
        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🎓 East Boundary Systems</h1>
                    <p>Email Verification</p>
                </div>
                <div class='content'>
                    <h2>Hello {$name}!</h2>
                    <p>Thank you for registering with East Boundary Systems. To complete your registration, please use the OTP code below:</p>
                    
                    <div class='otp-box'>
                        <p style='margin: 0; color: #666; font-size: 14px;'>Your OTP Code:</p>
                        <div class='otp-code'>{$otp}</div>
                        <p style='margin: 10px 0 0 0; color: #666; font-size: 12px;'>⏰ Valid for 10 minutes</p>
                    </div>
                    
                    <p><strong>Important Security Notes:</strong></p>
                    <ul>
                        <li>This OTP is valid for <strong>10 minutes</strong></li>
                        <li>Never share this code with anyone</li>
                        <li>If you didn't request this, please ignore this email</li>
                        <li>This is an automated email, please do not reply</li>
                    </ul>
                    
                    <p>After entering this OTP, you'll be able to access your account immediately.</p>
                    
                    <p>Best regards,<br><strong>East Boundary Systems Team</strong></p>
                </div>
                <div class='footer'>
                    <p>© 2025 East Boundary Systems. All rights reserved.</p>
                    <p>Developer: Chinyama Richard | 0962299100</p>
                </div>
            </div>
        </body>
        </html>
        ";
    } else {
        // Login OTP
        $subject = "Login Verification - East Boundary Systems";
        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🔐 East Boundary Systems</h1>
                    <p>Login Verification</p>
                </div>
                <div class='content'>
                    <h2>Hello {$name}!</h2>
                    <p>A login attempt was made to your account. To continue, please use the OTP code below:</p>
                    
                    <div class='otp-box'>
                        <p style='margin: 0; color: #666; font-size: 14px;'>Your Login OTP:</p>
                        <div class='otp-code'>{$otp}</div>
                        <p style='margin: 10px 0 0 0; color: #666; font-size: 12px;'>⏰ Valid for 10 minutes</p>
                    </div>
                    
                    <div class='alert'>
                        <strong>⚠️ Security Alert:</strong> If you didn't try to login, please contact support immediately and change your password.
                    </div>
                    
                    <p><strong>Login Details:</strong></p>
                    <ul>
                        <li>📧 Email: {$email}</li>
                        <li>🕐 Time: " . date('Y-m-d H:i:s') . "</li>
                        <li>🌍 IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "</li>
                    </ul>
                    
                    <p>Best regards,<br><strong>East Boundary Systems Team</strong></p>
                </div>
                <div class='footer'>
                    <p>© 2025 East Boundary Systems. All rights reserved.</p>
                    <p>Developer: Chinyama Richard | 0962299100</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }
    
    // Prepare SMTP configuration
    $smtpConfig = [
        'host' => $smtpHost,
        'port' => $smtpPort,
        'email' => $smtpEmail,
        'password' => $smtpPassword,
        'senderName' => $senderName
    ];
    
    // Send email via SMTP
    $emailSent = sendSMTPEmail($email, $subject, $message, $smtpConfig);
    
    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'OTP sent successfully to your email',
            'email' => $email
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to send email. Please check SMTP configuration or try again later.'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid request method'
    ]);
}
?>
