'use babel'

export class BlockSelectionStatus extends HTMLElement {

  constructor() {
    super()
    this.classList.add('block-selection-status')
    this.classList.add('inline-block')
    this.el = document.createElement('span')
    this.el.classList.add('icon')
    this.appendChild(this.el)
    this.onclick = () => this.runSticky()
    this.oncontextmenu = () => this.runPicker()
    this.icons = ['icon-list-unordered', 'icon-three-bars']
  }

  destroy() {
    this.remove()
  }

  runSticky() {
    atom.commands.dispatch(atom.workspace.element, 'block-section:sticky')
  }

  runPicker() {
    atom.commands.dispatch(atom.workspace.element, 'block-section:picker')
  }

  statusSticky(active) {
    if (active) {
      this.el.classList.remove(this.icons[1]) ; this.el.classList.add(this.icons[0])
    } else {
      this.el.classList.remove(this.icons[0]) ; this.el.classList.add(this.icons[1])
    }
  }

  statusPicker(active) {
    if (active) {
      this.el.classList.add('picker')
    } else {
      this.el.classList.remove('picker')
    }
  }
}

customElements.define('block-selection-status', BlockSelectionStatus)
