// Cloud Database Manager - Real-time sync for all devices
// Handles users, students, teachers, support staff, and settings

class CloudDatabase {
    constructor() {
        // Get Supabase credentials from environment or config
        this.supabaseUrl = this.getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || 'https://sxjlekfxdphmelykqiii.supabase.co';
        this.supabaseKey = this.getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4amxla2Z4ZHBobWVseWtxaWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjYwMDMsImV4cCI6MjA3NjI0MjAwM30.aujwb4tA3xaPaqpboBKFV6NxY4b07T7zefTARqyseZQ';
        
        // Check if we're in production
        this.isProduction = !window.location.hostname.includes('localhost') && 
                           !window.location.hostname.includes('127.0.0.1');
        
        // Check if Supabase is properly configured
        this.isConfigured = this.supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                           this.supabaseKey !== 'YOUR_SUPABASE_ANON_KEY';
        
        if (this.isConfigured) {
            this.initSupabase();
        } else {
            console.warn('⚠️ Supabase not configured. Using localStorage fallback.');
            this.useLocalStorage = true;
        }
    }
    
    getEnvVar(name) {
        // Try to get from process.env (if available)
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return process.env[name];
        }
        return null;
    }
    
    initSupabase() {
        try {
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase library not loaded!');
                this.useLocalStorage = true;
                return;
            }
            
            this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            console.log('✅ Cloud database connected!');
            console.log('🌍 Real-time sync enabled');
            this.useLocalStorage = false;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            this.useLocalStorage = true;
        }
    }
    
    // ==================== USERS ====================
    
    async getUsers() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('ebs_users') || '[]');
        }
        
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            console.log(`✅ Loaded ${data.length} users from cloud`);
            return data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }
    
    async createUser(userData) {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('ebs_users') || '[]');
            const newUser = {
                id: Date.now().toString(),
                ...userData,
                created_at: new Date().toISOString()
            };
            users.push(newUser);
            localStorage.setItem('ebs_users', JSON.stringify(users));
            return newUser;
        }
        
        try {
            const { data, error } = await this.client
                .from('users')
                .insert([userData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ User created in cloud');
            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    
    async findUserByEmail(email) {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('ebs_users') || '[]');
            return users.find(u => u.email.toLowerCase() === email.toLowerCase());
        }
        
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .ilike('email', email)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            return null;
        }
    }
    
    async updateUser(id, updates) {
        if (this.useLocalStorage) {
            const users = JSON.parse(localStorage.getItem('ebs_users') || '[]');
            const index = users.findIndex(u => u.id === id);
            if (index !== -1) {
                users[index] = { ...users[index], ...updates };
                localStorage.setItem('ebs_users', JSON.stringify(users));
                return users[index];
            }
            return null;
        }
        
        try {
            const { data, error } = await this.client
                .from('users')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ User updated in cloud');
            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    
    // ==================== STUDENTS ====================
    
    async getStudents() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('ebs_students') || '[]');
        }
        
        try {
            const { data, error } = await this.client
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            console.log(`✅ Loaded ${data.length} students from cloud`);
            return data || [];
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    }
    
    async createStudent(studentData) {
        if (this.useLocalStorage) {
            const students = JSON.parse(localStorage.getItem('ebs_students') || '[]');
            const newStudent = {
                id: Date.now().toString(),
                ...studentData,
                created_at: new Date().toISOString()
            };
            students.push(newStudent);
            localStorage.setItem('ebs_students', JSON.stringify(students));
            return newStudent;
        }
        
        try {
            const { data, error } = await this.client
                .from('students')
                .insert([studentData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Student created in cloud');
            return data;
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    }
    
    async updateStudent(id, updates) {
        if (this.useLocalStorage) {
            const students = JSON.parse(localStorage.getItem('ebs_students') || '[]');
            const index = students.findIndex(s => s.id === id);
            if (index !== -1) {
                students[index] = { ...students[index], ...updates };
                localStorage.setItem('ebs_students', JSON.stringify(students));
                return students[index];
            }
            return null;
        }
        
        try {
            const { data, error } = await this.client
                .from('students')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Student updated in cloud');
            return data;
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    }
    
    async deleteStudent(id) {
        if (this.useLocalStorage) {
            const students = JSON.parse(localStorage.getItem('ebs_students') || '[]');
            const filtered = students.filter(s => s.id !== id);
            localStorage.setItem('ebs_students', JSON.stringify(filtered));
            return true;
        }
        
        try {
            const { error } = await this.client
                .from('students')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Student deleted from cloud');
            return true;
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }
    
    // ==================== TEACHERS ====================
    
    async getTeachers() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('ebs_teachers') || '[]');
        }
        
        try {
            const { data, error } = await this.client
                .from('teachers')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            console.log(`✅ Loaded ${data.length} teachers from cloud`);
            return data || [];
        } catch (error) {
            console.error('Error fetching teachers:', error);
            return [];
        }
    }
    
    async createTeacher(teacherData) {
        if (this.useLocalStorage) {
            const teachers = JSON.parse(localStorage.getItem('ebs_teachers') || '[]');
            const newTeacher = {
                id: Date.now().toString(),
                ...teacherData,
                created_at: new Date().toISOString()
            };
            teachers.push(newTeacher);
            localStorage.setItem('ebs_teachers', JSON.stringify(teachers));
            return newTeacher;
        }
        
        try {
            const { data, error } = await this.client
                .from('teachers')
                .insert([teacherData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Teacher created in cloud');
            return data;
        } catch (error) {
            console.error('Error creating teacher:', error);
            throw error;
        }
    }
    
    async updateTeacher(id, updates) {
        if (this.useLocalStorage) {
            const teachers = JSON.parse(localStorage.getItem('ebs_teachers') || '[]');
            const index = teachers.findIndex(t => t.id === id);
            if (index !== -1) {
                teachers[index] = { ...teachers[index], ...updates };
                localStorage.setItem('ebs_teachers', JSON.stringify(teachers));
                return teachers[index];
            }
            return null;
        }
        
        try {
            const { data, error } = await this.client
                .from('teachers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Teacher updated in cloud');
            return data;
        } catch (error) {
            console.error('Error updating teacher:', error);
            throw error;
        }
    }
    
    async deleteTeacher(id) {
        if (this.useLocalStorage) {
            const teachers = JSON.parse(localStorage.getItem('ebs_teachers') || '[]');
            const filtered = teachers.filter(t => t.id !== id);
            localStorage.setItem('ebs_teachers', JSON.stringify(filtered));
            return true;
        }
        
        try {
            const { error } = await this.client
                .from('teachers')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Teacher deleted from cloud');
            return true;
        } catch (error) {
            console.error('Error deleting teacher:', error);
            throw error;
        }
    }
    
    // ==================== SUPPORT STAFF ====================
    
    async getSupportStaff() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('ebs_support_staff') || '[]');
        }
        
        try {
            const { data, error } = await this.client
                .from('support_staff')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            console.log(`✅ Loaded ${data.length} support staff from cloud`);
            return data || [];
        } catch (error) {
            console.error('Error fetching support staff:', error);
            return [];
        }
    }
    
    async createSupportStaff(staffData) {
        if (this.useLocalStorage) {
            const staff = JSON.parse(localStorage.getItem('ebs_support_staff') || '[]');
            const newStaff = {
                id: Date.now().toString(),
                ...staffData,
                created_at: new Date().toISOString()
            };
            staff.push(newStaff);
            localStorage.setItem('ebs_support_staff', JSON.stringify(staff));
            return newStaff;
        }
        
        try {
            const { data, error } = await this.client
                .from('support_staff')
                .insert([staffData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Support staff created in cloud');
            return data;
        } catch (error) {
            console.error('Error creating support staff:', error);
            throw error;
        }
    }
    
    async updateSupportStaff(id, updates) {
        if (this.useLocalStorage) {
            const staff = JSON.parse(localStorage.getItem('ebs_support_staff') || '[]');
            const index = staff.findIndex(s => s.id === id);
            if (index !== -1) {
                staff[index] = { ...staff[index], ...updates };
                localStorage.setItem('ebs_support_staff', JSON.stringify(staff));
                return staff[index];
            }
            return null;
        }
        
        try {
            const { data, error } = await this.client
                .from('support_staff')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Support staff updated in cloud');
            return data;
        } catch (error) {
            console.error('Error updating support staff:', error);
            throw error;
        }
    }
    
    async deleteSupportStaff(id) {
        if (this.useLocalStorage) {
            const staff = JSON.parse(localStorage.getItem('ebs_support_staff') || '[]');
            const filtered = staff.filter(s => s.id !== id);
            localStorage.setItem('ebs_support_staff', JSON.stringify(filtered));
            return true;
        }
        
        try {
            const { error } = await this.client
                .from('support_staff')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Support staff deleted from cloud');
            return true;
        } catch (error) {
            console.error('Error deleting support staff:', error);
            throw error;
        }
    }
    
    // ==================== EMPLOYEES (Payroll) ====================
    
    async getEmployees() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('ebs_employees') || '[]');
        }
        
        try {
            const { data, error } = await this.client
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            console.log(`✅ Loaded ${data.length} employees from cloud`);
            return data || [];
        } catch (error) {
            console.error('Error fetching employees:', error);
            return [];
        }
    }
    
    async createEmployee(employeeData) {
        if (this.useLocalStorage) {
            const employees = JSON.parse(localStorage.getItem('ebs_employees') || '[]');
            const newEmployee = {
                id: Date.now().toString(),
                ...employeeData,
                created_at: new Date().toISOString()
            };
            employees.push(newEmployee);
            localStorage.setItem('ebs_employees', JSON.stringify(employees));
            return newEmployee;
        }
        
        try {
            const { data, error } = await this.client
                .from('employees')
                .insert([employeeData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Employee created in cloud');
            return data;
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    }
    
    // ==================== SETTINGS (Email Config) ====================
    
    async getSetting(key) {
        if (this.useLocalStorage) {
            return localStorage.getItem(`ebs_${key}`);
        }
        
        try {
            const { data, error } = await this.client
                .from('app_settings')
                .select('value')
                .eq('key', key)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data ? data.value : null;
        } catch (error) {
            return null;
        }
    }
    
    async setSetting(key, value) {
        if (this.useLocalStorage) {
            localStorage.setItem(`ebs_${key}`, value);
            return true;
        }
        
        try {
            const { error } = await this.client
                .from('app_settings')
                .upsert({ key, value, updated_at: new Date().toISOString() });
            
            if (error) throw error;
            console.log(`✅ Setting ${key} saved to cloud`);
            return true;
        } catch (error) {
            console.error('Error saving setting:', error);
            return false;
        }
    }
    
    // ==================== REAL-TIME SUBSCRIPTIONS ====================
    
    subscribeToTable(tableName, callback) {
        if (this.useLocalStorage || !this.client) {
            console.log('📝 Real-time sync not available (using localStorage)');
            return null;
        }
        
        const subscription = this.client
            .channel(`${tableName}_changes`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => {
                    console.log(`🔄 Real-time update on ${tableName}:`, payload.eventType);
                    callback(payload);
                }
            )
            .subscribe();
        
        console.log(`✅ Subscribed to ${tableName} changes`);
        return subscription;
    }
    
    unsubscribe(subscription) {
        if (subscription && this.client) {
            this.client.removeChannel(subscription);
        }
    }
}

// Create global instance
window.cloudDB = new CloudDatabase();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudDatabase;
}
