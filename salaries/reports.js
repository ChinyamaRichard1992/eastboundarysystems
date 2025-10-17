// Reports Manager - Generate payroll reports and analytics

class ReportsManager {
    constructor(payrollSystem) {
        this.system = payrollSystem;
        this.init();
    }

    init() {
        // Monthly Payroll Report
        document.getElementById('monthlyPayrollReport')?.querySelector('.btn').addEventListener('click', () => {
            this.generateMonthlyPayrollReport();
        });

        // NAPSA Report
        document.getElementById('napsaReport')?.querySelector('.btn').addEventListener('click', () => {
            this.generateNapsaReport();
        });

        // Payment History Report
        document.getElementById('paymentHistoryReport')?.querySelector('.btn').addEventListener('click', () => {
            this.generatePaymentHistoryReport();
        });

        // Loan Report
        document.getElementById('loanReport')?.querySelector('.btn').addEventListener('click', () => {
            this.generateLoanReport();
        });

        // Export buttons
        document.getElementById('exportPDFBtn')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('closeReportBtn')?.addEventListener('click', () => this.closeReport());
    }

    generateMonthlyPayrollReport() {
        const month = prompt('Enter month (YYYY-MM):');
        if (!month) return;

        const payroll = this.system.payrolls.find(p => p.month === month);
        
        if (!payroll) {
            this.system.showNotification('No payroll found for this month.', 'warning');
            return;
        }

        const reportContent = this.createMonthlyPayrollHTML(payroll);
        this.showReport('Monthly Payroll Summary', reportContent);
        this.system.logActivity(`Generated monthly payroll report for ${payroll.monthName} ${payroll.year}`, 'Reports');
    }

