<?php
// Quick SMTP Test Script
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>SMTP Test</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
        .success { color: #4ec9b0; }
        .error { color: #f48771; }
        .info { color: #4fc1ff; }
        .warning { color: #dcdcaa; }
        pre { background: #252526; padding: 15px; border-radius: 5px; border-left: 3px solid #007acc; }
    </style>
</head>
<body>
    <h1>🔍 SMTP Connection Test</h1>
    <pre>
<?php

echo "<span class='info'>Testing SMTP connection to smtp.gmail.com:587...</span>\n\n";

// Get credentials from localStorage (pass via URL param for testing)
$testEmail = $_GET['email'] ?? '';
$testPassword = $_GET['pass'] ?? '';

if (empty($testEmail) || empty($testPassword)) {
    echo "<span class='warning'>⚠️  No credentials provided</span>\n";
    echo "Usage: test-smtp.php?email=YOUR_EMAIL&pass=YOUR_APP_PASSWORD\n\n";
    echo "Or configure first at: <a href='email-config.html' style='color: #4fc1ff;'>email-config.html</a>\n";
    exit;
}

echo "<span class='info'>📧 Using email: $testEmail</span>\n";
echo "<span class='info'>🔑 Password length: " . strlen($testPassword) . " characters</span>\n\n";

try {
    echo "Step 1: Connecting to smtp.gmail.com:587... ";
    $socket = @fsockopen('smtp.gmail.com', 587, $errno, $errstr, 10);
    
    if (!$socket) {
        throw new Exception("Connection failed: $errstr ($errno)");
    }
    echo "<span class='success'>✅ Connected</span>\n";
    
    // Read greeting
    echo "\nStep 2: Reading server greeting... ";
    $response = fgets($socket, 515);
    echo "\n<span class='info'>Server: $response</span>";
    
    if (substr($response, 0, 3) != '220') {
        throw new Exception("Bad greeting: $response");
    }
    echo "<span class='success'>✅ Greeting OK</span>\n";
    
    // Send EHLO
    echo "\nStep 3: Sending EHLO... ";
    fputs($socket, "EHLO localhost\r\n");
    
    // Read multiline response
    $response = '';
    while ($line = fgets($socket, 515)) {
        $response .= $line;
        echo "\n<span class='info'>Server: $line</span>";
        if (substr($line, 3, 1) != '-') break;
    }
    
    if (substr($response, 0, 3) != '250') {
        throw new Exception("EHLO failed: $response");
    }
    echo "<span class='success'>✅ EHLO OK</span>\n";
    
    // Start TLS
    echo "\nStep 4: Starting TLS... ";
    fputs($socket, "STARTTLS\r\n");
    $response = fgets($socket, 515);
    echo "\n<span class='info'>Server: $response</span>";
    
    if (substr($response, 0, 3) != '220') {
        throw new Exception("STARTTLS failed: $response");
    }
    echo "<span class='success'>✅ STARTTLS OK</span>\n";
    
    // Enable TLS
    echo "\nStep 5: Enabling TLS encryption... ";
    if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        throw new Exception("TLS encryption failed");
    }
    echo "<span class='success'>✅ TLS Encrypted</span>\n";
    
    // EHLO after TLS
    echo "\nStep 6: Sending EHLO after TLS... ";
    fputs($socket, "EHLO localhost\r\n");
    
    $response = '';
    while ($line = fgets($socket, 515)) {
        $response .= $line;
        echo "\n<span class='info'>Server: $line</span>";
        if (substr($line, 3, 1) != '-') break;
    }
    
    if (substr($response, 0, 3) != '250') {
        throw new Exception("EHLO after TLS failed: $response");
    }
    echo "<span class='success'>✅ EHLO after TLS OK</span>\n";
    
    // Authenticate
    echo "\nStep 7: Authenticating... ";
    fputs($socket, "AUTH LOGIN\r\n");
    $response = fgets($socket, 515);
    echo "\n<span class='info'>Server: $response</span>";
    
    if (substr($response, 0, 3) != '334') {
        throw new Exception("AUTH LOGIN failed: $response");
    }
    
    fputs($socket, base64_encode($testEmail) . "\r\n");
    $response = fgets($socket, 515);
    echo "<span class='info'>Server: $response</span>";
    
    fputs($socket, base64_encode($testPassword) . "\r\n");
    $response = fgets($socket, 515);
    echo "<span class='info'>Server: $response</span>";
    
    if (substr($response, 0, 3) != '235') {
        throw new Exception("Authentication failed! Check your App Password!");
    }
    echo "<span class='success'>✅ Authentication OK</span>\n";
    
    echo "\n\n<span class='success'>🎉 ALL TESTS PASSED! Email system is working correctly!</span>\n";
    echo "\n<span class='info'>You can now use the signup form and OTP will be sent successfully.</span>\n";
    
    // Quit
    fputs($socket, "QUIT\r\n");
    fclose($socket);
    
} catch (Exception $e) {
    echo "<span class='error'>❌ ERROR: " . $e->getMessage() . "</span>\n";
    echo "\n<span class='warning'>Troubleshooting:</span>\n";
    echo "1. Check your Gmail App Password (must be 16 characters, no spaces)\n";
    echo "2. Make sure 2FA is enabled on your Gmail account\n";
    echo "3. Generate a NEW App Password if needed\n";
    echo "4. Check your internet connection\n";
    echo "5. Make sure port 587 is not blocked by firewall\n";
    
    if (isset($socket) && is_resource($socket)) {
        fclose($socket);
    }
}

?>
    </pre>
    
    <p style="margin-top: 20px;">
        <a href="email-config.html" style="color: #4fc1ff;">← Go to Email Configuration</a> | 
        <a href="email-diagnostic.html" style="color: #4fc1ff;">Run Full Diagnostic →</a>
    </p>
</body>
</html>
