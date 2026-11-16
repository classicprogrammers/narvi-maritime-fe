/**
 * Previous/next navigation inside an ordered list of vessel ids
 * (the list the user was viewing when they opened a vessel).
 */
export function getAdjacentVesselIds(vesselIds, currentId) {
  const ids = Array.isArray(vesselIds) ? vesselIds : [];
  const index = ids.findIndex((id) => String(id) === String(currentId));
  if (index === -1) {
    return { index: -1, total: ids.length, prevId: null, nextId: null };
  }
  return {
    index,
    total: ids.length,
    prevId: index > 0 ? ids[index - 1] : null,
    nextId: index < ids.length - 1 ? ids[index + 1] : null,
  };
}
