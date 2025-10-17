// Supabase Configuration for Cloud Database
// This replaces localStorage with real-time cloud database

class SupabaseDB {
    constructor() {
        // Replace these with your Supabase credentials after deployment
        this.supabaseUrl = 'YOUR_SUPABASE_URL'; // e.g., https://abcdefgh.supabase.co
        this.supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Get from Supabase dashboard
        
        // Check if in production (deployed) or development (localhost)
        this.isProduction = !window.location.hostname.includes('localhost');
        
        if (!this.isProduction) {
            console.log('🔧 Running in DEVELOPMENT mode - using localStorage');
            console.log('📝 To use cloud database, deploy to Vercel');
        } else {
            console.log('☁️ Running in PRODUCTION mode - using Supabase');
            this.initSupabase();
        }
    }
    
    initSupabase() {
        // Initialize Supabase client
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase library not loaded!');
            console.log('Add this to your HTML <head>:');
            console.log('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
            return;
        }
        
        this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        console.log('✅ Supabase initialized');
    }
    
    // Get all users
    async getUsers() {
        if (!this.isProduction) {
            // Development: Use localStorage
            return JSON.parse(localStorage.getItem('ebs_users') || '[]');
        }
        
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }
    
    // Create new user
    async createUser(userData) {
        if (!this.isProduction) {
            // Development: Use localStorage
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
            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    
    // Find user by email
    async findUserByEmail(email) {
        if (!this.isProduction) {
            // Development: Use localStorage
            const users = JSON.parse(localStorage.getItem('ebs_users') || '[]');
            return users.find(u => u.email.toLowerCase() === email.toLowerCase());
        }
        
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return data;
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    }
    
    // Update user
    async updateUser(id, updates) {
        if (!this.isProduction) {
            // Development: Use localStorage
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
            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    
    // Real-time subscription to users table
    subscribeToUsers(callback) {
        if (!this.isProduction) {
            console.log('📝 Real-time sync not available in development mode');
            return null;
        }
        
        const subscription = this.client
            .channel('users_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'users' },
                (payload) => {
                    console.log('🔄 Real-time update:', payload);
                    callback(payload);
                }
            )
            .subscribe();
        
        return subscription;
    }
    
    // Unsubscribe from real-time updates
    unsubscribe(subscription) {
        if (subscription) {
            this.client.removeChannel(subscription);
        }
    }
}

// Create global database instance
window.db = new SupabaseDB();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseDB;
}
