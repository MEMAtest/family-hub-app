'use client';

import { useCallback } from 'react';
import { useFamilyStore, type ShoppingList } from '@/store/familyStore';
import databaseService from '@/services/databaseService';
import { createId } from '@/utils/id';
import { normaliseShoppingLists } from '@/hooks/useDatabaseSync';
import type { StapleCategory } from '@/types/kitchen.types';

export const TOP_UPS_LIST_NAME = 'Top-ups';

const CATEGORY_LABEL: Record<StapleCategory, string> = {
  food: 'Groceries',
  household: 'Household',
  toiletries: 'Toiletries',
  kids: 'Kids',
};

// If there are ever two Top-ups lists, every device must pick the same one:
// the one with the most items, then the oldest (lists arrive newest first).
const findTopUps = (lists: ShoppingList[]) => {
  const candidates = lists
    .map((list, index) => ({ list, index }))
    .filter(({ list }) => ((list as any).listName ?? list.name) === TOP_UPS_LIST_NAME);
  candidates.sort((a, b) => (b.list.items?.length ?? 0) - (a.list.items?.length ?? 0) || b.index - a.index);
  return candidates[0]?.list;
};

// Always read the live store: the list may have been created a moment ago in
// this same tap, so a value captured at render time would not include it.
const liveTopUps = () => findTopUps(useFamilyStore.getState().shoppingLists);

// The Kitchen keeps its own "Top-ups" shopping list for usuals that are low.
// It writes through databaseService like ShoppingContext does, but without the
// render-time snapshot of lists, which misses a list created in the same tap.
export const useTopUpsList = () => {
  const lists = useFamilyStore((state) => state.shoppingLists);
  const addShoppingList = useFamilyStore((state) => state.addShoppingList);
  const updateShoppingList = useFamilyStore((state) => state.updateShoppingList);
  const list = findTopUps(lists);

  const ensureList = useCallback(async (): Promise<ShoppingList> => {
    const existing = liveTopUps();
    if (existing) return existing;
    // Lists may not have loaded yet (e.g. tapped right after opening the app),
    // so check the server before creating one.
    const fromServer = findTopUps(normaliseShoppingLists(await databaseService.getShoppingLists()));
    if (fromServer) {
      if (!liveTopUps()) addShoppingList(fromServer);
      return liveTopUps() ?? fromServer;
    }
    const created = await databaseService.createShoppingList({ listName: TOP_UPS_LIST_NAME, category: 'Household' });
    const again = liveTopUps(); // another tap may have created it meanwhile
    if (again) return again;
    const next = {
      id: created?.id ?? createId('list'),
      name: TOP_UPS_LIST_NAME,
      listName: TOP_UPS_LIST_NAME,
      category: 'Household',
      items: [],
      total: 0,
      estimatedTotal: 0,
      lastWeekSpent: 0,
      avgWeeklySpend: 0,
      isActive: true,
    } as ShoppingList;
    addShoppingList(next);
    return next;
  }, [addShoppingList]);

  // Adds each name unless it's already on the list and not ticked off. Returns what was added.
  // An old ticked-off entry for the same thing is cleared first, otherwise it
  // would read as "bought" straight away.
  const addToTopUps = useCallback(async (items: Array<{ name: string; category: StapleCategory }>) => {
    const target = await ensureList();
    const added: string[] = [];

    for (const item of items) {
      const current = liveTopUps() ?? target;
      const key = item.name.toLowerCase();
      const entries = (current.items || []) as any[];
      if (entries.some((entry) => !entry.completed && String(entry.name).toLowerCase() === key)) continue;

      const stale = entries.filter((entry) => entry.completed && String(entry.name).toLowerCase() === key);
      for (const old of stale) await databaseService.deleteShoppingItem(old.id);

      const category = CATEGORY_LABEL[item.category];
      const saved = await databaseService.addShoppingItem(current.id, { itemName: item.name, estimatedPrice: 0, category });
      const newItem = { id: saved?.id ?? createId('item'), name: item.name, completed: false, price: 0, category };

      const latest = liveTopUps() ?? current;
      const kept = ((latest.items || []) as any[]).filter((entry) => !stale.some((old) => old.id === entry.id));
      updateShoppingList(latest.id, { items: [...kept, newItem] as any });
      added.push(item.name);
    }
    return added;
  }, [ensureList, updateShoppingList]);

  const tickedNames = new Set(
    (list?.items || []).filter((item: any) => item.completed).map((item: any) => String(item.name).toLowerCase())
  );
  const pendingNames = new Set(
    (list?.items || []).filter((item: any) => !item.completed).map((item: any) => String(item.name).toLowerCase())
  );

  return { list, addToTopUps, tickedNames, pendingNames };
};
