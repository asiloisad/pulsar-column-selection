'use babel'

import { CompositeDisposable } from 'atom'

export default {

  config: {
    mouseButton: {
      order: 1,
      title: 'Mouse button',
      description: 'The mouse button that will trigger column selection',
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
      description: 'The key that will trigger column selection',
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
      description: 'Show sticky status icon in status bar',
      type: 'boolean',
      default: true,
    },
    strictFlag: {
      order: 4,
      title: 'Only intersected text',
      description: 'Place cursor only at lines with text',
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
    for (let editor of atom.workspace.getTextEditors()) { editor.removeBSListeners() }
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
    const editorElement = atom.views.getView(editor)
    const editorComponent = editorElement.component

    let mouseStart, mouseEnd, globalRanges, globalRevers, context

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
        context = true
        return true
      }
    }

    editorElement.addEventListener('mousedown', mouseDown, { capture:true, passive:true })

    const mouseMove = (e) => {
      if (this.initTest(e)) {
        mouseEnd = screenPositionForMouseEvent(e)
        selectBoxAroundCursors()
        context = false
        e.preventDefault() ; e.stopPropagation()
        return false
      }
    }

    editorElement.addEventListener('mousemove', mouseMove)

    const contextMenu = (e) => {
      if (this.pickerFlag || (this.initTest(e) & !context)) {
        e.preventDefault() ; e.stopPropagation()
        this.pickerFlag = false ; this.updatePicker()
        return false
      }
    }

    editorElement.addEventListener('contextmenu', contextMenu)

    editor.removeBSListeners = () => {
      editorElement.removeEventListener('mousedown', mouseDown, { capture:true, passive:true })
      editorElement.removeEventListener('mousemove', mouseMove)
      editorElement.removeEventListener('contextmenu', contextMenu)
    }

    const screenPositionForMouseEvent = (e) => {
      let pixelPosition = editorComponent.pixelPositionForMouseEvent(e)
      let row = editorComponent.screenPositionForPixelPosition(pixelPosition).row
      let column = Math.round(pixelPosition.left/editor.defaultCharWidth)
      return { row, column }
    }

    const selectBoxAroundCursors = () => {
      if (mouseStart && mouseEnd) {
        zeroRanges = [] ; realRanges = []
        let isReversed = mouseEnd.column < mouseStart.column
        for (let { row } = mouseStart, end = mouseEnd.row, asc = mouseStart.row <= end; asc ? row <= end : row >= end; asc ? row++ : row--) {
          let range = editor.bufferRangeForScreenRange([[row, mouseStart.column], [row, mouseEnd.column]])
          if (range.isEmpty()) {
            if (realRanges.length) {
              continue
            } else if (!this.strictFlag) {
              zeroRanges.push(range)
            } else {
              let bufferPosition = editor.screenPositionForBufferPosition(range.start)
              if (bufferPosition.column===mouseStart.column) { zeroRanges.push(range) }
            }
          } else {
            realRanges.push(range)
          }
        }
        localRanges = realRanges.length ? realRanges : zeroRanges
        ranges = globalRanges.concat(localRanges)
        revers = globalRevers.concat(new Array(localRanges.length).fill(isReversed))
        for (let selection of editor.getSelections()) {
          selection.destroy()
        }
        for (let i=0 ; i<ranges.length ; i++) {
          editor.addSelectionForBufferRange(ranges[i], { reversed:revers[i] })
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
    let icons = ['icon-list-unordered', 'icon-three-bars']
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
        iconSpan.classList.remove(icons[1]) ; iconSpan.classList.add(icons[0])
      } else {
        iconSpan.classList.remove(icons[0]) ; iconSpan.classList.add(icons[1])
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
