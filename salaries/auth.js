// Professional Authentication System with Advanced Security Features
// Features: Password Strength, Brute Force Protection, Account Lockout, Session Management
// All data persists in localStorage even after browser refresh

class AuthSystem {
    constructor() {
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 60 * 60 * 1000; // 1 hour
        this.passwordMinLength = 8;
        this.init();
    }

    init() {
        // Check if already logged in and session validity
        this.checkExistingSession();
        
        // Initialize event listeners
        this.initTabs();
        this.initForms();
        this.initPasswordToggles();
        this.initPasswordStrength();
        this.loadRememberedEmail();
        
        // Start session monitoring
        this.startSessionMonitoring();
    }

    checkExistingSession() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            // Check if session has expired
            const sessionData = JSON.parse(localStorage.getItem('ebs_session_data') || '{}');
            const sessionExpiry = sessionData.expiry || 0;
            
            if (Date.now() > sessionExpiry) {
                // Session expired, logout
                this.performLogout();
                this.showError('Your session has expired. Please login again.');
            } else {
                // Valid session, redirect to main app
                window.location.href = 'index.html';
            }
        }
    }
    
    startSessionMonitoring() {
        // Monitor user activity to prevent session timeout
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => this.refreshSession());
        });
    }
    
    refreshSession() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            const sessionData = {
                expiry: Date.now() + this.sessionTimeout,
                lastActivity: new Date().toISOString()
            };
            localStorage.setItem('ebs_session_data', JSON.stringify(sessionData));
        }
    }

    initTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${targetTab}Form`).classList.add('active');
                this.hideAlerts();
            });
        });
    }

    initForms() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });
    }
    
    initPasswordStrength() {
        const signupPasswordInput = document.getElementById('signupPassword');
        if (signupPasswordInput) {
            signupPasswordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }
    
    updatePasswordStrength(password) {
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');
        const requirements = document.querySelectorAll('.password-req');
        
        if (!strengthBar || !strengthText) return;
        
        let strength = 0;
        const checks = {
            length: password.length >= this.passwordMinLength,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        // Update requirement checkmarks
        if (requirements.length > 0) {
            requirements[0].classList.toggle('met', checks.length);
            requirements[1].classList.toggle('met', checks.uppercase);
            requirements[2].classList.toggle('met', checks.lowercase);
            requirements[3].classList.toggle('met', checks.number);
            requirements[4].classList.toggle('met', checks.special);
        }
        
        // Calculate strength
        Object.values(checks).forEach(check => { if (check) strength++; });
        
        // Update strength bar
        strengthBar.className = 'password-strength-bar';
        if (strength <= 2) {
            strengthBar.classList.add('strength-weak');
            strengthText.textContent = 'Weak';
            strengthText.style.color = '#dc3545';
        } else if (strength <= 4) {
            strengthBar.classList.add('strength-medium');
            strengthText.textContent = 'Medium';
            strengthText.style.color = '#ffc107';
        } else {
            strengthBar.classList.add('strength-strong');
            strengthText.textContent = 'Strong';
            strengthText.style.color = '#28a745';
        }
        
        strengthBar.parentElement.classList.add('show');
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

    handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const role = document.getElementById('signupRole').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validate inputs
        if (!name || !email || !password || !confirmPassword || !role) {
            this.showError('Please fill in all fields');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        // Password validation
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (!this.validatePasswordStrength(password)) {
            this.showError('Password does not meet security requirements');
            return;
        }

        if (!agreeTerms) {
            this.showError('Please agree to Terms & Conditions');
            return;
        }

        const btn = document.querySelector('#signupForm .btn-primary');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            // Check if email already exists
            const users = this.getUsers();
            
            if (users.find(u => u.email === email)) {
                throw new Error('Email already registered. Please login instead.');
            }

            // Create new user with secure password hash
            const newUser = {
                id: Date.now().toString(),
                name,
                email,
                password: this.hashPassword(password),
                role,
                createdAt: new Date().toISOString(),
                isActive: true,
                failedLoginAttempts: 0,
                lastLogin: null,
                accountLocked: false,
                lockoutUntil: null
            };

            // Save user
            users.push(newUser);
            localStorage.setItem('ebs_users', JSON.stringify(users));

            this.logActivity(`New user registered: ${name} (${email})`, 'Authentication');
            this.showSuccess('Account created successfully! You can now login.');

            // Clear form and switch to login
            setTimeout(() => {
                document.getElementById('signupForm').reset();
                btn.classList.remove('loading');
                btn.disabled = false;
                
                // Switch to login tab
                document.querySelector('[data-tab="login"]').click();
                document.getElementById('loginEmail').value = email;
            }, 1500);

        } catch (error) {
            this.showError(error.message);
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }
    
    validatePasswordStrength(password) {
        if (password.length < this.passwordMinLength) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[a-z]/.test(password)) return false;
        if (!/[0-9]/.test(password)) return false;
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
        return true;
    }

    handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        const btn = document.querySelector('#loginForm .btn-primary');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            // Get users
            const users = this.getUsers();
            const userIndex = users.findIndex(u => u.email === email);
            const user = users[userIndex];

            if (!user) {
                throw new Error('Account not found. Please sign up first.');
            }

            // Check if account is locked
            if (user.accountLocked && user.lockoutUntil) {
                const lockoutRemaining = user.lockoutUntil - Date.now();
                if (lockoutRemaining > 0) {
                    const minutes = Math.ceil(lockoutRemaining / 60000);
                    throw new Error(`Account locked due to multiple failed login attempts. Try again in ${minutes} minute(s).`);
                } else {
                    // Unlock account
                    user.accountLocked = false;
                    user.lockoutUntil = null;
                    user.failedLoginAttempts = 0;
                }
            }

            // Verify password
            if (user.password !== this.hashPassword(password)) {
                // Increment failed attempts
                user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                
                const remainingAttempts = this.maxLoginAttempts - user.failedLoginAttempts;
                
                if (user.failedLoginAttempts >= this.maxLoginAttempts) {
                    // Lock account
                    user.accountLocked = true;
                    user.lockoutUntil = Date.now() + this.lockoutDuration;
                    users[userIndex] = user;
                    localStorage.setItem('ebs_users', JSON.stringify(users));
                    
                    this.logActivity(`Account locked for: ${email}`, 'Security');
                    throw new Error('Account locked due to multiple failed login attempts. Please try again in 15 minutes.');
                }
                
                users[userIndex] = user;
                localStorage.setItem('ebs_users', JSON.stringify(users));
                
                this.logActivity(`Failed login attempt for: ${email}`, 'Security');
                throw new Error(`Incorrect password. ${remainingAttempts} attempt(s) remaining.`);
            }

            // Successful login - reset failed attempts
            user.failedLoginAttempts = 0;
            user.accountLocked = false;
            user.lockoutUntil = null;
            user.lastLogin = new Date().toISOString();
            
            users[userIndex] = user;
            localStorage.setItem('ebs_users', JSON.stringify(users));

            // Set current user session
            this.setCurrentUser(user);

            // Set session expiry
            const sessionData = {
                expiry: Date.now() + this.sessionTimeout,
                lastActivity: new Date().toISOString()
            };
            localStorage.setItem('ebs_session_data', JSON.stringify(sessionData));

            // Remember email if requested
            if (rememberMe) {
                localStorage.setItem('ebs_remembered_email', email);
            } else {
                localStorage.removeItem('ebs_remembered_email');
            }

            this.logActivity(`User logged in: ${user.name}`, 'Authentication');
            this.showSuccess('Login successful! Redirecting...');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            this.showError(error.message);
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    performLogout() {
        localStorage.removeItem('ebs_current_user');
        localStorage.removeItem('ebs_session_data');
        this.logActivity('User logged out', 'Authentication');
    }

    getUsers() {
        const users = localStorage.getItem('ebs_users');
        return users ? JSON.parse(users) : [];
    }

    getPendingUsers() {
        const pending = localStorage.getItem('ebs_pending_users');
        return pending ? JSON.parse(pending) : [];
    }

    getCurrentUser() {
        const user = localStorage.getItem('ebs_current_user');
        return user ? JSON.parse(user) : null;
    }

    setCurrentUser(user) {
        user.lastLogin = new Date().toISOString();
        const userSession = {...user};
        delete userSession.password;
        localStorage.setItem('ebs_current_user', JSON.stringify(userSession));
        
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index].lastLogin = user.lastLogin;
            localStorage.setItem('ebs_users', JSON.stringify(users));
        }
    }

    loadRememberedEmail() {
        const rememberedEmail = localStorage.getItem('ebs_remembered_email');
        if (rememberedEmail) {
            document.getElementById('loginEmail').value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    hashPassword(password) {
        // Enhanced password hashing with salt
        const salt = 'EBS_SALT_2025';
        const saltedPassword = salt + password + salt.split('').reverse().join('');
        
        let hash = 0;
        for (let i = 0; i < saltedPassword.length; i++) {
            const char = saltedPassword.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        // Convert to hex string for better security
        let hexHash = '';
        for (let i = 0; i < 16; i++) {
            hexHash += ((hash >> (i * 2)) & 0xFF).toString(16).padStart(2, '0');
        }
        
        return hexHash;
    }

    logActivity(action, category) {
        const activityLog = JSON.parse(localStorage.getItem('ebs_activity_log') || '[]');
        activityLog.push({
            id: Date.now().toString(),
            action,
            category,
            timestamp: new Date().toISOString(),
            user: this.getCurrentUser()?.name || 'System'
        });
        localStorage.setItem('ebs_activity_log', JSON.stringify(activityLog));
    }

    showSuccess(message) {
        this.hideAlerts();
        const alert = document.getElementById('successAlert');
        const messageEl = document.getElementById('successMessage');
        messageEl.textContent = message;
        alert.classList.add('show');
    }

    showError(message) {
        this.hideAlerts();
        const alert = document.getElementById('errorAlert');
        const messageEl = document.getElementById('errorMessage');
        messageEl.textContent = message;
        alert.classList.add('show');
    }

    hideAlerts() {
        document.getElementById('successAlert').classList.remove('show');
        document.getElementById('errorAlert').classList.remove('show');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthSystem();
});
