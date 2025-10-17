<?php
// Email Verification System
// Sends real verification emails using Gmail SMTP

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => 'Only POST requests allowed']);
    exit();
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    $type = $data['type'] ?? ''; // 'verification' or 'otp'
    $email = $data['email'] ?? '';
    $name = $data['name'] ?? '';
    $verificationCode = $data['verificationCode'] ?? '';
    $otpCode = $data['otpCode'] ?? '';
    
    // Get Gmail credentials from request (sent from frontend)
    $gmailAddress = $data['gmailAddress'] ?? '';
    $gmailPassword = $data['gmailPassword'] ?? '';
    $senderName = $data['senderName'] ?? 'East Boundary Systems';
    
    if (!$gmailAddress || !$gmailPassword) {
        throw new Exception('Gmail SMTP not configured. Please configure in Settings.');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email address');
    }
    
    // Prepare email content based on type
    if ($type === 'verification') {
        // Use actual server IP for cross-device access
        $serverIP = $_SERVER['HTTP_HOST'] ?? '192.168.215.96';
        $verificationLink = "http://{$serverIP}/eastboundarysystems/salaries/verify-email.html?code=" . urlencode($verificationCode) . "&email=" . urlencode($email);
        $manualLink = "http://{$serverIP}/eastboundarysystems/salaries/verify-email.html";
        
        $subject = "Verify Your Email - East Boundary Systems";
        $htmlBody = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 40px 30px; }
                .content h2 { color: #2c3e50; margin-top: 0; }
                .content p { color: #555; line-height: 1.6; font-size: 15px; }
                .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .btn:hover { opacity: 0.9; }
                .code-box { background: #f8f9fa; border: 2px dashed #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: monospace; }
                .manual-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .manual-box h3 { color: #856404; margin-top: 0; font-size: 16px; }
                .manual-box p { color: #856404; margin: 5px 0; font-size: 14px; }
                .manual-box code { background: #fff; padding: 5px 10px; border-radius: 3px; font-family: monospace; color: #333; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>📧 Email Verification</h1>
                </div>
                <div class='content'>
                    <h2>Welcome, {$name}!</h2>
                    <p>Thank you for registering with East Boundary Systems Payroll Management System.</p>
                    
                    <p><strong>Your 6-Digit Verification Code:</strong></p>
                    <div class='code-box'>
                        <div class='code'>{$verificationCode}</div>
                    </div>
                    
                    <div class='manual-box'>
                        <h3>📋 Manual Verification Steps:</h3>
                        <p><strong>1.</strong> Open your web browser</p>
                        <p><strong>2.</strong> Copy and paste this URL:</p>
                        <p><code>{$manualLink}</code></p>
                        <p><strong>3.</strong> Enter your email: <code>{$email}</code></p>
                        <p><strong>4.</strong> Enter the code above: <code>{$verificationCode}</code></p>
                        <p><strong>5.</strong> Click 'Verify Email'</p>
                    </div>
                    
                    <p style='font-size: 13px; color: #6c757d;'><em>Note: If the button below doesn't work, please follow the manual steps above.</em></p>
                    
                    <center>
                        <a href='{$verificationLink}' class='btn'>✅ Quick Verify (Click Here)</a>
                    </center>
                    
                    <p><strong>⏰ This verification code expires in 24 hours.</strong></p>
                    
                    <p>If you didn't create an account, please ignore this email.</p>
                </div>
                <div class='footer'>
                    <p>© 2025 East Boundary Systems. All rights reserved.</p>
                    <p>Developed by Chinyama Richard | 0962299100</p>
                </div>
            </div>
        </body>
        </html>
        ";
    } else if ($type === 'otp') {
        $subject = "Your Login OTP Code - East Boundary Systems";
        $htmlBody = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 40px 30px; }
                .content h2 { color: #2c3e50; margin-top: 0; }
                .content p { color: #555; line-height: 1.6; font-size: 15px; }
                .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 25px 0; }
                .otp { font-size: 36px; font-weight: 900; letter-spacing: 8px; margin: 10px 0; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; color: #856404; margin: 20px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🔐 Login OTP Code</h1>
                </div>
                <div class='content'>
                    <h2>Hello, {$name}!</h2>
                    <p>You requested to login to your East Boundary Systems account.</p>
                    <p>Here is your One-Time Password (OTP):</p>
                    
                    <div class='otp-box'>
                        <p style='margin: 0; font-size: 14px; opacity: 0.9;'>Your OTP Code</p>
                        <div class='otp'>{$otpCode}</div>
                        <p style='margin: 0; font-size: 13px; opacity: 0.8;'>Valid for 5 minutes</p>
                    </div>
                    
                    <div class='warning'>
                        <strong>⚠️ Security Notice:</strong><br>
                        • This OTP expires in 5 minutes<br>
                        • Never share this code with anyone<br>
                        • If you didn't request this code, ignore this email
                    </div>
                    
                    <p>Enter this code on the login page to complete your signin.</p>
                </div>
                <div class='footer'>
                    <p>© 2025 East Boundary Systems. All rights reserved.</p>
                    <p>Developed by Chinyama Richard | 0962299100</p>
                </div>
            </div>
        </body>
        </html>
        ";
    } else {
        throw new Exception('Invalid email type');
    }
    
    // Send email using Gmail SMTP
    $sent = sendViaGmailSMTP($gmailAddress, $gmailPassword, $email, $name, $subject, $htmlBody, $senderName);
    
    if ($sent) {
        echo json_encode([
            'success' => true,
            'message' => 'Email sent successfully'
        ]);
    } else {
        throw new Exception('Failed to send email');
    }
    
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Send email via Gmail SMTP using socket connection
 */
function sendViaGmailSMTP($gmailAddress, $gmailPassword, $to, $toName, $subject, $htmlBody, $fromName) {
    try {
        $smtpHost = 'smtp.gmail.com';
        $smtpPort = 587;
        
        $socket = fsockopen($smtpHost, $smtpPort, $errno, $errstr, 30);
        
        if (!$socket) {
            throw new Exception("Failed to connect to Gmail SMTP: $errstr ($errno)");
        }
        
        $send = function($cmd) use ($socket) {
            fwrite($socket, $cmd . "\r\n");
            fflush($socket);
            
            $response = '';
            while (true) {
                $line = fgets($socket, 512);
                $response .= $line;
                
                if (preg_match('/^\d{3} /', $line)) {
                    break;
                }
                
                if (feof($socket)) {
                    break;
                }
            }
            
            return trim($response);
        };
        
        // Read server greeting
        $response = fgets($socket, 512);
        if (strpos($response, '220') === false) {
            throw new Exception("Failed to connect: $response");
        }
        
        // Send EHLO
        $response = $send("EHLO localhost");
        if (strpos($response, '250') === false) {
            throw new Exception("EHLO failed: $response");
        }
        
        // Start TLS
        $response = $send("STARTTLS");
        if (strpos($response, '220') === false) {
            throw new Exception("STARTTLS failed: $response");
        }
        
        // Enable TLS encryption
        $cryptoMethod = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
        $result = @stream_socket_enable_crypto($socket, true, $cryptoMethod);
        
        if (!$result) {
            $result = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_ANY_CLIENT);
            if (!$result) {
                throw new Exception("Failed to enable TLS encryption");
            }
        }
        
        // Send EHLO again after TLS
        $response = $send("EHLO localhost");
        if (strpos($response, '250') === false) {
            throw new Exception("EHLO after TLS failed: $response");
        }
        
        // Authenticate
        $send("AUTH LOGIN");
        $send(base64_encode($gmailAddress));
        $response = $send(base64_encode($gmailPassword));
        
        if (strpos($response, '235') === false) {
            throw new Exception('Gmail authentication failed. Check your Gmail address and App Password.');
        }
        
        // Send email envelope
        $send("MAIL FROM: <$gmailAddress>");
        $send("RCPT TO: <$to>");
        $send("DATA");
        
        // Email headers and body
        $boundary = md5(time());
        
        $emailData = "From: $fromName <$gmailAddress>\r\n";
        $emailData .= "To: $toName <$to>\r\n";
        $emailData .= "Subject: $subject\r\n";
        $emailData .= "MIME-Version: 1.0\r\n";
        $emailData .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
        $emailData .= $htmlBody . "\r\n";
        
        // Send email data
        fwrite($socket, $emailData);
        $send(".");
        
        // Quit
        $send("QUIT");
        
        // Close connection
        fclose($socket);
        
        return true;
        
    } catch (Exception $e) {
        if (isset($socket) && is_resource($socket)) {
            fclose($socket);
        }
        
        throw $e;
    }
}
?>
