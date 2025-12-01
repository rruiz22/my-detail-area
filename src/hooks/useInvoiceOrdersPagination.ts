import { useMemo, useState, useEffect } from 'react';

export interface InvoiceItem {
  id: string;
  order_number?: string;
  custom_order_number?: string;
  vehicle_vin?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  po?: string;
  ro?: string;
  tag?: string;
  is_paid?: boolean;
  [key: string]: unknown;
}

export interface PaginationResult {
  paginatedItems: InvoiceItem[];
  totalPages: number;
  totalFiltered: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export function useInvoiceOrdersPagination(
  items: InvoiceItem[],
  searchTerm: string,
  statusFilter: 'all' | 'paid' | 'unpaid',
  pageSize: number,
  currentPage: number
): PaginationResult {
  // Reset to page 1 when filters change
  const [effectiveCurrentPage, setEffectiveCurrentPage] = useState(currentPage);

  useEffect(() => {
    setEffectiveCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    setEffectiveCurrentPage(currentPage);
  }, [currentPage]);

  const result = useMemo(() => {
    // 1. Filter by search term
    let filteredItems = items;

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase().trim();
      filteredItems = items.filter((item) => {
        const orderNumber = item.custom_order_number || item.order_number || '';
        const vin = item.vehicle_vin || '';
        const make = item.vehicle_make || '';
        const model = item.vehicle_model || '';
        const year = item.vehicle_year?.toString() || '';
        const po = item.po || '';
        const ro = item.ro || '';
        const tag = item.tag || '';

        const searchableText = [
          orderNumber,
          vin,
          make,
          model,
          year,
          po,
          ro,
          tag,
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(lowerSearch);
      });
    }

    // 2. Filter by status (paid/unpaid)
    if (statusFilter !== 'all') {
      filteredItems = filteredItems.filter((item) => {
        if (statusFilter === 'paid') {
          return item.is_paid === true;
        } else {
          // unpaid
          return item.is_paid !== true;
        }
      });
    }

    // 3. Calculate pagination
    const totalFiltered = filteredItems.length;
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;

    // Ensure currentPage is within valid range
    const safePage = Math.max(1, Math.min(effectiveCurrentPage, totalPages));

    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalFiltered);

    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    return {
      paginatedItems,
      totalPages,
      totalFiltered,
      totalItems: items.length,
      startIndex,
      endIndex,
    };
  }, [items, searchTerm, statusFilter, pageSize, effectiveCurrentPage]);

  return result;
}
