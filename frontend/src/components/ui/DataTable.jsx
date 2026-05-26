import EmptyState from "./EmptyState.jsx";
import ErrorState from "./ErrorState.jsx";
import LoadingState from "./LoadingState.jsx";

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
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

