export interface Pagination {
  pageIndex: number;
  pageSize: number;
}

export const defaultPagination: Pagination = {
  pageIndex: 0,
  pageSize: 10,
};
