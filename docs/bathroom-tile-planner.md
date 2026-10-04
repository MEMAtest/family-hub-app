# Bathroom tile planner

Entry: Property > Projects > bathroom project > Main Bathroom or Shower Room > Tiles & measurements > Floor tiles or Wall tiles.

## Workflow

- The original quote area is retained. A separate measurement record uses a known area or labelled rectangular sections in m, cm or mm, minus explicitly entered untiled areas/openings.
- Waste inclusion starts as unknown. The user must confirm inclusion/exclusion. An adjustable allowance is only added when excluded.
- Quote/measurement photos and pasted text are read on demand using the existing configured vision provider. Images are resized locally before sending. The provider receives only the selected document, room and surface, not the household's project history. Consent is required; extracted values remain editable drafts and do not save automatically.
- Tile labels can be photographed, existing catalogue options selected, or product details entered manually. A pasted HTTPS product link is saved as a reference; arbitrary links are not scraped and unknown pack/price details must be entered.
- Tile size, box coverage or tiles per box, price and price basis are reviewed before choosing. A box price without box coverage cannot produce a cost. Conflicting box information must be corrected.
- The calculation rounds to whole boxes, or whole tiles when there is no pack information. Per-m2 prices are charged against purchased coverage, not raw room area. Tile totals exclude installation materials, labour and delivery.
- One chosen tile per surface replaces that surface's previous selection. Fixture selections and the other room remain unchanged. Quote and project budget values are not incremented by tile selections.
- Updating saved measurements recalculates an existing tile choice and returns its status to review. Original and recent confirmed measurement revisions remain available. Source images are stored once in the existing household project document and referenced by revisions. Large project collections are refused before saving rather than exceeding the shared-document limit.

## Quote And Additional Items

The room overview includes all 28 supply-of-goods lines from the two 18 January 2026 quotations, including parts inside bundles. Those lines point to the corresponding project item rather than creating duplicate priced basket entries. Downlight quantities are six for the main bathroom and four for the shower room. Labour tasks and contractor installation-material allowances are not additional retail product costs.

Add item opens a room/category/quantity/size form with an optional same-room related item. Add supplier option saves a product link, entered price/basis, size, photo link and explicitly included components. Links are references, not automatic scraping of arbitrary websites. No login credentials, account connection or supplier checkout is required. Saved options remain unverified and do not enter the basket until chosen. A different primary fixture prompts before replacing the previous choice, keeps supporting parts and refuses to silently replace an ordered choice. Household items, related links and manual supplier options survive catalogue migrations.

Stonewater product links are an explicit exception: paste a public product-page link into Add supplier option and choose Read Stonewater product. The authenticated endpoint reads bounded public catalogue JSON from the exact allowlisted HTTPS host, refuses redirects, and returns a draft without AI or project writes. Variant selection is explicit for multi-variant products; a linked variant is honoured. Product name, variant price, SKU, photos and description carry into the editable form. Title-stated dimensions are copied as text, not inferred room fit. Included components still require confirmation. Catalogue availability is not an in-stock guarantee. Prices are a snapshot, not a live checkout total; delivery and fit need supplier confirmation. Other websites remain manual. The warm-process limit of ten reads per minute is not a distributed rate limit.

Verified a real Stonewater public product response separately from the browser fixture: the Fairford 1700 x 900mm left-hand bath returned SKU 14140039, a GBP 536 price and two images. The mobile browser journey mocks catalogue replies and checks variant selection, saved SKU/link, alternative replacement and reload persistence. It is not a production household test or supplier order.

## Boundaries

Fixture fit is separate from tile-area planning. Edit fit measurements records labelled available width, length, depth and/or height for the specific item, with unit conversion, a required free-space allowance per checked axis, source and explicit confirmation. Product dimensions are editable in mm in product details. Labelled catalogue dimensions are used; unlabelled title pairs are not assigned to axes automatically. At least two axes and all recorded limits must be checked before showing Within measured limits. A known oversize blocks selection; missing information stays Needs checking. Supporting parts need checking against the chosen fixture, not the fixture's room envelope. This does not approve installation, connections, handedness, access or unchecked dimensions.

Changed fit limits or product dimensions return un-ordered basket choices to Ask fitter. Ordered statuses remain recorded. Fixture selections retain the most recent 100 choice-history snapshots, including the names and prices of replaced options. Catalogue migration preserves fit measurements, edited product dimensions and choice history.

The calculator is an area/pack estimate, not an installation layout solver. It does not infer room dimensions from photographs, guarantee room/product fit, or optimise individual cuts. Complex layouts and ordering allowances need fitter confirmation. AI cannot reliably read every scan or handwriting: no provider/unclear result leaves manual entry available, with no invented values.

The document endpoint requires the current household member's authenticated session, checks same-origin requests and input bounds, and validates structured output. A warm-process per-user limit permits five reads per five minutes; this is not a distributed billing ceiling across serverless instances. No unattended polling is added.

## Verification

Unit tests cover area conversion, deductions, waste assumptions, floating point boundaries, whole packs, price basis, invalid inputs, safe links, independent rooms, migration, replacement and photo deduplication. Route tests cover auth, origin, consent, input size/signatures, bounded calls, provider failure and draft-only output.

`npx playwright test --config=playwright.tile-planner.config.ts` exercises the actual local app at phone and desktop widths using labelled fixture data. Provider replies are mocked in the photo journey; that is not evidence of real-provider OCR accuracy. Persistence is tested across reload, and the shared-document sync test exercises two in-memory devices using the real sync implementation. Production phone/device acceptance remains a separate gate.
