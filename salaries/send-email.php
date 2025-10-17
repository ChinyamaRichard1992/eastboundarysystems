<?php
// Gmail SMTP Email Sender for Payslips
// No external libraries required - uses PHP's built-in mail() with Gmail SMTP configuration

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only POST requests allowed']);
    exit();
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data received');
    }
    
    // Extract email configuration
    $gmailAddress = $data['gmailAddress'] ?? '';
    $gmailPassword = $data['gmailPassword'] ?? '';
    $senderName = $data['senderName'] ?? 'Payroll System';
    $recipientEmail = $data['recipientEmail'] ?? '';
    $recipientName = $data['recipientName'] ?? '';
    $subject = $data['subject'] ?? 'Payslip';
    $messageBody = $data['message'] ?? '';
    $pdfBase64 = $data['pdfData'] ?? '';
    $pdfFilename = $data['pdfFilename'] ?? 'payslip.pdf';
    
    // Validate required fields
    if (empty($gmailAddress) || empty($gmailPassword)) {
        throw new Exception('Gmail credentials not configured. Please set up Gmail SMTP in Settings.');
    }
    
    if (empty($recipientEmail)) {
        throw new Exception('Recipient email is required');
    }
    
    if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid recipient email address');
    }
    
    if (!filter_var($gmailAddress, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid Gmail address');
    }
    
    // Decode PDF (optional for test emails)
    $pdfBinary = null;
    if (!empty($pdfBase64)) {
        $pdfBinary = base64_decode($pdfBase64);
        if ($pdfBinary === false) {
            throw new Exception('Invalid PDF data');
        }
    }
    
    // Create boundary for multipart email
    $boundary = md5(time());
    
    // Email headers
    $headers = "From: $senderName <$gmailAddress>\r\n";
    $headers .= "Reply-To: $gmailAddress\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    // Build email body
    $message = "--$boundary\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $message .= $messageBody . "\r\n\r\n";
    
    // Attach PDF if provided
    if ($pdfBinary !== null && !empty($pdfFilename)) {
        $message .= "--$boundary\r\n";
        $message .= "Content-Type: application/pdf; name=\"$pdfFilename\"\r\n";
        $message .= "Content-Disposition: attachment; filename=\"$pdfFilename\"\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split($pdfBase64) . "\r\n";
    }
    
    $message .= "--$boundary--";
    
    // Use direct Gmail SMTP connection (skip mail() function)
    $sent = sendViaGmailSMTP(
        $gmailAddress,
        $gmailPassword,
        $recipientEmail,
        $recipientName,
        $subject,
        $messageBody,
        $pdfBinary,
        $pdfFilename,
        $senderName
    );
    
    if ($sent) {
        echo json_encode([
            'success' => true,
            'message' => "Email sent successfully to $recipientEmail"
        ]);
    } else {
        throw new Exception('Failed to send email. Please check SMTP configuration.');
    }
    
} catch (Exception $e) {
    http_response_code(200); // Changed to 200 so JS can parse the JSON error
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ]);
}

/**
 * Send email via Gmail SMTP using socket connection
 */
function sendViaGmailSMTP($gmailAddress, $gmailPassword, $to, $toName, $subject, $htmlBody, $pdfBinary, $pdfFilename, $fromName) {
    try {
        // Gmail SMTP settings
        $smtpHost = 'smtp.gmail.com';
        $smtpPort = 587; // TLS
        
        // Create socket connection
        $socket = fsockopen($smtpHost, $smtpPort, $errno, $errstr, 30);
        
        if (!$socket) {
            throw new Exception("Failed to connect to Gmail SMTP: $errstr ($errno)");
        }
        
        // Helper function to send SMTP command and read multiline responses
        $send = function($cmd) use ($socket) {
            fwrite($socket, $cmd . "\r\n");
            fflush($socket);
            
            $response = '';
            // Read all lines of the response (multiline responses end with code followed by space, not dash)
            while (true) {
                $line = fgets($socket, 512);
                $response .= $line;
                
                // Check if this is the last line (code followed by space, not dash)
                if (preg_match('/^\d{3} /', $line)) {
                    break;
                }
                
                // Prevent infinite loop
                if (feof($socket)) {
                    break;
                }
            }
            
            return trim($response);
        };
        
        // Read server greeting (220)
        $response = fgets($socket, 512);
        if (strpos($response, '220') === false) {
            throw new Exception("Failed to connect: $response");
        }
        
        // Send EHLO
        $response = $send("EHLO localhost");
        error_log("EHLO Response: " . substr($response, 0, 100));
        if (strpos($response, '250') === false) {
            throw new Exception("EHLO failed: " . substr($response, 0, 200));
        }
        
        // Start TLS - Gmail responds with 220 Ready to start TLS
        $response = $send("STARTTLS");
        error_log("STARTTLS Response: " . substr($response, 0, 100));
        if (strpos($response, '220') === false) {
            throw new Exception("STARTTLS failed. Expected 220, got: " . substr($response, 0, 200));
        }
        
        // Enable TLS encryption with better crypto method
        $cryptoMethod = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
        $result = @stream_socket_enable_crypto($socket, true, $cryptoMethod);
        
        if (!$result) {
            // Try with any TLS version if specific ones fail
            $result = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_ANY_CLIENT);
            if (!$result) {
                throw new Exception("Failed to enable TLS encryption. Check OpenSSL extension.");
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
        $emailData .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n\r\n";
        
        // HTML body
        $emailData .= "--$boundary\r\n";
        $emailData .= "Content-Type: text/html; charset=UTF-8\r\n";
        $emailData .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $emailData .= $htmlBody . "\r\n\r\n";
        
        // PDF attachment (if provided)
        if ($pdfBinary !== null && !empty($pdfFilename)) {
            $emailData .= "--$boundary\r\n";
            $emailData .= "Content-Type: application/pdf; name=\"$pdfFilename\"\r\n";
            $emailData .= "Content-Disposition: attachment; filename=\"$pdfFilename\"\r\n";
            $emailData .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $emailData .= chunk_split(base64_encode($pdfBinary)) . "\r\n";
        }
        
        $emailData .= "--$boundary--\r\n";
        
        // Send email data
        fwrite($socket, $emailData);
        $send(".");
        
        // Quit
        $send("QUIT");
        
        // Close connection
        fclose($socket);
        
        return true;
        
    } catch (Exception $e) {
        error_log("Gmail SMTP Error: " . $e->getMessage());
        
        // Close socket if still open
        if (isset($socket) && is_resource($socket)) {
            fclose($socket);
        }
        
        // Throw exception so the main handler can catch it
        throw $e;
    }
}
?>
