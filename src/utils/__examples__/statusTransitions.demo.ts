/**
 * Status Transition Validation - Visual Demo & Quick Reference
 *
 * Run this file to see live validation examples and understand the workflow.
 *
 * @module statusTransitions.demo
 */

import {
  isValidStatusTransition,
  getValidNextStatuses,
  isTerminalStatus,
  getStatusDistance,
  getWorkflowPath,
  type OrderStatus,
  WORKFLOW_STATUSES,
  TERMINAL_STATUSES
} from '../statusTransitions';

// ============================================================================
// DEMO RUNNER
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 ORDER STATUS TRANSITION VALIDATION - DEMO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================================================
// 1. WORKFLOW CONSTANTS
// ============================================================================

console.log('1️⃣  WORKFLOW CONSTANTS\n');
console.log('   Standard Workflow Progression:');
console.log('   ', WORKFLOW_STATUSES.join(' → '), '\n');
console.log('   Terminal Statuses (no further transitions):');
console.log('   ', TERMINAL_STATUSES.join(', '), '\n');

// ============================================================================
// 2. VALID TRANSITIONS
// ============================================================================

console.log('2️⃣  VALID TRANSITIONS\n');

const validTransitions: Array<[OrderStatus, OrderStatus]> = [
  ['draft', 'pending'],
  ['pending', 'confirmed'],
  ['confirmed', 'in_progress'],
  ['in_progress', 'completed'],
  ['in_progress', 'on_hold'],
  ['on_hold', 'in_progress'],
  ['draft', 'cancelled'],
  ['pending', 'cancelled'],
  ['confirmed', 'cancelled'],
  ['in_progress', 'cancelled']
];

validTransitions.forEach(([from, to]) => {
  const isValid = isValidStatusTransition(from, to);
  const symbol = isValid ? '✅' : '❌';
  console.log(`   ${symbol} ${from.padEnd(12)} → ${to.padEnd(12)} (${isValid ? 'ALLOWED' : 'DENIED'})`);
});

console.log('');

// ============================================================================
// 3. INVALID TRANSITIONS
// ============================================================================

console.log('3️⃣  INVALID TRANSITIONS (Business Rule Violations)\n');

const invalidTransitions: Array<[OrderStatus, OrderStatus, string]> = [
  ['draft', 'completed', 'Skipping approval steps'],
  ['draft', 'in_progress', 'Skipping approval and confirmation'],
  ['pending', 'in_progress', 'Missing manager confirmation'],
  ['pending', 'completed', 'Skipping processing step'],
  ['completed', 'pending', 'Backward transition from terminal state'],
  ['completed', 'in_progress', 'Cannot modify completed orders'],
  ['cancelled', 'pending', 'Cannot modify cancelled orders'],
  ['in_progress', 'draft', 'Backward transition not allowed']
];

invalidTransitions.forEach(([from, to, reason]) => {
  const isValid = isValidStatusTransition(from, to);
  const symbol = isValid ? '✅' : '❌';
  console.log(`   ${symbol} ${from.padEnd(12)} → ${to.padEnd(12)}`);
  console.log(`      Reason: ${reason}`);
});

console.log('');

// ============================================================================
// 4. VALID NEXT STATUSES
// ============================================================================

console.log('4️⃣  VALID NEXT STATUSES (for UI Dropdowns)\n');

const statuses: OrderStatus[] = ['draft', 'pending', 'confirmed', 'in_progress', 'on_hold', 'completed', 'cancelled'];

statuses.forEach((status) => {
  const nextStatuses = getValidNextStatuses(status);
  const terminal = isTerminalStatus(status);

  if (terminal) {
    console.log(`   🔒 ${status.toUpperCase().padEnd(12)} → (TERMINAL - No transitions)`);
  } else {
    console.log(`   📝 ${status.toUpperCase().padEnd(12)} → [${nextStatuses.join(', ')}]`);
  }
});

console.log('');

// ============================================================================
// 5. WORKFLOW DISTANCE CALCULATION
// ============================================================================

console.log('5️⃣  WORKFLOW DISTANCE (Progress Tracking)\n');

const distanceExamples: Array<[OrderStatus, OrderStatus]> = [
  ['draft', 'completed'],
  ['draft', 'pending'],
  ['pending', 'confirmed'],
  ['confirmed', 'in_progress'],
  ['in_progress', 'completed'],
  ['draft', 'in_progress'],
  ['pending', 'completed'],
  ['completed', 'draft']
];

distanceExamples.forEach(([from, to]) => {
  const distance = getStatusDistance(from, to);
  if (distance === -1) {
    console.log(`   ❌ ${from.padEnd(12)} → ${to.padEnd(12)} : INVALID PATH`);
  } else if (distance === 0) {
    console.log(`   ⏸️  ${from.padEnd(12)} → ${to.padEnd(12)} : SAME STATUS (0 steps)`);
  } else {
    console.log(`   ✅ ${from.padEnd(12)} → ${to.padEnd(12)} : ${distance} step${distance > 1 ? 's' : ''}`);
  }
});

