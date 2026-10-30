# Anniversary Album Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a Vue 3 and Three.js anniversary album that presents 40–60 private photos as a guided, cinematic, landscape-first experience and remains usable without WebGL.

**Architecture:** Vue owns the accessible DOM interface, navigation, audio, orientation gate, and lightbox. Three.js owns only the animated photo stage; pure modules calculate dates, validate content, generate formations, plan mesh transitions, and decide performance fallback. User content lives in `public/content.js`, while a Sharp-based script creates metadata-free web assets without modifying originals.

**Tech Stack:** Vue 3, Vite, Three.js, JavaScript ES modules, Node test runner, Sharp, CSS

**Spec:** `docs/superpowers/specs/2026-10-30-anniversary-album-design.md`

## Global Constraints

- Display no names; show `Our First Anniversary` and elapsed days from `2025-12-14` in `Asia/Shanghai`.
- `2026-12-14` must display exactly `365` elapsed days.
- Support desktop Chrome/Edge, mobile Safari/Chrome, and WeChat's embedded browser; mobile viewing is landscape-first.
- Use Vue 3, Vite, and Three.js only for product runtime; do not add Vue Router, Pinia, a component library, a backend, or authentication.
- Keep opening, orientation prompt, controls, captions, lightbox, and ending copy in accessible DOM elements rather than WebGL.
- Use exactly three photo formations: memory river, infinity loop, and double heart.
- One wheel, keyboard, or horizontal swipe action advances at most one chapter; transitions last `800–1200ms` and reject repeated input while locked.
- Start audio only from the opening button's user gesture; missing audio must not block the album.
- Keep `originals/` untouched and ignored by Git; generated media must omit EXIF and location metadata.
- Treat `public/content.js` as public content: never put passwords, tokens, or other secrets in it.
- Provide DOM fallback for unavailable/lost WebGL, sustained performance below `24 FPS`, and reduced-motion users.

## Review Focus

- Shanghai midnight and visitors in other time zones must not move the anniversary count one day early or late; Task 1 pins the UTC boundary.
- Empty, malformed, or partially missing `window.ALBUM_CONTENT` must yield safe content plus readable errors rather than a blank page; Task 1 pins these inputs.
- Formation and transition logic must remain finite and unique for chapter sizes from `0` through `60`; Tasks 3 and 4 pin low, unequal, and maximum counts.
- Missing music, broken photos, WebGL context loss, and sustained sub-24-FPS rendering must preserve a navigable DOM experience; Tasks 3, 6, and 8 exercise these paths.
- Portrait-only devices and predominantly vertical touch gestures must not trap users or accidentally advance chapters; Tasks 5 and 8 exercise orientation bypass and swipe thresholds.

---

## File Map

- `src/lib/days.js`: Shanghai-calendar elapsed-day calculation and next-midnight scheduling.
- `src/lib/content.js`: normalize and validate the public content object and derive media paths.
- `src/lib/navigation.js`: chapter bounds, input lock rules, horizontal swipe classification, and lightbox index wrapping.
- `src/three/formations.js`: deterministic river, infinity, and double-heart coordinates.
- `src/three/frame-budget.js`: two-stage low-frame-rate downgrade decision.
- `src/three/transition-plan.js`: reconcile old and new photo sets without duplicate mesh assignments.
- `src/three/album-scene.js`: Three.js renderer, texture lifecycle, raycasting, animation, and cleanup.
- `src/components/AlbumStage.vue`: canvas lifecycle and DOM fallback boundary.
- `src/components/OpeningScreen.vue`: cover, live day count, and entry gesture.
- `src/components/LandscapeGate.vue`: portrait prompt with explicit compatibility bypass.
- `src/components/Lightbox.vue`: accessible enlarged-photo viewer.
- `src/components/FallbackGallery.vue`: non-WebGL chapter gallery.
- `src/App.vue`: top-level chapter, audio, pause, visibility, and ending state.
- `src/styles.css`: cinematic design, responsive layout, reduced motion, and focus states.
- `public/content.js`: user-editable anniversary content.
- `scripts/prepare-photos.mjs`: non-destructive photo conversion and metadata stripping.

