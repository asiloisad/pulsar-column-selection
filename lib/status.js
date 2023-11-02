'use babel'

export class BlockSelectionStatus extends HTMLElement {

  constructor() {
    super()
    this.classList.add('block-selection-status')
    this.classList.add('inline-block')
    this.el = document.createElement('span')
    this.el.classList.add('icon')
    this.appendChild(this.el)
    this.onclick = () => this.onClickTick()
    this.icons = ['icon-list-unordered', 'icon-three-bars']
  }

  destroy() {
    this.remove()
  }

  onClickTick(el) {
    atom.commands.dispatch(atom.workspace.element, 'block-section:sticky')
  }

  status(active) {
    if (active) {
      this.el.classList.remove(this.icons[1]) ; this.el.classList.add(this.icons[0])
    } else {
      this.el.classList.remove(this.icons[0]) ; this.el.classList.add(this.icons[1])
    }
  }

  show() {
    this.style.display = 'inline-block'
  }

  hide() {
    this.style.display = 'none'
  }

}

customElements.define('block-selection-status', BlockSelectionStatus)
