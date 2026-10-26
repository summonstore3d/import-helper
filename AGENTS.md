<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared pricing master data in `system_state` domains and append audit/history rows separately, because this preserves the current calculation APIs while adding durable multi-user storage.
- Keep the pricing screen seller-first and isolate calculation memory in a technical section, because future seller roles must hide it while managers and administrators retain access.
- Derive sector hourly rates and production cost at calculation time from the editable labor/maintenance allocation (`src/lib/custos-industriais.ts`), never from stored spreadsheet results, so every edit flows into the price.
- Gate tabs by role via `user_roles` + editable `role_permissions` (checked in AppShell with `src/lib/acesso.ts`); first account becomes admin through `ensure_my_role()`, because admins must configure visibility without code changes.
- Derive the simulator expense rate directly from the shared demonstrative and refresh expenses/settings on focus and periodically; protect pending local writes so other sessions cannot overwrite unsaved edits.
- DRE imports await a direct shared-state write and read-back before updating the demonstrative or showing synchronization success; keep the import status separate from generic autosave status.
- Pricing view previews are administrator-only, local presentation state and never change actual roles or permissions; use the shared visibility predicate to preserve seller restrictions.

- Store individual product margins in one `system_state` domain per stable product code (`margin:<code>`), validate manager/admin writes in the database, and use the same lookup across pricing, catalog and dashboard; per-product writes avoid overwriting another product's margin.

- Store discount caps per product code in `system_state` domains (`discount:<code>`), enforce manager/admin cap writes and discount limits in the database, and apply bounded discounts after final price calculation; simulations retain the original price and applied discount.
