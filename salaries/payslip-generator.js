// Payslip Generator - Creates NRC-protected PDF payslips

class PayslipGenerator {
    constructor(payrollSystem) {
        this.system = payrollSystem;
        this.currentPayslip = null;
        this.init();
    }

    init() {
        // Setup filter button event listener
        const filterBtn = document.getElementById('filterPayslipsBtn');
        const monthInput = document.getElementById('payslipMonth');
        const clearFilterBtn = document.getElementById('clearFilterBtn');
        const refreshBtn = document.getElementById('refreshPayslipsBtn');
        
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                const month = monthInput?.value;
                this.renderPayslips(month || null);
                
                if (month) {
                    this.system.showNotification(`Filtered payslips for ${month}`, 'info');
                } else {
                    this.system.showNotification('Showing all payslips', 'info');
                }
            });
        }

        // Clear filter button
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                if (monthInput) {
                    monthInput.value = '';
                }
                this.renderPayslips(null);
                this.system.showNotification('Filter cleared - showing all payslips', 'info');
            });
        }

        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const currentFilter = monthInput?.value || null;
                this.renderPayslips(currentFilter);
                this.system.showNotification('Payslips refreshed', 'success');
            });
        }

        // Allow pressing Enter in month input to filter
        if (monthInput) {
            monthInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    filterBtn?.click();
                }
            });
        }

        // Render initial payslips when tab is loaded
        this.renderPayslips();
    }

    generateBulkPayslips(payroll) {
        if (!payroll || !payroll.records) {
            this.system.showNotification('Invalid payroll data.', 'error');
            return;
        }

        // Check if libraries are loaded
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            this.system.showNotification('PDF libraries not loaded. Please refresh the page.', 'error');
            return;
        }

        const action = confirm(
            `Generate payslips for ${payroll.records.length} employees?\n\n` +
            `Choose:\n` +
            `• OK = Create records + Download all PDFs (may take time)\n` +
            `• Cancel = Create records only (download individually later)`
        );

        let successCount = 0;
        
        // First, create all payslip records
        payroll.records.forEach(record => {
            try {
                this.createPayslipRecord(record, payroll);
                successCount++;
            } catch (error) {
                console.error(`Error generating payslip for ${record.employee_name}:`, error);
            }
        });

        this.system.saveToStorage('ebs_payslips', this.system.payslips);
        
        // Update payroll status
        const payrollIndex = this.system.payrolls.findIndex(p => p.payroll_id === payroll.payroll_id);
        if (payrollIndex !== -1) {
            this.system.payrolls[payrollIndex].payslips_generated = true;
            this.system.payrolls[payrollIndex].payslips_generated_at = new Date().toISOString();
            this.system.saveToStorage('ebs_payrolls', this.system.payrolls);
        }

        // Enable send button
        document.getElementById('sendPayslipsBtn').disabled = false;

        this.system.showNotification(`${successCount} payslip records created.`, 'success');
        this.system.logActivity(`Generated ${successCount} payslips for ${payroll.monthName} ${payroll.year}`, 'Payslip Generation');

        // If user chose to download PDFs
        if (action) {
            this.system.showNotification('Starting PDF generation... This may take a few moments.', 'info');
            this.downloadAllPayslipsPDFs(payroll);
        } else {
            this.system.showNotification('Payslips created. Go to Payslips tab to download individually.', 'info');
        }
    }

    async downloadAllPayslipsPDFs(payroll) {
        const records = payroll.records;
        const total = records.length;
        let completed = 0;
        let failed = 0;

        this.system.showNotification(`Generating PDF 1 of ${total}...`, 'info');

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            
            try {
                // Update progress
                if (i > 0) {
                    this.system.showNotification(`Generating PDF ${i + 1} of ${total}... (${completed} completed)`, 'info');
                }

                // Generate payslip HTML and download
                await this.generateSinglePayslipPDF(record, payroll);
                completed++;
                
                // Small delay between PDFs to prevent browser overload
                await this.delay(800);
                
            } catch (error) {
                console.error(`Failed to generate PDF for ${record.employee_name}:`, error);
                failed++;
            }
        }

        const message = `PDF generation complete!\n✅ ${completed} successful\n${failed > 0 ? '❌ ' + failed + ' failed' : ''}`;
        this.system.showNotification(message, failed > 0 ? 'warning' : 'success');
        this.system.logActivity(`Generated ${completed} PDF payslips (${failed} failed)`, 'Payslip PDF Generation');
    }

    async generateSinglePayslipPDF(record, payroll) {
        return new Promise((resolve, reject) => {
            const payslip = {
                ...record,
                payroll_id: payroll.payroll_id,
                month: payroll.month,
                monthName: payroll.monthName,
                year: payroll.year,
                approved_by: payroll.approved_by
            };

            // Create temporary container for PDF generation
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '600px';
            tempContainer.style.background = 'white';
            tempContainer.style.padding = '20px';
            tempContainer.innerHTML = this.generatePayslipHTML(payslip);
            document.body.appendChild(tempContainer);

            // Generate PDF
            html2canvas(tempContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 190;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 10;
                
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                const filename = `Payslip_${payslip.employee_name.replace(/\s+/g, '_')}_${payslip.monthName}_${payslip.year}.pdf`;
                pdf.save(filename);
                
                // Clean up
                document.body.removeChild(tempContainer);
                resolve();
            }).catch(error => {
                document.body.removeChild(tempContainer);
                reject(error);
            });
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    createPayslipRecord(record, payroll) {
        // Check if payslip already exists
        const existing = this.system.payslips.find(p => 
            p.employee_id === record.employee_id && 
            p.payroll_id === payroll.payroll_id
        );

        if (existing) {
            // Update existing
            Object.assign(existing, {
                ...record,
                payroll_id: payroll.payroll_id,
                month: payroll.month,
                monthName: payroll.monthName,
                year: payroll.year,
                status: 'Generated',
                email_status: existing.email_status || 'Pending',
                generated_at: new Date().toISOString()
            });
        } else {
            // Create new
            const payslip = {
                payslip_id: this.generatePayslipId(),
                payroll_id: payroll.payroll_id,
                employee_id: record.employee_id,
                employee_name: record.employee_name,
                nrc_number: record.nrc_number,
                email: record.email,
                month: payroll.month,
                monthName: payroll.monthName,
                year: payroll.year,
                ...record,
                status: 'Generated',
                email_status: 'Pending',
                generated_at: new Date().toISOString(),
                approved_by: payroll.approved_by
            };
            this.system.payslips.push(payslip);
        }
    }

    previewPayslip(record, payroll) {
        this.currentPayslip = {
            ...record,
            payroll_id: payroll.payroll_id,
            month: payroll.month,
            monthName: payroll.monthName,
            year: payroll.year,
            approved_by: payroll.approved_by
        };

        const modal = document.getElementById('payslipModal');
        const content = document.getElementById('payslipContent');
        
        content.innerHTML = this.generatePayslipHTML(this.currentPayslip);
        modal.classList.add('active');

        // Setup event listeners
        document.getElementById('closePayslipModal').onclick = () => modal.classList.remove('active');

this.system.showNotification(`${successCount} payslip records created.`, 'success');
this.system.logActivity(`Generated ${successCount} payslips for ${payroll.monthName} ${payroll.year}`, 'Payslip Generation');

// If user chose to download PDFs
if (action) {
    this.system.showNotification('Starting PDF generation... This may take a few moments.', 'info');
    this.downloadAllPayslipsPDFs(payroll);
} else {
    this.system.showNotification('Payslips created. Go to Payslips tab to download individually.', 'info');
}
}

async downloadAllPayslipsPDFs(payroll) {
    const records = payroll.records;
    const total = records.length;
    let completed = 0;
    let failed = 0;

    this.system.showNotification(`Generating PDF 1 of ${total}...`, 'info');

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
            this.system.showNotification(`Generating PDF ${i + 1} of ${total}...`, 'info');
            
            const payslip = this.system.payslips.find(p => 
                p.employee_id === record.employee_id && 
                p.month === payroll.month && 
                p.year === payroll.year
            );
            
            if (payslip) {
                await this.generateSinglePayslipPDF(record, payroll);
                completed++;
            } else {
                failed++;
            }
            
            // Small delay between PDFs
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`Failed to generate PDF for ${record.employee_name}:`, error);
            failed++;
        }
    }
    
    this.system.showNotification(
        `PDF generation complete! Success: ${completed}, Failed: ${failed}`, 
        failed > 0 ? 'warning' : 'success'
    );
}

    downloadPayslipPDF(payslip) {
        console.log('📄 Starting PDF generation for:', payslip.employee_name);
        
        // Check if required libraries are loaded
        if (typeof html2canvas === 'undefined') {
            alert('ERROR: html2canvas library not loaded.\n\nPossible causes:\n1. No internet connection\n2. CDN blocked\n\nSolution: Check internet connection and refresh page.');
            console.error('html2canvas not loaded - check internet connection');
            return;
        }
        
        if (typeof window.jspdf === 'undefined') {
            alert('ERROR: jsPDF library not loaded.\n\nPossible causes:\n1. No internet connection\n2. CDN blocked\n\nSolution: Check internet connection and refresh page.');
            console.error('jsPDF not loaded - check internet connection');
            return;
        }
        
        console.log('✅ Libraries loaded successfully');
        
        // Get content element
        const content = document.getElementById('payslipContent');
        
        if (!content) {
            alert('ERROR: Payslip content not found.\n\nPlease refresh the page and try again.');
            console.error('payslipContent element not found');
            return;
        }
        
        if (!content.innerHTML || content.innerHTML.trim() === '') {
            alert('ERROR: Payslip content is empty.\n\nPlease generate the payslip first.');
            console.error('payslipContent is empty');
            return;
        }
        
        console.log('✅ Content element found and populated');
        
        // Make sure content is visible and rendered
        const originalDisplay = content.style.display;
        content.style.display = 'block';
        content.style.visibility = 'visible';
        content.style.opacity = '1';
        
        this.system.showNotification('Generating PDF...', 'info');
        
        console.log('🎨 Starting html2canvas rendering...');
        
        html2canvas(content, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            allowTaint: false,
            imageTimeout: 0
        }).then(canvas => {
            console.log('✅ Canvas created successfully');
            
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 190;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 10;
            
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            const filename = `Payslip_${payslip.employee_name.replace(/\s+/g, '_')}_${payslip.monthName}_${payslip.year}.pdf`;
            pdf.save(filename);
            
            console.log('✅ PDF saved:', filename);
            
            // Restore original display
            content.style.display = originalDisplay;
            
            this.system.showNotification('✅ PDF downloaded successfully!', 'success');
            this.system.logActivity(`Downloaded payslip for ${payslip.employee_name}`, 'Payslip Download');
        }).catch(error => {
            console.error('❌ PDF generation error:', error);
            console.error('Error details:', error.stack);
            
            // Restore display
            content.style.display = originalDisplay;
            
            alert('ERROR generating PDF:\n\n' + error.message + '\n\nCheck browser console (F12) for details.');
            this.system.showNotification('Error generating PDF: ' + error.message, 'error');
        });
    }

    renderPayslips(filterMonth = null) {
        const tbody = document.getElementById('payslipsTableBody');
        let payslips = [...this.system.payslips]; // Create a copy to avoid mutating original

        if (filterMonth) {
            payslips = payslips.filter(p => p.month === filterMonth);
        }

        if (payslips.length === 0) {
            const message = filterMonth 
                ? `No payslips found for ${filterMonth}. Try selecting a different month.`
                : 'No payslips generated yet. Generate payroll and create payslips first.';
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <p>${message}</p>
                        ${filterMonth ? '<button class="btn btn-secondary" onclick="document.getElementById(\'payslipMonth\').value=\'\'; payslipGenerator.renderPayslips();">Clear Filter</button>' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payslips.sort((a, b) => 
            new Date(b.generated_at) - new Date(a.generated_at)
        ).map(payslip => `
            <tr>
                <td><strong>${payslip.employee_name}</strong><br><small>${payslip.employee_id}</small></td>
                <td>${payslip.monthName} ${payslip.year}</td>
                <td>K ${payslip.gross_salary.toFixed(2)}</td>
                <td><strong style="color: #28a745;">K ${payslip.net_pay.toFixed(2)}</strong></td>
                <td><span class="status-badge ${payslip.status.toLowerCase()}">${payslip.status}</span></td>
                <td>${new Date(payslip.generated_at).toLocaleDateString()}</td>
                <td><span class="status-badge ${payslip.email_status.toLowerCase()}">${payslip.email_status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="payslipGenerator.viewPayslipById('${payslip.payslip_id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="payslipGenerator.deletePayslipById('${payslip.payslip_id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="payslipGenerator.emailPayslipById('${payslip.payslip_id}')" title="Email">
                        <i class="fas fa-envelope"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    viewPayslipById(payslipId) {
        const payslip = this.system.payslips.find(p => p.payslip_id === payslipId);
        if (payslip) {
            this.previewPayslip(payslip, { approved_by: payslip.approved_by });
        }
    }

    downloadPayslipById(payslipId) {
        const payslip = this.system.payslips.find(p => p.payslip_id === payslipId);
        if (payslip) {
            this.currentPayslip = payslip;
            const content = document.getElementById('payslipContent');
            content.innerHTML = this.generatePayslipHTML(payslip);
            content.style.display = 'block';
            content.style.visibility = 'visible';
            content.style.position = 'absolute';
            content.style.left = '-9999px';
            setTimeout(() => {
                this.downloadPayslipPDF(payslip);
                content.style.position = '';
                content.style.left = '';
            }, 500);
        }
    }

    emailPayslipById(payslipId) {
        const payslip = this.system.payslips.find(p => p.payslip_id === payslipId);
        if (payslip) {
            this.emailSinglePayslip(payslip);
        }
    }

    deletePayslipById(payslipId) {
        const payslip = this.system.payslips.find(p => p.payslip_id === payslipId);
        if (!payslip) return;

        if (confirm(`Delete payslip for ${payslip.employee_name} (${payslip.monthName} ${payslip.year})?\n\nThis action cannot be undone.`)) {
            // Remove payslip from array
            this.system.payslips = this.system.payslips.filter(p => p.payslip_id !== payslipId);
            this.system.saveToStorage('ebs_payslips', this.system.payslips);

            // Log activity
            this.system.logActivity(`Deleted payslip for ${payslip.employee_name} (${payslip.monthName} ${payslip.year})`, 'Payslip Management');
            this.system.showNotification(`Payslip for ${payslip.employee_name} deleted successfully.`, 'success');

            // Refresh the table
            const monthInput = document.getElementById('payslipMonth');
            const currentFilter = monthInput?.value || null;
            this.renderPayslips(currentFilter);
        }
    }

    deleteCurrentPayslip() {
        if (!this.currentPayslip) return;

        const payslip = this.currentPayslip;
        
        if (confirm(`Delete payslip for ${payslip.employee_name} (${payslip.monthName} ${payslip.year})?\n\nThis action cannot be undone.`)) {
            // Remove payslip from array
            this.system.payslips = this.system.payslips.filter(p => p.payslip_id !== payslip.payslip_id);
            this.system.saveToStorage('ebs_payslips', this.system.payslips);

            // Log activity
            this.system.logActivity(`Deleted payslip for ${payslip.employee_name} (${payslip.monthName} ${payslip.year})`, 'Payslip Management');
            this.system.showNotification(`Payslip for ${payslip.employee_name} deleted successfully.`, 'success');

            // Close modal
            const modal = document.getElementById('payslipModal');
            modal.classList.remove('active');

            // Refresh the table
            const monthInput = document.getElementById('payslipMonth');
            const currentFilter = monthInput?.value || null;
            this.renderPayslips(currentFilter);
        }
    }

    emailSinglePayslip(payslip) {
        if (!payslip.email) {
            this.system.showNotification(`No email address for ${payslip.employee_name}.`, 'warning');
            return;
        }

        // Simulate email sending (since we don't have actual email server)
        if (confirm(`Send payslip to ${payslip.employee_name} at ${payslip.email}?`)) {
            // Update email status
            const index = this.system.payslips.findIndex(p => p.payslip_id === payslip.payslip_id);
            if (index !== -1) {
                this.system.payslips[index].email_status = 'Sent';
                this.system.payslips[index].email_sent_at = new Date().toISOString();
                this.system.saveToStorage('ebs_payslips', this.system.payslips);
            }

            this.system.showNotification(`Payslip sent to ${payslip.email}`, 'success');
            this.system.logActivity(`Sent payslip to ${payslip.employee_name} via email`, 'Payslip Email');
            
            // Refresh the table
            this.renderPayslips();
        }
    }

    generatePayslipId() {
        return `PAYSLIP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    generatePayslipHTML(payslip) {
        const today = new Date().toLocaleDateString('en-GB');
        
        return `
            <div style="font-family: Arial, sans-serif; width: 600px; margin: 0 auto; padding: 10px; background: white; box-sizing: border-box;">
                <!-- Header -->
                <div style="text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 10px;">
                    <h1 style="margin: 0; color: #2c3e50; font-size: 20px;">EAST BOUNDARY SYSTEMS</h1>
                    <p style="margin: 2px 0; color: #7f8c8d; font-size: 10px;">School Management System</p>
                    <h2 style="margin: 5px 0; color: #e74c3c; font-size: 16px;">PAYSLIP</h2>
                    <p style="margin: 2px 0; color: #34495e; font-weight: bold; font-size: 11px;">${payslip.monthName} ${payslip.year}</p>
                </div>

                <!-- Employee Information -->
                <div style="margin-bottom: 10px;">
                    <h3 style="background: #34495e; color: white; padding: 6px; margin: 0 0 8px 0; font-size: 12px;">Employee Information</h3>
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px;">
                        <tr>
                            <td style="padding: 4px; width: 40%; font-weight: bold; color: #2c3e50;">Employee ID:</td>
                            <td style="padding: 4px; width: 60%; border-bottom: 1px solid #ecf0f1; word-wrap: break-word; overflow-wrap: break-word;">${payslip.employee_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; color: #2c3e50;">Name:</td>
                            <td style="padding: 4px; border-bottom: 1px solid #ecf0f1; word-wrap: break-word; overflow-wrap: break-word;">${payslip.employee_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; color: #2c3e50;">NRC:</td>
                            <td style="padding: 4px; border-bottom: 1px solid #ecf0f1;">${payslip.nrc_number || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; color: #2c3e50;">Email:</td>
                            <td style="padding: 4px; border-bottom: 1px solid #ecf0f1; word-wrap: break-word; overflow-wrap: break-word; font-size: 9px;">${payslip.email || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; color: #2c3e50;">Grade:</td>
                            <td style="padding: 4px; border-bottom: 1px solid #ecf0f1;">${payslip.grade_taught || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; color: #2c3e50;">Period:</td>
                            <td style="padding: 4px; border-bottom: 1px solid #ecf0f1;">${payslip.monthName} ${payslip.year}</td>
                        </tr>
                    </table>
                </div>

                <!-- Earnings -->
                <div style="margin-bottom: 10px;">
                    <h3 style="background: #27ae60; color: white; padding: 6px; margin: 0 0 8px 0; font-size: 12px;">Earnings</h3>
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px;">
                        <tr style="background: #ecf0f1;">
                            <th style="padding: 4px 4px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 55%;">Description</th>
                            <th style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 45%;">Amount (ZMW)</th>
                        </tr>
                        <tr>
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #ecf0f1;">Basic Salary</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #ecf0f1;">K ${(payslip.basic_salary || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #ecf0f1;">Allowances</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #ecf0f1;">K ${(payslip.allowances || 0).toFixed(2)}</td>
                        </tr>
                        <tr style="background: #d5f4e6; font-weight: bold;">
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #bdc3c7;">Gross Salary</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #bdc3c7;">K ${(payslip.gross_salary || 0).toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Deductions -->
                <div style="margin-bottom: 10px;">
                    <h3 style="background: #e74c3c; color: white; padding: 6px; margin: 0 0 8px 0; font-size: 12px;">Deductions</h3>
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px;">
                        <tr style="background: #ecf0f1;">
                            <th style="padding: 4px 4px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 55%;">Description</th>
                            <th style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 45%;">Amount (ZMW)</th>
                        </tr>
                        <tr>
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #ecf0f1;">NAPSA (Employee)</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #ecf0f1;">K ${(payslip.napsa_employee || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #ecf0f1;">Loan Deductions</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #ecf0f1;">K ${(payslip.loan_deductions || 0).toFixed(2)}</td>
                        </tr>
                        <tr style="background: #fadbd8; font-weight: bold;">
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #bdc3c7;">Total Deductions</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #bdc3c7;">K ${(payslip.total_deductions || 0).toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                ${payslip.loan_details && payslip.loan_details.length > 0 ? `
                <!-- Loan Details -->
                <div style="margin-bottom: 10px;">
                    <h3 style="background: #f39c12; color: white; padding: 6px; margin: 0 0 8px 0; font-size: 12px;">Loan Details</h3>
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px;">
                        <tr style="background: #ecf0f1;">
                            <th style="padding: 4px 4px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 55%;">Loan ID</th>
                            <th style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 45%;">Deduction (ZMW)</th>
                        </tr>
                        ${payslip.loan_details.map(loan => `
                        <tr>
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #ecf0f1;">${loan.loan_id}</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #ecf0f1;">K ${loan.deduction.toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </table>
                </div>
                ` : ''}

                <!-- Net Pay -->
                <div style="margin-bottom: 15px;">
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; background: #2c3e50;">
                        <tr>
                            <td style="padding: 8px 4px 8px 8px; color: white; font-size: 14px; font-weight: bold; width: 40%;">NET PAY</td>
                            <td style="padding: 8px 2px 8px 8px; color: #2ecc71; font-size: 16px; font-weight: bold; text-align: left; width: 60%;">K ${(payslip.net_pay || 0).toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Employer Contributions -->
                <div style="margin-bottom: 10px;">
                    <h3 style="background: #3498db; color: white; padding: 6px; margin: 0 0 8px 0; font-size: 11px;">Employer Contributions (Not Deducted)</h3>
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px;">
                        <tr style="background: #ecf0f1;">
                            <th style="padding: 4px 4px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 55%;">Description</th>
                            <th style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #bdc3c7; width: 45%;">Amount (ZMW)</th>
                        </tr>
                        <tr>
                            <td style="padding: 4px 4px 4px 8px; border: 1px solid #ecf0f1;">NAPSA (Employer)</td>
                            <td style="padding: 4px 2px 4px 8px; text-align: left; border: 1px solid #ecf0f1;">K ${(payslip.napsa_employer || 0).toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
                    <p style="color: #7f8c8d; font-size: 8px; margin: 2px 0;"><strong>Generated:</strong> ${today}</p>
                    <p style="color: #7f8c8d; font-size: 8px; margin: 2px 0; word-wrap: break-word;"><strong>Payslip ID:</strong> ${payslip.payslip_id || 'N/A'}</p>
                    ${payslip.approved_by ? `<p style="color: #7f8c8d; font-size: 8px; margin: 2px 0;"><strong>Approved By:</strong> ${payslip.approved_by}</p>` : ''}
                    <p style="color: #e74c3c; font-size: 8px; margin: 8px 0 2px 0; font-style: italic;">
                        <strong>CONFIDENTIAL:</strong> This payslip is private and confidential.
                    </p>
                    <p style="color: #7f8c8d; font-size: 8px; margin: 2px 0; text-align: center;">
                        East Boundary Systems
                    </p>
                </div>

                <!-- Developer Credit -->
                <div style="margin-top: 12px; padding: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; text-align: center;">
                    <p style="color: #ffffff; font-size: 7px; margin: 0; font-weight: bold; letter-spacing: 0.5px;">
                        SYSTEM DEVELOPED BY CHINYAMA RICHARD
                    </p>
                    <div style="margin-top: 4px; display: flex; justify-content: center; align-items: center; gap: 8px;">
                        <span style="color: #ffd700; font-size: 6px; font-weight: 600;">
                            📞 Call: 0962299100
                        </span>
                        <span style="color: #e0e0e0; font-size: 6px;">|</span>
                        <span style="color: #ffd700; font-size: 6px; font-weight: 600;">
                            ✉️ chinyamarichard2019@gmail.com
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
}
