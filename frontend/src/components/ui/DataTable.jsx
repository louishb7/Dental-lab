import EmptyState from "./EmptyState.jsx";
import ErrorState from "./ErrorState.jsx";
import LoadingState from "./LoadingState.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.jsx";

export default function DataTable({
  columns,
  data,
  loading,
  error,
  emptyIcon,
  emptyTitle = "Nenhum registro encontrado.",
  emptyDescription,
  onRetry,
}) {
  if (loading) return <LoadingState message="Carregando dados..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data?.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.03)]">
      <Table className="min-w-[780px]">
        <TableHeader>
          <TableRow className="border-[rgba(229,235,241,0.13)] hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className="h-10 px-3 text-xs font-extrabold uppercase tracking-[0.04em] text-[#aeb7c2]"
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className="border-[rgba(229,235,241,0.1)] hover:bg-[rgba(255,138,42,0.04)]"
            >
              {columns.map((column) => (
                <TableCell key={column.key} className="px-3 py-3 text-sm text-[#d7dde5]">
                  {column.render ? column.render(row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
