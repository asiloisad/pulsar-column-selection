# block-selection

<p align="center">
  <a href="https://github.com/bacadra/pulsar-block-selection/tags">
  <img src="https://img.shields.io/github/v/tag/bacadra/pulsar-block-selection?style=for-the-badge&label=Latest&color=blue" alt="Latest">
  </a>
  <a href="https://github.com/bacadra/pulsar-block-selection/issues">
  <img src="https://img.shields.io/github/issues-raw/bacadra/pulsar-block-selection?style=for-the-badge&color=blue" alt="OpenIssues">
  </a>
  <a href="https://github.com/bacadra/pulsar-block-selection/blob/master/package.json">
  <img src="https://img.shields.io/github/languages/top/bacadra/pulsar-block-selection?style=for-the-badge&color=blue" alt="Language">
  </a>
  <a href="https://github.com/bacadra/pulsar-block-selection/blob/master/LICENSE">
  <img src="https://img.shields.io/github/license/bacadra/pulsar-block-selection?style=for-the-badge&color=blue" alt="Licence">
  </a>
</p>

A package allow you to drag across lines to select a block of text with carets on each line. A few similar packages has been already published, but this one has applied important fixes:

* fixed a problem of inline HTML elements, e.g. [Hydrogen](https://github.com/nteract/hydrogen),
* fixed a problem of zone near to end of file,
* fixed low performance if `Ctrl` is pressed,
* fixed context menu if `Right Mouse Button` without modifier is used,
* fixed window change with sticky-mode,
* consider `core.multiCursorOnClick` config,
* added sticky mode with preset shortcut `Alt-Q` (or `Left Mouse Button` on status-bar icon),
* added status-bar indicator of sticky mode,
* added picker mode `Ctrl-Q` (or `Right Mouse Button` on status-bar icon) to selected region by sequence of 2 `Left Mouse Button`, optional `Ctrl` accepted or `Right Mouse Button` to break sequence.

## Installation

To install `block-selection` search for [block-selection](https://web.pulsar-edit.dev/packages/block-selection) in the Install pane of the Pulsar settings or run `ppm install block-selection`.

Alternatively, run `ppm install bacadra/pulsar-block-selection` to install a package directly from Github repository.

## Customize the appearance

The style can be adjusted according to user preferences and the UI/syntax theme in the `styles.less` (File/Stylesheet..) file.

* e.g. crosshair cursor if sticky mode is activated

```less
atom-text-editor.block-selection {
  cursor: crosshair;
}
```

# Contributing [🍺](https://www.buymeacoffee.com/asiloisad)

If you have any ideas on how to improve the package, spot any bugs, or would like to support the development of new features, please feel free to share them via GitHub.

## Notes

A package has been inspired by [Sublime Style Column Selection](https://github.com/bigfive/atom-sublime-select) and [slickedit-select](https://github.com/virtualthoughts/slickedit-select) packages, but decaffeinated and many problems has been resolved.
