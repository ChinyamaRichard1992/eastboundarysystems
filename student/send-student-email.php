<?php
// Student Email System
// Sends student information and payment details to guardian via Gmail SMTP

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
    
    // Get Gmail credentials
    $gmailAddress = $data['gmailAddress'] ?? '';
    $gmailPassword = $data['gmailPassword'] ?? '';
    $senderName = $data['senderName'] ?? 'East Boundary Systems';
    
    if (!$gmailAddress || !$gmailPassword) {
        throw new Exception('Gmail SMTP not configured. Please contact administrator.');
    }
    
    // Get student data
    $student = $data['student'] ?? null;
    $paymentData = $data['paymentData'] ?? null;
    
    if (!$student || !isset($student['guardianEmail'])) {
        throw new Exception('Student data or guardian email missing');
    }
    
    $guardianEmail = $student['guardianEmail'];
    if (!filter_var($guardianEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid guardian email address');
    }
    
    // Prepare email content
    $subject = "Student Information & Payment Summary - " . $student['name'];
    
    // Format payment details
    $paymentHtml = '';
    if ($paymentData) {
        $totalFee = number_format($paymentData['totalFee'] ?? 0, 2);
        $amountPaid = number_format($paymentData['amountPaid'] ?? 0, 2);
        $balance = number_format($paymentData['balance'] ?? 0, 2);
        $status = $paymentData['status'] ?? 'No Payment';
        $term = $paymentData['term'] ?? 'N/A';
        
        $statusColor = '#dc3545'; // red
        if ($status === 'Fully Paid') $statusColor = '#28a745'; // green
        if ($status === 'Partly Paid') $statusColor = '#ffc107'; // yellow
        
        $paymentHtml = "
        <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #2c3e50; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;'>
                <i>💳</i> Payment Summary
            </h3>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6;'><strong>Academic Term:</strong></td>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right;'>{$term}</td>
                </tr>
                <tr>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6;'><strong>Total Fees:</strong></td>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 18px; color: #2c3e50;'><strong>K {$totalFee}</strong></td>
                </tr>
                <tr>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6;'><strong>Amount Paid:</strong></td>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 18px; color: #28a745;'><strong>K {$amountPaid}</strong></td>
                </tr>
                <tr>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6;'><strong>Balance Due:</strong></td>
                    <td style='padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 18px; color: #dc3545;'><strong>K {$balance}</strong></td>
                </tr>
                <tr>
                    <td style='padding: 10px;'><strong>Payment Status:</strong></td>
                    <td style='padding: 10px; text-align: right;'>
                        <span style='background: {$statusColor}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 14px;'>{$status}</span>
                    </td>
                </tr>
            </table>
        </div>";
        
        // Add payment history if available
        if (isset($paymentData['payments']) && count($paymentData['payments']) > 0) {
            $paymentHtml .= "
            <div style='background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin: 20px 0;'>
                <h3 style='color: #2c3e50; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;'>
                    <i>📋</i> Payment History
                </h3>
                <table style='width: 100%; border-collapse: collapse;'>
                    <thead>
                        <tr style='background: #f8f9fa;'>
                            <th style='padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;'>Date</th>
                            <th style='padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;'>Description</th>
                            <th style='padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;'>Amount</th>
                        </tr>
                    </thead>
                    <tbody>";
            
            foreach ($paymentData['payments'] as $payment) {
                $paidDate = date('M d, Y', strtotime($payment['date'] ?? 'now'));
                $paidAmount = number_format($payment['paid'] ?? 0, 2);
                $description = htmlspecialchars($payment['description'] ?? 'Payment');
                
                $paymentHtml .= "
                        <tr>
                            <td style='padding: 10px; border-bottom: 1px solid #dee2e6;'>{$paidDate}</td>
                            <td style='padding: 10px; border-bottom: 1px solid #dee2e6;'>{$description}</td>
                            <td style='padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right; color: #28a745;'><strong>K {$paidAmount}</strong></td>
                        </tr>";
            }
            
            $paymentHtml .= "
                    </tbody>
                </table>
            </div>";
        }
    } else {
        $paymentHtml = "
        <div style='background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 5px; margin: 20px 0;'>
            <p style='margin: 0; color: #856404;'><strong>ℹ️ Note:</strong> Payment information will be available once the student makes their first payment.</p>
        </div>";
    }
    
    // Calculate age
    $dob = new DateTime($student['dob']);
    $today = new DateTime();
    $age = $today->diff($dob)->y;
    $formattedDob = $dob->format('F d, Y');
    
    $htmlBody = "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; margin: 0; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .content h2 { color: #2c3e50; margin-top: 0; }
            .content p { color: #555; line-height: 1.6; font-size: 15px; }
            .info-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-section h3 { color: #2c3e50; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { flex: 0 0 40%; font-weight: 600; color: #495057; }
            .info-value { flex: 1; color: #212529; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 13px; }
            .warning-box { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .warning-box p { margin: 0; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>📚 Student Information Report</h1>
                <p>East Boundary School Management System</p>
            </div>
            <div class='content'>
                <h2>Dear {$student['guardianName']},</h2>
                <p>This email contains comprehensive information about your child/ward's enrollment and payment status at East Boundary School.</p>
                
                <div class='info-section'>
                    <h3><i>👤</i> Student Information</h3>
                    <div class='info-row'>
                        <div class='info-label'>Student ID:</div>
                        <div class='info-value'><strong>{$student['id']}</strong></div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Full Name:</div>
                        <div class='info-value'><strong>{$student['name']}</strong></div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Grade:</div>
                        <div class='info-value'><strong>{$student['grade']}</strong></div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Date of Birth:</div>
                        <div class='info-value'>{$formattedDob} ({$age} years old)</div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Enrollment Status:</div>
                        <div class='info-value'><strong>{$student['enrollmentStatus']}</strong></div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Year of Admission:</div>
                        <div class='info-value'>{$student['yearOfAdmission']}</div>
                    </div>
                </div>
                
                <div class='info-section'>
                    <h3><i>👨‍👩‍👧</i> Guardian/Parent Information</h3>
                    <div class='info-row'>
                        <div class='info-label'>Name:</div>
                        <div class='info-value'>{$student['guardianName']}</div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Relationship:</div>
                        <div class='info-value'>{$student['guardianRelationship']}</div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Phone:</div>
                        <div class='info-value'>{$student['guardianPhone']}</div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Email:</div>
                        <div class='info-value'>{$student['guardianEmail']}</div>
                    </div>
                    <div class='info-row'>
                        <div class='info-label'>Address:</div>
                        <div class='info-value'>{$student['guardianAddress']}</div>
                    </div>
                </div>
                
                {$paymentHtml}
                
                <div class='warning-box'>
                    <p><strong>📞 Need Help?</strong> If you have any questions about this information or need to discuss payment arrangements, please contact the school office.</p>
                </div>
                
                <p style='margin-top: 30px;'>Thank you for being part of the East Boundary School community!</p>
                <p><strong>Best regards,</strong><br>East Boundary School Administration</p>
            </div>
            <div class='footer'>
                <p>© " . date('Y') . " East Boundary School. All rights reserved.</p>
                <p style='margin-top: 5px;'>This is an automated message from the School Management System.</p>
                <p style='margin-top: 5px;'>Developed by Chinyama Richard | 0962299100</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Send email using Gmail SMTP
    $sent = sendViaGmailSMTP($gmailAddress, $gmailPassword, $guardianEmail, $student['guardianName'], $subject, $htmlBody, $senderName);
    
    if ($sent) {
        echo json_encode([
            'success' => true,
            'message' => 'Email sent successfully to ' . $guardianEmail
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
