// Email Handler - Real-time Email Sending with PHP Backend

class EmailHandler {
    constructor(payrollSystem) {
        this.system = payrollSystem;
        this.emailLog = this.system.loadFromStorage('ebs_email_log') || [];
        this.API_URL = 'api/send-payslip-email.php'; // Update with your server URL
        this.USE_REAL_EMAIL = true; // Set to false to use simulation mode
    }

    async sendBulkPayslips(payroll) {
        if (!payroll) {
            this.system.showNotification('No payroll data available.', 'error');
            return;
        }

        // Get payslips for this payroll
        const payslips = this.system.payslips.filter(p => p.payroll_id === payroll.payroll_id);
        
        if (payslips.length === 0) {
            this.system.showNotification('No payslips found. Please generate payslips first.', 'warning');
            return;
        }

        if (!confirm(`Send ${payslips.length} payslips via email?\n\n⚠️ This will use real email sending.`)) {
            return;
        }

        this.system.showNotification('📧 Sending emails... Please wait.', 'info');

        let sentCount = 0;
        let failedCount = 0;
        const failedEmails = [];

        // Send emails with rate limiting (1 per second to avoid spam filters)
        for (const payslip of payslips) {
            if (payslip.email && this.validateEmail(payslip.email)) {
                try {
                    this.system.showNotification(`Sending email to ${payslip.employee_name}...`, 'info');
                    const result = await this.sendEmail(payslip);
                    
                    console.log(`Result for ${payslip.employee_name}:`, result);
                    
                    if (result.success) {
                        sentCount++;
                        payslip.email_status = 'Sent';
                        payslip.email_sent_at = new Date().toISOString();
                        this.system.showNotification(`✅ Sent to ${payslip.employee_name}`, 'success');
                    } else {
                        failedCount++;
                        payslip.email_status = 'Failed';
                        const errorMsg = result.message || result.error || 'Unknown error';
                        failedEmails.push({ name: payslip.employee_name, error: errorMsg });
                        console.error(`Failed to send to ${payslip.employee_name}:`, errorMsg);
                        alert(`❌ Failed to send to ${payslip.employee_name}\n\nError: ${errorMsg}`);
                    }
                } catch (error) {
                    failedCount++;
                    payslip.email_status = 'Failed';
                    failedEmails.push({ name: payslip.employee_name, error: error.message });
                    console.error(`Exception sending to ${payslip.employee_name}:`, error);
                    alert(`❌ Exception sending to ${payslip.employee_name}\n\nError: ${error.message}`);
                }
                
                // Delay to avoid rate limiting
                await this.delay(2000);
            } else {
                failedCount++;
                payslip.email_status = 'No Email';
                failedEmails.push({ name: payslip.employee_name, error: 'No valid email' });
                alert(`❌ ${payslip.employee_name} has no valid email address`);
            }
        }

        this.system.saveToStorage('ebs_payslips', this.system.payslips);
        this.system.saveToStorage('ebs_email_log', this.emailLog);

        const message = `✅ Email sending complete!\nSent: ${sentCount} | Failed: ${failedCount}`;
        this.system.showNotification(message, sentCount > 0 ? 'success' : 'warning');
        this.system.logActivity(`Sent ${sentCount} payslips via email for ${payroll.monthName} ${payroll.year}`, 'Email Automation');
        
        // Show failed emails if any
    }

