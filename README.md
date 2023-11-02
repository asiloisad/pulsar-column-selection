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

* fixed a problem of inline HTML elements (e.g. Hydrogen),
* low performance if `Ctrl` is pressed,
* context menu if pure `Right Mouse Button` is used,
* add sticky mode with preset shortcut `Alt-Q`,
* a problem of EOF fixed.

## Installation

To install `block-selection` search for [block-selection](https://web.pulsar-edit.dev/packages/block-selection) in the Install pane of the Pulsar settings or run `ppm install block-selection`.

Alternatively, run `ppm install bacadra/pulsar-block-selection` to install a package directly from Github repository.

# Contributing [🍺](https://www.buymeacoffee.com/asiloisad)

If you have any ideas on how to improve the package, spot any bugs, or would like to support the development of new features, please feel free to share them via GitHub.

## Notes

A package has been inspired by [Sublime Style Column Selection](https://github.com/bigfive/atom-sublime-select) and [slickedit-select](https://github.com/virtualthoughts/slickedit-select) packages, but decaffeinated and many problems has been resolved.
