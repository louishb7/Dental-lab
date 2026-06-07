/**
 * Returns the number of service rows attached to a case.
 *
 * This intentionally counts case item records, not the sum of item quantities.
 */
export function getServiceCount(caseItem) {
  return caseItem.items_count ?? caseItem.items?.length ?? 0;
}

export function formatServiceItemCount(caseItem) {
  const count = getServiceCount(caseItem);
  return `${count} ${count === 1 ? "item de serviço" : "itens de serviço"}`;
}
