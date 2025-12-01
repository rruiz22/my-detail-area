import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Smart pagination component with ellipsis logic
 * Shows: < 1 ... 4 5 6 ... 20 >
 */
export function SmartPagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: SmartPaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const delta = 1; // Pages to show around current
    const range: (number | 'ellipsis')[] = [];
    const rangeWithDots: (number | 'ellipsis')[] = [];

    // Always show first page
    range.push(1);

    // Calculate range around current page
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }

    // Always show last page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Add ellipsis where needed
    let prev: number | 'ellipsis' | undefined;
    for (const i of range) {
      if (prev !== undefined) {
        if (typeof i === 'number' && typeof prev === 'number' && i - prev > 1) {
          rangeWithDots.push('ellipsis');
        }
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous Button */}
        <PaginationItem>
          <PaginationPrevious
            onClick={(e) => {
              e.preventDefault();
              if (!disabled && currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
            className={
              disabled || currentPage === 1
                ? 'pointer-events-none opacity-50'
                : 'cursor-pointer'
            }
          />
        </PaginationItem>

        {/* Page Numbers */}
        {pageNumbers.map((page, index) => (
          <PaginationItem key={`page-${index}`}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={(e) => {
                  e.preventDefault();
                  if (!disabled && page !== currentPage) {
                    onPageChange(page);
                  }
                }}
                isActive={page === currentPage}
                className={disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next Button */}
        <PaginationItem>
          <PaginationNext
            onClick={(e) => {
              e.preventDefault();
              if (!disabled && currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
            className={
              disabled || currentPage === totalPages
                ? 'pointer-events-none opacity-50'
                : 'cursor-pointer'
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
