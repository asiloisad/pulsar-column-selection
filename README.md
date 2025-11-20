# column-selection

Create multiple selections across lines. A package allows you to drag across lines to select a column of text, with carets on each line. A few similar packages have already been released, but this one has applied important fixes:

- fixed a problem with inline HTML elements, e.g. [Hydrogen](https://github.com/nteract/hydrogen),
- fixed a problem with zone near end of file,
- fixed low performance when pressing `Ctrl`,
- fixed context menu when `Right Mouse Button` is used without modifier,
- fixed window switching with sticky mode,
- consider `core.multiCursorOnClick` configuration,
- added sticky mode with default shortcut `Alt-Q` (or `Left Mouse Button` on statusbar icon),
- turn off cursor-line background color while selecting,
- added status bar indicator for sticky mode,
- added picker mode `Ctrl-Q` (or `Right Mouse Button` on status bar icon) to selected region by sequence of 2 `Left Mouse Button`, optional `Ctrl` accepted or `Right Mouse Button` to break sequence,
- added text-editor edge scrolling,
- performance improved.

An example of sticky mode:

![sticky](https://github.com/asiloisad/pulsar-column-selection/blob/master/assets/sticky.gif?raw=true)

An example of picker mode:

![picker](https://github.com/asiloisad/pulsar-column-selection/blob/master/assets/picker.gif?raw=true)

## Installation

To install `column-selection` search for [column-selection](https://web.pulsar-edit.dev/packages/column-selection) in the Install pane of the Pulsar settings or run `ppm install column-selection`. Alternatively, you can run `ppm install asiloisad/pulsar-column-selection` to install a package directly from the GitHub repository.

## Customize the appearance

The style can be adjusted according to user preferences and the UI/syntax theme in the `styles.less` (File/Stylesheet..) file.

- e.g. crosshair cursor while selecting

```less
atom-text-editor.column-selection {
  cursor: crosshair;
}
```

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!

## Notes

A package has been inspired by [Sublime Style Column Selection](https://github.com/bigfive/atom-sublime-select) and [slickedit-select](https://github.com/virtualthoughts/slickedit-select).
