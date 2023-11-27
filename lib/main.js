'use babel'

import { CompositeDisposable } from 'atom'

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
    strictFlag: {
      order: 4,
      title: 'Default of Strict mode',
      description: 'Place cursor only on lines with text at mouse column position',
      type: 'boolean',
      default: true,
    }
  },

  activate() {
    this.stickyFlag = false ; this.pickerFlag = false ; this.switch = null
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
      atom.config.observe('column-selection.strictFlag', (value) => {
        this.strictFlag = value ; this.updateStrict()
      }),
      atom.commands.add('atom-workspace', {
        'column-selection:sticky': () => this.sticky(),
        'column-selection:picker': () => this.picker(),
        'column-selection:strict': () => this.strict(),
      }),
      atom.workspace.observeTextEditors((editor) => {
        this.handleLoad(editor)
      }),
    )
  },

  deactivate () {
    this.disposables.dispose()
    this.deactivateStatusBar()
    for (let editor of atom.workspace.getTextEditors()) {
      editor.getElement().removeColumnSelectionListeners()
    }
  },

  sticky() {
    this.stickyFlag = !this.stickyFlag ; this.updateSticky()
  },

  picker() {
    this.pickerFlag = this.pickerFlag===false ? true : false ; this.updatePicker()
  },

  strict() {
    this.strictFlag = !this.strictFlag ; this.updateStrict()
    if (this.strictFlag) {
      atom.notifications.addInfo('column-selection strict mode has been activated')
    } else {
      atom.notifications.addInfo('column-selection strict mode has been deactivated')
    }
  },

  initTest (e) {
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

  handleLoad(editor) {
    const element = atom.views.getView(editor)
    const component = element.component

    let mouseStart, mouseEnd, globalRanges, globalRevers, showContext

    const mouseDown = (e) => {
      if (this.pickerFlag) {
        if (e.which===1) {
          if (this.pickerFlag===true) {
            e.stopPropagation()
            parseExistingSelections(this.multiCursorOnClick && e.ctrlKey)
            mouseStart = screenPositionForMouseEvent(e)
            this.pickerFlag = editor
          } else if (this.pickerFlag == editor) {
            e.stopPropagation()
            mouseEnd = screenPositionForMouseEvent(e)
            this.pickerFlag = false ; this.updatePicker()
            selectBoxAroundCursors()
          } else {
            this.pickerFlag = false ; this.updatePicker()
          }
        } else {
          e.stopPropagation()
        }
      } else if (this.stickyFlag && e.which===1 && e.shiftKey) {
        e.stopPropagation()
        if (editor.getSelections().length===1) {
          parseExistingSelections(false)
          mouseStart = editor.getLastCursor().getScreenPosition()
        }
        mouseEnd = screenPositionForMouseEvent(e)
        selectBoxAroundCursors()
      } else if (this.initTest(e)) {
        mouseStart = mouseEnd = screenPositionForMouseEvent(e)
        parseExistingSelections(this.multiCursorOnClick && e.ctrlKey)
        showContext = true
        return true
      }
    }

    element.addEventListener('mousedown', mouseDown, { capture:true, passive:true })

    const mouseMove = (e) => {
      if (this.initTest(e)) {
        mouseEnd = screenPositionForMouseEvent(e)
        selectBoxAroundCursors()
        showContext = false
        e.preventDefault() ; e.stopPropagation()
        return false
      }
    }

    element.addEventListener('mousemove', mouseMove)

    const contextMenu = (e) => {
      if (this.pickerFlag || (this.initTest(e) & !showContext)) {
        e.preventDefault() ; e.stopPropagation()
        this.pickerFlag = false ; this.updatePicker()
        return false
      }
    }

    element.addEventListener('contextmenu', contextMenu)

    element.removeColumnSelectionListeners = () => {
      element.removeEventListener('mousedown', mouseDown, { capture:true, passive:true })
      element.removeEventListener('mousemove', mouseMove)
      element.removeEventListener('contextmenu', contextMenu)
    }

    editor.disposables.add(editor.onDidDestroy(() => {
      element.removeColumnSelectionListeners()
    }))

    const screenPositionForMouseEvent = (e) => {
      let pixelPosition = component.pixelPositionForMouseEvent(e)
      let row = component.screenPositionForPixelPosition(pixelPosition).row
      let column = Math.round(pixelPosition.left/editor.defaultCharWidth)
      return { row, column }
    }

    const selectBoxAroundCursors = () => {
      if (mouseStart && mouseEnd) {
        let zeroRanges = [] ; let realRanges = []
        let isReversed = mouseEnd.column < mouseStart.column
        for (let { row } = mouseStart, end = mouseEnd.row, asc = mouseStart.row <= end; asc ? row <= end : row >= end; asc ? row++ : row--) {
          let range = editor.bufferRangeForScreenRange([[row, mouseStart.column], [row, mouseEnd.column]])
          if (range.isEmpty()) {
            let pointStart = editor.screenPositionForBufferPosition(range.start)
            let pointEnd   = editor.screenPositionForBufferPosition(range.end  )
            if (isReversed) { [pointStart, pointEnd] = [pointEnd, pointStart] }
            if (pointStart.column===mouseStart.column || pointEnd.column===mouseEnd.column) {
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
        let ranges = globalRanges.concat(localRanges)
        let revers = globalRevers.concat(new Array(localRanges.length).fill(isReversed))
        for (let i=0 ; i<ranges.length ; i++) {
          if (i===0) {
            editor.setSelectedBufferRange(ranges[i], { reversed:revers[i] })
          } else {
            editor.addSelectionForBufferRange(ranges[i], { reversed:revers[i] })
          }
        }
      }
    }

    const parseExistingSelections = (parse) => {
      globalRanges = [] ; globalRevers = []
      if (parse) {
        for (let selection of editor.getSelections()) {
          globalRanges.push(selection.getBufferRange())
          globalRevers.push(selection.isReversed())
        }
      }
    }
  },

  updateSticky() {
    for (let editor of atom.workspace.getTextEditors()) {
      let view = atom.views.getView(editor)
      if (this.sticky) {
        view.classList.add('column-selection')
      } else {
        view.classList.remove('column-selection')
      }
    }
    if (this.switch) { this.switch.updateSticky(this.stickyFlag) }
  },

  updatePicker() {
    if (this.switch) { this.switch.updatePicker(this.pickerFlag) }
  },

  updateStrict() {
    if (this.switch) { this.switch.updateStrict(this.strictFlag) }
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar
    if (!atom.config.get('column-selection.statusBar')) { return }
    this.activateStatusBar()
  },

  activateStatusBar() {
    if (!this.statusBar) { return }
    this.switch = this.createSwitch()
    this.switch.updateSticky(this.stickyFlag)
    this.switch.updatePicker(this.pickerFlag)
    this.switch.updateStrict(this.strictFlag)
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
      } else if (e.which===2) {
        this.strict()
      } else if (e.which===3) {
        this.picker()
      }
    }
    element.updateSticky = (active) => {
      if (active) {
        iconSpan.classList.remove('icon-three-bars')
        iconSpan.classList.add('icon-list-unordered')
      } else {
        iconSpan.classList.remove('icon-list-unordered')
        iconSpan.classList.add('icon-three-bars')
      }
    }
    element.updatePicker = (active) => {
      if (active) {
        iconSpan.classList.add('picker')
      } else {
        iconSpan.classList.remove('picker')
      }
    }
    element.updateStrict = () => {}
    return element
  },
}
