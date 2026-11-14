<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* ==========================================================================
   Polices auto-hébergées
   ========================================================================== */
@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 400 800;
  font-stretch: 100%;
  font-display: swap;
  src: url('/fonts/bricolage-grotesque-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 400 800;
  font-stretch: 100%;
  font-display: swap;
  src: url('/fonts/bricolage-grotesque-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-400-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-400-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-700-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-700-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-italic-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-italic-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* ==========================================================================
   Tokens « Marché »
   ========================================================================== */
:root {
  --encre: #16233D;
  --papier: #F4F6EC;
  --papier-2: #E7ECDA;
  --tomate: #C0321F;
  --moutarde: #E9A81C;
  --persil: #2F7D4F;
  --aubergine: #5B3A6E;
  --bleu: #2A6F97;
  --ochre: #8A560B;
  --ink-soft: rgba(22, 35, 61, 0.62);
  --ink-faint: rgba(22, 35, 61, 0.16);
  --radius: 12px;
  --display: 'Bricolage Grotesque', system-ui, sans-serif;
  --body: 'Atkinson Hyperlegible', system-ui, sans-serif;
}

/* ==========================================================================
   Base
   ========================================================================== */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--papier);
  color: var(--encre);
  font-family: var(--body);
  font-size: 16px;
  line-height: 1.5;
}

h1,
h2,
h3 {
  font-family: var(--display);
  font-weight: 700;
  line-height: 1.05;
  margin: 0;
}

p {
  margin: 0;
}

a {
  color: inherit;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 3px solid var(--bleu);
  outline-offset: 2px;
  border-radius: 4px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 1.5rem);
}

/* ==========================================================================
   Bandeau d'étal (accueil)
   ========================================================================== */
.awning {
  height: 15px;
  border-bottom: 2px solid var(--encre);
  background: repeating-linear-gradient(90deg, var(--tomate) 0 24px, var(--moutarde) 24px 48px);
}

/* ==========================================================================
   Cartes « étal »
   ========================================================================== */
.etal {
  background: #fff;
  border: 2px solid var(--encre);
  border-radius: var(--radius);
  overflow: hidden;
}

.etal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 2px solid var(--encre);
  font-family: var(--display);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.etal-body {
  padding: 0.95rem 0.9rem 1.05rem;
  display: grid;
  gap: 0.65rem;
}

.tone {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  border: 2px solid currentColor;
  flex: none;
  display: inline-block;
}
.tone-tomate { background: var(--tomate); color: var(--tomate); }
.tone-moutarde { background: var(--moutarde); color: var(--moutarde); }
.tone-persil { background: var(--persil); color: var(--persil); }
.tone-aubergine { background: var(--aubergine); color: var(--aubergine); }
.tone-bleu { background: var(--bleu); color: var(--bleu); }

/* ==========================================================================
   Champs de formulaire
   ========================================================================== */
.field {
  display: grid;
  gap: 0.3rem;
}

.field label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.clear-btn {
  border: 0;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
}
.clear-btn:hover {
  background: var(--tomate);
  color: #fff;
}

.input,
select,
textarea {
  width: 100%;
  background: var(--papier);
  border: 2px solid var(--encre);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
}

textarea {
  resize: vertical;
  min-height: 5.5rem;
}

input[type='file'] {
  font-size: 0.8rem;
  max-width: 100%;
}

.hint {
  font-size: 0.72rem;
  color: var(--ink-soft);
}

/* ==========================================================================
   Boutons
   ========================================================================== */
.btn {
  font-weight: 700;
  background: var(--tomate);
  color: var(--papier);
  border: 2px solid var(--encre);
  border-radius: 9px;
  padding: 0.5rem 0.95rem;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--encre);
  transition: transform 0.07s, box-shadow 0.07s;
}
.btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--encre);
}
.btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--encre);
}
.btn:disabled {
  opacity: 0.55;
  cursor: progress;
}
.btn.ghost {
  background: var(--papier);
  color: var(--encre);
}

.chip-btn {
  font-weight: 700;
  font-size: 0.78rem;
  background: var(--papier);
  border: 2px solid var(--encre);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
}
.chip-btn:hover {
  background: var(--moutarde);
}

/* ==========================================================================
   Accueil
   ========================================================================== */
.home .hero {
  padding: 1.6rem 0 1.3rem;
}

.wordmark {
  position: relative;
  z-index: 0;
  display: inline-block;
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(2.4rem, 12vw, 3.4rem);
  letter-spacing: -0.03em;
  line-height: 0.95;
}
.wordmark::after {
  content: '';
  position: absolute;
  z-index: -1;
  left: -0.06em;
  right: 0.75em;
  bottom: 0.02em;
  height: 0.3em;
  background: var(--moutarde);
  transform: rotate(-1.2deg);
}

