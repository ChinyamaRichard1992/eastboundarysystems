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
    $subject = "Student Payment Summary - " . $student['name'];
    
    // Format payment details
    $paymentHtml = '';
    if ($paymentData) {
        $totalFee = number_format($paymentData['totalFee'] ?? 0, 2);
        $amountPaid = number_format($paymentData['amountPaid'] ?? 0, 2);
        $balance = number_format($paymentData['balance'] ?? 0, 2);
        $status = $paymentData['status'] ?? 'No Payment';
        $term = $paymentData['term'] ?? 'N/A';
        
        $statusColor = '#dc3545'; // red
        if ($status === 'Paid') $statusColor = '#28a745'; // green
        if ($status === 'Pending') $statusColor = '#ffc107'; // yellow
        
        $statusClass = 'status-pending';
        if ($status === 'Paid') $statusClass = 'status-paid';
        if ($status === 'Overpaid') $statusClass = 'status-overpaid';
        
        $paymentHtml = "
        <!-- Payment Summary Card -->
        <div class='card payment-summary'>
            <div class='card-header'>
                <span class='card-icon'>💳</span>
                <span class='card-title'>Payment Summary for {$term}</span>
            </div>
            
            <div class='summary-stats'>
                <div class='stat-box'>
                    <div class='stat-label'>Total Fees</div>
                    <div class='stat-value total'>K {$totalFee}</div>
                    <div style='font-size: 12px; color: #6c757d;'>Required Amount</div>
                </div>
                
                <div class='stat-box'>
                    <div class='stat-label'>Amount Paid</div>
                    <div class='stat-value paid'>K {$amountPaid}</div>
                    <div style='font-size: 12px; color: #6c757d;'>Total Payments Made</div>
                </div>
                
                <div class='stat-box'>
                    <div class='stat-label'>Balance Due</div>
                    <div class='stat-value balance'>K {$balance}</div>
                    <span class='status-badge {$statusClass}'>{$status}</span>
                </div>
            </div>
        </div>";
        
        // Add payment history if available
        if (isset($paymentData['payments']) && count($paymentData['payments']) > 0) {
            $paymentCount = count($paymentData['payments']);
            
            $paymentHtml .= "
            <!-- Payment History Card -->
            <div class='card' style='margin-top: 25px;'>
                <div class='card-header'>
                    <span class='card-icon'>📋</span>
                    <span class='card-title'>Payment History ({$paymentCount} Transaction" . ($paymentCount > 1 ? 's' : '') . ")</span>
                </div>
                
                <div class='payment-history'>";
            
            foreach ($paymentData['payments'] as $payment) {
                $paidDate = date('M d, Y', strtotime($payment['date'] ?? 'now'));
                $paidAmount = number_format($payment['paid'] ?? 0, 2);
                $receiptNo = htmlspecialchars($payment['receiptNo'] ?? 'N/A');
                $description = htmlspecialchars($payment['description'] ?? 'School Fees Payment');
                
                $paymentHtml .= "
                    <div class='payment-item'>
                        <div class='payment-details'>
                            <div class='payment-receipt'>📄 {$receiptNo}</div>
                            <div class='payment-date'>🗓️ {$paidDate}</div>
                            <div class='payment-desc'>{$description}</div>
                        </div>
                        <div class='payment-amount'>K {$paidAmount}</div>
                    </div>";
            }
            
            $paymentHtml .= "
                </div>
            </div>";
        }
    } else {
        $paymentHtml = "
        <div style='background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 5px; margin: 20px 0;'>
            <p style='margin: 0; color: #856404;'><strong>ℹ️ Note:</strong> No payment information available for this student.</p>
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
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px; 
                line-height: 1.6;
            }
            .email-wrapper {
                max-width: 650px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            .header::after {
                content: '';
                position: absolute;
                bottom: -20px;
                left: 0;
                right: 0;
                height: 40px;
                background: white;
                border-radius: 50% 50% 0 0;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .header p {
                font-size: 14px;
                opacity: 0.95;
                font-weight: 500;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 20px;
                color: #2c3e50;
                margin-bottom: 15px;
                font-weight: 600;
            }
            .intro-text {
                color: #555;
                font-size: 15px;
                margin-bottom: 30px;
                line-height: 1.8;
            }
            .card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
                border: 1px solid #e9ecef;
            }
            .card-header {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 3px solid #667eea;
            }
            .card-icon {
                font-size: 24px;
                margin-right: 12px;
            }
            .card-title {
                font-size: 18px;
                color: #2c3e50;
                font-weight: 700;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
            }
            .info-item {
                display: flex;
                padding: 10px 0;
                border-bottom: 1px solid #dee2e6;
            }
            .info-item:last-child {
                border-bottom: none;
            }
            .info-label {
                flex: 0 0 45%;
                font-weight: 600;
                color: #495057;
                font-size: 14px;
            }
            .info-value {
                flex: 1;
                color: #212529;
                font-size: 14px;
                word-wrap: break-word;
            }
            .payment-summary {
                background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
                border-left: 4px solid #667eea;
            }
            .summary-stats {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
                margin-top: 20px;
            }
            .stat-box {
                background: white;
                padding: 18px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            .stat-label {
                font-size: 13px;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .stat-value {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 5px;
            }
            .stat-value.total { color: #2c3e50; }
            .stat-value.paid { color: #28a745; }
            .stat-value.balance { color: #dc3545; }
            .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 5px;
            }
            .status-paid { background: #28a745; color: white; }
            .status-pending { background: #ffc107; color: #000; }
            .status-overpaid { background: #dc3545; color: white; }
            .payment-history {
                margin-top: 20px;
            }
            .payment-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
                border-left: 4px solid #28a745;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
            }
            .payment-details {
                flex: 1;
                min-width: 200px;
            }
            .payment-receipt {
                font-weight: 700;
                color: #2c3e50;
                font-size: 14px;
                margin-bottom: 4px;
            }
            .payment-date {
                font-size: 13px;
                color: #6c757d;
                margin-bottom: 4px;
            }
            .payment-desc {
                font-size: 13px;
                color: #495057;
            }
            .payment-amount {
                font-size: 20px;
                font-weight: 700;
                color: #28a745;
                white-space: nowrap;
            }
            .contact-box {
                background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin: 25px 0;
                text-align: center;
            }
            .contact-box p {
                margin: 0;
                font-size: 15px;
                line-height: 1.6;
            }
            .contact-box strong {
                font-size: 16px;
            }
            .footer-message {
                text-align: center;
                margin: 30px 0 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            .footer-message p {
                margin: 8px 0;
                color: #555;
                font-size: 15px;
            }
            .footer {
                background: #2c3e50;
                color: white;
                padding: 25px;
                text-align: center;
            }
            .footer p {
                margin: 5px 0;
                font-size: 13px;
                opacity: 0.9;
            }
            .divider {
                height: 3px;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                margin: 30px 0;
                border-radius: 2px;
            }
        </style>
    </head>
    <body>
        <div class='email-wrapper'>
            <!-- Header -->
            <div class='header'>
                <h1>📚 Student Payment Report</h1>
                <p>East Boundary School Management System</p>
            </div>
            
            <!-- Content -->
            <div class='content'>
                <div class='greeting'>Dear {$student['guardianName']},</div>
                <p class='intro-text'>
                    We are pleased to provide you with a comprehensive payment report for your child/ward. 
                    This report contains complete information about enrollment status and financial transactions.
                </p>
                
                <!-- Student Information Card -->
                <div class='card'>
                    <div class='card-header'>
                        <span class='card-icon'>👤</span>
                        <span class='card-title'>Student Information</span>
                    </div>
                    <div class='info-grid'>
                        <div class='info-item'>
                            <div class='info-label'>Student ID</div>
                            <div class='info-value'><strong>{$student['id']}</strong></div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Full Name</div>
                            <div class='info-value'><strong>{$student['name']}</strong></div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Grade</div>
                            <div class='info-value'><strong>{$student['grade']}</strong></div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Date of Birth</div>
                            <div class='info-value'>{$formattedDob} ({$age} years old)</div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Enrollment Status</div>
                            <div class='info-value'><strong>{$student['enrollmentStatus']}</strong></div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Year of Admission</div>
                            <div class='info-value'>{$student['yearOfAdmission']}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Guardian Information Card -->
                <div class='card'>
                    <div class='card-header'>
                        <span class='card-icon'>👨‍👩‍👧</span>
                        <span class='card-title'>Guardian/Parent Information</span>
                    </div>
                    <div class='info-grid'>
                        <div class='info-item'>
                            <div class='info-label'>Name</div>
                            <div class='info-value'>{$student['guardianName']}</div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Relationship</div>
                            <div class='info-value'>{$student['guardianRelationship']}</div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Phone</div>
                            <div class='info-value'>{$student['guardianPhone']}</div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Email</div>
                            <div class='info-value'>{$student['guardianEmail']}</div>
                        </div>
                        <div class='info-item'>
                            <div class='info-label'>Address</div>
                            <div class='info-value'>{$student['guardianAddress']}</div>
                        </div>
                    </div>
                </div>
                
                <div class='divider'></div>
                
                {$paymentHtml}
                
                <!-- Contact Box -->
                <div class='contact-box'>
                    <p><strong>📞 Need Assistance?</strong></p>
                    <p>If you have any questions or need to discuss payment arrangements, please contact the school office.</p>
                </div>
                
                <!-- Footer Message -->
                <div class='footer-message'>
                    <p>Thank you for being part of the <strong>East Boundary School</strong> community!</p>
                    <p style='margin-top: 12px;'><strong>Best regards,</strong><br>East Boundary School Administration</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class='footer'>
                <p><strong>© " . date('Y') . " East Boundary School</strong></p>
                <p style='margin-top: 8px;'>This is an automated message from the School Management System</p>
                <p style='margin-top: 8px;'>Developed by Chinyama Richard | 0962299100</p>
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
