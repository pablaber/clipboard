# Style guide

How the UI looks and how to keep it consistent. The theme is **Bold Pop**: neo-brutalist
bones (black outlines, hard offset shadows, heavy type) with flat candy colours. Read this
before adding or changing any UI.

## Where styles live

| File                     | What goes there                                                                  |
| ------------------------ | -------------------------------------------------------------------------------- |
| `src/app.css`            | design tokens (CSS custom properties), element defaults, the shared classes      |
| `src/lib/icons.ts`       | the icon vocabulary: every icon the app uses, under a name for what it means     |
| a component's `<style>`  | layout specific to that page or component, built from tokens and shared classes |

- **Use tokens, never raw values.** Colours, fonts, borders, radius and shadows come from
  the `--color-*`, `--font-*`, `--border`, `--radius` and `--shadow*` variables in
  `app.css`. A hex code outside `app.css` (and `static/favicon.svg`) is a bug.
- **Reuse a shared class before writing new CSS.** If a pattern appears on a second page,
  move it into `app.css` and document it here.
- Plain CSS only. No CSS framework, no CSS-in-JS, no inline `style=` for theming.

## Principles

1. **Outlined and flat.** Containers and controls have a 2px black border (`--border`).
   Depth is a hard offset shadow (`--shadow`, `--shadow-sm`), never a blur. No gradients.
2. **Colour means something.** Each fill colour has one role (below). Don't pick a colour
   because it looks nice in one spot.
3. **The code is the hero.** Clip codes are the biggest, heaviest thing on any page that
   shows one.
4. **Loud, but readable.** Text is always black on colour; contrast and visible focus are
   not negotiable.

## Colour

| Token            | Value     | Role                                                                       |
| ---------------- | --------- | -------------------------------------------------------------------------- |
| `--color-ink`    | `#000`    | all text, borders, shadows, focus ring                                     |
| `--color-paper`  | `#fff`    | page background, default card, secondary buttons, inputs                   |
| `--color-muted`  | `#3d3d3d` | secondary text (`.muted`): hints, timestamps, the user's email             |
| `--color-pink`   | `#ff90e8` | **action**: primary buttons, clip-code tags, the logo tile                 |
| `--color-yellow` | `#ffc900` | **result / attention**: the one card the user should look at (new code, error page) |
| `--color-blue`   | `#90a8ed` | **secondary input**: a supporting form section ("Have a code?")            |
| `--color-teal`   | `#23a094` | **success**: confirmation state ("Copied!")                                |
| `--color-sunken` | `#f1f1f1` | **user content**: the background behind pasted text                        |
| `--color-danger` | `#d4130b` | **error / destructive**: error messages, delete hover                      |

Rules:

- At most **one yellow card per page**. It marks the outcome of what the user just did.
- Pink is for things you can click. Don't use it for decoration or static labels.
- Text on any fill is `--color-ink`. Never put white text on a colour.
- `--color-muted` is only for text on white, sunken, yellow or blue (all at least 4.5:1).
- `--color-danger` text only on white (5.4:1). It fails on blue and yellow, so a form
  that can show an error belongs on a white card or the page background.
- Never use colour as the only signal: errors also get `ErrorIcon` and words; success
  changes the label ("Copied!") as well as the colour.

## Typography

- **Archivo Variable** (`--font-sans`) for all UI text. **JetBrains Mono Variable**
  (`--font-mono`) only for what the user typed or pasted: the clip textarea, the clip
  `<pre>`, the one-time-code input.
- Both fonts are self-hosted through `@fontsource-variable/*` imports in `+layout.svelte`.
  Do not link Google Fonts or any other font CDN.

| Element             | Size                         | Weight | Notes                                  |
| ------------------- | ---------------------------- | ------ | -------------------------------------- |
| `h1`                | `clamp(1.9rem, 7vw, 2.3rem)` | 900    | tight tracking (`-0.04em`); one per page |
| `h2`                | `1.1rem`                     | 800    | card titles                            |
| `.code`             | up to `3.4rem`               | 900    | clip code display, tabular numerals    |
| body                | `1rem`                       | 400    | line-height 1.5                        |
| buttons             | inherit                      | 700    |                                        |
| `.muted`            | `0.9rem`                     | 400    |                                        |

- Always render clip codes with `formatCode()` (`1234 5678`) and `font-variant-numeric:
  tabular-nums` (both `.code` and `.code-tag` do this).
- Sentence case everywhere. No all-caps headings or buttons.

## Components

### Buttons

`<button>` is styled globally; pick a variant with a class.

| Class                 | Looks like                          | Use for                                         |
| --------------------- | ----------------------------------- | ----------------------------------------------- |
| _(none)_              | pink fill, outline, small shadow    | the main action of a form or page (one per group) |
| `.secondary`          | white fill                          | other actions next to a primary (Copy code, Log out) |
| `.ghost`              | no fill, border or shadow           | low-emphasis row actions (delete in a list)     |
| `.icon-only`          | square padding                      | combine with a variant when there is no label   |
| `.success`            | teal fill                           | transient confirmation state only               |

- Buttons lift on hover and press into their shadow on `:active`; don't add other hover
  effects. Disabled buttons fade to 60%.