### Task 1: Application Foundation, Date Counter, and Content Contract

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.js`
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/styles.css`
- Create: `src/lib/days.js`
- Create: `src/lib/content.js`
- Create: `public/content.js`
- Create: `tests/days.test.js`
- Create: `tests/content.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `calculateElapsedDays(startDate, now, timeZone) -> number | null`
- Produces: `millisecondsUntilNextMidnight(now, timeZone) -> number`
- Produces: `normalizeAlbumContent(raw) -> { content, errors }`
- Produces: `photoMediaPaths(chapterFolder, file) -> { thumb, full }`
- Produces: normalized content keys `startDate`, `timeZone`, `cover`, `music`, `letter`, and `chapters[]`

- [x] **Step 1: Create the minimal Vue/Vite package and entry files**

Add runtime dependencies `vue` and `three`, development dependencies `vite`, `@vitejs/plugin-vue`, and `sharp`, set `"type": "module"`, and add scripts `dev`, `build`, `test` (`node --test`), and `prepare-media`. Configure Vite's Vue plugin and load `./content.js` before `src/main.js` in `index.html`.

- [x] **Step 2: Write the failing elapsed-day tests**

In `tests/days.test.js`, assert:

```js
assert.equal(calculateElapsedDays('2025-12-14', new Date('2026-12-13T15:59:59Z'), 'Asia/Shanghai'), 364);
assert.equal(calculateElapsedDays('2025-12-14', new Date('2026-12-13T16:00:00Z'), 'Asia/Shanghai'), 365);
assert.equal(calculateElapsedDays('invalid', new Date('2026-12-14T00:00:00Z'), 'Asia/Shanghai'), null);
assert.ok(millisecondsUntilNextMidnight(new Date('2026-12-13T15:59:59Z'), 'Asia/Shanghai') <= 1000);
```

- [x] **Step 3: Run the date test and verify it fails**

Run: `node --test tests/days.test.js`

Expected: FAIL because `src/lib/days.js` does not exist.

- [x] **Step 4: Implement the calendar functions in `src/lib/days.js`**

Use `Intl.DateTimeFormat(..., { timeZone, year, month, day })` to compare calendar dates, not the visitor's local midnight. Keep invalid dates non-throwing and return `null`.

- [x] **Step 5: Run the date test and verify it passes**

Run: `node --test tests/days.test.js`

Expected: all date tests PASS.

- [x] **Step 6: Write the failing content-normalization tests**

In `tests/content.test.js`, cover an empty object, blank `letter`, absent `music`, invalid `startDate`, captions containing literal HTML, and a valid photo entry. Assert that blank letter is valid, missing music normalizes to `null`, invalid date adds a `startDate` error, captions remain unchanged plain strings, and `photoMediaPaths('01-故事开始', '01')` returns the matching `thumb/01.webp` and `full/01.webp` paths.

- [x] **Step 7: Run the content test and verify it fails**

Run: `node --test tests/content.test.js`

Expected: FAIL because the exported normalizer and path resolver do not exist.

- [x] **Step 8: Implement `normalizeAlbumContent` and `photoMediaPaths`**

Use safe defaults, preserve explicit empty captions and letter text, reject non-array chapters/photos into the `errors` list, and never interpret content strings as HTML.

- [x] **Step 9: Create the editable content template and minimal application shell**

Set `startDate` to `2025-12-14`, `timeZone` to `Asia/Shanghai`, cover to `./media/cover.jpg`, music to `./media/music.mp3`, letter to an empty string, and four confirmed chapter titles with empty photo arrays. `App.vue` should render a readable configuration error rather than a blank page.

- [x] **Step 10: Run foundation verification**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite emits `dist/index.html` without errors.

- [x] **Step 11: Commit the foundation**

```bash
git add package.json package-lock.json index.html vite.config.js src public/content.js tests .gitignore
git commit -m "feat: scaffold album content foundation"
```

### Task 2: Non-Destructive Photo Preparation

**Files:**
- Create: `scripts/prepare-photos.mjs`
- Create: `tests/prepare-photos.test.js`
- Modify: `package.json`
- Create: `README.md`

**Interfaces:**
- Consumes: normalized `chapters[]` with `folder` and photo `file` keys from Task 1.
- Produces: `preparePhotos({ sourceDir, outputDir, chapters, coverFile }) -> Promise<{ processed, failures }>`
- Produces: `public/media/photos/<folder>/thumb/<file>.webp` capped at `512px` longest edge.
- Produces: `public/media/photos/<folder>/full/<file>.webp` capped at `1920px` longest edge.
- Produces: optimized `public/media/cover.jpg` capped at `2400px` longest edge.

- [x] **Step 1: Write the failing media-pipeline test**

Use Sharp in `tests/prepare-photos.test.js` to create a temporary `2000×1200` JPEG with metadata. Assert that preparation leaves the source byte-for-byte unchanged, creates thumb/full/cover outputs at the exact paths, enforces the size limits, outputs WebP photos, and produces outputs with no EXIF metadata.

- [x] **Step 2: Add failure-case assertions**

Assert that an absent named source appears in `failures`, and an unsupported `.heic` input produces a clear conversion message rather than silently succeeding.

- [x] **Step 3: Run the media test and verify it fails**

Run: `node --test tests/prepare-photos.test.js`

Expected: FAIL because `preparePhotos` does not exist.

- [x] **Step 4: Implement `preparePhotos` and the CLI entry point**

Use Sharp rotation without `withMetadata()` so output metadata is stripped. Resolve `.jpg`, `.jpeg`, and `.png` inputs by basename; report unsupported or missing files together at the end and leave originals untouched. Support `--dry-run` without writing output.

- [x] **Step 5: Document the exact media workflow**

In `README.md`, document `originals/` folder names, numeric basenames, `npm run prepare-media`, and the requirement to export unsupported HEIC files as JPG first.

- [x] **Step 6: Run the pipeline verification**

Run: `node --test tests/prepare-photos.test.js && npm run prepare-media -- --dry-run`

Expected: tests PASS; dry run lists absent user-supplied assets, writes nothing, and exits `0` so it can be used as a preview.

- [x] **Step 7: Commit the media pipeline**

```bash
git add scripts/prepare-photos.mjs tests/prepare-photos.test.js package.json package-lock.json README.md
git commit -m "feat: add photo preparation pipeline"
```

### Task 3: Formation Geometry and Performance Downgrade

**Files:**
- Create: `src/three/formations.js`
- Create: `src/three/frame-budget.js`
- Create: `tests/formations.test.js`
- Create: `tests/frame-budget.test.js`

**Interfaces:**
- Produces: `createFormation(name, count, viewport) -> Array<{ x, y, z, rotationZ, scale }>`
- Produces: formation names `river`, `infinity`, and `doubleHeart`.
- Produces: `selectEvenly(items, limit) -> items[]` preserving order without duplicates.
- Produces: `createFrameBudget() -> { addFrame(deltaMs), reset() }`, where `addFrame` returns `normal`, `reduced`, or `fallback`.

- [x] **Step 1: Write the failing formation tests**

For every formation and counts `0`, `1`, `8`, `40`, and `60`, assert output length equals count and every numeric field is finite. Assert `selectEvenly([...Array(60).keys()], 24)` returns 24 ordered unique values including the first and last.

- [x] **Step 2: Run formation tests and verify they fail**

Run: `node --test tests/formations.test.js`

Expected: FAIL because `formations.js` does not exist.

- [x] **Step 3: Implement the three deterministic layouts and even selection**

Use normalized coordinates scaled by the supplied viewport. The river uses a smooth S curve, infinity uses a figure-eight parametric path, and double heart splits the photo count as evenly as possible between two heart curves.

- [x] **Step 4: Run formation tests and verify they pass**

Run: `node --test tests/formations.test.js`

Expected: all formation tests PASS.

- [x] **Step 5: Write the failing frame-budget tests**

Assert that stable `16ms` frames stay `normal`; one full 3-second window averaging over `41.67ms` becomes `reduced`; a second such window becomes `fallback`; and `reset()` returns to `normal`.

- [x] **Step 6: Run frame-budget tests and verify they fail**

Run: `node --test tests/frame-budget.test.js`

Expected: FAIL because the frame-budget interface does not exist.

- [x] **Step 7: Implement the two-stage frame budget**

Accumulate elapsed milliseconds and frame count per 3-second window. Use the exact `24 FPS` threshold from the spec; do not react to isolated slow frames.

- [x] **Step 8: Run geometry and budget verification**

Run: `node --test tests/formations.test.js tests/frame-budget.test.js`

Expected: all tests PASS.

- [x] **Step 9: Commit formation logic**

```bash
git add src/three/formations.js src/three/frame-budget.js tests/formations.test.js tests/frame-budget.test.js
git commit -m "feat: add photo formation calculations"
```

### Task 4: Three.js Scene and Mesh Transition Lifecycle

**Files:**
- Create: `src/three/transition-plan.js`
- Create: `src/three/album-scene.js`
- Create: `src/components/AlbumStage.vue`
- Create: `tests/transition-plan.test.js`

**Interfaces:**
- Consumes: `createFormation`, `selectEvenly`, and frame-budget states from Task 3.
- Produces: `createTransitionPlan(currentItems, nextPhotos, targets) -> { updates, creates, removes }`.
- Produces: class `AlbumScene` with `setChapter`, `setPointer`, `setPaused`, `setReducedMotion`, `resize`, and `dispose` methods.
- Produces: Vue events `photo-select`, `transition-end`, and `fallback` from `AlbumStage.vue`.

- [x] **Step 1: Write the failing transition-plan tests**

Assert equal-count transitions reuse every matching keyed mesh; larger next chapters create only missing keys; smaller next chapters remove only stale keys; and no photo key appears in more than one of `updates`, `creates`, or `removes`.

- [x] **Step 2: Run the transition-plan test and verify it fails**

Run: `node --test tests/transition-plan.test.js`

Expected: FAIL because `createTransitionPlan` does not exist.

- [x] **Step 3: Implement the pure transition planner**

Key items by `chapterId/file`; keep allocation independent from Three.js so unequal chapter sizes are testable without WebGL.

- [x] **Step 4: Run the transition-plan test and verify it passes**

Run: `node --test tests/transition-plan.test.js`

Expected: all transition-plan tests PASS.

- [x] **Step 5: Implement `AlbumScene`**

Create one perspective camera and renderer with pixel ratio capped at `1.5`. Use photo planes, eased `800–1200ms` interpolation, texture disposal after removal, raycasting for hover/click, page-visibility pause, and WebGL context-loss fallback. On `reduced`, cap pixel ratio at `1` and visible photos at 24; on `fallback`, stop rendering and notify Vue.

- [x] **Step 6: Implement `AlbumStage.vue` canvas lifecycle**

Create the scene on mount, forward chapter and pause changes, normalize pointer coordinates, emit selected photo metadata, resize with `ResizeObserver`, and call `dispose()` on unmount.

- [x] **Step 7: Verify compilation and renderer startup**

Run: `npm test && npm run build && npm run dev -- --host 127.0.0.1`

Expected: tests and build PASS; the development page creates one canvas without console errors and tears it down after reload.

- [x] **Step 8: Commit the Three.js stage**

```bash
git add src/three/transition-plan.js src/three/album-scene.js src/components/AlbumStage.vue tests/transition-plan.test.js
git commit -m "feat: render interactive threejs album stage"
```

### Task 5: Guided Chapter Flow, Orientation, and Audio

**Files:**
- Create: `src/lib/navigation.js`
- Create: `src/components/OpeningScreen.vue`
- Create: `src/components/LandscapeGate.vue`
- Create: `tests/navigation.test.js`
- Modify: `src/App.vue`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: normalized content and day functions from Task 1; `AlbumStage` events from Task 4.
- Produces: `nextChapterIndex(index, direction, count, locked) -> number`.
- Produces: `horizontalSwipeDirection(start, end, minDistance = 50) -> -1 | 0 | 1`.
- Produces: opening event `enter` and orientation event `continue-portrait`.

- [x] **Step 1: Write the failing navigation tests**

Assert that locked navigation preserves the index, bounds never leave `0..count-1`, one direction input moves exactly one chapter, horizontal movement below `50px` returns `0`, and a predominantly vertical gesture returns `0` even when its horizontal component exceeds `50px`.

- [x] **Step 2: Run navigation tests and verify they fail**

Run: `node --test tests/navigation.test.js`

Expected: FAIL because `navigation.js` does not exist.

- [x] **Step 3: Implement chapter and swipe helpers**

Keep input classification pure. Treat rightward swipe as previous and leftward swipe as next.

- [x] **Step 4: Run navigation tests and verify they pass**

Run: `node --test tests/navigation.test.js`

Expected: all navigation tests PASS.

- [x] **Step 5: Implement the opening and orientation components**

`OpeningScreen.vue` renders the cover, live elapsed days, and one entry button; a failed cover image switches to the cinematic CSS backdrop. `LandscapeGate.vue` blocks portrait mobile initially, responds to orientation changes, and includes an explicit “仍然继续” action for devices that cannot rotate.

- [x] **Step 6: Implement `App.vue` chapter orchestration**

Start music only inside the entry click handler, catch autoplay rejection, schedule the next Shanghai-midnight day update, lock input until `transition-end`, map chapters to river/river/infinity/doubleHeart, and keep current chapter through orientation changes. Pass all chapter thumbnails to the final double-heart scene; use `selectEvenly` only after the scene enters reduced mode.

- [x] **Step 7: Add audio and visibility behavior**

Hide the music control after an audio error, provide mute/unmute after successful playback, pause Three.js when `document.hidden`, and leave music state unchanged when opening a photo.

- [x] **Step 8: Verify guided flow**

Run: `npm test && npm run build`

Expected: all tests and build PASS; manual wheel, arrow-key, and touch checks advance one chapter and ignore input during transitions.

- [x] **Step 9: Commit guided navigation**

```bash
git add src/lib/navigation.js src/components/OpeningScreen.vue src/components/LandscapeGate.vue src/App.vue src/styles.css tests/navigation.test.js
git commit -m "feat: add guided anniversary album flow"
```

### Task 6: Accessible Lightbox and DOM Fallback

**Files:**
- Create: `src/components/Lightbox.vue`
- Create: `src/components/FallbackGallery.vue`
- Modify: `src/lib/navigation.js`
- Modify: `tests/navigation.test.js`
- Modify: `src/App.vue`
- Modify: `src/components/AlbumStage.vue`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: photo metadata emitted by `AlbumStage` and normalized media paths.
- Produces: `stepPhotoIndex(index, direction, count) -> number` with wraparound.
- Produces: Lightbox events `close` and `change`.
- Produces: identical `photo-select` events from `FallbackGallery.vue`.

- [x] **Step 1: Add the failing lightbox-index tests**

Assert next from the last photo wraps to `0`, previous from `0` wraps to the final index, and count `0` safely returns `-1`.

- [x] **Step 2: Run the navigation test and verify the new assertions fail**

Run: `node --test tests/navigation.test.js`

Expected: FAIL because `stepPhotoIndex` does not exist.

- [x] **Step 3: Implement `stepPhotoIndex`**

Keep it independent from Vue and reuse the existing horizontal-swipe helper in the lightbox.

- [x] **Step 4: Implement `Lightbox.vue`**

Use a modal DOM surface with previous/next/close buttons, Escape and arrow keys, touch swipe, pure-text captions, broken-image placeholder, focus containment, and focus return to the triggering photo.

- [x] **Step 5: Implement `FallbackGallery.vue`**

Render the current chapter as keyboard-accessible photo buttons. Preserve chapter titles, captions, broken-image placeholders, and lightbox selection without WebGL.

- [x] **Step 6: Wire fallback and pause behavior**

Switch from `AlbumStage` to `FallbackGallery` on renderer creation failure, context loss, frame-budget fallback, or reduced-motion mode. Pause the stage while the lightbox is open and resume it after close.

- [x] **Step 7: Run lightbox and fallback verification**

Run: `npm test && npm run build`

Expected: all tests and build PASS; manual keyboard traversal reaches every lightbox action, Escape returns focus, and a deliberately broken image shows a placeholder without losing navigation.

- [x] **Step 8: Commit accessible viewing**

```bash
git add src/components/Lightbox.vue src/components/FallbackGallery.vue src/components/AlbumStage.vue src/lib/navigation.js src/App.vue src/styles.css tests/navigation.test.js
git commit -m "feat: add accessible lightbox and fallback gallery"
```

### Task 7: Cinematic Visual System and Final Chapter

**Files:**
- Modify: `index.html`
- Modify: `src/App.vue`
- Modify: `src/components/OpeningScreen.vue`
- Modify: `src/components/AlbumStage.vue`
- Modify: `src/components/Lightbox.vue`
- Modify: `src/components/FallbackGallery.vue`
- Modify: `src/styles.css`
- Create: `public/robots.txt`

**Interfaces:**
- Consumes: all prior components and the confirmed chapter copy.
- Produces: final visual states `opening`, `chapters`, `ending`, and `replay`.

- [x] **Step 1: Apply the confirmed “sunset cinema” design tokens**

Use wine-dark backgrounds, amber highlights, warm film borders, readable contrast, visible focus rings, film-edge details, and restrained shadows. Keep all copy and controls legible at desktop and mobile-landscape widths.

- [x] **Step 2: Implement confirmed chapter and ending copy**

Use the four chapter titles from the spec, render the double-heart day count at the climax, fade back to the cover for the ending, keep the user letter blank without an empty box, lower audio volume, and provide “重新观看”. Replay resets the chapter to the beginning and restores the pre-ending audio volume.

- [x] **Step 3: Implement responsive and reduced-motion styles**

Support `1440×900`, `844×390`, and portrait `390×844`; never require hover; avoid horizontal document scrolling; reduce motion to short opacity transitions and the DOM gallery.

- [x] **Step 4: Add indexing controls**

Add `<meta name="robots" content="noindex, nofollow">` and a matching `public/robots.txt` that disallows crawling. Do not claim these provide authentication.

- [x] **Step 5: Verify the visual system**

Run: `npm test && npm run build`

Expected: all tests and build PASS. Inspect the three target viewports: no clipped controls, unreadable copy, overlapping photos, or inaccessible actions; reduced-motion mode uses no large spatial transition.

- [x] **Step 6: Commit final presentation**

```bash
git add index.html src public/robots.txt
git commit -m "style: finish cinematic album experience"
```

### Task 8: Release Verification and Manual Deployment

**Files:**
- Modify: `README.md`
- Create: `docs/release-checklist.md`

**Interfaces:**
- Consumes: the complete application and `dist/` output.
- Produces: a verified static build, repeatable media/content instructions, and the final Netlify URL when account access is available.

- [x] **Step 1: Document user-editable content and rebuild steps**

Explain every `public/content.js` field, photo folder/basename rules, optional captions, blank letter behavior, `music.mp3`, cover replacement, `npm run prepare-media`, `npm test`, `npm run build`, and Netlify `dist/` upload.

- [x] **Step 2: Write the release checklist**

Include the spec's desktop, mobile, WeChat, WebGL fallback, reduced motion, broken media, audio, no-name, orientation, EXIF, and day-count acceptance items. Mark actual-device checks as pending until performed, never as inferred from desktop emulation.

- [x] **Step 3: Run the complete automated verification**

Run: `npm test && npm run build`

Expected: every Node test PASS and Vite produces `dist/` without warnings that affect runtime.

- [x] **Step 4: Verify repository privacy boundaries**

Run: `git status --short --ignored` and `git ls-files originals public/media`

Expected: originals and generated media are ignored; `git ls-files` prints no private media paths; no secret-looking values appear in tracked configuration.

- [x] **Step 5: Exercise failure and compatibility paths locally**

Test missing `music.mp3`, one broken photo path, forced WebGL context loss, sustained frame-budget fallback, reduced motion, portrait bypass, vertical swipes, and empty content. Expected: every case remains navigable and shows a readable fallback rather than a blank page.

- [ ] **Step 6: Perform browser and device checks**

Check desktop Chrome/Edge and mobile Safari/Chrome with the live or LAN URL. Check WeChat's embedded browser on a real phone when available. Record device/browser, result, and any unverified item in `docs/release-checklist.md`.

- [x] **Step 7: Commit release documentation**

```bash
git add README.md docs/release-checklist.md
git commit -m "docs: add album release workflow"
```

- [ ] **Step 8: Publish the verified `dist/` folder**

Upload `dist/` to the user's Netlify project after account access is available, retain the generated non-meaningful URL, open the deployed site in desktop and mobile browsers, and confirm `robots.txt`, cover, content, music behavior, and media paths over HTTPS. If account access is unavailable, stop with the verified `dist/` artifact and identify login as the only deployment blocker.
