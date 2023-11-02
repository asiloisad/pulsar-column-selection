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
        { description: 'Sticky', value: 4 },
      ],
      default: 0,
    },
  },

  activate(state) {
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
      atom.commands.add('atom-text-editor:not([mini])', {
        'block-section:sticky': () => { this.sticky = !this.sticky },
      }),
      atom.workspace.observeTextEditors((editor) => {
        this.handleLoad(editor)
      }),
    )
    this.sticky = false
  },

  deactivate () {
    // TODO: deactivate existing patches
    this.disposables.dispose()
  },

  initTest (e) {
    if (e.which!==this.mouseButton) {
      return false
    } else if (this.selectKey===0) {
      return true
    } else if (this.selectKey===1) {
      return this.sticky || e.shiftKey
    } else if (this.selectKey===2) {
      return this.sticky || e.altKey
    } else if (this.selectKey===3) {
      return this.sticky || e.ctrlKey
    } else if (this.selectKey===4) {
      return this.sticky
    }
  },

  handleLoad(editor) {
    const editorElement = atom.views.getView(editor)
    const editorComponent = editorElement.component

    let mouseStart, mouseEnd, ranges, revers, context

    const onMouseDown = (e) => {
      if (this.initTest(e)) {
        mouseStart = mouseEnd = screenPositionForMouseEvent(e)
        parseExistingSelections(this.multiCursorOnClick && e.ctrlKey)
        context = true
        e.preventDefault() ; e.stopPropagation()
        return false
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
      if (this.initTest(e) & !context) {
        e.preventDefault() ; e.stopPropagation()
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
}
