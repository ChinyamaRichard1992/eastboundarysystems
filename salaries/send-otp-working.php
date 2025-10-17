<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/email_errors.log');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log function
function logMessage($message) {
    $logFile = __DIR__ . '/email_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Working SMTP function using fsockopen
function sendEmailViaSMTP($to, $subject, $htmlBody, $config) {
    logMessage("Starting SMTP send to: $to");
    
    $from = $config['email'];
    $fromName = $config['senderName'];
    $smtpHost = $config['host'];
    $smtpPort = (int)$config['port'];
    $username = $config['email'];
    $password = $config['password'];
    
    try {
        // Connect to SMTP server
        logMessage("Connecting to $smtpHost:$smtpPort");
        $socket = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, 30);
        
        if (!$socket) {
            throw new Exception("Cannot connect to SMTP server: $errstr ($errno)");
        }
        
        // Helper function to send SMTP command
        $sendCommand = function($command, $multiline = false) use ($socket) {
            logMessage("SMTP > $command");
            fputs($socket, $command . "\r\n");
            
            if ($multiline) {
                // Read multiple lines (for EHLO)
                $response = '';
                while ($line = fgets($socket, 515)) {
                    $response .= $line;
                    logMessage("SMTP < $line");
                    // Stop when we get a line that doesn't start with "250-"
                    if (substr($line, 3, 1) != '-') {
                        break;
                    }
                }
                return $response;
            } else {
                $response = fgets($socket, 515);
                logMessage("SMTP < $response");
                return $response;
            }
        };
        
        // Read greeting
        $response = fgets($socket, 515);
        logMessage("SMTP greeting: $response");
        if (substr($response, 0, 3) != '220') {
            throw new Exception("SMTP greeting failed: $response");
        }
        
        // Send EHLO - read multiline response
        $response = $sendCommand("EHLO localhost", true);
        if (substr($response, 0, 3) != '250') {
            throw new Exception("EHLO failed: $response");
        }
        
        // Start TLS
        $response = $sendCommand("STARTTLS");
        if (substr($response, 0, 3) != '220') {
            throw new Exception("STARTTLS failed: $response");
        }
        
        logMessage("Starting TLS encryption...");
        
        // Enable TLS
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception("Failed to enable TLS encryption");
        }
        
        logMessage("TLS encryption enabled successfully");
        
        // Send EHLO again after TLS - read multiline response
        $response = $sendCommand("EHLO localhost", true);
        if (substr($response, 0, 3) != '250') {
            throw new Exception("EHLO after TLS failed: $response");
        }
        
        // Authenticate
        $response = $sendCommand("AUTH LOGIN");
        if (substr($response, 0, 3) != '334') {
            throw new Exception("AUTH LOGIN failed: $response");
        }
        
        $response = $sendCommand(base64_encode($username));
        if (substr($response, 0, 3) != '334') {
            throw new Exception("Username auth failed: $response");
        }
        
        $response = $sendCommand(base64_encode($password));
        if (substr($response, 0, 3) != '235') {
            throw new Exception("Password auth failed. Check your Gmail App Password!");
        }
        
        logMessage("Authentication successful!");
        
        // Send MAIL FROM
        $response = $sendCommand("MAIL FROM: <$from>");
        if (substr($response, 0, 3) != '250') {
            throw new Exception("MAIL FROM failed: $response");
        }
        
        // Send RCPT TO
        $response = $sendCommand("RCPT TO: <$to>");
        if (substr($response, 0, 3) != '250') {
            throw new Exception("RCPT TO failed: $response");
        }
        
        // Send DATA
        $response = $sendCommand("DATA");
        if (substr($response, 0, 3) != '354') {
            throw new Exception("DATA command failed: $response");
        }
        
        // Prepare email headers and body
        $boundary = md5(uniqid(time()));
        $emailContent = "From: $fromName <$from>\r\n";
        $emailContent .= "To: <$to>\r\n";
        $emailContent .= "Subject: $subject\r\n";
        $emailContent .= "MIME-Version: 1.0\r\n";
        $emailContent .= "Content-Type: text/html; charset=UTF-8\r\n";
        $emailContent .= "\r\n";
        $emailContent .= $htmlBody;
        $emailContent .= "\r\n.\r\n";
        
        fputs($socket, $emailContent);
        $response = fgets($socket, 515);
        logMessage("Send result: $response");
        
        if (substr($response, 0, 3) != '250') {
            throw new Exception("Email sending failed: $response");
        }
        
        // Quit
        $sendCommand("QUIT");
        fclose($socket);
        
        logMessage("Email sent successfully to $to");
        return true;
        
    } catch (Exception $e) {
        logMessage("ERROR: " . $e->getMessage());
        if (isset($socket) && is_resource($socket)) {
            fclose($socket);
        }
        throw $e;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        logMessage("=== New OTP Request ===");
        logMessage("Input: " . json_encode($input));
        
        $email = $input['email'] ?? '';
        $name = $input['name'] ?? 'User';
        $otp = $input['otp'] ?? '';
        $type = $input['type'] ?? 'signup';
        
        $smtpHost = $input['smtpHost'] ?? 'smtp.gmail.com';
        $smtpPort = $input['smtpPort'] ?? 587;
        $smtpEmail = $input['smtpEmail'] ?? '';
        $smtpPassword = $input['smtpPassword'] ?? '';
        $senderName = $input['senderName'] ?? 'East Boundary Systems';
        
        // Validate required fields
        if (empty($email)) {
            throw new Exception('Email is required');
        }
        
        if (empty($otp)) {
            throw new Exception('OTP is required');
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }
        
        if (empty($smtpEmail) || empty($smtpPassword)) {
            logMessage("ERROR: SMTP not configured");
            echo json_encode([
                'success' => false,
                'error' => 'Email system not configured. Please configure SMTP settings first.',
                'needsConfig' => true,
                'debugInfo' => 'SMTP email or password is missing'
            ]);
            exit;
        }
        
        // Prepare email subject and body
        $subject = ($type === 'signup') 
            ? "Verify Your Email - East Boundary Systems"
            : "Login Verification - East Boundary Systems";
        
        $htmlBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
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
    <div class='container'>
        <div class='header'>
            <h1>🎓 East Boundary Systems</h1>
            <p style='margin: 10px 0 0 0; font-size: 16px;'>Email Verification</p>
        </div>
        <div class='content'>
            <h2 style='color: #2c3e50; margin-top: 0;'>Hello $name!</h2>
            <p>Thank you for registering with East Boundary Systems. To complete your registration, please use the OTP code below:</p>
            
            <div class='otp-box'>
                <p style='margin: 0 0 10px 0; color: #666; font-size: 14px;'>Your OTP Code:</p>
                <div class='otp-code'>$otp</div>
                <p style='margin: 15px 0 0 0; color: #666; font-size: 13px;'>⏰ Valid for 10 minutes</p>
            </div>
            
            <div class='info-box'>
                <p style='margin: 0; color: #856404; font-size: 14px;'><strong>⚠️ Important Security Notes:</strong></p>
                <ul style='margin: 10px 0 0 20px; padding: 0; color: #856404; font-size: 13px;'>
                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>This is an automated email, please do not reply</li>
                </ul>
            </div>
            
            <p style='margin-top: 20px;'>After entering this OTP, you'll be able to access your account immediately.</p>
            
            <p style='margin-top: 25px;'>Best regards,<br><strong>East Boundary Systems Team</strong></p>
        </div>
        <div class='footer'>
            <p style='margin: 5px 0;'>© 2025 East Boundary Systems. All rights reserved.</p>
            <p style='margin: 5px 0;'>Developer: Chinyama Richard | 0962299100</p>
            <p style='margin: 5px 0; font-size: 11px; color: #999;'>chinyamarichard2019@gmail.com</p>
        </div>
    </div>
</body>
</html>";
        
        // Prepare SMTP config
        $smtpConfig = [
            'host' => $smtpHost,
            'port' => $smtpPort,
            'email' => $smtpEmail,
            'password' => $smtpPassword,
            'senderName' => $senderName
        ];
        
        logMessage("Attempting to send email to: $email");
        logMessage("SMTP Host: $smtpHost:$smtpPort");
        logMessage("SMTP User: $smtpEmail");
        
        // Send email
        sendEmailViaSMTP($email, $subject, $htmlBody, $smtpConfig);
        
        logMessage("SUCCESS: Email sent to $email");
        
        echo json_encode([
            'success' => true,
            'message' => 'OTP sent successfully to your email',
            'email' => $email,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        logMessage("EXCEPTION: " . $e->getMessage());
        
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'debugInfo' => 'Check email_debug.log for details',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid request method. Use POST.'
    ]);
}
?>
