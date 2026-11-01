export function filterStores<T extends { name: string; slug: string; admin_email: string | null }>(stores: T[], search: string): T[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return stores;
  return stores.filter((store) =>
    [store.name, store.slug, store.admin_email ?? ''].some((value) =>
      value.toLocaleLowerCase().includes(query)
    )
  );
}