// Script: Create Gurukul Admin User in Supabase
// Run: node scripts/create-admin.mjs

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your_secure_password';
const ADMIN_NAME     = 'Gurukul Vidyapeeth Admin';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
  console.log('🔧 Creating admin user...\n');

  // Step 1: Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:             ADMIN_EMAIL,
    password:          ADMIN_PASSWORD,
    email_confirm:     true,   // auto-confirm, no email verification needed
    user_metadata:     { full_name: ADMIN_NAME }
  });

  if (authError) {
    // If user already exists, try to get their ID
    if (authError.message.includes('already') || authError.code === 'email_exists') {
      console.log('⚠️  Auth user already exists, fetching existing user...');
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find(u => u.email === ADMIN_EMAIL);
      if (existing) {
        await insertAdminUser(existing.id);
        // Also update password
        await supabase.auth.admin.updateUserById(existing.id, { password: ADMIN_PASSWORD });
        console.log('✅ Password updated!');
      } else {
        console.error('❌ Could not find existing user');
      }
      return;
    }
    console.error('❌ Auth error:', authError.message);
    return;
  }

  console.log('✅ Auth user created:', authData.user.email);
  await insertAdminUser(authData.user.id);
}

async function insertAdminUser(userId) {
  // Step 2: Insert into admin_users table
  const { error: dbError } = await supabase
    .from('admin_users')
    .upsert({
      id:        userId,
      email:     ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role:      'super_admin',
      is_active: true
    }, { onConflict: 'id' });

  if (dbError) {
    console.error('❌ DB insert error:', dbError.message);
    return;
  }

  console.log('\n🎉 Admin user ready!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Email    :', ADMIN_EMAIL);
  console.log('  Password :', ADMIN_PASSWORD);
  console.log('  Role     : super_admin');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n👉 Login at: http://localhost:3000/admin/login\n');
}

createAdmin();
