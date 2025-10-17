// Email Verification Handler
// Handles email verification and password setup

class EmailVerification {
    constructor() {
        this.init();
    }

    init() {
        // Get verification code and email from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.verificationCode = urlParams.get('code');
        this.email = urlParams.get('email');

        // Initialize password toggles
        this.initPasswordToggles();

        // Initialize form submissions
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.setPassword();
        });

        document.getElementById('manualVerifyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleManualVerification();
        });

        // Check if we have URL parameters
        if (!this.verificationCode || !this.email) {
            // Show manual entry form
            this.showManualEntry();
        } else {
            // Auto-verify with URL parameters
            this.verifyCode();
        }
    }

    showManualEntry() {
        document.getElementById('verifying').style.display = 'none';
        document.getElementById('manualEntry').style.display = 'block';
    }

    async handleManualVerification() {
        const email = document.getElementById('manualEmail').value.trim();
        const code = document.getElementById('manualCode').value.trim();
        const errorAlert = document.getElementById('manualError');
        const errorMessage = document.getElementById('manualErrorMessage');
        const btn = document.getElementById('manualVerifyBtn');

        // Hide previous errors
        errorAlert.classList.remove('show');

        if (!email || !code) {
            errorMessage.textContent = 'Please enter both email and verification code';
            errorAlert.classList.add('show');
            return;
        }

        if (code.length !== 6 || !/^\d+$/.test(code)) {
            errorMessage.textContent = 'Verification code must be 6 digits';
            errorAlert.classList.add('show');
            return;
        }

        // Show loading
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            // Set the verification details
            this.verificationCode = code;
            this.email = email;

            // Verify the code
            await this.verifyCode();

            // If successful, hide manual entry
            document.getElementById('manualEntry').style.display = 'none';

        } catch (error) {
            errorMessage.textContent = error.message;
            errorAlert.classList.add('show');
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    async verifyCode() {
        try {
            // Get pending users from localStorage
            const pendingUsers = JSON.parse(localStorage.getItem('ebs_pending_users') || '[]');
            
            // Find user with matching code and email
            const userIndex = pendingUsers.findIndex(u => 
                u.verificationCode === this.verificationCode && 
                u.email === this.email
            );

            if (userIndex === -1) {
                throw new Error('Invalid or expired verification code. Please check your email and try again.');
            }

            const user = pendingUsers[userIndex];

            // Check if code has expired (24 hours)
            const codeAge = Date.now() - new Date(user.createdAt).getTime();
            if (codeAge > 24 * 60 * 60 * 1000) {
                throw new Error('Verification code has expired. Please sign up again to receive a new code.');
            }

            // Mark user as email verified
            user.emailVerified = true;
            user.verifiedAt = new Date().toISOString();
            pendingUsers[userIndex] = user;
            localStorage.setItem('ebs_pending_users', JSON.stringify(pendingUsers));

            // Show password setup form
            document.getElementById('verifying').style.display = 'none';
            document.getElementById('setPassword').style.display = 'block';

        } catch (error) {
            this.showError(error.message);
        }
    }

    async setPassword() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorAlert = document.getElementById('passwordError');
        const errorMessage = document.getElementById('passwordErrorMessage');
        const btn = document.getElementById('setPasswordBtn');

        // Hide previous errors
        errorAlert.classList.remove('show');

        // Validate password
        if (password.length < 8) {
            errorMessage.textContent = 'Password must be at least 8 characters long';
            errorAlert.classList.add('show');
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorAlert.classList.add('show');
            return;
        }

        // Show loading
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            // Get pending users
            const pendingUsers = JSON.parse(localStorage.getItem('ebs_pending_users') || '[]');
            const userIndex = pendingUsers.findIndex(u => 
                u.verificationCode === this.verificationCode && 
                u.email === this.email
            );

            if (userIndex === -1) {
                throw new Error('User not found');
            }

            const user = pendingUsers[userIndex];

            // Set password
            user.password = this.hashPassword(password);
            user.passwordSetAt = new Date().toISOString();

            // Move from pending to verified users
            const users = JSON.parse(localStorage.getItem('ebs_users') || '[]');
            const newUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                password: user.password,
                emailVerified: true,
                requiresOTP: true,
                createdAt: user.createdAt,
                verifiedAt: user.verifiedAt,
                passwordSetAt: user.passwordSetAt
            };

            users.push(newUser);
            localStorage.setItem('ebs_users', JSON.stringify(users));

            // Remove from pending users
            pendingUsers.splice(userIndex, 1);
            localStorage.setItem('ebs_pending_users', JSON.stringify(pendingUsers));

            // Log activity
            this.logActivity(`User completed registration: ${user.name}`, 'Authentication');

            // Show success
            document.getElementById('setPassword').style.display = 'none';
            document.getElementById('verified').style.display = 'block';

        } catch (error) {
            errorMessage.textContent = error.message;
            errorAlert.classList.add('show');
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    initPasswordToggles() {
        const toggles = document.querySelectorAll('.toggle-password');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.dataset.target;
                const input = document.getElementById(targetId);
                
                if (input.type === 'password') {
                    input.type = 'text';
                    toggle.classList.remove('fa-eye');
                    toggle.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    toggle.classList.remove('fa-eye-slash');
                    toggle.classList.add('fa-eye');
                }
            });
        });
    }

    hashPassword(password) {
        // Simple hash for demo
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    logActivity(action, category) {
        const activityLog = JSON.parse(localStorage.getItem('ebs_activity_log') || '[]');
        activityLog.push({
            id: Date.now().toString(),
            action,
            category,
            timestamp: new Date().toISOString(),
            user: 'System'
        });
        localStorage.setItem('ebs_activity_log', JSON.stringify(activityLog));
    }

    showError(message) {
        document.getElementById('verifying').style.display = 'none';
        document.getElementById('setPassword').style.display = 'none';
        document.getElementById('verified').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmailVerification();
});