- Busy states change the label ("Saving…") and set `disabled`.
- A button with a keyboard shortcut shows it in a trailing `<kbd class="shortcut">` (e.g.
  "Save ⌘ ↵"), rendered client-side only and `aria-hidden`, with `aria-keyshortcuts` on the
  control that owns the shortcut. `.shortcut` hints hide on devices without a fine pointer.
- Keep `<button>` for actions and `<a>` for navigation, even when they look alike.

### Cards

`.card` is a white, outlined, shadowed section. Add one tone class to give it a role:
`.tone-yellow` (result), `.tone-blue` (secondary input), `.tone-sunken` (user content).
Lists and plain content stay white. Cards are not nested.

### Clip codes

- `.code`: the large display on the "Your code" card, the clip page `h1` and the error page.
- `.code-tag`: a small pink, outlined label for codes in lists; put it on the `<a>` that
  opens the clip.

### Forms

- Inputs, textareas and selects get the black outline from `app.css`; don't restyle them
  per page beyond width and font family.
- Every input has a `<label>`; use `.sr` when the label is visually redundant.
- Errors use `<p class="error" role="alert"><ErrorIcon />…</p>` right below the field.
- Only autofocus an input on a page whose single purpose is that input (`/code`), never on
  pages with other content to read first.

### Layout and spacing

- Content is a single column, `max-width: var(--content-width)` (40rem), centred.
- `.row` lays out inline groups (buttons plus metadata) with wrapping.
- Spacing is in rem, mostly 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5. Cards are 1.25rem apart.
- Check every change at 375px wide as well as desktop. Long content (emails, links,
  previews) must truncate or wrap, never overflow.

## Icons

The app uses [Lucide](https://lucide.dev/icons) through `@lucide/svelte`.

- **Import icons from `$lib/icons`, never from `@lucide/svelte` directly.** `icons.ts`
  re-exports each Lucide icon under a name for its meaning, so one action always has one
  icon.
- **To add an icon**, pick it at lucide.dev, add an
  `export { default as <Meaning>Icon } from '@lucide/svelte/icons/<name>'` line to
  `icons.ts`, and add a row to the table below. Name it for what it means (`DeleteIcon`),
  not what it shows (`TrashIcon`). If a meaning already has an icon, use it.
- **Size and stroke come from CSS** (`.lucide-icon` in `app.css`: `1.15em`, stroke
  `2.25`). Don't pass `size`, `strokeWidth` or `color` props; icons follow the font size and
  `currentColor`.
- Icons go **before** their label, inside the same element, with `.with-icon` (or a
  button, which already lays out icon + text). The one exception is forward navigation,
  where the arrow trails: "Open →".
- Decorative icons are hidden from screen readers automatically. An **icon-only button
  needs `aria-label`** (specific, e.g. "Delete 1234 5678") and a `title`.
- Icons accompany words; don't replace a label with an icon except in dense list rows.

| Export         | Lucide icon       | Meaning                                    |
| -------------- | ----------------- | ------------------------------------------ |
| `BrandIcon`    | `clipboard`       | the app / logo                             |
| `SaveIcon`     | `clipboard-paste` | save a new clip                            |
| `CopyIcon`     | `copy`            | copy to the system clipboard               |
| `CopiedIcon`   | `check`           | copy succeeded                             |
| `DeleteIcon`   | `trash-2`         | delete a clip                              |
| `OpenIcon`     | `arrow-right`     | go to / open (trailing)                    |
| `BackIcon`     | `arrow-left`      | go back                                    |
| `LinkIcon`     | `link`            | a shareable URL                            |
| `ExpiresIcon`  | `clock`           | absolute expiry ("Expires in 1 h")         |
| `TimeLeftIcon` | `hourglass`       | remaining time in lists                    |
| `KeepForIcon`  | `timer`           | choosing a lifetime                        |
| `WarningIcon`  | `shield-alert`    | safety advice                              |
| `ErrorIcon`    | `circle-alert`    | an error message                           |
| `NotFoundIcon` | `search-x`        | 404 / expired                              |
| `UserIcon`     | `user`            | the logged-in account                      |
| `LogInIcon`    | `log-in`          | log in                                     |
| `LogOutIcon`   | `log-out`         | log out                                    |
| `MailIcon`     | `mail`            | an email was sent                          |
| `SendIcon`     | `send`            | send a login code                          |

## Accessibility

- Focus is a 3px black outline offset by 2px (`:focus-visible` in `app.css`). Don't
  remove it or replace it with a colour change.
- Text contrast is at least 4.5:1 on every fill in the palette; check any new pairing.
- Hover and press movement is disabled under `prefers-reduced-motion`.
- Forms still work without JavaScript (see `AGENTS.md`); styling must not depend on JS.

## Not covered yet

- **Dark mode.** The theme is light only (`color-scheme: light`). A dark version would
  swap the token values, not the components.
- **The login email** (`supabase/templates/login_code.html`) is unstyled; email HTML needs
  inline styles and is out of scope for `app.css`.

## Checklist for UI changes

1. Colours, fonts and shadows come from tokens; no new hex values outside `app.css`.
2. Existing shared classes reused; any new shared pattern added to `app.css` and here.
3. Icons imported from `$lib/icons`; icon-only buttons have `aria-label`.
4. Looks right at 375px and on desktop; keyboard focus is visible.
5. `npm run check` passes.
