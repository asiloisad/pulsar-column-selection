# column-selection

<p align="center">
  <a href="https://github.com/bacadra/pulsar-column-selection/tags">
  <img src="https://img.shields.io/github/v/tag/bacadra/pulsar-column-selection?style=for-the-badge&label=Latest&color=blue" alt="Latest">
  </a>
  <a href="https://github.com/bacadra/pulsar-column-selection/issues">
  <img src="https://img.shields.io/github/issues-raw/bacadra/pulsar-column-selection?style=for-the-badge&color=blue" alt="OpenIssues">
  </a>
  <a href="https://github.com/bacadra/pulsar-column-selection/blob/master/package.json">
  <img src="https://img.shields.io/github/languages/top/bacadra/pulsar-column-selection?style=for-the-badge&color=blue" alt="Language">
  </a>
  <a href="https://github.com/bacadra/pulsar-column-selection/blob/master/LICENSE">
  <img src="https://img.shields.io/github/license/bacadra/pulsar-column-selection?style=for-the-badge&color=blue" alt="Licence">
  </a>
</p>

A package allows you to drag across lines to select a column of text, with carets on each line. A few similar packages have already been released, but this one has applied important fixes:

* fixed a problem with inline HTML elements, e.g. [Hydrogen](https://github.com/nteract/hydrogen),
* fixed a problem with zone near end of file,
* fixed low performance when pressing `Ctrl`,
* fixed context menu when `Right Mouse Button` is used without modifier,
* fixed window switching with sticky mode,
* consider `core.multiCursorOnClick` configuration,
* added sticky mode with default shortcut `Alt-Q` (or `Left Mouse Button` on statusbar icon),
* added status bar indicator for sticky mode,
* added picker mode `Ctrl-Q` (or `Right Mouse Button` on status bar icon) to selected region by sequence of 2 `Left Mouse Button`, optional `Ctrl` accepted or `Right Mouse Button` to break sequence,
* added strict mode `Ctrl-Alt-Q` (or `Middle Mouse Button` on status bar icon) to handle selection behaviour when mouse start column is equal to mouse end column,
* added keyboard commands for single cursor movement.

## Installation

To install `column-selection` search for [column-selection](https://web.pulsar-edit.dev/packages/column-selection) in the Install pane of the Pulsar settings or run `ppm install column-selection`.

Alternatively, you can run `ppm install bacadra/pulsar-column-selection` to install a package directly from the Github repository.

## Customize the appearance

The style can be adjusted according to user preferences and the UI/syntax theme in the `styles.less` (File/Stylesheet..) file.

* e.g. crosshair cursor if sticky mode is activated

```less
atom-text-editor.column-selection {
  cursor: crosshair;
}
```

# Contributing [🍺](https://www.buymeacoffee.com/asiloisad)

If you have any ideas on how to improve the package, spot any bugs, or would like to support the development of new features, please feel free to share them via GitHub.

## Notes

A package has been inspired by [Sublime Style Column Selection](https://github.com/bigfive/atom-sublime-select) and [slickedit-select](https://github.com/virtualthoughts/slickedit-select) packages, but decaffeinated and many problems has been resolved.
