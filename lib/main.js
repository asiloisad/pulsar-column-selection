'use babel'

import { CompositeDisposable } from 'atom'
import { BlockSelectionStatus } from './status'

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
  },

  activate() {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe('editor.multiCursorOnClick', (value) => {
        this.multiCursorOnClick = value
      }),
      atom.config.observe('block-selection.mouseButton', (value) => {
        this.mouseButton = value
      }),
      atom.config.observe('block-selection.selectKey', (value) => {
        this.selectKey = value
      }),
      atom.config.onDidChange('block-selection.statusBar', (e) => {
        e.newValue ? this.activateStatusBar() : this.deactivateStatusBar()
      }),
      atom.commands.add('atom-workspace', {
        'block-section:sticky': () => this.sticky(),
        'block-section:picker': () => this.picker(),
      }),
      atom.workspace.observeTextEditors((editor) => {
        this.handleLoad(editor)
      }),
    )
    this.stickyFlag = false ; this.pickerFlag = false
    this.blockSelectionStatus = null
  },

  deactivate () {
    // TODO: deactivate existing patches
    this.disposables.dispose()
    this.deactivateStatusBar()
  },

  sticky() {
    this.stickyFlag = !this.stickyFlag ; this.updateSticky()
  },

  picker() {
    this.pickerFlag = this.pickerFlag===false ? true : false ; this.updatePicker()

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

    let mouseStart, mouseEnd, ranges, revers, context

    const listenerMouseDown = (e) => {
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
      }
    }

    editorElement.addEventListener('mousedown', listenerMouseDown, { capture:true, passive:true })

    const onMouseDown = (e) => {
      if (this.initTest(e)) {
        mouseStart = mouseEnd = screenPositionForMouseEvent(e)
        parseExistingSelections(this.multiCursorOnClick && e.ctrlKey)
        context = true
        return true
      }
    }
    editorElement.onmousedown = onMouseDown

    const onMouseMove = (e) => {
      if (this.initTest(e)) {
        mouseEnd = screenPositionForMouseEvent(e)
        selectBoxAroundCursors()
        context = false
        e.preventDefault() ; e.stopPropagation()
        return false
      }
    }
    editorElement.onmousemove = onMouseMove

    const onMouseUp = (e) => {
      if (this.initTest(e)) {
        e.preventDefault() ; e.stopPropagation()
        return false
      }
    }
    editorElement.onmouseup = onMouseUp

    const onContextMenu = (e) => {
      if (this.pickerFlag || (this.initTest(e) & !context)) {
        e.preventDefault() ; e.stopPropagation()
        this.pickerFlag = false ; this.updatePicker()
        return false
      }
    }
    editorElement.oncontextmenu = onContextMenu

    const screenPositionForMouseEvent = (e) => {
      let pixelPosition = editorComponent.pixelPositionForMouseEvent(e)
      let row = editorComponent.screenPositionForPixelPosition(pixelPosition).row
      let column = Math.round(pixelPosition.left/editor.defaultCharWidth)
      return { row, column }
    }

    const selectBoxAroundCursors = () => {
      if (mouseStart && mouseEnd) {
        let range, allRanges = [] ; mueRanges = []
        let isReversed = mouseEnd.column < mouseStart.column
        for (let { row } = mouseStart, end = mouseEnd.row, asc = mouseStart.row <= end; asc ? row <= end : row >= end; asc ? row++ : row--) {
          range = editor.bufferRangeForScreenRange([[row, mouseStart.column], [row, mouseEnd.column]])
          allRanges.push(range) ; if (!range.isEmpty()) { mueRanges.push(range) }
        }
        if (mueRanges.length) {
          iRanges = ranges.concat(mueRanges)
          iRevers = revers.concat(new Array(mueRanges.length).fill(isReversed))
        } else {
          iRanges = ranges.concat(allRanges)
          iRevers = revers.concat(new Array(allRanges.length).fill(isReversed))
        }
        for (let i=0 ; i<iRanges.length ; i++) {
          if (i===0) {
            editor.setSelectedBufferRange(iRanges[i], { reversed:iRevers[i] })
          } else {
            editor.addSelectionForBufferRange(iRanges[i], { reversed:iRevers[i] })
          }
        }
      }
    }

    const parseExistingSelections = (parse) => {
      ranges = [] ; revers = []
      if (parse) {
        for (let selection of editor.getSelections()) {
          ranges.push(selection.getBufferRange())
          revers.push(selection.isReversed())
        }
      }
    }
  },

  updateSticky() {
    for (let editor of atom.workspace.getTextEditors()) {
      let view = atom.views.getView(editor)
      if (this.sticky) {
        view.classList.add('block-selection')
      } else {
        view.classList.remove('block-selection')
      }
    }
    if (this.blockSelectionStatus) {
      this.blockSelectionStatus.statusSticky(this.stickyFlag)
    }
  },

  updatePicker() {
    if (this.blockSelectionStatus) {
      this.blockSelectionStatus.statusPicker(this.pickerFlag)
    }
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar
    if (!atom.config.get('block-selection.statusBar')) { return }
    this.activateStatusBar()
  },

  activateStatusBar() {
    if (!this.statusBar) { return }
    this.blockSelectionStatus = new BlockSelectionStatus()
    this.blockSelectionStatus.statusSticky(this.stickyFlag)
    this.blockSelectionStatus.statusPicker(this.pickerFlag)
    this.statusBar.addRightTile({ item:this.blockSelectionStatus, priority:-90 })
  },

  deactivateStatusBar() {
    if (!this.blockSelectionStatus) { return }
    this.blockSelectionStatus.destroy()
    this.blockSelectionStatus = null
  },
}