.home .tagline {
  margin-top: 0.7rem;
  color: var(--ink-soft);
  max-width: 32ch;
}

.home .stack {
  display: grid;
  gap: 1.1rem;
  padding-bottom: 2rem;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.error {
  color: var(--tomate);
  font-weight: 700;
  padding: 0.25rem 0;
}

.loading {
  color: var(--ink-soft);
  padding: 1rem 0;
}

/* ==========================================================================
   Page liste
   ========================================================================== */
.back {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-soft);
  text-decoration: none;
  margin-top: 0.25rem;
}
.back:hover {
  color: var(--tomate);
}

.list-head {
  margin: 0.35rem 0 1.2rem;
}

.list-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.list-title h1 {
  font-size: clamp(1.5rem, 6vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  max-width: 70%;
  overflow-wrap: anywhere;
}

.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: none;
}
.progress .bar {
  width: 74px;
  height: 9px;
  border: 2px solid var(--encre);
  border-radius: 999px;
  background: var(--papier-2);
  overflow: hidden;
}
.progress .bar i {
  display: block;
  height: 100%;
  background: var(--persil);
  transition: width 0.2s ease;
}
.progress span {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.list-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
  flex-wrap: wrap;
}

.pseudo {
  margin-top: 0.8rem;
}
.pseudo summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.pseudo summary b {
  color: var(--encre);
}
.pseudo form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.pseudo form input {
  flex: 1;
}

.sections {
  display: grid;
  gap: 1.15rem;
  margin-bottom: 1.4rem;
}

.band {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.85rem;
  color: var(--papier);
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  font-size: 0.8rem;
  background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.11) 0 7px, transparent 7px 17px);
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.6rem;
  padding: 0.6rem 0.85rem;
}
.item + .item {
  border-top: 1px dashed var(--ink-faint);
}

.item .item-text {
  flex: 1 1 8rem;
  min-width: 6rem;
  font-size: 1.02rem;
  overflow-wrap: anywhere;
}

.item .meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
}

.check {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 23px;
  height: 23px;
  margin: 0;
  border: 2px solid var(--encre);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.check:checked {
  background: var(--tomate);
  border-color: var(--tomate);
}
.check:checked::after {
  content: '';
  width: 6px;
  height: 12px;
  border-right: 3px solid #fff;
  border-bottom: 3px solid #fff;
  transform: rotate(40deg) translate(-1px, -2px);
}

.item.done .item-text {
  text-decoration: line-through;
  text-decoration-color: var(--tomate);
  text-decoration-thickness: 2.5px;
  color: var(--ink-soft);
}

.qty {
  width: 6.5rem;
  text-align: center;
  font-family: var(--display);
  font-weight: 700;
  font-size: 0.78rem;
  background: var(--moutarde);
  border: 2px solid var(--encre);
  border-radius: 8px;
  padding: 0.15rem 0.5rem;
  color: var(--encre);
}
.qty::placeholder {
  color: var(--ink-soft);
}

.stamp {
  font-family: var(--display);
  font-weight: 700;
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--persil);
  background: transparent;
  border: 2px solid var(--persil);
  border-radius: 5px;
  padding: 0.14rem 0.45rem;
  transform: rotate(-3deg);
  box-shadow: inset 0 0 0 1.5px var(--persil);
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.claim {
  font-weight: 700;
  font-size: 0.74rem;
  background: transparent;
  color: var(--persil);
  border: 2px solid var(--persil);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  white-space: nowrap;
}
.claim:hover {
  background: var(--persil);
  color: var(--papier);
}

.trash {
  border: 0;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  padding: 0.2rem 0.35rem;
  border-radius: 6px;
}
.trash:hover {
  background: var(--tomate);
  color: #fff;
}

.add-grid {
  display: grid;
  grid-template-columns: 1fr 7rem;
  gap: 0.55rem;
}
.add-grid input {
  min-width: 0;
}

.empty {
  color: var(--ink-soft);
  font-weight: 700;
  padding: 0.5rem 0.15rem 0;
}

/* ==========================================================================
   Dialogue pseudo
   ========================================================================== */
dialog {
  border: 2px solid var(--encre);
  border-radius: var(--radius);
  padding: 0;
  max-width: min(92vw, 26rem);
  background: var(--papier);
  color: var(--encre);
  box-shadow: 7px 9px 0 rgba(22, 35, 61, 0.16);
}
dialog::backdrop {
  background: rgba(22, 35, 61, 0.45);
}
.pseudo-dialog .etal-body {
  gap: 0.9rem;
}
.pseudo-dialog h2 {
  font-size: 1.35rem;
}
.pseudo-dialog p {
  color: var(--ink-soft);
}

/* ==========================================================================
   Mouvement réduit
   ========================================================================== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