    async sendSingleEmail(payslip) {
        const subject = `Your Payslip for ${payslip.monthName} ${payslip.year}`;
        const body = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .header { background: #4a90e2; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    p { margin: 10px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>East Boundary School</h1>
                    <p>Payslip for ${payslip.monthName} ${payslip.year}</p>
                </div>
                <div class="content">
                    <p>Dear ${payslip.employee_name},</p>
                    <p>Please find attached your payslip for ${payslip.monthName} ${payslip.year}.</p>
                    <p><strong>Net Pay: K ${payslip.net_pay.toFixed(2)}</strong></p>
                    <p>The attached PDF contains complete details of your salary breakdown.</p>
                    <p>If you have any questions regarding your payslip, please contact the HR department.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} East Boundary School. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply.</p>
                </div>
            </body>
            </html>
        `;

        try {
            // Generate PDF
            console.log(`📄 Generating PDF for ${payslip.employee_name}...`);
            const pdfBase64 = await this.generatePayslipPDF(payslip);
            
            if (!pdfBase64) {
                throw new Error('Failed to generate PDF');
            }

            console.log(`📦 PDF size: ${(pdfBase64.length / 1024).toFixed(2)} KB`);

            // Send email with PDF attachment with timeout
            console.log(`📧 Sending email to ${payslip.email}...`);
            
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

            // Get Gmail SMTP configuration from localStorage
            const gmailAddress = localStorage.getItem('ebs_gmail_address') || '';
            const gmailPassword = localStorage.getItem('ebs_gmail_password') || '';
            const senderName = localStorage.getItem('ebs_sender_name') || 'East Boundary Systems - Payroll';
            
            console.log('📧 Gmail Config Check:');
            console.log('  - Gmail Address:', gmailAddress ? '✅ Set' : '❌ Not set');
            console.log('  - Gmail Password:', gmailPassword ? '✅ Set' : '❌ Not set');
            console.log('  - Sender Name:', senderName);
            
            if (!gmailAddress || !gmailPassword) {
                throw new Error('Gmail SMTP not configured. Please configure in Settings → Email Configuration.');
            }
            
            try {
                const fetchUrl = window.location.protocol === 'file:' ? 
                    'http://localhost/eastboundarysystems/salaries/send-email.php' : 
                    'send-email.php';
                
                console.log('📤 Sending email request to:', fetchUrl);
                console.log('📍 Current URL:', window.location.href);
                
                const requestData = {
                    gmailAddress: gmailAddress,
                    gmailPassword: gmailPassword,
                    senderName: senderName,
                    recipientEmail: payslip.email,
                    recipientName: payslip.employee_name,
                    subject: subject,
                    message: body,
                    pdfData: pdfBase64,
                    pdfFilename: `Payslip_${payslip.employee_name.replace(/\s+/g, '_')}_${payslip.monthName}_${payslip.year}.pdf`
                };
                
                console.log('📦 Request data prepared (PDF size:', (pdfBase64.length / 1024).toFixed(2), 'KB)');
                
                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData),
                    signal: controller.signal
                });
                
                console.log('📡 Response received:', response.status, response.statusText);

                clearTimeout(timeoutId);

                // Check if response is OK before parsing JSON
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ HTTP Error ${response.status}:`, errorText);
                    throw new Error(`Server error (${response.status}): ${errorText.substring(0, 150)}`);
                }

                // Get response content type
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const responseText = await response.text();
                    console.error('❌ Expected JSON but got:', responseText.substring(0, 200));
                    throw new Error('Server returned non-JSON response. Check PHP errors.');
                }

                const result = await response.json();
                console.log(`✅ Email sent successfully to ${payslip.email}`);
                return result;
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'AbortError') {
                    throw new Error('Email sending timeout (120s). Server may be slow or PDF too large.');
                }
                
                throw fetchError;
            }
            
        } catch (error) {
            console.error(`❌ Error sending email to ${payslip.email}:`, error);
            
            // Return more specific error messages
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Cannot reach email server. Check your internet connection or server status.';
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.message
            };
        }
    }

    async generatePayslipPDF(payslip) {
        // Check if libraries are loaded
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            console.error('PDF libraries not loaded');
            return null;
        }

        // Get or create hidden container
        let tempContainer = document.getElementById('emailPayslipContainer');
        if (!tempContainer) {
            tempContainer = document.createElement('div');
            tempContainer.id = 'emailPayslipContainer';
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '600px';
            tempContainer.style.background = 'white';
            tempContainer.style.padding = '20px';
            document.body.appendChild(tempContainer);
        }

        // Use the SAME generatePayslipHTML method from PayslipGenerator
        // This ensures email payslip is IDENTICAL to downloaded payslip
        if (this.system.payslipGenerator && typeof this.system.payslipGenerator.generatePayslipHTML === 'function') {
            tempContainer.innerHTML = this.system.payslipGenerator.generatePayslipHTML(payslip);
        } else {
            console.error('PayslipGenerator not available');
            return null;
        }
        
        tempContainer.style.display = 'block';

        try {
            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture as canvas with same settings as PayslipGenerator
            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 0,
                removeContainer: false
            });

            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const imgWidth = 210; // A4 width
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            
            // Get PDF as base64
            const pdfBase64 = pdf.output('datauristring').split(',')[1];

            // Clean up
            tempContainer.style.display = 'none';

            console.log('✅ Email PDF generated using same template as download');
            return pdfBase64;
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            tempContainer.style.display = 'none';
            return null;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendEmail(payslip) {
        // Call sendSingleEmail method
        return await this.sendSingleEmail(payslip);
    }

    generateEmailSubject(payslip) {
        return `Your Payslip for ${payslip.monthName} ${payslip.year} - ${this.system.settings.companyName || 'East Boundary School'}`;
    }

    generateEmailBody(payslip) {
        return `Dear ${payslip.employee_name}, Please find your payslip attached for ${payslip.monthName} ${payslip.year}. Best regards, ${this.system.settings.companyName || 'East Boundary School'}`;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async sendRealEmail(emailData) {
        // This method is now handled by sendSingleEmail
        if (!this.USE_REAL_EMAIL) {
            return this.simulateEmailSending(payslip, emailData);
        }

        try {
            // Make real API call to PHP backend
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Log the email
            const logEntry = {
                log_id: this.generateLogId(),
                payslip_id: payslip.payslip_id,
                employee_name: payslip.employee_name,
                to_email: payslip.email,
                subject: emailData.subject,
                status: result.success ? 'Sent' : 'Failed',
                sent_at: new Date().toISOString(),
                error: result.error || null,
                pdf_protected: protectedPdfBase64 !== null
            };

            this.emailLog.push(logEntry);

            console.log('📧 EMAIL SENT:', result);
            
            return result;

        } catch (error) {
            console.error('❌ EMAIL ERROR:', error);

            const logEntry = {
                log_id: this.generateLogId(),
                payslip_id: payslip.payslip_id,
                employee_name: payslip.employee_name,
                to_email: payslip.email,
                subject: emailData.subject,
                status: 'Failed',
                sent_at: new Date().toISOString(),
                error: error.message
            };

            this.emailLog.push(logEntry);

            return {
                success: false,
                error: `Failed to connect to email server: ${error.message}`
            };
        }
    }

    simulateEmailSending(payslip, emailData) {
        // Simulation mode for testing without backend
        console.log('📧 EMAIL SIMULATED (Set USE_REAL_EMAIL = true for real sending):', emailData);
        
        const logEntry = {
            log_id: this.generateLogId(),
            payslip_id: payslip.payslip_id,
            employee_name: payslip.employee_name,
            to_email: payslip.email,
            subject: emailData.subject,
            status: 'Simulated',
            sent_at: new Date().toISOString(),
            error: null
        };

        this.emailLog.push(logEntry);
        
        return {
            success: true,
            message: 'Email sent successfully (simulated - enable real email in email-handler.js)'
        };
    }

    generateEmailSubject(payslip) {
        let subject = this.system.settings.emailSubject;
        subject = subject.replace('{month}', payslip.monthName);
        subject = subject.replace('{year}', payslip.year);
        subject = subject.replace('{employee_name}', payslip.employee_name);
        return subject;
    }

    generateEmailBody(payslip) {
        let body = this.system.settings.emailTemplate;
        body = body.replace('{employee_name}', payslip.employee_name);
        body = body.replace('{month}', payslip.monthName);
        body = body.replace('{year}', payslip.year);
        body = body.replace('{nrc_number}', payslip.nrc_number);
        body = body.replace('{net_pay}', `K ${payslip.net_pay.toFixed(2)}`);
        return body;
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    generateLogId() {
        return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    viewEmailLog() {
        // Display email log in a modal or table
        console.table(this.emailLog);
        return this.emailLog;
    }

    // Helper: Convert Blob to Base64 (for client-side PDF)
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

/*
 * =================================================================
 * BACKEND INTEGRATION GUIDE (PHP + PHPMailer)
 * =================================================================
 * 
 * Create a file: /api/send-payslip-email.php
 * 
 * <?php
 * require 'vendor/autoload.php'; // PHPMailer
 * use PHPMailer\PHPMailer\PHPMailer;
 * use PHPMailer\PHPMailer\Exception;
 * 
 * // Get POST data
 * $data = json_decode(file_get_contents('php://input'), true);
 * 
 * $mail = new PHPMailer(true);
 * 
 * try {
 *     // SMTP Configuration
 *     $mail->isSMTP();
 *     $mail->Host = 'smtp.gmail.com'; // Or your SMTP server
 *     $mail->SMTPAuth = true;
 *     $mail->Username = 'payroll@eastboundary.com';
 *     $mail->Password = 'your-app-password';
 *     $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
 *     $mail->Port = 587;
 * 
 *     // Email settings
 *     $mail->setFrom('payroll@eastboundary.com', 'East Boundary Payroll');
 *     $mail->addAddress($data['to']);
 *     $mail->Subject = $data['subject'];
 *     $mail->Body = $data['body'];
 * 
 *     // Attach password-protected PDF (requires external library like FPDI)
 *     // For password protection, use: setProtection(['print'], $data['password'])
 *     $mail->addAttachment($data['attachment']);
 * 
 *     $mail->send();
 *     echo json_encode(['success' => true, 'message' => 'Email sent']);
 * } catch (Exception $e) {
 *     echo json_encode(['success' => false, 'error' => $mail->ErrorInfo]);
 * }
 * ?>
 * 
 * =================================================================
 */
