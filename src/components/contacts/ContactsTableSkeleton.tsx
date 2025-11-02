import { TableRow, TableCell } from '@/components/ui/table';

export function ContactsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <div className="flex items-center gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
            </div>
          </TableCell>
          <TableCell>
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          </TableCell>
          <TableCell>
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
