import type { BedProp, BedSlot, Member } from "#/types/seaScene.types";

/** Every member of every group as one flat list, so placing them is a single loop. */
export function members<T extends { count?: number }>(
  groups: readonly T[],
): Member<T>[] {
  return groups.flatMap((group) =>
    Array.from({ length: group.count ?? 1 }, (_, i) => ({ group, i })),
  );
}

/** Every prop at each of its places, `count` times at each. */
export function bedSlots(props: readonly BedProp[]): BedSlot[] {
  return props.flatMap((prop) =>
    prop.places.flatMap((place) =>
      members([prop]).map(({ i }) => ({ prop, place, i })),
    ),
  );
}
