import * as React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortConfig, SortDirection } from "@/hooks/useTableSort";

interface SortableTableHeadProps<T> extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: keyof T;
  sortConfig: SortConfig<T>;
  onSort: (key: keyof T) => void;
  children: React.ReactNode;
}

function SortableTableHeadInner<T>(
  {
    sortKey,
    sortConfig,
    onSort,
    children,
    className,
    ...props
  }: SortableTableHeadProps<T>,
  ref: React.ForwardedRef<HTMLTableCellElement>
) {
  const isActive = sortConfig.key === sortKey;

  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-start align-middle font-medium text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors [&:has([role=checkbox])]:pr-0",
        className
      )}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {isActive ? (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-40" />
        )}
      </div>
    </th>
  );
}

export const SortableTableHead = React.forwardRef(SortableTableHeadInner) as <T>(
  props: SortableTableHeadProps<T> & { ref?: React.Ref<HTMLTableCellElement> }
) => React.ReactElement;
