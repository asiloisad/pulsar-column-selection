const { CompositeDisposable, Disposable } = require('atom')

module.exports = {

  activate() {
    // initialize
    this.editor = null ; this.context = false ; this.switch = null

    // subscribe
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

    // dragging mouse
    this.dragging = false

    // events
    this.registerEventListener(window, 'mousedown'  , this.mouseDown  .bind(this), { capture: true })
    this.registerEventListener(window, 'mouseup'    , this.mouseUp    .bind(this), { capture: true })
    this.registerEventListener(window, 'mousemove'  , this.mouseMove  .bind(this), { capture: true })
    this.registerEventListener(window, 'contextmenu', this.contextMenu.bind(this), { capture: true })
    this.registerEventListener(window, 'scroll'     , this.scrollEvent.bind(this), { capture: true })
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
    if (this.switch) { this.switch.stickyUpdate() }
  },

  picker() {
    this.pickerFlag = !this.pickerFlag
    if (this.switch) { this.switch.pickerUpdate() }
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
      this.dragging = true ; this.lastMoveEvent=false ; this.autoscrollOnMouseDrag()
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
      this.editorRestoreDeco() ; this.editorRemoveClass() ; this.reset()
      e.preventDefault() ; e.stopPropagation()
    }
    this.dragging = false
  },

  mouseMove(e) {
    if (this.editor && !this.pickerFlag) {
      this.editorRemoveDeco()
      this.editorAddClass()
      this.context = true
      this.lastMoveEvent = e
      this.selectBox(e)
      e.preventDefault() ; e.stopPropagation()
    }
  },

  scrollEvent() {
    if (this.editor && !this.pickerFlag && this.lastMoveEvent) {
      this.selectBox(this.lastMoveEvent)
    }
  },

  autoscrollOnMouseDrag() {
    window.requestAnimationFrame(() => {
      if (!this.editor || !this.dragging) {
        return
      } else if (this.lastMoveEvent) {
        this.editor.component.autoscrollOnMouseDrag(this.lastMoveEvent)
      }
      this.autoscrollOnMouseDrag()
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

  editorRemoveDeco() {
    if (!this.editor || this.selecting || !this.editor.cursorLineDecorations) { return }
    for (let decoration of this.editor.cursorLineDecorations) { decoration.destroy(); }
  },

  editorRestoreDeco() {
    if (!this.editor || !this.selecting) { return }
    this.editor.decorateCursorLine()
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
    this.switch.stickyUpdate()
    this.switch.pickerUpdate()
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
    iconSpan.classList.add('icon', 'is-icon-only', 'icon-three-bars')
    element.appendChild(iconSpan)
    element.onmouseup = (e) => {
      if (e.which===1) {
        this.sticky()
      } else if (e.which===3) {
        this.picker()
      }
    }
    element.stickyUpdate = () => {
      if (this.stickyFlag) {
        iconSpan.classList.add('sticky')
      } else {
        iconSpan.classList.remove('sticky')
      }
    }
    element.pickerUpdate = () => {
      if (this.pickerFlag) {
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
