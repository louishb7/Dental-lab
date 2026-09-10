import EmptyState from "./EmptyState.jsx";
import ErrorState from "./ErrorState.jsx";
import LoadingState from "./LoadingState.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.jsx";

export default function DataTable({
  columns,
  data,
  loading,
  error,
  emptyIcon,
  emptyTitle = "Nenhum registro encontrado.",
  emptyDescription,
  onRetry,
  tableClassName = "w-full table-fixed",
  renderMobile,
  mobileHeader,
}) {
  if (loading) return <LoadingState message="Carregando dados..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data?.length) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      {renderMobile && (
        <div className="divide-y divide-[var(--color-border)] xl:hidden">
          {mobileHeader}
          {data.map((row) => (
            <div key={row.id}>{renderMobile(row)}</div>
          ))}
        </div>
      )}
      <div className={`min-w-0 ${renderMobile ? "hidden xl:block" : ""}`}>
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow className="border-[var(--color-border)] bg-[var(--color-table-head)] hover:bg-[var(--color-table-head)]">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`h-10 px-4 text-xs font-medium text-[var(--color-text-muted)] ${column.className || ""}`}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} className="border-[var(--color-border)] hover:bg-primary/5">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={`whitespace-normal break-words px-4 py-4 text-sm text-[var(--color-text-soft)] ${column.className || ""}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