    createMonthlyPayrollHTML(payroll) {
        return `
            <div class="report-summary">
                <h3>Payroll Summary for ${payroll.monthName} ${payroll.year}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
                    <div class="summary-card">
                        <h4>Total Employees</h4>
                        <p class="summary-value">${payroll.employee_count}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total Gross</h4>
                        <p class="summary-value">K ${payroll.total_gross.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total NAPSA (Employee)</h4>
                        <p class="summary-value">K ${payroll.total_napsa_employee.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total NAPSA (Employer)</h4>
                        <p class="summary-value">K ${payroll.total_napsa_employer.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total Net Pay</h4>
                        <p class="summary-value">K ${payroll.total_net.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Status</h4>
                        <p class="summary-value">${payroll.status}</p>
                    </div>
                </div>

                <h3 style="margin-top: 2rem;">Detailed Breakdown</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Basic Salary</th>
                            <th>Allowances</th>
                            <th>Gross</th>
                            <th>NAPSA (Emp)</th>
                            <th>NAPSA (Empr)</th>
                            <th>Deductions</th>
                            <th>Net Pay</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payroll.records.map(record => `
                            <tr>
                                <td>${record.employee_name}</td>
                                <td>K ${record.basic_salary.toFixed(2)}</td>
                                <td>K ${record.allowances.toFixed(2)}</td>
                                <td>K ${record.gross_salary.toFixed(2)}</td>
                                <td>K ${record.napsa_employee.toFixed(2)}</td>
                                <td>K ${record.napsa_employer.toFixed(2)}</td>
                                <td>K ${record.total_deductions.toFixed(2)}</td>
                                <td><strong>K ${record.net_pay.toFixed(2)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background: #f0f8ff;">
                            <td>TOTAL</td>
                            <td>K ${payroll.records.reduce((s, r) => s + r.basic_salary, 0).toFixed(2)}</td>
                            <td>K ${payroll.records.reduce((s, r) => s + r.allowances, 0).toFixed(2)}</td>
                            <td>K ${payroll.total_gross.toFixed(2)}</td>
                            <td>K ${payroll.total_napsa_employee.toFixed(2)}</td>
                            <td>K ${payroll.total_napsa_employer.toFixed(2)}</td>
                            <td>K ${payroll.records.reduce((s, r) => s + r.total_deductions, 0).toFixed(2)}</td>
                            <td>K ${payroll.total_net.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                    <p><strong>Created by:</strong> ${payroll.created_by}</p>
                    <p><strong>Created on:</strong> ${new Date(payroll.created_at).toLocaleString()}</p>
                    ${payroll.approved_by ? `<p><strong>Approved by:</strong> ${payroll.approved_by}</p>` : ''}
                    ${payroll.approved_at ? `<p><strong>Approved on:</strong> ${new Date(payroll.approved_at).toLocaleString()}</p>` : ''}
                </div>
            </div>
        `;
    }

    generateNapsaReport() {
        const year = prompt('Enter year (YYYY):') || new Date().getFullYear().toString();
        
        const payrolls = this.system.payrolls.filter(p => p.year === year);
        
        if (payrolls.length === 0) {
            this.system.showNotification('No payroll data found for this year.', 'warning');
            return;
        }

        const reportContent = this.createNapsaReportHTML(payrolls, year);
        this.showReport('NAPSA Contribution Report', reportContent);
        this.system.logActivity(`Generated NAPSA report for ${year}`, 'Reports');
    }

    createNapsaReportHTML(payrolls, year) {
        // Calculate yearly totals
        const yearlyTotals = {
            employee: payrolls.reduce((sum, p) => sum + p.total_napsa_employee, 0),
            employer: payrolls.reduce((sum, p) => sum + p.total_napsa_employer, 0)
        };
        yearlyTotals.total = yearlyTotals.employee + yearlyTotals.employer;

        return `
            <div class="report-summary">
                <h3>NAPSA Contribution Report for ${year}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
                    <div class="summary-card">
                        <h4>Employee Contributions</h4>
                        <p class="summary-value">K ${yearlyTotals.employee.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Employer Contributions</h4>
                        <p class="summary-value">K ${yearlyTotals.employer.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total NAPSA</h4>
                        <p class="summary-value">K ${yearlyTotals.total.toFixed(2)}</p>
                    </div>
                </div>

                <h3 style="margin-top: 2rem;">Monthly Breakdown</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Employees</th>
                            <th>Employee Contribution (5%)</th>
                            <th>Employer Contribution (5%)</th>
                            <th>Total NAPSA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payrolls.sort((a, b) => a.month.localeCompare(b.month)).map(payroll => {
                            const totalNapsa = payroll.total_napsa_employee + payroll.total_napsa_employer;
                            return `
                                <tr>
                                    <td><strong>${payroll.monthName} ${payroll.year}</strong></td>
                                    <td>${payroll.employee_count}</td>
                                    <td>K ${payroll.total_napsa_employee.toFixed(2)}</td>
                                    <td>K ${payroll.total_napsa_employer.toFixed(2)}</td>
                                    <td><strong>K ${totalNapsa.toFixed(2)}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background: #f0f8ff;">
                            <td>YEARLY TOTAL</td>
                            <td>-</td>
                            <td>K ${yearlyTotals.employee.toFixed(2)}</td>
                            <td>K ${yearlyTotals.employer.toFixed(2)}</td>
                            <td>K ${yearlyTotals.total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4 style="margin-bottom: 0.5rem;">NAPSA Remittance Information</h4>
                    <p>Maximum monthly contribution per employee: K ${this.system.settings.napsaMaxContribution.toFixed(2)}</p>
                    <p>Employee rate: ${this.system.settings.napsaEmployeeRate}%</p>
                    <p>Employer rate: ${this.system.settings.napsaEmployerRate}%</p>
                </div>
            </div>
        `;
    }

    generatePaymentHistoryReport() {
        // Prompt for employee selection
        const employeeId = prompt('Enter Employee ID (leave blank for all employees):');
        
        let payslips = this.system.payslips;
        let title = 'All Employees Payment History';
        
        if (employeeId) {
            payslips = payslips.filter(p => p.employee_id === employeeId);
            const employee = this.system.employees.find(e => e.employee_id === employeeId);
            title = employee ? `Payment History - ${employee.full_name}` : 'Employee Payment History';
        }

        if (payslips.length === 0) {
            this.system.showNotification('No payment history found.', 'warning');
            return;
        }

        const reportContent = this.createPaymentHistoryHTML(payslips, title);
        this.showReport(title, reportContent);
        this.system.logActivity(`Generated payment history report`, 'Reports');
    }

    createPaymentHistoryHTML(payslips, title) {
        const totalPaid = payslips.reduce((sum, p) => sum + p.net_pay, 0);

        return `
            <div class="report-summary">
                <h3>${title}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
                    <div class="summary-card">
                        <h4>Total Payslips</h4>
                        <p class="summary-value">${payslips.length}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total Amount Paid</h4>
                        <p class="summary-value">K ${totalPaid.toFixed(2)}</p>
                    </div>
                </div>

                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Month</th>
                            <th>Gross Salary</th>
                            <th>NAPSA</th>
                            <th>Deductions</th>
                            <th>Net Pay</th>
                            <th>Email Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payslips.sort((a, b) => b.month.localeCompare(a.month)).map(payslip => `
                            <tr>
                                <td>${payslip.employee_name}<br><small>${payslip.employee_id}</small></td>
                                <td>${payslip.monthName} ${payslip.year}</td>
                                <td>K ${payslip.gross_salary.toFixed(2)}</td>
                                <td>K ${payslip.napsa_employee.toFixed(2)}</td>
                                <td>K ${payslip.total_deductions.toFixed(2)}</td>
                                <td><strong>K ${payslip.net_pay.toFixed(2)}</strong></td>
                                <td><span class="status-badge ${payslip.email_status.toLowerCase()}">${payslip.email_status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background: #f0f8ff;">
                            <td colspan="5">TOTAL</td>
                            <td>K ${totalPaid.toFixed(2)}</td>
                            <td>-</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    generateLoanReport() {
        const loans = this.system.loans;
        
        if (loans.length === 0) {
            this.system.showNotification('No loan records found.', 'warning');
            return;
        }

        const reportContent = this.createLoanReportHTML(loans);
        this.showReport('Loan & Advance Deduction Summary', reportContent);
        this.system.logActivity('Generated loan deduction report', 'Reports');
    }

    createLoanReportHTML(loans) {
        const activeLoans = loans.filter(l => l.status === 'Active');
        const clearedLoans = loans.filter(l => l.status === 'Cleared');
        
        const totalActive = activeLoans.reduce((sum, l) => sum + l.remaining_balance, 0);
        const totalCleared = clearedLoans.reduce((sum, l) => sum + l.total_amount, 0);

        return `
            <div class="report-summary">
                <h3>Loan & Advance Deduction Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
                    <div class="summary-card">
                        <h4>Active Loans</h4>
                        <p class="summary-value">${activeLoans.length}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Outstanding Balance</h4>
                        <p class="summary-value">K ${totalActive.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Cleared Loans</h4>
                        <p class="summary-value">${clearedLoans.length}</p>
                    </div>
                    <div class="summary-card">
                        <h4>Total Cleared Amount</h4>
                        <p class="summary-value">K ${totalCleared.toFixed(2)}</p>
                    </div>
                </div>

                <h3 style="margin-top: 2rem;">Active Loans</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Total Amount</th>
                            <th>Monthly Deduction</th>
                            <th>Remaining Balance</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeLoans.map(loan => {
                            const employee = this.system.employees.find(e => e.employee_id === loan.employee_id);
                            return `
                                <tr>
                                    <td>${employee ? employee.full_name : 'Unknown'}<br><small>${loan.employee_id}</small></td>
                                    <td>${loan.type}</td>
                                    <td>K ${loan.total_amount.toFixed(2)}</td>
                                    <td>K ${loan.monthly_deduction.toFixed(2)}</td>
                                    <td><strong>K ${loan.remaining_balance.toFixed(2)}</strong></td>
                                    <td>${loan.remarks || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <h3 style="margin-top: 2rem;">Cleared Loans</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clearedLoans.map(loan => {
                            const employee = this.system.employees.find(e => e.employee_id === loan.employee_id);
                            return `
                                <tr>
                                    <td>${employee ? employee.full_name : 'Unknown'}</td>
                                    <td>${loan.type}</td>
                                    <td>K ${loan.total_amount.toFixed(2)}</td>
                                    <td><span class="status-badge cleared">Cleared</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    showReport(title, content) {
        const viewer = document.getElementById('reportViewer');
        const titleEl = document.getElementById('reportTitle');
        const contentEl = document.getElementById('reportContent');
        
        titleEl.textContent = title;
        contentEl.innerHTML = content;
        viewer.style.display = 'block';
        
        // Scroll to report
        viewer.scrollIntoView({ behavior: 'smooth' });
    }

    closeReport() {
        document.getElementById('reportViewer').style.display = 'none';
    }

    exportToPDF() {
        const content = document.getElementById('reportContent');
        const title = document.getElementById('reportTitle').textContent;
        
        if (typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined') {
            html2canvas(content, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 190;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                pdf.text(title, 105, 10, { align: 'center' });
                pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
                
                pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
                this.system.showNotification('Report exported to PDF.', 'success');
            });
        } else {
            window.print();
            this.system.showNotification('Use Print to PDF option.', 'info');
        }
    }

    exportToExcel() {
        // Simple CSV export (can be enhanced with SheetJS/XLSX library)
        const title = document.getElementById('reportTitle').textContent;
        const table = document.querySelector('#reportContent table');
        
        if (!table) {
            this.system.showNotification('No table data to export.', 'warning');
            return;
        }

        let csv = [];
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cols = row.querySelectorAll('td, th');
            const csvRow = Array.from(cols).map(col => `"${col.textContent.trim()}"`);
            csv.push(csvRow.join(','));
        });

        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        this.system.showNotification('Report exported to CSV.', 'success');
    }
}
