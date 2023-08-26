export interface PaginationType<T> {
  items: T[];
  count: number;
  currentPage: number;
  totalPages: number;
}
