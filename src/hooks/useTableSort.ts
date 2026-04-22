import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export function useTableSort<T>(data: T[], defaultKey?: keyof T, defaultDirection: SortDirection = 'asc') {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: defaultKey || null,
    direction: defaultDirection,
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle nested objects (e.g., clients.full_name)
      const aVal = typeof aValue === 'object' && aValue !== null 
        ? Object.values(aValue)[0] 
        : aValue;
      const bVal = typeof bValue === 'object' && bValue !== null 
        ? Object.values(bValue)[0] 
        : bValue;

      // Handle different types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal, 'he');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortConfig.direction === 'asc' 
          ? (aVal === bVal ? 0 : aVal ? -1 : 1)
          : (aVal === bVal ? 0 : aVal ? 1 : -1);
      }

      // Date comparison
      if (aVal instanceof Date || bVal instanceof Date || 
          (typeof aVal === 'string' && typeof bVal === 'string' && 
           !isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal)))) {
        const dateA = new Date(aVal as string | Date).getTime();
        const dateB = new Date(bVal as string | Date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Fallback to string comparison
      const comparison = String(aVal).localeCompare(String(bVal), 'he');
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return { sortedData, sortConfig, requestSort };
}
