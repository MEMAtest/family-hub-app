# Shared household data

Property records, the issues log, kids-activity bookmarks, Kitchen usuals and
fridge checks, and the Monday email settings used to live only in the browser (`family-storage` in localStorage), so
each parent saw a different copy. They are now stored per family in the
`family_documents` table and synced to every signed-in device.

## Deploying

The table is new. Production schema changes are applied by hand, so after this
ships run once against the production database:

```bash
npm run db:push
```

It is an additive change (one new table), safe to run before or after the deploy.
Until it has run, the app keeps working exactly as before: data stays on each
device and the property header shows **Only on this device**. Once the table
exists the first device to open the app uploads its local data, and the badge
changes to **Shared with family**.

## How it works

| Piece | File |
| --- | --- |
| Document keys and shapes | `src/lib/sharedDocuments.ts` |
| API (batch GET, versioned PUT) | `src/app/api/families/[familyId]/documents/` |
| Three-way merge | `src/lib/sharedDocumentMerge.ts` |
| Client sync engine | `src/services/sharedDocumentSync.ts` |
| Started from | `src/hooks/useSharedDocumentSync.ts` (mounted in `FamilyHubApp`) |

- Each key (`property.tasks`, `property.issues`, `kids.marks`, ...) is one JSON
  document with a `version`. A write names the version it was based on; if
  another device saved first the server answers 409 with its copy, the client
  merges and retries.
- The merge compares both copies against the last version they agreed on, so
  edits and deletions from two phones combine. An edit always beats a deletion,
  and a device whose local cache was reset never deletes shared data.
- Devices pull on start, on focus, when coming back online and every minute,
  and push about a second after a change.

Not everything goes through documents: the Kitchen's **Top-ups** shopping list
uses the normal shopping list tables, and the meal log uses `meal_plans`
(meals marked as made), so both also show up in Shopping and Meals.

## Tests

- Unit: `src/lib/__tests__/sharedDocumentMerge.test.ts`,
  `src/services/__tests__/sharedDocumentSync.test.ts` (two simulated devices),
  `src/app/api/families/[familyId]/documents/__tests__/route.test.ts`.
- End to end: `tests/e2e/household-sharing.spec.ts` (two browser contexts
  against the test database; part of `npm run test:e2e:user-journeys`).
