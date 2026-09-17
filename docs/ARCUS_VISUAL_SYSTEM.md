# ARCUS visual system

## Direction

ARCUS uses a **Mineral Paper** visual language: editorial, technical and restrained. It should resemble a well-designed scientific publication and field instrument, not a generic SaaS dashboard or an AI product.

## Typography

ARCUS uses one coherent open-source superfamily, self-hosted by the platform.

| Role | Typeface | Use |
| --- | --- | --- |
| Reading and interface | IBM Plex Sans | Paragraphs, navigation, buttons, forms and tables |
| Editorial hierarchy | IBM Plex Serif | Page titles, section titles and evidence narratives |
| Technical notation | IBM Plex Mono | ARCUS IDs, coordinates, short labels, provenance and machine-readable values |

Rules:

- Serif is reserved for meaningful hierarchy, not for controls or dense data tables.
- Mono is reserved for genuinely technical information; it is not a decorative font.
- Sans is the default whenever no stronger semantic reason exists.
- Uppercase labels use restrained tracking; paragraphs and long headings do not.
- Synthetic italics are avoided. Emphasis uses weight, colour and hierarchy.

## Colour

- Paper is the default working surface.
- Scientific ink is the default text colour.
- Observatory teal identifies institutional and evidence-boundary surfaces.
- Structural copper is an accent for selection, navigation and calls to action.
- Risk colours are used only when the underlying data has that meaning.

Dark surfaces are reserved for the footer, introductory reveal, evidence boundaries and focused overlays. They are not used merely to make a section look more dramatic.

## Shape and depth

- Technical chips: `2px` radius.
- Controls and editorial panels: `4px` radius.
- Floating overlays and dialogs: `8px` radius.
- Fully rounded forms are reserved for binary toggles, status indicators and compact filters.
- Cards rely primarily on spacing, rules and surface contrast. Shadows are used only to express actual elevation.
- Gradients and glow effects are limited to the opening reveal and subtle spatial context; they are not general decoration.

## Components

- Primary action: solid copper or institutional teal, never a gradient.
- Secondary action: paper surface with a visible rule.
- Panels: paper-white or muted paper, one-pixel rule, compact radius.
- Data values: clear alignment and tabular numerals where comparison matters.
- Empty states and limitations: explicit prose, not ambiguous icons or colour alone.

## Accessibility and output

- Text and interactive controls must retain sufficient contrast on paper and teal surfaces.
- Focus indication uses the signal copper token and must remain visible.
- Fonts are served locally with `font-display: swap` so content remains available during loading.
- Exported charts remain white-background and paper-ready; interface decoration is excluded from research figures.

IBM Plex is distributed under the SIL Open Font License 1.1. The license and font files are stored in `public/fonts/ibm-plex/`.
