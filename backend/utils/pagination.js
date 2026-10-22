const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function parsePagination(query = {}) {
  const requested = query.page !== undefined || query.limit !== undefined;
  const pageValue = Number(query.page);
  const limitValue = Number(query.limit);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit = Number.isSafeInteger(limitValue) && limitValue > 0
    ? Math.min(limitValue, MAX_LIMIT)
    : DEFAULT_LIMIT;
  return { requested, page, limit, skip: (page - 1) * limit };
}

export function paginationSummary(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}
