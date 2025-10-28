// ============================================================================
// DEBUG SCRIPT - Permissions System Diagnostic
// ============================================================================
// HOW TO USE:
// 1. Open http://localhost:8080 in your browser
// 2. Log in with rudyruizlima@gmail.com
// 3. Open DevTools Console (F12)
// 4. Copy and paste this entire script
// 5. Review the output below
// ============================================================================

(async function debugPermissions() {
  console.log('🔍 ============================================================');
  console.log('🔍 PERMISSIONS DEBUG SCRIPT - Starting Diagnostic');
  console.log('🔍 ============================================================\n');

  try {
    // Import Supabase client
    const { supabase } = await import('./src/integrations/supabase/client.ts');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    console.log('✅ Current User:', {
      id: user.id,
      email: user.email
    });
    console.log('\n');

    // ========================================================================
    // QUERY 1: Check user's roles
    // ========================================================================
    console.log('📋 QUERY 1: Fetching user custom roles...');

    const { data: userRoles, error: rolesError } = await supabase
      .from('user_custom_role_assignments')
      .select(`
        custom_role_id,
        dealer_custom_roles (
          id,
          role_name,
          display_name,
          dealer_id
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError) throw rolesError;

    console.log('✅ User Custom Roles:', userRoles);
    console.log('   Count:', userRoles.length);
    console.log('\n');

    // ========================================================================
    // QUERY 2: Check role_module_access for each role
    // ========================================================================
    if (userRoles.length > 0) {
      const roleIds = userRoles.map(r => r.custom_role_id);

      console.log('📋 QUERY 2: Checking role_module_access...');

      const { data: moduleAccess, error: accessError } = await supabase
        .from('role_module_access')
        .select('*')
        .in('role_id', roleIds);

      if (accessError) throw accessError;

      console.log('✅ Role Module Access Entries:', moduleAccess);
      console.log('   Count:', moduleAccess?.length || 0);

      if (!moduleAccess || moduleAccess.length === 0) {
        console.warn('⚠️ WARNING: No entries found in role_module_access!');
        console.warn('   This means the role has NO module configuration.');
        console.warn('   Frontend will apply fail-closed policy = DENY ALL');
      } else {
        // Group by role
        const grouped = moduleAccess.reduce((acc, entry) => {
          if (!acc[entry.role_id]) acc[entry.role_id] = [];
          acc[entry.role_id].push(entry);
          return acc;
        }, {});

        console.log('\n   📊 Grouped by Role:');
        for (const [roleId, entries] of Object.entries(grouped)) {
          const role = userRoles.find(r => r.custom_role_id === roleId);
          const roleName = role?.dealer_custom_roles?.role_name || 'Unknown';

          console.log(`\n   🔑 Role: ${roleName} (${roleId})`);
          console.log('      Modules enabled:');

          const enabled = entries.filter(e => e.is_enabled);
          const disabled = entries.filter(e => !e.is_enabled);

          console.log('      ✅ Enabled:', enabled.map(e => e.module).join(', '));
          if (disabled.length > 0) {
            console.log('      ❌ Disabled:', disabled.map(e => e.module).join(', '));
          }
        }
      }
      console.log('\n');

      // ====================================================================
      // QUERY 3: Check module_permissions for each role
      // ====================================================================
      console.log('📋 QUERY 3: Checking role module permissions...');

      const { data: modulePerms, error: permsError } = await supabase
        .from('role_module_permissions_new')
        .select(`
          role_id,
          permission_id,
          module_permissions (
            module,
            permission_key,
            is_active
          )
        `)
        .in('role_id', roleIds);

      if (permsError) throw permsError;

      console.log('✅ Role Module Permissions:', modulePerms);
      console.log('   Count:', modulePerms?.length || 0);

      if (!modulePerms || modulePerms.length === 0) {
        console.warn('⚠️ WARNING: No module permissions found!');
      } else {
        // Group by role and module
        const permsByRole = modulePerms.reduce((acc, perm) => {
          if (!acc[perm.role_id]) acc[perm.role_id] = {};

          const module = perm.module_permissions.module;
          const permKey = perm.module_permissions.permission_key;

          if (!acc[perm.role_id][module]) {
            acc[perm.role_id][module] = [];
          }
          acc[perm.role_id][module].push(permKey);

          return acc;
        }, {});

        console.log('\n   📊 Permissions by Role and Module:');
        for (const [roleId, modules] of Object.entries(permsByRole)) {
          const role = userRoles.find(r => r.custom_role_id === roleId);
          const roleName = role?.dealer_custom_roles?.role_name || 'Unknown';

          console.log(`\n   🔑 Role: ${roleName} (${roleId})`);
          for (const [module, perms] of Object.entries(modules)) {
            console.log(`      📦 ${module}:`, perms.join(', '));
          }
        }
      }
      console.log('\n');

      // ====================================================================
      // QUERY 4: Call the RPC function directly
      // ====================================================================
      console.log('📋 QUERY 4: Testing RPC get_user_permissions_batch...');

      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_user_permissions_batch', { p_user_id: user.id });

      if (rpcError) throw rpcError;

      console.log('✅ RPC Result:', rpcResult);
      console.log('\n   📊 Summary:');
      console.log('      Roles returned:', rpcResult.roles?.length || 0);
      console.log('      System permissions:', rpcResult.system_permissions?.length || 0);
      console.log('      Module permissions:', rpcResult.module_permissions?.length || 0);
      console.log('      Module access entries:', rpcResult.module_access?.length || 0);

      if (!rpcResult.module_access || rpcResult.module_access.length === 0) {
        console.error('\n   ❌ PROBLEM IDENTIFIED: RPC returns ZERO module_access entries!');
        console.error('      This is why custom_roles is empty in frontend.');
        console.error('      Frontend applies fail-closed policy and denies all permissions.');
      } else {
        console.log('\n   ✅ RPC returns module_access correctly');
        console.log('      Modules enabled:', rpcResult.module_access.map(m => m.module).join(', '));
      }
    }

    console.log('\n');
    console.log('🔍 ============================================================');
    console.log('🔍 DIAGNOSTIC COMPLETE');
    console.log('🔍 ============================================================');
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Review the warnings above');
    console.log('   2. If module_access is empty, need to populate role_module_access table');
    console.log('   3. Share this output with Claude for analysis');

  } catch (error) {
    console.error('💥 Error during diagnostic:', error);
  }
})();