console.log('');

// ============================================================================
// 6. WORKFLOW PATH VISUALIZATION
// ============================================================================

console.log('6️⃣  WORKFLOW PATH (for Progress Indicators)\n');

const pathExamples: Array<[OrderStatus, OrderStatus]> = [
  ['draft', 'completed'],
  ['pending', 'in_progress'],
  ['draft', 'cancelled'],
  ['completed', 'pending']
];

pathExamples.forEach(([from, to]) => {
  const path = getWorkflowPath(from, to);
  if (path) {
    console.log(`   ✅ ${from.padEnd(12)} → ${to.padEnd(12)}`);
    console.log(`      Path: ${path.join(' → ')}\n`);
  } else {
    console.log(`   ❌ ${from.padEnd(12)} → ${to.padEnd(12)}`);
    console.log(`      Path: NO VALID PATH\n`);
  }
});

// ============================================================================
// 7. REAL-WORLD SCENARIO
// ============================================================================

console.log('7️⃣  REAL-WORLD SCENARIO: Order Lifecycle\n');

const orderLifecycle = [
  { status: 'draft', action: 'Order created by sales team', user: 'john.doe' },
  { status: 'pending', action: 'Submitted for manager approval', user: 'john.doe' },
  { status: 'confirmed', action: 'Approved by sales manager', user: 'manager.smith' },
  { status: 'in_progress', action: 'Processing started', user: 'tech.johnson' },
  { status: 'on_hold', action: 'Paused - waiting for parts', user: 'tech.johnson' },
  { status: 'in_progress', action: 'Resumed - parts arrived', user: 'tech.johnson' },
  { status: 'completed', action: 'Work finished successfully', user: 'tech.johnson' }
];

console.log('   Order Progression Timeline:\n');

orderLifecycle.forEach((entry, index) => {
  const nextEntry = orderLifecycle[index + 1];
  const isLast = !nextEntry;

  console.log(`   ${index + 1}. ${entry.status.toUpperCase().padEnd(12)} (${entry.user})`);
  console.log(`      └─ ${entry.action}`);

  if (!isLast) {
    const isValid = isValidStatusTransition(entry.status as OrderStatus, nextEntry.status as OrderStatus);
    const symbol = isValid ? '✅' : '❌';
    console.log(`      ${symbol} Transition to ${nextEntry.status} is ${isValid ? 'VALID' : 'INVALID'}\n`);
  } else {
    console.log(`      🔒 TERMINAL STATE - No further transitions\n`);
  }
});

// ============================================================================
// 8. PERMISSION-BASED FILTERING EXAMPLE
// ============================================================================

console.log('8️⃣  PERMISSION-BASED FILTERING (Role-Based Access)\n');

type UserRole = 'dealer_user' | 'dealer_manager' | 'dealer_admin';

const rolePermissions: Record<UserRole, OrderStatus[]> = {
  dealer_user: ['pending', 'on_hold', 'cancelled'],
  dealer_manager: ['confirmed', 'in_progress', 'on_hold', 'cancelled'],
  dealer_admin: ['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'on_hold', 'cancelled']
};

const currentStatus: OrderStatus = 'pending';
const validNextStatuses = getValidNextStatuses(currentStatus);

(['dealer_user', 'dealer_manager', 'dealer_admin'] as UserRole[]).forEach((role) => {
  const allowedStatuses = rolePermissions[role];
  const permittedTransitions = validNextStatuses.filter(status => allowedStatuses.includes(status));

  console.log(`   ${role.toUpperCase().padEnd(15)} can transition to: [${permittedTransitions.join(', ') || 'NONE'}]`);
});

console.log('');

// ============================================================================
// 9. ERROR MESSAGE EXAMPLES
// ============================================================================

console.log('9️⃣  ERROR MESSAGES (for User Feedback)\n');

import { getTransitionErrorMessage } from '../statusTransitions';

const errorExamples: Array<[OrderStatus, OrderStatus]> = [
  ['draft', 'completed'],
  ['completed', 'pending'],
  ['pending', 'in_progress']
];

errorExamples.forEach(([from, to]) => {
  const error = getTransitionErrorMessage(from, to);
  console.log(`   ${from} → ${to}`);
  console.log(`   Title: ${error.title}`);
  console.log(`   Message: ${error.description}\n`);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ DEMO COMPLETED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📖 For full documentation, see:');
console.log('   src/utils/__docs__/statusTransitions.md\n');
console.log('💡 For integration examples, see:');
console.log('   src/utils/__examples__/statusTransitions.example.ts\n');
console.log('🔧 For usage in your code:');
console.log(`   import { isValidStatusTransition } from '@/utils/statusTransitions';\n`);
