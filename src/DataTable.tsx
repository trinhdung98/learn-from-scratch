import { type ReactNode } from "react";

type ColumnId = string;

export interface ColumnDef<TData> {
  id: ColumnId;
  header: () => ReactNode;
  cell: (item: TData) => ReactNode;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
}

const DataTable = <T,>({ data, columns }: DataTableProps<T>) => {
  return (
    <>
      <table>
        <thead>
          {columns.map((column) => (
            <th key={column.id}>{column.header()}</th>
          ))}
        </thead>
        <tbody>
          {data.map((item) => (
            <tr>
              {columns.map((column) => (
                <td>{column.cell(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default DataTable;
