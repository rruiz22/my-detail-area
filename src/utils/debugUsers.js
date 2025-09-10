// Diagnostic utility for debugging user queries
// Run this in browser console: import('./utils/debugUsers.js').then(m => m.diagnoseMissingUsers())

import { supabase } from '@/integrations/supabase/client';

export const diagnoseMissingUsers = async () => {
  console.log('🔍 Starting user diagnosis...');
  
  try {
    // 1. Check current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 Current user:', currentUser, authError);
    
    // 2. Simple profiles count
    const { count: profilesCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    console.log('🔍 Total profiles count:', profilesCount, countError);
    
    // 3. All profiles (simple query)
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, user_type, dealership_id, created_at')
      .order('email');
    console.log('🔍 All profiles (simple):', allProfiles, profilesError);
    
    // 4. Profiles with memberships (LEFT JOIN)
    const { data: profilesWithMemberships, error: membershipError } = await supabase
      .from('profiles')
      .select(`
        id, email, first_name, last_name, user_type, dealership_id, created_at,
        dealer_memberships (
          dealer_id,
          is_active,
          created_at
        )
      `)
      .order('email');
    console.log('🔍 Profiles with memberships (LEFT JOIN):', profilesWithMemberships, membershipError);
    
    // 5. Profiles with memberships (INNER JOIN - what UserDashboard uses)
    const { data: profilesInnerJoin, error: innerJoinError } = await supabase
      .from('profiles')
      .select(`
        id, email, first_name, last_name, user_type, dealership_id, created_at,
        dealer_memberships!inner (
          dealer_id,
          is_active,
          created_at
        )
      `)
      .order('email');
    console.log('🔍 Profiles with memberships (INNER JOIN):', profilesInnerJoin, innerJoinError);
    
    // 6. Check dealer_memberships table directly
    const { data: allMemberships, error: membershipDirectError } = await supabase
      .from('dealer_memberships')
      .select('*')
      .order('created_at');
    console.log('🔍 All dealer_memberships:', allMemberships, membershipDirectError);
    
    // 7. Check dealerships table
    const { data: dealerships, error: dealershipsError } = await supabase
      .from('dealerships')
      .select('id, name, status')
      .order('name');
    console.log('🔍 All dealerships:', dealerships, dealershipsError);
    
    // Summary
    console.log('🔍 SUMMARY:');
    console.log(`- Total profiles: ${profilesCount}`);
    console.log(`- Profiles returned (simple): ${allProfiles?.length || 0}`);
    console.log(`- Profiles with LEFT JOIN: ${profilesWithMemberships?.length || 0}`);
    console.log(`- Profiles with INNER JOIN: ${profilesInnerJoin?.length || 0}`);
    console.log(`- Total memberships: ${allMemberships?.length || 0}`);
    console.log(`- Total dealerships: ${dealerships?.length || 0}`);
    
    return {
      currentUser,
      profilesCount,
      allProfiles,
      profilesWithMemberships,
      profilesInnerJoin,
      allMemberships,
      dealerships
    };
    
  } catch (error) {
    console.error('🔍 Error during diagnosis:', error);
    return { error };
  }
};

// Test RLS policies specifically
export const testRLSPolicies = async () => {
  console.log('🔍 Testing RLS policies...');
  
  try {
    // Test with service key (bypasses RLS) - this won't work from browser but let's see the error
    console.log('🔍 Current client auth mode:', supabase.supabaseKey);
    
    // Try different query approaches to understand RLS restrictions
    
    // 1. Try count without select
    const { count: directCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    console.log('🔍 Direct count result:', directCount, countError);
    
    // 2. Try with specific user filter
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', (await supabase.auth.getUser()).data.user?.id);
    console.log('🔍 Current user profile only:', currentUserProfile, currentUserError);
    
    // 3. Try to get system admin users
    const { data: systemAdmins, error: adminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'system_admin');
    console.log('🔍 System admin profiles:', systemAdmins, adminError);
    
    // 4. Test dealer_memberships access
    const { data: memberships, error: membershipError } = await supabase
      .from('dealer_memberships')
      .select('*');
    console.log('🔍 All dealer_memberships:', memberships, membershipError);
    
    // 5. Try to get all profiles with explicit filtering
    const { data: allWithFilter, error: filterError } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'is', null); // Should get all if RLS allows
    console.log('🔍 All profiles with explicit filter:', allWithFilter, filterError);
    
  } catch (error) {
    console.error('🔍 Error testing RLS:', error);
  }
};

// Function to check current user's admin status
export const checkAdminStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Check if current user has admin permissions
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    console.log('🔍 Current user profile:', profile, error);
    
    // Try to check user roles
    const { data: roles, error: roleError } = await supabase
      .rpc('get_user_roles', { user_uuid: user.id });
    console.log('🔍 Current user roles:', roles, roleError);
    
    return { profile, roles };
  } catch (error) {
    console.error('🔍 Error checking admin status:', error);
    return null;
  }
};

// Auto-run when imported
if (typeof window !== 'undefined') {
  window.diagnoseMissingUsers = diagnoseMissingUsers;
  window.testRLSPolicies = testRLSPolicies;
  window.checkAdminStatus = checkAdminStatus;
  console.log('🔍 Debug utility loaded. Available functions:');
  console.log('  - diagnoseMissingUsers()');
  console.log('  - testRLSPolicies()');
  console.log('  - checkAdminStatus()');
}