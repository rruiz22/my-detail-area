import { useMemo, useState, useEffect } from 'react';
import { Invoice } from '@/types/invoices';
import {
  groupInvoices,
  GroupByOption,
  InvoiceGroup,
} from '@/utils/invoiceGrouping';

const STORAGE_KEY_GROUPING = 'invoice_grouping_preference';
const STORAGE_KEY_COLLAPSED = 'invoice_collapsed_groups';

/**
 * Hook for managing invoice grouping with localStorage persistence
 */
export function useInvoiceGrouping(invoices: Invoice[]) {
  // Load grouping preference from localStorage (default: 'status')
  const [groupBy, setGroupBy] = useState<GroupByOption>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GROUPING);
      return (stored as GroupByOption) || 'status';
    } catch {
      return 'status';
    }
  });

  // Load collapsed groups state from localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch {
      // Ignore errors
    }
    return new Set<string>();
  });

  // Persist grouping preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPING, groupBy);
    } catch (error) {
      console.error('Failed to save grouping preference:', error);
    }
  }, [groupBy]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_COLLAPSED,
        JSON.stringify(Array.from(collapsedGroups))
      );
    } catch (error) {
      console.error('Failed to save collapsed state:', error);
    }
  }, [collapsedGroups]);

  // Group invoices based on current groupBy option
  const groups = useMemo(() => {
    if (groupBy === 'none' || !invoices.length) {
      return [];
    }
    return groupInvoices(invoices, groupBy);
  }, [invoices, groupBy]);

  // Toggle collapsed state for a group
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Check if a group is collapsed
  const isGroupCollapsed = (groupKey: string): boolean => {
    return collapsedGroups.has(groupKey);
  };

  // Expand all groups
  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  // Collapse all groups
  const collapseAll = () => {
    const allKeys = groups.map((g) => g.key);
    setCollapsedGroups(new Set(allKeys));
  };

  return {
    groupBy,
    setGroupBy,
    groups,
    isGroupCollapsed,
    toggleGroup,
    expandAll,
    collapseAll,
  };
}

/**
 * Helper hook for getting the default expanded value for Accordion
 */
export function useAccordionDefaultValue(
  groups: InvoiceGroup[],
  collapsedGroups: Set<string>
): string[] {
  return useMemo(() => {
    return groups
      .filter((group) => !collapsedGroups.has(group.key))
      .map((group) => group.key);
  }, [groups, collapsedGroups]);
}
