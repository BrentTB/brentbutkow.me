- Voice and visuals: Professional with personality—clear hierarchy, confident typography, and a distinctive accent color. Avoid generic purple; pick one bold primary and a restrained neutral palette. Use subtle motion (entry fades, staggered list reveals) sparingly.

- Architecture: Small, purpose-built components per file; no long files. Favor composition over conditionals/flags. Apply SRP/DRY/SOLID; lift state thoughtfully; keep presentational vs. container separation.

- Types: Strict TypeScript—no any. Define domain types and props interfaces near components or in dedicated types modules. Prefer discriminated unions over any/unknown.

- structure: Use folders to keep order. Components with tsx and css files should be kept in a folder with the same name

- Styling: Use CSS modules or scoped styles; keep tokens (colors, spacing, typography) centralized. Responsive-first layout; ensure good contrast and accessible focus states. Use css instead of typescript for dynamic motion where possible.

- Content structure: Sections for intro/hero, projects with clear metadata (role, stack, outcome), experience/skills, and contact/CTA. Provide concise, personable copy.

- Interactions: Keep it fast and simple—no heavy animations. Respect prefers-reduced-motion. Progressive enhancement: graceful degradation if JS fails for non-critical visuals.

- State/data: Keep components pure; fetch/load data at edges (top-level or hooks). Reusable hooks for shared behaviors. No implicit globals.

- Testing/quality: Add lightweight tests for utilities/hooks where meaningful. Run lint/type checks. Keep dependencies minimal.

- Accessibility: Semantic HTML, proper headings, alt text, keyboard navigation, ARIA where needed.

- Tooling: Use Vite conventions. Keep imports clean and paths alias-aware. Avoid over-abstracting until patterns repeat twice.

- Documentation: Comment non-obvious logic. Maintain a README with setup/build instructions. Use meaningful commit messages.
