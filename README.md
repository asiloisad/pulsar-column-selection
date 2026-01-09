# column-selection

Create multiple selections across lines by dragging. Enables column/block selection with carets on each line for efficient multi-line editing.

![sticky](https://github.com/asiloisad/pulsar-column-selection/blob/master/assets/sticky.gif?raw=true)

![picker](https://github.com/asiloisad/pulsar-column-selection/blob/master/assets/picker.gif?raw=true)

## Features

- **Drag selection**: Hold modifier key and drag to select a column of text.
- **Sticky mode**: Toggle persistent column selection with `Alt+Q` or status bar icon.
- **Picker mode**: Select region with two clicks using `Ctrl+Q` or right-click status bar.
- **Edge scrolling**: Auto-scroll when dragging near editor edges.
- **Status indicator**: Shows current mode in the status bar.
- **Precise positioning**: Temporarily disables atomic soft tabs during selection for accurate column alignment.
- **High performance**: Reuses existing selections and uses `mergeIntersectingSelections` for efficient updates, avoiding costly recreation of selection objects during drag.
- **Inline blocks support**: Works correctly with inline block decorations (e.g., hydrogen-next output results).

> **Tip**: For the best column selection experience, consider disabling atomic soft tabs globally in Settings > Editor > Atomic Soft Tabs. This prevents cursor snapping to tab boundaries and allows precise positioning at any column.

## Installation

To install `column-selection` search for [column-selection](https://web.pulsar-edit.dev/packages/column-selection) in the Install pane of the Pulsar settings or run `ppm install column-selection`. Alternatively, you can run `ppm install asiloisad/pulsar-column-selection` to install a package directly from the GitHub repository.

## Commands

Commands available in `atom-workspace`:

- `column-selection:sticky`: (`Alt+Q`) toggle sticky column selection mode,
- `column-selection:picker`: (`Ctrl+Q`) toggle picker column selection mode.

## Customization

The style can be adjusted according to user preferences in the `styles.less` file:

- e.g. crosshair cursor while selecting:

```less
atom-text-editor.column-selection {
  cursor: crosshair;
}
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!
