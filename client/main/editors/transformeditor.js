'use strict';

const $ = require('jquery');
const keyboardJS = require('keyboardjs');
const opsDropDown = require('./operatordropdown');
const tarp = require('../utils/tarp');

const TransformEditor = function(dataset) {

    this.dataset = dataset;

    this.$el = $('<div class="jmv-transform-editor"></div>');

    this.title = 'TRANSFORM';

    this._exampleFormulas = [
        { s: ">", a: "2000", b: "'good'" },
        { s: "<=", a: "1000", b: "A" },
        { s: "==", a: "5", b: "B" },
        { s: "<", a: "17000", b: "'Male'" },
        { s: ">=", a: "1", b: "'Early'" },
        { s: "=", a: "'tom'", b: "'medium'" }
    ];

    this.model = { };

    this._init = function() {
        this.dataset.on('change:editingTrans', this._populate, this);
        this.dataset.on('dataSetLoaded', this._dataSetLoaded, this);

        opsDropDown.init();

        this.formula = [ '' ];

        this.$top = $('<div class="jmv-transform-editor-top"></div>').appendTo(this.$el);
        this.$title = $('<input class="jmv-variable-editor-widget-title" type="text" maxlength="63">').appendTo(this.$top);
        this.$description = $('<div class="jmv-variable-editor-widget-description" type="text" placeholder="Description" contenteditable="true">').appendTo(this.$top);

        this.setInputEvents = function($element, isDiv, propertyName) {
            let _applyOnBlur = true;
            $element.focus(() => {
                keyboardJS.pause('');
                $element.select();
            } );

            $element.blur(() => {
                if (_applyOnBlur) {
                    keyboardJS.resume();
                    let id = this.dataset.get('editingTrans');
                    let values = { };
                    if (isDiv)
                        values[propertyName] = $element[0].textContent;
                    else
                        values[propertyName] = $element.val();
                    this.dataset.setTransforms([{ id: id, values: values }]).then(() => {
                        this._populate();
                    });
                }
                _applyOnBlur = true;
            } );

            $element.keydown((event) => {
                var keypressed = event.keyCode || event.which;
                if (keypressed === 13) { // enter key
                    $element.blur();
                    event.preventDefault();
                    event.stopPropagation();
                }
                else if (keypressed === 27) { // escape key
                    _applyOnBlur = false;
                    $element.blur();
                    let id = this.dataset.get('editingTrans');
                    let value = this.dataset.getTransformById(id)[propertyName];
                    if (isDiv)
                        $element[0].textContent = value;
                    else
                        $element.val(value);
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
        };

        this.setInputEvents(this.$title, false, 'name');
        this.setInputEvents(this.$description, true, 'description');

        this.$contents = $('<div class="contents"></div>').appendTo(this.$el);

        let $insertBox = $('<div class="insert-box"></div>').appendTo(this.$contents);
        let $insert = $('<div class="insert button"></div>').appendTo($insertBox);

        $insert.on('click', (event) => {
            this._focusFormulaControls();
            this.formula.splice(this.formula.length - 1, 0, '', '');
            this._addTransformUIItem('', '');
            this._updateLastFormulaTag();
        });

        this.$options = $('<div class="jmv-transform-editor-options"></div>').appendTo(this.$contents);

        let $rightBox = $('<div class="right-box"></div>').appendTo(this.$contents);
        let $moveup = $('<div class="move-up button"><span class="mif-arrow-up"></span></div>').appendTo($rightBox);
        let $movedown = $('<div class="move-down button"><span class="mif-arrow-down"></span></div>').appendTo($rightBox);

        let elements3 = this._addTransformUIItem('');

        $(window).on('keydown', event => {
            if ( ! this.$contents.hasClass('super-focus'))
                return;

            let undo = event.key === 'Escape';
            if (event.key === 'Escape' || event.key === 'Enter') {
                if (undo) {
                    this.formula = this._undoFormula;
                    this._createFormulaUI();
                }
                tarp.hide('recode-formula');
            }
        });


        this.$bottom = $('<div class="jmv-transform-editor-bottom"></div>').appendTo(this.$el);
        this.$connectionInfo = $('<div class="jmv-transform-editor-widget-info">This transform is being used by 3 variables.</div>').appendTo(this.$bottom);
        this.$viewConnectionInfo = $('<div class="view-button">View</div>').appendTo(this.$bottom);
    };

    this._focusFormulaControls = function() {
        if (this.$contents.hasClass('super-focus'))
            return;

        this._undoFormula = this.formula.slice();

        this.$contents.addClass('super-focus');
        tarp.show('recode-formula', true, 0.1, 299).then(() => {
            this.$contents.removeClass('super-focus');
            this._applyFormula();
        }, () => {
            this.$contents.removeClass('super-focus');
            this._applyFormula();
        });
    };

    this._addTransformUIItem = function(formula1, formula2) {
        let hasCondition = formula2 !== undefined;

        let tag = 'if value';
        if ( ! hasCondition) {
            if (this.formula.length === 1)
                tag = '=';
            else
                tag = 'else use';
        }

        let elements = this._createFormulaBox(this.$options, tag, hasCondition, formula1);
        let $formula = elements.$formula;
        let $formulaMessage = elements.$formulaMessage;

        $formula.on('input', (event) => {
            //this.model.set('formula', this.$formula[0].textContent);
            opsDropDown.hide();
        });
        $formula.on('editor:closing', () => {
            elements.$showEditor.removeClass('is-active');
        });
        //this.model.on('change:formula', (event) => this._setFormula(event.changed.formula));
        //this.model.on('change:formulaMessage', (event) => this._setFormulaMessage(event.changed.formulaMessage));

        if (hasCondition) {
            this._createSubFormula(elements.$formulaBox, 'use', false, formula2, 1);
            this._createFormulaButtons(elements.$formulaBox);
        }
    };

    this._updateLastFormulaTag = function() {
        let $equal = this.$options.find('.recode-else .equal');
        let $formula = this.$options.find('.recode-else .formula');
        let tag = '=';
        if (this.formula.length > 1)
            tag = 'else use';

        let indent = (tag.length + 1) + 'ch';
        $formula.css('text-indent', indent);
        $equal.html(tag);
    };

    this._applyFormula = function() {
        if (this._applyId)
            clearTimeout(this._applyId);

        this._applyId = setTimeout(() => {
            let id = this.dataset.get('editingTrans');
            let values = { formula: this.formula };
            this._applyId = null;
            this.dataset.setTransforms([{ id: id, values: values }]);
        }, 0);
    };

    this._createFormulaUI = function() {
        this.$options.empty();
        for (let i = 0; i < this.formula.length; i += 2)
            this._addTransformUIItem(this.formula[i], this.formula[i+1]);
    };

    this._populate = function(event) {
        let id = this.dataset.get('editingTrans');
        if (id !== null) {
            let transform = this.dataset.getTransformById(id);
            if (transform) {
                this.$title.val(transform.name);
                this.$description[0].textContent = transform.description;

                let updateFormula = false;
                if ( ! this.formula || this.formula.length !== transform.formula.length)
                     updateFormula = true;
                else {
                    for (let i = 0; i < this.formula.length; i++) {
                        if (this.formula[i] !== transform.formula[i]) {
                            updateFormula = true;
                            break;
                        }
                    }
                }
                this.formula = transform.formula;
                if (updateFormula)
                    this._createFormulaUI();

                return;
            }
        }

        this.$title.html('');
        this.$description.html('');
    };
    this._dataSetLoaded = function(event) {
        this._populate(event);
    };

    this._removeCondition = function($formulaBox) {
        this._focusFormulaControls();
        let condIndex = $formulaBox.index();
        let index = condIndex * 2;
        this.formula.splice(index, 2);
        $formulaBox.remove();
        this._updateLastFormulaTag();
    };

    this._createFormulaButtons = function($formulaBox) {
        let $rm = $('<div class="remove-cond" data-index="0"><span class="mif-cross"></span></div>').appendTo($formulaBox);
        $rm.on('click', (event) => {
            this._removeCondition($formulaBox);
        });
        //let $ro = $('<div class="reorder-cond" data-index="0"></div>').appendTo($formulaBox);
    };
    this._createFormulaBox = function($parent, prefix, isCondition, formula) {
        let indent = (prefix.length + 1) + 'ch';

        let $elseBox = $parent.find('.recode-else');
        let className = 'recode-if';
        if ( ! isCondition)
            className = 'recode-else';

        let $formulaBox = $('<div class="formula-box ' + className + '"></div>');//.appendTo($parent);

        if ($elseBox.length > 0) {
            if ( ! isCondition)
                throw 'The else statement ui already exists';

            $formulaBox.insertBefore($elseBox);
        }
        else
            $parent.append($formulaBox);

        let $showEditor = $('<div class="show-editor" title="Show formula editor"><div class="down-arrow"></div></div>').appendTo($formulaBox);

        let $formulaList = $('<div class="formula-list"></div>').appendTo($formulaBox);

        let elements = this._createSubFormula($formulaBox, prefix, isCondition, formula, 0);

        elements.$showEditor = $showEditor;

        return elements;
    };
    this._startsWithValidOps = function($formula) {
        let validOps = ['==', '=', '<=', '>=', '<', '>'];

        let text = $formula.text().trim();

        if (text === '') {
            text = $formula.attr('placeholder');
        }

        for (let i = 0; i < validOps.length; i++) {
            if (text.startsWith(validOps[i])) {
                let count = validOps[i].length;
                if (count < text.length && text[count] !== ' ') {

                    let startPosition = $formula[0].selectionStart;
                    let endPosition = $formula[0].selectionEnd;

                    text = text.slice(0, count) + ' ' + text.slice(count);
                    $formula.text(text);
                }
                return validOps[i].length;

            }
        }

        return 0;
    };
    this._createSubFormula = function($formulaBox, prefix, hasOp, formula, index) {

        let indent = (prefix.length + 1) + 'ch';

        if (hasOp === undefined)
            hasOp = false;

        let elements = { };
        elements.$formulaBox = $formulaBox;

        let $formulaList = $formulaBox.find('.formula-list');
        let $formulaPair = $('<div class="formula-pair"></div>').appendTo($formulaList);

        let _example = this._exampleFormulas[Math.floor(Math.random() * Math.floor(this._exampleFormulas.length - 1))].b;
        let _sign = '';
        if (hasOp) {
            _example = this._exampleFormulas[Math.floor(Math.random() * Math.floor(this._exampleFormulas.length - 1))].a;
            _sign = this._exampleFormulas[Math.floor(Math.random() * Math.floor(this._exampleFormulas.length - 1))].s + ' ';
        }

        let $fp = $('<div class="formula-list-item"></div>').appendTo($formulaPair);
        elements.$formula = $('<div class="formula" type="text" placeholder="' + _sign + 'e.g. ' + _example + '" contenteditable="true" data-index="' + index + '" style="text-indent:' + indent + '">' + formula + '</div>').appendTo($fp);
        $('<div class="equal">' + prefix + '</div>').appendTo($fp);

        let $opEdit = null;

        elements.$formula.on('blur', (event) => {
            this.formula[($formulaBox.index() * 2) + index] = elements.$formula[0].textContent;
            if (hasOp && this._editorClicked === false)
                $opEdit.hide();
        });

        elements.$formula.on('focus', (event) => {
            this._focusFormulaControls();
            if (hasOp)
                $opEdit.show();
        });

        if (hasOp) {
            $opEdit = $('<div class="down-arrow">a</div>').appendTo($fp);
            $opEdit.css('width', _sign.length + 'ch');
            $opEdit.hide();

            elements.$formula.on('input', (event) => {
                let count = this._startsWithValidOps(elements.$formula);
                if (count !== 0)
                    $opEdit.css('width', (count+1) + 'ch');
            });

            $opEdit.on('click', (event) => {
                if (this._$wasEditingFormula !== elements.$formula) {
                    opsDropDown.show(elements.$formula, null, false);

                    let sel = window.getSelection();
                    /*let range = sel.getRangeAt(0);
                    let start = range.startOffset;
                    let end = range.endOffset;
                    let text = el.textContent;
                    let before = text.substring(0, start);
                    let after  = text.substring(end, text.length);*/

                    let count = this._startsWithValidOps(elements.$formula);

                    /*let textSelected = text.substring(start, end);
                    el.textContent = (before + newText + after);*/
                    sel.setBaseAndExtent(elements.$formula[0].firstChild, 0, elements.$formula[0].firstChild, count);
                    elements.$formula[0].focus();
                    //elements.$formula.focus();
                    $opEdit.addClass('is-active');
                }
                event.stopPropagation();
                event.preventDefault();
            });

            $opEdit.on('mousedown', (event) => {
                this._$wasEditingFormula = opsDropDown.focusedOn();
                this._editorClicked = true;
            });

            elements.$formula.on('editor:closing', () => {
                $opEdit.removeClass('is-active');
            });

            elements.$formula.on('input', (event) => {
                opsDropDown.updatePosition();
            });
        }

        elements.$formula.focus(() => {
            keyboardJS.pause();
        });
        elements.$formula.blur((event) => {
            if (this._isRealBlur()) {
                this._editorClicked = false;
                return;
            }

            keyboardJS.resume();
        });
        elements.$formula.on('keydown', (event) => {
            if (event.keyCode === 13 && event.shiftKey === false) {    //enter
                elements.$formula.blur();
                event.preventDefault();
            }

            if (event.keyCode === 9) {    //tab
                event.preventDefault();
            }
        });

        let $formulaMessageBox = $('<div class="formulaMessageBox""></div>').appendTo($formulaPair);
        elements.$formulaMessage = $('<div class="formulaMessage""></div>').appendTo($formulaMessageBox);

        return elements;
    };
    this._isRealBlur = function() {
        return opsDropDown.clicked() || this._editorClicked;
    };

    this._init();
};

module.exports = TransformEditor;
