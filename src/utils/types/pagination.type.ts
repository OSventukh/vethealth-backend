export interface Pagination<T> {
  items: T[];
  count: number;
  currentPage: number;
  totalPages: number;
}
