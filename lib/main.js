const { CompositeDisposable, Disposable } = require("atom");

/**
 * Column Selection Package
 * Provides rectangular/column text selection using mouse dragging.
 * Supports various selection modes with keyboard modifiers.
 */
module.exports = {
  /**
   * Activates the package and sets up mouse event listeners.
   */
  activate() {
    // initialize
    this.editor = null;
    this.context = false;
    this.switch = null;
    this.selections = null;
    this.mouseStart = null;
    this.mouseEnd = null;
    this.dragging = false;
    this.selecting = false;
    this.atomicTabs = undefined;

    // subscribe
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.config.observe("editor.multiCursorOnClick", (value) => {
        this.multiCursorOnClick = value;
      }),
      atom.config.observe("column-selection.mouseButton", (value) => {
        this.mouseButton = value;
      }),
      atom.config.observe("column-selection.selectKey", (value) => {
        this.selectKey = value;
      }),
      atom.config.onDidChange("column-selection.statusBar", (e) => {
        e.newValue ? this.activateStatusBar() : this.deactivateStatusBar();
      }),
      atom.commands.add("atom-workspace", {
        "column-selection:sticky": () => this.sticky(),
        "column-selection:picker": () => this.picker(),
      }),
    );

    // throttled selections...
    this.selectBox = throttle(this.selectBox.bind(this));

    // events
    this.registerEventListener(window, "mousedown", this.mouseDown.bind(this), {
      capture: true,
    });
    this.registerEventListener(window, "mouseup", this.mouseUp.bind(this), {
      capture: true,
    });
    this.registerEventListener(window, "mousemove", this.mouseMove.bind(this), {
      capture: true,
    });
    this.registerEventListener(window, "contextmenu", this.contextMenu.bind(this), {
      capture: true,
    });
    this.registerEventListener(window, "scroll", this.scrollEvent.bind(this), {
      capture: true,
    });
  },

  registerEventListener(element, command, func, props) {
    element.addEventListener(command, func, props);
    this.disposables.add(
      new Disposable(() => {
        element.removeEventListener(command, func, props);
      }),
    );
  },

  /**
   * Deactivates the package and disposes all resources.
   */
  deactivate() {
    this.disposables.dispose();
  },

  /**
   * Toggles sticky selection mode on/off.
   */
  sticky() {
    this.stickyFlag = !this.stickyFlag;
    if (this.switch) {
      this.switch.stickyUpdate();
    }
  },

  /**
   * Toggles picker selection mode on/off.
   */
  picker() {
    this.pickerFlag = !this.pickerFlag;
    if (this.switch) {
      this.switch.pickerUpdate();
    }
  },

  /**
   * Resets the editor reference.
   */
  reset() {
    this.restoreAtomicSoftTabs();
    this.editor = null;
  },

  /**
   * Finds the text editor from a mouse event target.
   * @param {MouseEvent} e - The mouse event
   * @returns {TextEditor|null} The text editor or null
   */
  findEditor(e) {
    let element;
    if (!this.editor && (element = e.target.closest("atom-text-editor"))) {
      this.editor = element.getModel();
    }
    return this.editor;
  },

  /**
   * Tests if column selection should be initiated based on mouse event.
   * @param {MouseEvent} e - The mouse event
   * @returns {boolean} True if selection should start
   */
  initTest(e) {
    if (this.stickyFlag && e.which === 1) {
      return true;
    } else if (!this.mouseButton || e.which !== this.mouseButton) {
      return false;
    } else if (this.selectKey === 0) {
      return true;
    } else if (this.selectKey === 1) {
      return e.shiftKey;
    } else if (this.selectKey === 2) {
      return e.altKey;
    } else if (this.selectKey === 3) {
      return e.ctrlKey;
    }
  },

  /**
   * Converts a mouse event to screen position coordinates.
   * @param {MouseEvent} e - The mouse event
   * @returns {Object} Object with row and column properties
   */
  screenPositionForMouseEvent(e) {
    let pixelPosition = this.editor.component.pixelPositionForMouseEvent(e);
    try {
      var row = this.editor.component.screenPositionForPixelPosition(pixelPosition).row;
    } catch {
      return null;
    }
    let column = Math.round(pixelPosition.left / this.editor.defaultCharWidth);
    return { row, column };
  },

  /**
   * Temporarily disables atomic soft tabs to allow precise column selection.
   */
  disableAtomicSoftTabs() {
    if (this.editor && this.atomicTabs === undefined) {
      this.atomicTabs = this.editor.hasAtomicSoftTabs();
      if (this.atomicTabs) {
        this.editor.update({ atomicSoftTabs: false });
      }
    }
  },

  /**
   * Restores the original atomic soft tabs setting.
   */
  restoreAtomicSoftTabs() {
    if (this.editor && this.atomicTabs !== undefined) {
      if (this.atomicTabs) {
        this.editor.update({ atomicSoftTabs: true });
      }
      this.atomicTabs = undefined;
    }
  },

  /**
   * Handles mouse down events to start column selection.
   * @param {MouseEvent} e - The mouse event
   */
  mouseDown(e) {
    if (this.pickerFlag) {
      if (!this.findEditor(e)) {
        return;
      }
      this.disableAtomicSoftTabs();
      e.preventDefault();
      e.stopPropagation();
      return false;
    } else if (this.stickyFlag && e.which === 1 && e.shiftKey) {
      if (!this.findEditor(e)) {
        return;
      } else if (!this.mouseStart || this.editor.getSelections().length === 1) {
        this.saveActualSelection(true);
        this.mouseStart = this.editor.getLastCursor().getScreenPosition();
      }
      this.disableAtomicSoftTabs();
      this.selectBox(e);
      e.stopPropagation();
    } else if (this.initTest(e)) {
      if (!this.findEditor(e)) {
        return;
      }
      this.saveActualSelection(this.multiCursorOnClick && e.ctrlKey);
      this.dragging = true;
      this.lastMoveEvent = false;
      this.disableAtomicSoftTabs();
      this.autoscrollOnMouseDrag();
      this.mouseStart = this.screenPositionForMouseEvent(e);
      if (!this.mouseStart) return;
    }
  },

  /**
   * Handles mouse up events to finalize selection.
   * @param {MouseEvent} e - The mouse event
   */
  mouseUp(e) {
    if (this.pickerFlag) {
      if (!this.findEditor(e)) {
        this.restoreAtomicSoftTabs();
        this.picker();
        return;
      } else if (e.which === 1) {
        if (this.pickerFlag === 1) {
          this.saveActualSelection(this.multiCursorOnClick && e.ctrlKey);
          this.mouseEnd = this.screenPositionForMouseEvent(e);
          if (!this.mouseEnd) return;
          this.selectBox();
          this.restoreAtomicSoftTabs();
          this.picker();
          this.reset();
        } else {
          this.pickerFlag = 1;
          this.mouseStart = this.screenPositionForMouseEvent(e);
          if (!this.mouseStart) return;
        }
      } else if (e.which === 3) {
        this.context = true;
        this.restoreAtomicSoftTabs();
        this.picker();
        this.reset();
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    } else if (this.editor) {
      this.editorRestoreLineDecoration();
      this.editorRemoveColumnSelectionClass();
      this.restoreAtomicSoftTabs();
      this.reset();
      e.preventDefault();
      e.stopPropagation();
    }
    this.dragging = false;
  },

  /**
   * Handles mouse move events during selection.
   * @param {MouseEvent} e - The mouse event
   */
  mouseMove(e) {
    if (this.editor && !this.pickerFlag) {
      this.editorRemoveLineDecoration();
      this.editorAddColumnSelectionClass();
      this.context = true;
      this.lastMoveEvent = e;
      this.selectBox(e);
      e.preventDefault();
      e.stopPropagation();
    }
  },

  /**
   * Handles scroll events during active selection.
   */
  scrollEvent() {
    if (this.editor && !this.pickerFlag && this.lastMoveEvent) {
      this.selectBox(this.lastMoveEvent);
    }
  },

  /**
   * Enables automatic scrolling while dragging near editor edges.
   */
  autoscrollOnMouseDrag() {
    window.requestAnimationFrame(() => {
      if (!this.editor || !this.dragging) {
        return;
      } else if (this.lastMoveEvent) {
        this.editor.component.autoscrollOnMouseDrag(this.lastMoveEvent);
      }
      this.autoscrollOnMouseDrag();
    });
  },

  /**
   * Handles context menu events to prevent default during selection.
   * @param {MouseEvent} e - The context menu event
   */
  contextMenu(e) {
    if (this.context) {
      this.context = false;
      e.preventDefault();
      e.stopPropagation();
    }
  },

  /**
   * Performs rectangular box selection between start and end positions.
   * @param {MouseEvent} [e] - Optional mouse event to update end position
   */
  selectBox(e) {
    if (!this.editor) {
      return;
    }
    if (e) {
      if (this.mouseEnd) {
        let mouseNew = this.screenPositionForMouseEvent(e);
        if (!mouseNew) return;
        if (mouseNew.row === this.mouseEnd.row && mouseNew.column === this.mouseEnd.column) {
          return;
        } else {
          this.mouseEnd = mouseNew;
        }
      } else {
        this.mouseEnd = this.screenPositionForMouseEvent(e);
        if (!this.mouseEnd) return;
      }
    }
    if (this.mouseStart && this.mouseEnd) {
      let zeroRanges = [];
      let realRanges = [];
      let reversed = this.mouseEnd.column < this.mouseStart.column;
      for (
        let { row } = this.mouseStart, end = this.mouseEnd.row, asc = this.mouseStart.row <= end;
        asc ? row <= end : row >= end;
        asc ? row++ : row--
      ) {
        let range = this.editor.bufferRangeForScreenRange([
          [row, this.mouseStart.column],
          [row, this.mouseEnd.column],
        ]);
        if (range.isEmpty()) {
          let pointStart = this.editor.screenPositionForBufferPosition(range.start);
          let pointEnd = this.editor.screenPositionForBufferPosition(range.end);
          if (reversed) {
            [pointStart, pointEnd] = [pointEnd, pointStart];
          }
          if (
            pointStart.column === this.mouseStart.column ||
            pointEnd.column === this.mouseEnd.column
          ) {
            if (pointStart.column === 0 && pointEnd.column === 0) {
              zeroRanges.push(range);
            } else {
              realRanges.push(range);
            }
          }
        } else {
          realRanges.push(range);
        }
      }
      let localRanges = realRanges.length ? realRanges : zeroRanges;

      if (!localRanges.length) {
        return;
      }

      // reuse old selections
      const selections = this.editor.getSelections();
      for (let selection of selections.slice(localRanges.length + this.selections.length)) {
        selection.destroy();
      }

      // like fn setSelectedBufferRanges
      this.editor.mergeIntersectingSelections({}, () => {
        for (let i = 0; i < this.selections.length; i++) {
          let actualRange = this.selections[i].range;
          let reversed = this.selections[i].reversed;
          if (selections[i]) {
            selections[i].setBufferRange(actualRange, { reversed });
          } else {
            this.editor.addSelectionForBufferRange(actualRange, { reversed });
          }
        }
        for (let i = 0; i < localRanges.length; i++) {
          if (selections[i + this.selections.length]) {
            selections[i + this.selections.length].setBufferRange(localRanges[i], { reversed });
          } else {
            this.editor.addSelectionForBufferRange(localRanges[i], {
              reversed,
            });
          }
        }
      });
    }
  },

  /**
   * Adds the column-selection CSS class to the editor element.
   */
  editorAddColumnSelectionClass() {
    if (!this.editor || this.selecting) {
      return;
    }
    this.selecting = true;
    this.editor.getElement().classList.add("column-selection");
  },

  /**
   * Removes the column-selection CSS class from the editor element.
   */
  editorRemoveColumnSelectionClass() {
    if (!this.editor || !this.selecting) {
      return;
    }
    this.selecting = false;
    this.editor.getElement().classList.remove("column-selection");
  },

  /**
   * Removes cursor line decorations during column selection.
   */
  editorRemoveLineDecoration() {
    if (!this.editor || this.selecting || !this.editor.cursorLineDecorations) {
      return;
    }
    for (let decoration of this.editor.cursorLineDecorations) {
      decoration.destroy();
    }
  },

  /**
   * Restores cursor line decorations after column selection ends.
   */
  editorRestoreLineDecoration() {
    if (!this.editor || !this.selecting) {
      return;
    }
    this.editor.decorateCursorLine();
  },

  /**
   * Saves the current selections to preserve when adding column selections.
   * @param {boolean} parse - Whether to parse and store existing selections
   */
  saveActualSelection(parse) {
    this.selections = [];
    if (parse) {
      for (let selection of this.editor.getSelections()) {
        this.selections.push({
          range: selection.getBufferRange(),
          reversed: selection.isReversed(),
        });
      }
    }
  },

  /**
   * Consumes the status bar service.
   * @param {Object} statusBar - The status bar service object
   */
  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    if (!atom.config.get("column-selection.statusBar")) {
      return;
    }
    this.activateStatusBar();
  },

  /**
   * Activates the status bar tile with selection mode indicators.
   */
  activateStatusBar() {
    if (!this.statusBar) {
      return;
    }
    this.switch = this.createSwitch();
    this.switch.stickyUpdate();
    this.switch.pickerUpdate();
    this.statusBar.addRightTile({ item: this.switch, priority: -90 });
  },

  /**
   * Deactivates and removes the status bar tile.
   */
  deactivateStatusBar() {
    if (!this.switch) {
      return;
    }
    this.switch.remove();
    this.switch = null;
  },

  /**
   * Creates the status bar switch element for mode toggling.
   * @returns {HTMLElement} The switch element with event handlers
   */
  createSwitch() {
    const element = document.createElement("div");
    element.classList.add("column-selection-icon", "inline-block");
    let iconSpan = document.createElement("span");
    iconSpan.classList.add("icon", "is-icon-only", "icon-three-bars");
    element.appendChild(iconSpan);
    element.onmouseup = (e) => {
      if (e.which === 1) {
        this.sticky();
      } else if (e.which === 3) {
        this.picker();
      }
    };
    element.stickyUpdate = () => {
      if (this.stickyFlag) {
        iconSpan.classList.add("sticky");
      } else {
        iconSpan.classList.remove("sticky");
      }
    };
    element.pickerUpdate = () => {
      if (this.pickerFlag) {
        iconSpan.classList.add("picker");
      } else {
        iconSpan.classList.remove("picker");
      }
    };
    return element;
  },
};

/**
 * Creates a throttled version of a function using requestAnimationFrame.
 * @param {Function} func - The function to throttle
 * @returns {Function} The throttled function
 */
function throttle(func) {
  let timer = false;
  return (...args) => {
    if (timer) {
      return;
    }
    func.apply(this, args);
    timer = requestAnimationFrame(() => {
      timer = false;
    });
  };
}
