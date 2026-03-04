export function fuzzyFilter(query: string, items: string[]): string[] {
  if (!query) {
    return items;
  }

  const lowerQuery = query.toLowerCase();
  return items.filter((item) => {
    const lowerItem = item.toLowerCase();
    let qIdx = 0;

    for (let i = 0; i < lowerItem.length && qIdx < lowerQuery.length; i++) {
      if (lowerItem[i] === lowerQuery[qIdx]) {
        qIdx++;
      }
    }

    return qIdx === lowerQuery.length;
  });
}
