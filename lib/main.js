'use babel'

import { CompositeDisposable, Disposable } from 'atom'

export default {

    config: {
      mouseButton: {
        order: 1,
        title: 'Mouse button',
        description: 'The mouse button that triggers the column selection. If `None`, the column selection will still be used in sticky and picker modes',
        type: 'integer',
        enum: [
          { description: 'None'  , value: 0 },
          { description: 'Left'  , value: 1 },
          { description: 'Middle', value: 2 },
          { description: 'Right' , value: 3 },
        ],
        default: 3,
      },
      selectKey: {
        order: 2,
        title: 'Select key',
        description: 'The additional key to trigger column selection',
        type: 'integer',
        enum: [
          { description: 'None'  , value: 0 },
          { description: 'Shift' , value: 1 },
          { description: 'Alt'   , value: 2 },
          { description: 'Ctrl'  , value: 3 },
        ],
        default: 0,
      },
      statusBar: {
        order: 3,
        title: 'Status bar icon',
        description: 'Show sticky status icon in the status bar',
        type: 'boolean',
        default: true,
      },
    },

  activate() {
    this.editor=null ; this.context=false ; this.switch=null ; this.dragging=false

    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe('editor.multiCursorOnClick', (value) => {
        this.multiCursorOnClick = value
      }),
      atom.config.observe('column-selection.mouseButton', (value) => {
        this.mouseButton = value
      }),
      atom.config.observe('column-selection.selectKey', (value) => {
        this.selectKey = value
      }),
      atom.config.onDidChange('column-selection.statusBar', (e) => {
        e.newValue ? this.activateStatusBar() : this.deactivateStatusBar()
      }),
      atom.commands.add('atom-workspace', {
        'column-selection:sticky': () => this.sticky(),
        'column-selection:picker': () => this.picker(),
      }),
    )

    // thottled selections...
    this.selecting = false
    this.selectBox = throttle(this.selectBox.bind(this), 20)

    this.registerEventListener(window, 'mousedown'  , this.mouseDown  .bind(this), { capture: true })
    this.registerEventListener(window, 'mouseup'    , this.mouseUp    .bind(this), { capture: true })
    this.registerEventListener(window, 'mousemove'  , this.mouseMove  .bind(this), { capture: true })
    this.registerEventListener(window, 'contextmenu', this.contextMenu.bind(this), { capture: true })
  },

  registerEventListener(element, command, func, props) {
    element.addEventListener(command, func, props)
    this.disposables.add(new Disposable(() => {
      element.removeEventListener(command, func, props)
    }))
  },

  deactivate () {
    this.disposables.dispose()
  },

  sticky() {
    this.stickyFlag = !this.stickyFlag
    if (this.switch) { this.switch.sticky(this.stickyFlag) }
  },

  picker() {
    this.pickerFlag = !this.pickerFlag
    if (this.switch) { this.switch.picker(this.pickerFlag) }
  },

  reset() {
    this.editor = null
  },

  findEditor(e) {
    if (!this.editor && (element = e.target.closest('atom-text-editor'))) {
      this.editor = element.getModel() ; this.patchEditor()
    }
    return this.editor
  },

  patchEditor() {
    if (!this.editor.columnSelectionProperties) {
      this.editor.columnSelectionProperties = {
        mouseStart: null, mouseEnd: null, ranges: null, revers: null,
      }
    }
  },

  get props() {
    return this.editor.columnSelectionProperties
  },

  initTest(e) {
    if (this.stickyFlag && e.which===1) {
      return true
    } else if (!this.mouseButton || e.which!==this.mouseButton) {
      return false
    } else if (this.selectKey===0) {
      return true
    } else if (this.selectKey===1) {
      return e.shiftKey
    } else if (this.selectKey===2) {
      return e.altKey
    } else if (this.selectKey===3) {
      return e.ctrlKey
    }
  },

  screenPositionForMouseEvent(e) {
    let pixelPosition = this.editor.component.pixelPositionForMouseEvent(e)
    let row = this.editor.component.screenPositionForPixelPosition(pixelPosition).row
    let column = Math.round(pixelPosition.left/this.editor.defaultCharWidth)
    return { row, column }
  },

  mouseDown(e) {
    if (this.pickerFlag) {
      if (!this.findEditor(e)) { return }
      e.preventDefault() ; e.stopPropagation() ; return false
    } else if (this.stickyFlag && e.which===1 && e.shiftKey) {
      if (!this.findEditor(e)) {
        return
      } else if (!this.props.mouseStart || this.editor.getSelections().length===1) {
        this.saveExisting(true)
        this.props.mouseStart = this.editor.getLastCursor().getScreenPosition()
      }
      this.selectBox(e) ; e.stopPropagation()
    } else if (this.initTest(e)) {
      if (!this.findEditor(e)) { return }
      this.saveExisting(this.multiCursorOnClick && e.ctrlKey)
      this.dragging = true ; this.lastMoveEvent=false ; this.scrollAnimation()
      this.props.mouseStart = this.screenPositionForMouseEvent(e)
    }
  },

  mouseUp(e) {
    if (this.pickerFlag) {
      if (!this.findEditor(e)) {
        this.picker() ; return
      } else if (e.which===1) {
        if (this.pickerFlag===1) {
          this.saveExisting(this.multiCursorOnClick && e.ctrlKey)
          this.props.mouseEnd = this.screenPositionForMouseEvent(e)
          this.selectBox() ; this.picker() ; this.reset()
        } else {
          this.pickerFlag = 1
          this.props.mouseStart = this.screenPositionForMouseEvent(e)
        }
      } else if (e.which===3) {
        this.context = true ; this.picker() ; this.reset()
      }
      e.preventDefault() ; e.stopPropagation() ; return false
    } else if (this.editor) {
      this.editorRemoveClass() ; this.reset()
      e.preventDefault() ; e.stopPropagation()
    }
    this.dragging = false
  },

  mouseMove(e) {
    if (this.editor && !this.pickerFlag) {
      this.editorAddClass()
      this.context = true
      this.lastMoveEvent = e
      this.selectBox(e)
      e.preventDefault() ; e.stopPropagation()
    }
  },

  scrollAnimation() {
    window.requestAnimationFrame(() => {
      if (!this.editor) {
        return
      }
      if (this.lastMoveEvent) {
        this.editor.component.autoscrollOnMouseDrag(this.lastMoveEvent)
      }
      if (!this.dragging) { return }
      this.selectBox(this.lastMoveEvent)
      this.scrollAnimation()
    })
  },

  contextMenu(e) {
    if (this.context) {
      this.context = false
      e.preventDefault() ; e.stopPropagation()
    }
  },

  selectBox(e) {
    if (!this.editor) { return }
    if (e) {
      if (this.props.mouseEnd) {
        mouseNew = this.screenPositionForMouseEvent(e)
        if (mouseNew.row===this.props.mouseEnd.row && mouseNew.column===this.props.mouseEnd.column) {
          return
        } else {
          this.props.mouseEnd = mouseNew
        }
      } else {
        this.props.mouseEnd = this.screenPositionForMouseEvent(e)
      }
    }
    if (this.props.mouseStart && this.props.mouseEnd) {
      let zeroRanges = [] ; let realRanges = []
      let isReversed = this.props.mouseEnd.column < this.props.mouseStart.column
      for (let { row } = this.props.mouseStart, end = this.props.mouseEnd.row, asc = this.props.mouseStart.row <= end; asc ? row <= end : row >= end; asc ? row++ : row--) {
        let range = this.editor.bufferRangeForScreenRange([[row, this.props.mouseStart.column], [row, this.props.mouseEnd.column]])
        if (range.isEmpty()) {
          let pointStart = this.editor.screenPositionForBufferPosition(range.start)
          let pointEnd   = this.editor.screenPositionForBufferPosition(range.end  )
          if (isReversed) { [pointStart, pointEnd] = [pointEnd, pointStart] }
          if (pointStart.column===this.props.mouseStart.column || pointEnd.column===this.props.mouseEnd.column) {
            if (pointStart.column==0 && pointEnd.column===0) {
              zeroRanges.push(range)
            } else {
              realRanges.push(range)
            }
          }
        } else {
          realRanges.push(range)
        }
      }
      let localRanges = realRanges.length ? realRanges : zeroRanges
      let ranges = this.props.ranges.concat(localRanges)
      let revers = this.props.revers.concat(new Array(localRanges.length).fill(isReversed))
      for (let i=0 ; i<ranges.length ; i++) {
        if (i===0) {
          this.editor.setSelectedBufferRange(ranges[i], { reversed:revers[i], autoscroll:false, preserveFolds:true })
        } else {
          this.editor.addSelectionForBufferRange(ranges[i], { reversed:revers[i], autoscroll:false, preserveFolds:true })
        }
      }
    }
  },

  editorAddClass() {
    if (!this.editor || this.selecting) { return }
    this.selecting = true
    this.editor.getElement().classList.add('column-selection')
  },

  editorRemoveClass() {
    if (!this.editor || !this.selecting) { return }
    this.selecting = false
    this.editor.getElement().classList.remove('column-selection')
  },

  saveExisting(parse) {
    this.props.ranges = [] ; this.props.revers = []
    if (parse) {
      for (let selection of this.editor.getSelections()) {
        this.props.ranges.push(selection.getBufferRange())
        this.props.revers.push(selection.isReversed())
      }
    }
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar
    if (!atom.config.get('column-selection.statusBar')) { return }
    this.activateStatusBar()
  },

  activateStatusBar() {
    if (!this.statusBar) { return }
    this.switch = this.createSwitch()
    this.switch.sticky(this.stickyFlag)
    this.switch.picker(this.pickerFlag)
    this.statusBar.addRightTile({ item:this.switch, priority:-90 })
  },

  deactivateStatusBar() {
    if (!this.switch) { return }
    this.switch.remove() ; this.switch = null
  },

  createSwitch () {
    const element = document.createElement('div')
    element.classList.add('column-selection-icon', 'inline-block')
    let iconSpan = document.createElement('span')
    iconSpan.classList.add('icon', 'is-icon-only')
    element.appendChild(iconSpan)
    element.onmouseup = (e) => {
      if (e.which===1) {
        this.sticky()
      } else if (e.which===3) {
        this.picker()
      }
    }
    element.sticky = (active) => {
      if (active) {
        iconSpan.classList.remove('icon-three-bars')
        iconSpan.classList.add('icon-list-unordered')
      } else {
        iconSpan.classList.remove('icon-list-unordered')
        iconSpan.classList.add('icon-three-bars')
      }
    }
    element.picker = (active) => {
      if (active) {
        iconSpan.classList.add('picker')
      } else {
        iconSpan.classList.remove('picker')
      }
    }
    return element
  },
}

function throttle(func, timeout) {
  let timer = false
  return (...args) => {
    if (timer) { return }
    func.apply(this, args)
    timer = setTimeout(() => { timer = false }, timeout)
  }
}
