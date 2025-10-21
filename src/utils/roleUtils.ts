/**
 * Role Formatting Utilities
 *
 * Provides consistent role name formatting across the application.
 * Converts snake_case and dash-case role names to human-readable format.
 */

/**
 * Format a role name for display
 *
 * Converts snake_case or dash-case role names to Title Case.
 *
 * @param role - The role name to format (e.g., "used_car_manager", "sales-manager")
 * @returns Formatted role name (e.g., "Used Car Manager", "Sales Manager")
 *
 * @example
 * formatRoleName("used_car_manager") // "Used Car Manager"
 * formatRoleName("sales-manager") // "Sales Manager"
 * formatRoleName("service_advisor") // "Service Advisor"
 * formatRoleName("system_admin") // "System Admin"
 */
export function formatRoleName(role: string): string {
  if (!role) return '';

  return role
    .replace(/[_-]/g, ' ')  // Replace underscores and dashes with spaces
    .split(' ')             // Split into words
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )                       // Capitalize first letter of each word
    .join(' ');             // Join back together
}

/**
 * Get initials from a role name
 *
 * @param role - The role name
 * @returns Initials (e.g., "UCM" for "Used Car Manager")
 *
 * @example
 * getRoleInitials("used_car_manager") // "UCM"
 * getRoleInitials("sales_manager") // "SM"
 */
export function getRoleInitials(role: string): string {
  const formatted = formatRoleName(role);
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Check if a role name indicates an admin role
 *
 * @param role - The role name to check
 * @returns True if the role appears to be an admin role
 */
export function isAdminRole(role: string): boolean {
  return role.toLowerCase().includes('admin');
}

/**
 * Check if a role name indicates a manager role
 *
 * @param role - The role name to check
 * @returns True if the role appears to be a manager role
 */
export function isManagerRole(role: string): boolean {
  return role.toLowerCase().includes('manager');
}
