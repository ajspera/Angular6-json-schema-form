import * as tslib_1 from "tslib";
import cloneDeep from 'lodash/cloneDeep';
import map from 'lodash/map';
import { addClasses, inArray } from '../../shared';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { JsonSchemaFormService } from '../../json-schema-form.service';
/**
 * Bootstrap 3 framework for Angular JSON Schema Form.
 *
 */
let Bootstrap3FrameworkComponent = class Bootstrap3FrameworkComponent {
    constructor(changeDetector, jsf) {
        this.changeDetector = changeDetector;
        this.jsf = jsf;
        this.frameworkInitialized = false;
        this.formControl = null;
        this.debugOutput = '';
        this.debug = '';
        this.parentArray = null;
        this.isOrderable = false;
    }
    get showRemoveButton() {
        if (!this.options.removable || this.options.readonly ||
            this.layoutNode.type === '$ref') {
            return false;
        }
        if (this.layoutNode.recursiveReference) {
            return true;
        }
        if (!this.layoutNode.arrayItem || !this.parentArray) {
            return false;
        }
        // If array length <= minItems, don't allow removing any items
        return this.parentArray.items.length - 1 <= this.parentArray.options.minItems ? false :
            // For removable list items, allow removing any item
            this.layoutNode.arrayItemType === 'list' ? true :
                // For removable tuple items, only allow removing last item in list
                this.layoutIndex[this.layoutIndex.length - 1] === this.parentArray.items.length - 2;
    }
    ngOnInit() {
        this.initializeFramework();
        if (this.layoutNode.arrayItem && this.layoutNode.type !== '$ref') {
            this.parentArray = this.jsf.getParentNode(this);
            if (this.parentArray) {
                this.isOrderable = this.layoutNode.arrayItemType === 'list' &&
                    !this.options.readonly && this.parentArray.options.orderable;
            }
        }
    }
    ngOnChanges() {
        if (!this.frameworkInitialized) {
            this.initializeFramework();
        }
    }
    initializeFramework() {
        if (this.layoutNode) {
            this.options = cloneDeep(this.layoutNode.options);
            this.widgetLayoutNode = Object.assign({}, this.layoutNode, { options: cloneDeep(this.layoutNode.options) });
            this.widgetOptions = this.widgetLayoutNode.options;
            this.formControl = this.jsf.getFormControl(this);
            this.options.isInputWidget = inArray(this.layoutNode.type, [
                'button', 'checkbox', 'checkboxes-inline', 'checkboxes', 'color',
                'date', 'datetime-local', 'datetime', 'email', 'file', 'hidden',
                'image', 'integer', 'month', 'number', 'password', 'radio',
                'radiobuttons', 'radios-inline', 'radios', 'range', 'reset', 'search',
                'select', 'submit', 'tel', 'text', 'textarea', 'time', 'url', 'week'
            ]);
            this.options.title = this.setTitle();
            this.options.htmlClass =
                addClasses(this.options.htmlClass, 'schema-form-' + this.layoutNode.type);
            if (this.layoutNode.type !== 'flex') {
                this.options.htmlClass =
                    this.layoutNode.type === 'array' ?
                        addClasses(this.options.htmlClass, 'list-group') :
                        this.layoutNode.arrayItem && this.layoutNode.type !== '$ref' ?
                            addClasses(this.options.htmlClass, 'list-group-item') :
                            addClasses(this.options.htmlClass, 'form-group');
            }
            this.widgetOptions.htmlClass = '';
            this.options.labelHtmlClass =
                addClasses(this.options.labelHtmlClass, 'control-label');
            this.widgetOptions.activeClass =
                addClasses(this.widgetOptions.activeClass, 'active');
            this.options.fieldAddonLeft =
                this.options.fieldAddonLeft || this.options.prepend;
            this.options.fieldAddonRight =
                this.options.fieldAddonRight || this.options.append;
            // Add asterisk to titles if required
            if (this.options.title && this.layoutNode.type !== 'tab' &&
                !this.options.notitle && this.options.required &&
                !this.options.title.includes('*')) {
                this.options.title += ' <strong class="text-danger">*</strong>';
            }
            // Set miscelaneous styles and settings for each control type
            switch (this.layoutNode.type) {
                // Checkbox controls
                case 'checkbox':
                case 'checkboxes':
                    this.widgetOptions.htmlClass = addClasses(this.widgetOptions.htmlClass, 'checkbox');
                    break;
                case 'checkboxes-inline':
                    this.widgetOptions.htmlClass = addClasses(this.widgetOptions.htmlClass, 'checkbox');
                    this.widgetOptions.itemLabelHtmlClass = addClasses(this.widgetOptions.itemLabelHtmlClass, 'checkbox-inline');
                    break;
                // Radio controls
                case 'radio':
                case 'radios':
                    this.widgetOptions.htmlClass = addClasses(this.widgetOptions.htmlClass, 'radio');
                    break;
                case 'radios-inline':
                    this.widgetOptions.htmlClass = addClasses(this.widgetOptions.htmlClass, 'radio');
                    this.widgetOptions.itemLabelHtmlClass = addClasses(this.widgetOptions.itemLabelHtmlClass, 'radio-inline');
                    break;
                // Button sets - checkboxbuttons and radiobuttons
                case 'checkboxbuttons':
                case 'radiobuttons':
                    this.widgetOptions.htmlClass = addClasses(this.widgetOptions.htmlClass, 'btn-group');
                    this.widgetOptions.itemLabelHtmlClass = addClasses(this.widgetOptions.itemLabelHtmlClass, 'btn');
                    this.widgetOptions.itemLabelHtmlClass = addClasses(this.widgetOptions.itemLabelHtmlClass, this.options.style || 'btn-default');
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, 'sr-only');
                    break;
                // Single button controls
                case 'button':
                case 'submit':
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, 'btn');
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, this.options.style || 'btn-info');
                    break;
                // Containers - arrays and fieldsets
                case 'array':
                case 'fieldset':
                case 'section':
                case 'conditional':
                case 'advancedfieldset':
                case 'authfieldset':
                case 'selectfieldset':
                case 'optionfieldset':
                    this.options.messageLocation = 'top';
                    break;
                case 'tabarray':
                case 'tabs':
                    this.widgetOptions.htmlClass = addClasses(this.widgetOptions.htmlClass, 'tab-content');
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, 'tab-pane');
                    this.widgetOptions.labelHtmlClass = addClasses(this.widgetOptions.labelHtmlClass, 'nav nav-tabs');
                    break;
                // 'Add' buttons - references
                case '$ref':
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, 'btn pull-right');
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, this.options.style || 'btn-default');
                    this.options.icon = 'glyphicon glyphicon-plus';
                    break;
                // Default - including regular inputs
                default:
                    this.widgetOptions.fieldHtmlClass = addClasses(this.widgetOptions.fieldHtmlClass, 'form-control');
            }
            if (this.formControl) {
                this.updateHelpBlock(this.formControl.status);
                this.formControl.statusChanges.subscribe(status => this.updateHelpBlock(status));
                if (this.options.debug) {
                    const vars = [];
                    this.debugOutput = map(vars, thisVar => JSON.stringify(thisVar, null, 2)).join('\n');
                }
            }
            this.frameworkInitialized = true;
        }
    }
    updateHelpBlock(status) {
        this.options.helpBlock = status === 'INVALID' &&
            this.options.enableErrorState && this.formControl.errors &&
            (this.formControl.dirty || this.options.feedbackOnRender) ?
            this.jsf.formatErrors(this.formControl.errors, this.options.validationMessages) :
            this.options.description || this.options.help || null;
    }
    setTitle() {
        switch (this.layoutNode.type) {
            case 'button':
            case 'checkbox':
            case 'section':
            case 'help':
            case 'msg':
            case 'submit':
            case 'message':
            case 'tabarray':
            case 'tabs':
            case '$ref':
                return null;
            case 'advancedfieldset':
                this.widgetOptions.expandable = true;
                this.widgetOptions.title = 'Advanced options';
                return null;
            case 'authfieldset':
                this.widgetOptions.expandable = true;
                this.widgetOptions.title = 'Authentication settings';
                return null;
            case 'fieldset':
                this.widgetOptions.title = this.options.title;
                return null;
            default:
                this.widgetOptions.title = null;
                return this.jsf.setItemTitle(this);
        }
    }
    removeItem() {
        this.jsf.removeItem(this);
    }
};
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object)
], Bootstrap3FrameworkComponent.prototype, "layoutNode", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Array)
], Bootstrap3FrameworkComponent.prototype, "layoutIndex", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Array)
], Bootstrap3FrameworkComponent.prototype, "dataIndex", void 0);
Bootstrap3FrameworkComponent = tslib_1.__decorate([
    Component({
        // tslint:disable-next-line:component-selector
        selector: 'bootstrap-3-framework',
        template: `
    <div
      [class]="options?.htmlClass || ''"
      [class.has-feedback]="options?.feedback && options?.isInputWidget &&
        (formControl?.dirty || options?.feedbackOnRender)"
      [class.has-error]="options?.enableErrorState && formControl?.errors &&
        (formControl?.dirty || options?.feedbackOnRender)"
      [class.has-success]="options?.enableSuccessState && !formControl?.errors &&
        (formControl?.dirty || options?.feedbackOnRender)">

      <button *ngIf="showRemoveButton"
        class="close pull-right"
        type="button"
        (click)="removeItem()">
        <span aria-hidden="true">&times;</span>
        <span class="sr-only">Close</span>
      </button>
      <div *ngIf="options?.messageLocation === 'top'">
          <p *ngIf="options?.helpBlock"
          class="help-block"
          [innerHTML]="options?.helpBlock"></p>
      </div>

      <label *ngIf="options?.title && layoutNode?.type !== 'tab'"
        [attr.for]="'control' + layoutNode?._id"
        [class]="options?.labelHtmlClass || ''"
        [class.sr-only]="options?.notitle"
        [innerHTML]="options?.title"></label>
      <p *ngIf="layoutNode?.type === 'submit' && jsf?.formOptions?.fieldsRequired">
        <strong class="text-danger">*</strong> = required fields
      </p>
      <div [class.input-group]="options?.fieldAddonLeft || options?.fieldAddonRight">
        <span *ngIf="options?.fieldAddonLeft"
          class="input-group-addon"
          [innerHTML]="options?.fieldAddonLeft"></span>

        <select-widget-widget
          [layoutNode]="widgetLayoutNode"
          [dataIndex]="dataIndex"
          [layoutIndex]="layoutIndex"></select-widget-widget>

        <span *ngIf="options?.fieldAddonRight"
          class="input-group-addon"
          [innerHTML]="options?.fieldAddonRight"></span>
      </div>

      <span *ngIf="options?.feedback && options?.isInputWidget &&
          !options?.fieldAddonRight && !layoutNode.arrayItem &&
          (formControl?.dirty || options?.feedbackOnRender)"
        [class.glyphicon-ok]="options?.enableSuccessState && !formControl?.errors"
        [class.glyphicon-remove]="options?.enableErrorState && formControl?.errors"
        aria-hidden="true"
        class="form-control-feedback glyphicon"></span>
      <div *ngIf="options?.messageLocation !== 'top'">
        <p *ngIf="options?.helpBlock"
          class="help-block"
          [innerHTML]="options?.helpBlock"></p>
      </div>
    </div>

    <div *ngIf="debug && debugOutput">debug: <pre>{{debugOutput}}</pre></div>
  `,
        styles: [`
    :host /deep/ .list-group-item .form-control-feedback { top: 40; }
    :host /deep/ .checkbox,
    :host /deep/ .radio { margin-top: 0; margin-bottom: 0; }
    :host /deep/ .checkbox-inline,
    :host /deep/ .checkbox-inline + .checkbox-inline,
    :host /deep/ .checkbox-inline + .radio-inline,
    :host /deep/ .radio-inline,
    :host /deep/ .radio-inline + .radio-inline,
    :host /deep/ .radio-inline + .checkbox-inline { margin-left: 0; margin-right: 10px; }
    :host /deep/ .checkbox-inline:last-child,
    :host /deep/ .radio-inline:last-child { margin-right: 0; }
    :host /deep/ .ng-invalid.ng-touched { border: 1px solid #f44336; }
  `]
    }),
    tslib_1.__metadata("design:paramtypes", [ChangeDetectorRef,
        JsonSchemaFormService])
], Bootstrap3FrameworkComponent);
export { Bootstrap3FrameworkComponent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLTMtZnJhbWV3b3JrLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2FuZ3VsYXI2LWpzb24tc2NoZW1hLWZvcm0vIiwic291cmNlcyI6WyJsaWIvZnJhbWV3b3JrLWxpYnJhcnkvYm9vdHN0cmFwLTMtZnJhbWV3b3JrL2Jvb3RzdHJhcC0zLWZyYW1ld29yay5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sU0FBUyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sR0FBRyxNQUFNLFlBQVksQ0FBQztBQUM3QixPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNuRCxPQUFPLEVBQ0wsaUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxLQUFLLEVBR0osTUFBTSxlQUFlLENBQUM7QUFDekIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJdkU7OztHQUdHO0FBaUZILElBQWEsNEJBQTRCLEdBQXpDLE1BQWEsNEJBQTRCO0lBY3ZDLFlBQ1MsY0FBaUMsRUFDakMsR0FBMEI7UUFEMUIsbUJBQWMsR0FBZCxjQUFjLENBQW1CO1FBQ2pDLFFBQUcsR0FBSCxHQUFHLENBQXVCO1FBZm5DLHlCQUFvQixHQUFHLEtBQUssQ0FBQztRQUk3QixnQkFBVyxHQUFRLElBQUksQ0FBQztRQUN4QixnQkFBVyxHQUFRLEVBQUUsQ0FBQztRQUN0QixVQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ2hCLGdCQUFXLEdBQVEsSUFBSSxDQUFDO1FBQ3hCLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBUWhCLENBQUM7SUFFTCxJQUFJLGdCQUFnQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRO1lBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFDL0I7WUFBRSxPQUFPLEtBQUss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QUksQ0FBQztZQUNkO2dCQUNFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDaEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QztJQUNILENBQUM7SUFFRCxVQUFVO1FBQ1IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNGLENBQUE7QUExTVU7SUFBUixLQUFLLEVBQUU7O2dFQUFpQjtBQUNoQjtJQUFSLEtBQUssRUFBRTs7aUVBQXVCO0FBQ3RCO0lBQVIsS0FBSyxFQUFFOzsrREFBcUI7QUFabEIsNEJBQTRCO0lBaEZ4QyxTQUFTLENBQUM7UUFDVCw4Q0FBOEM7UUFDOUMsUUFBUSxFQUFFLHVCQUF1QjtRQUNqQyxRQUFRLEVBQUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E2RFQ7aUJBQ1E7Ozs7Ozs7Ozs7Ozs7R0FhUjtLQUNGLENBQUM7NkNBZ0J5QixpQkFBaUI7UUFDNUIscUJBQXFCO0dBaEJ4Qiw0QkFBNEIsQ0FvTnhDO1NBcE5ZLDRCQUE0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjbG9uZURlZXAgZnJvbSAnbG9kYXNoL2Nsb25lRGVlcCc7XG5pbXBvcnQgbWFwIGZyb20gJ2xvZGFzaC9tYXAnO1xuaW1wb3J0IHsgYWRkQ2xhc3NlcywgaW5BcnJheSB9IGZyb20gJy4uLy4uL3NoYXJlZCc7XG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29tcG9uZW50LFxuICBJbnB1dCxcbiAgT25DaGFuZ2VzLFxuICBPbkluaXRcbiAgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEpzb25TY2hlbWFGb3JtU2VydmljZSB9IGZyb20gJy4uLy4uL2pzb24tc2NoZW1hLWZvcm0uc2VydmljZSc7XG5cblxuXG4vKipcbiAqIEJvb3RzdHJhcCAzIGZyYW1ld29yayBmb3IgQW5ndWxhciBKU09OIFNjaGVtYSBGb3JtLlxuICpcbiAqL1xuQENvbXBvbmVudCh7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjb21wb25lbnQtc2VsZWN0b3JcbiAgc2VsZWN0b3I6ICdib290c3RyYXAtMy1mcmFtZXdvcmsnLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxkaXZcbiAgICAgIFtjbGFzc109XCJvcHRpb25zPy5odG1sQ2xhc3MgfHwgJydcIlxuICAgICAgW2NsYXNzLmhhcy1mZWVkYmFja109XCJvcHRpb25zPy5mZWVkYmFjayAmJiBvcHRpb25zPy5pc0lucHV0V2lkZ2V0ICYmXG4gICAgICAgIChmb3JtQ29udHJvbD8uZGlydHkgfHwgb3B0aW9ucz8uZmVlZGJhY2tPblJlbmRlcilcIlxuICAgICAgW2NsYXNzLmhhcy1lcnJvcl09XCJvcHRpb25zPy5lbmFibGVFcnJvclN0YXRlICYmIGZvcm1Db250cm9sPy5lcnJvcnMgJiZcbiAgICAgICAgKGZvcm1Db250cm9sPy5kaXJ0eSB8fCBvcHRpb25zPy5mZWVkYmFja09uUmVuZGVyKVwiXG4gICAgICBbY2xhc3MuaGFzLXN1Y2Nlc3NdPVwib3B0aW9ucz8uZW5hYmxlU3VjY2Vzc1N0YXRlICYmICFmb3JtQ29udHJvbD8uZXJyb3JzICYmXG4gICAgICAgIChmb3JtQ29udHJvbD8uZGlydHkgfHwgb3B0aW9ucz8uZmVlZGJhY2tPblJlbmRlcilcIj5cblxuICAgICAgPGJ1dHRvbiAqbmdJZj1cInNob3dSZW1vdmVCdXR0b25cIlxuICAgICAgICBjbGFzcz1cImNsb3NlIHB1bGwtcmlnaHRcIlxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgKGNsaWNrKT1cInJlbW92ZUl0ZW0oKVwiPlxuICAgICAgICA8c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIj4mdGltZXM7PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInNyLW9ubHlcIj5DbG9zZTwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgICAgPGRpdiAqbmdJZj1cIm9wdGlvbnM/Lm1lc3NhZ2VMb2NhdGlvbiA9PT0gJ3RvcCdcIj5cbiAgICAgICAgICA8cCAqbmdJZj1cIm9wdGlvbnM/LmhlbHBCbG9ja1wiXG4gICAgICAgICAgY2xhc3M9XCJoZWxwLWJsb2NrXCJcbiAgICAgICAgICBbaW5uZXJIVE1MXT1cIm9wdGlvbnM/LmhlbHBCbG9ja1wiPjwvcD5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8bGFiZWwgKm5nSWY9XCJvcHRpb25zPy50aXRsZSAmJiBsYXlvdXROb2RlPy50eXBlICE9PSAndGFiJ1wiXG4gICAgICAgIFthdHRyLmZvcl09XCInY29udHJvbCcgKyBsYXlvdXROb2RlPy5faWRcIlxuICAgICAgICBbY2xhc3NdPVwib3B0aW9ucz8ubGFiZWxIdG1sQ2xhc3MgfHwgJydcIlxuICAgICAgICBbY2xhc3Muc3Itb25seV09XCJvcHRpb25zPy5ub3RpdGxlXCJcbiAgICAgICAgW2lubmVySFRNTF09XCJvcHRpb25zPy50aXRsZVwiPjwvbGFiZWw+XG4gICAgICA8cCAqbmdJZj1cImxheW91dE5vZGU/LnR5cGUgPT09ICdzdWJtaXQnICYmIGpzZj8uZm9ybU9wdGlvbnM/LmZpZWxkc1JlcXVpcmVkXCI+XG4gICAgICAgIDxzdHJvbmcgY2xhc3M9XCJ0ZXh0LWRhbmdlclwiPio8L3N0cm9uZz4gPSByZXF1aXJlZCBmaWVsZHNcbiAgICAgIDwvcD5cbiAgICAgIDxkaXYgW2NsYXNzLmlucHV0LWdyb3VwXT1cIm9wdGlvbnM/LmZpZWxkQWRkb25MZWZ0IHx8IG9wdGlvbnM/LmZpZWxkQWRkb25SaWdodFwiPlxuICAgICAgICA8c3BhbiAqbmdJZj1cIm9wdGlvbnM/LmZpZWxkQWRkb25MZWZ0XCJcbiAgICAgICAgICBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCJcbiAgICAgICAgICBbaW5uZXJIVE1MXT1cIm9wdGlvbnM/LmZpZWxkQWRkb25MZWZ0XCI+PC9zcGFuPlxuXG4gICAgICAgIDxzZWxlY3Qtd2lkZ2V0LXdpZGdldFxuICAgICAgICAgIFtsYXlvdXROb2RlXT1cIndpZGdldExheW91dE5vZGVcIlxuICAgICAgICAgIFtkYXRhSW5kZXhdPVwiZGF0YUluZGV4XCJcbiAgICAgICAgICBbbGF5b3V0SW5kZXhdPVwibGF5b3V0SW5kZXhcIj48L3NlbGVjdC13aWRnZXQtd2lkZ2V0PlxuXG4gICAgICAgIDxzcGFuICpuZ0lmPVwib3B0aW9ucz8uZmllbGRBZGRvblJpZ2h0XCJcbiAgICAgICAgICBjbGFzcz1cImlucHV0LWdyb3VwLWFkZG9uXCJcbiAgICAgICAgICBbaW5uZXJIVE1MXT1cIm9wdGlvbnM/LmZpZWxkQWRkb25SaWdodFwiPjwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8c3BhbiAqbmdJZj1cIm9wdGlvbnM/LmZlZWRiYWNrICYmIG9wdGlvbnM/LmlzSW5wdXRXaWRnZXQgJiZcbiAgICAgICAgICAhb3B0aW9ucz8uZmllbGRBZGRvblJpZ2h0ICYmICFsYXlvdXROb2RlLmFycmF5SXRlbSAmJlxuICAgICAgICAgIChmb3JtQ29udHJvbD8uZGlydHkgfHwgb3B0aW9ucz8uZmVlZGJhY2tPblJlbmRlcilcIlxuICAgICAgICBbY2xhc3MuZ2x5cGhpY29uLW9rXT1cIm9wdGlvbnM/LmVuYWJsZVN1Y2Nlc3NTdGF0ZSAmJiAhZm9ybUNvbnRyb2w/LmVycm9yc1wiXG4gICAgICAgIFtjbGFzcy5nbHlwaGljb24tcmVtb3ZlXT1cIm9wdGlvbnM/LmVuYWJsZUVycm9yU3RhdGUgJiYgZm9ybUNvbnRyb2w/LmVycm9yc1wiXG4gICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgIGNsYXNzPVwiZm9ybS1jb250cm9sLWZlZWRiYWNrIGdseXBoaWNvblwiPjwvc3Bhbj5cbiAgICAgIDxkaXYgKm5nSWY9XCJvcHRpb25zPy5tZXNzYWdlTG9jYXRpb24gIT09ICd0b3AnXCI+XG4gICAgICAgIDxwICpuZ0lmPVwib3B0aW9ucz8uaGVscEJsb2NrXCJcbiAgICAgICAgICBjbGFzcz1cImhlbHAtYmxvY2tcIlxuICAgICAgICAgIFtpbm5lckhUTUxdPVwib3B0aW9ucz8uaGVscEJsb2NrXCI+PC9wPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG5cbiAgICA8ZGl2ICpuZ0lmPVwiZGVidWcgJiYgZGVidWdPdXRwdXRcIj5kZWJ1ZzogPHByZT57e2RlYnVnT3V0cHV0fX08L3ByZT48L2Rpdj5cbiAgYCxcbiAgc3R5bGVzOiBbYFxuICAgIDpob3N0IC9kZWVwLyAubGlzdC1ncm91cC1pdGVtIC5mb3JtLWNvbnRyb2wtZmVlZGJhY2sgeyB0b3A6IDQwOyB9XG4gICAgOmhvc3QgL2RlZXAvIC5jaGVja2JveCxcbiAgICA6aG9zdCAvZGVlcC8gLnJhZGlvIHsgbWFyZ2luLXRvcDogMDsgbWFyZ2luLWJvdHRvbTogMDsgfVxuICAgIDpob3N0IC9kZWVwLyAuY2hlY2tib3gtaW5saW5lLFxuICAgIDpob3N0IC9kZWVwLyAuY2hlY2tib3gtaW5saW5lICsgLmNoZWNrYm94LWlubGluZSxcbiAgICA6aG9zdCAvZGVlcC8gLmNoZWNrYm94LWlubGluZSArIC5yYWRpby1pbmxpbmUsXG4gICAgOmhvc3QgL2RlZXAvIC5yYWRpby1pbmxpbmUsXG4gICAgOmhvc3QgL2RlZXAvIC5yYWRpby1pbmxpbmUgKyAucmFkaW8taW5saW5lLFxuICAgIDpob3N0IC9kZWVwLyAucmFkaW8taW5saW5lICsgLmNoZWNrYm94LWlubGluZSB7IG1hcmdpbi1sZWZ0OiAwOyBtYXJnaW4tcmlnaHQ6IDEwcHg7IH1cbiAgICA6aG9zdCAvZGVlcC8gLmNoZWNrYm94LWlubGluZTpsYXN0LWNoaWxkLFxuICAgIDpob3N0IC9kZWVwLyAucmFkaW8taW5saW5lOmxhc3QtY2hpbGQgeyBtYXJnaW4tcmlnaHQ6IDA7IH1cbiAgICA6aG9zdCAvZGVlcC8gLm5nLWludmFsaWQubmctdG91Y2hlZCB7IGJvcmRlcjogMXB4IHNvbGlkICNmNDQzMzY7IH1cbiAgYF0sXG59KVxuZXhwb3J0IGNsYXNzIEJvb3RzdHJhcDNGcmFtZXdvcmtDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcyB7XG4gIGZyYW1ld29ya0luaXRpYWxpemVkID0gZmFsc2U7XG4gIHdpZGdldE9wdGlvbnM6IGFueTsgLy8gT3B0aW9ucyBwYXNzZWQgdG8gY2hpbGQgd2lkZ2V0XG4gIHdpZGdldExheW91dE5vZGU6IGFueTsgLy8gbGF5b3V0Tm9kZSBwYXNzZWQgdG8gY2hpbGQgd2lkZ2V0XG4gIG9wdGlvbnM6IGFueTsgLy8gT3B0aW9ucyB1c2VkIGluIHRoaXMgZnJhbWV3b3JrXG4gIGZvcm1Db250cm9sOiBhbnkgPSBudWxsO1xuICBkZWJ1Z091dHB1dDogYW55ID0gJyc7XG4gIGRlYnVnOiBhbnkgPSAnJztcbiAgcGFyZW50QXJyYXk6IGFueSA9IG51bGw7XG4gIGlzT3JkZXJhYmxlID0gZmFsc2U7XG4gIEBJbnB1dCgpIGxheW91dE5vZGU6IGFueTtcbiAgQElucHV0KCkgbGF5b3V0SW5kZXg6IG51bWJlcltdO1xuICBASW5wdXQoKSBkYXRhSW5kZXg6IG51bWJlcltdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBjaGFuZ2VEZXRlY3RvcjogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgcHVibGljIGpzZjogSnNvblNjaGVtYUZvcm1TZXJ2aWNlXG4gICkgeyB9XG5cbiAgZ2V0IHNob3dSZW1vdmVCdXR0b24oKTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVtb3ZhYmxlIHx8IHRoaXMub3B0aW9ucy5yZWFkb25seSB8fFxuICAgICAgdGhpcy5sYXlvdXROb2RlLnR5cGUgPT09ICckcmVmJ1xuICAgICkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAodGhpcy5sYXlvdXROb2RlLnJlY3Vyc2l2ZVJlZmVyZW5jZSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgIGlmICghdGhpcy5sYXlvdXROb2RlLmFycmF5SXRlbSB8fCAhdGhpcy5wYXJlbnRBcnJheSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAvLyBJZiBhcnJheSBsZW5ndGggPD0gbWluSXRlbXMsIGRvbid0IGFsbG93IHJlbW92aW5nIGFueSBpdGVtc1xuICAgIHJldHVybiB0aGlzLnBhcmVudEFycmF5Lml0ZW1zLmxlbmd0aCAtIDEgPD0gdGhpcy5wYXJlbnRBcnJheS5vcHRpb25zLm1pbkl0ZW1zID8gZmFsc2UgOlxuICAgICAgLy8gRm9yIHJlbW92YWJsZSBsaXN0IGl0ZW1zLCBhbGxvdyByZW1vdmluZyBhbnkgaXRlbVxuICAgICAgdGhpcy5sYXlvdXROb2RlLmFycmF5SXRlbVR5cGUgPT09ICdsaXN0JyA/IHRydWUgOlxuICAgICAgLy8gRm9yIHJlbW92YWJsZSB0dXBsZSBpdGVtcywgb25seSBhbGxvdyByZW1vdmluZyBsYXN0IGl0ZW0gaW4gbGlzdFxuICAgICAgdGhpcy5sYXlvdXRJbmRleFt0aGlzLmxheW91dEluZGV4Lmxlbmd0aCAtIDFdID09PSB0aGlzLnBhcmVudEFycmF5Lml0ZW1zLmxlbmd0aCAtIDI7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmluaXRpYWxpemVGcmFtZXdvcmsoKTtcbiAgICBpZiAodGhpcy5sYXlvdXROb2RlLmFycmF5SXRlbSAmJiB0aGlzLmxheW91dE5vZGUudHlwZSAhPT0gJyRyZWYnKSB7XG4gICAgICB0aGlzLnBhcmVudEFycmF5ID0gdGhpcy5qc2YuZ2V0UGFyZW50Tm9kZSh0aGlzKTtcbiAgICAgIGlmICh0aGlzLnBhcmVudEFycmF5KSB7XG4gICAgICAgIHRoaXMuaXNPcmRlcmFibGUgPSB0aGlzLmxheW91dE5vZGUuYXJyYXlJdGVtVHlwZSA9PT0gJ2xpc3QnICYmXG4gICAgICAgICAgIXRoaXMub3B0aW9ucy5yZWFkb25seSAmJiB0aGlzLnBhcmVudEFycmF5Lm9wdGlvbnMub3JkZXJhYmxlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nT25DaGFuZ2VzKCkge1xuICAgIGlmICghdGhpcy5mcmFtZXdvcmtJbml0aWFsaXplZCkgeyB0aGlzLmluaXRpYWxpemVGcmFtZXdvcmsoKTsgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZUZyYW1ld29yaygpIHtcbiAgICBpZiAodGhpcy5sYXlvdXROb2RlKSB7XG4gICAgICB0aGlzLm9wdGlvbnMgPSBjbG9uZURlZXAodGhpcy5sYXlvdXROb2RlLm9wdGlvbnMpO1xuICAgICAgdGhpcy53aWRnZXRMYXlvdXROb2RlID0ge1xuICAgICAgICAuLi50aGlzLmxheW91dE5vZGUsXG4gICAgICAgIG9wdGlvbnM6IGNsb25lRGVlcCh0aGlzLmxheW91dE5vZGUub3B0aW9ucylcbiAgICAgIH07XG4gICAgICB0aGlzLndpZGdldE9wdGlvbnMgPSB0aGlzLndpZGdldExheW91dE5vZGUub3B0aW9ucztcbiAgICAgIHRoaXMuZm9ybUNvbnRyb2wgPSB0aGlzLmpzZi5nZXRGb3JtQ29udHJvbCh0aGlzKTtcblxuICAgICAgdGhpcy5vcHRpb25zLmlzSW5wdXRXaWRnZXQgPSBpbkFycmF5KHRoaXMubGF5b3V0Tm9kZS50eXBlLCBbXG4gICAgICAgICdidXR0b24nLCAnY2hlY2tib3gnLCAnY2hlY2tib3hlcy1pbmxpbmUnLCAnY2hlY2tib3hlcycsICdjb2xvcicsXG4gICAgICAgICdkYXRlJywgJ2RhdGV0aW1lLWxvY2FsJywgJ2RhdGV0aW1lJywgJ2VtYWlsJywgJ2ZpbGUnLCAnaGlkZGVuJyxcbiAgICAgICAgJ2ltYWdlJywgJ2ludGVnZXInLCAnbW9udGgnLCAnbnVtYmVyJywgJ3Bhc3N3b3JkJywgJ3JhZGlvJyxcbiAgICAgICAgJ3JhZGlvYnV0dG9ucycsICdyYWRpb3MtaW5saW5lJywgJ3JhZGlvcycsICdyYW5nZScsICdyZXNldCcsICdzZWFyY2gnLFxuICAgICAgICAnc2VsZWN0JywgJ3N1Ym1pdCcsICd0ZWwnLCAndGV4dCcsICd0ZXh0YXJlYScsICd0aW1lJywgJ3VybCcsICd3ZWVrJ1xuICAgICAgXSk7XG5cbiAgICAgIHRoaXMub3B0aW9ucy50aXRsZSA9IHRoaXMuc2V0VGl0bGUoKTtcblxuICAgICAgdGhpcy5vcHRpb25zLmh0bWxDbGFzcyA9XG4gICAgICAgIGFkZENsYXNzZXModGhpcy5vcHRpb25zLmh0bWxDbGFzcywgJ3NjaGVtYS1mb3JtLScgKyB0aGlzLmxheW91dE5vZGUudHlwZSk7XG4gICAgICBpZiAodGhpcy5sYXlvdXROb2RlLnR5cGUgIT09ICdmbGV4JykgIHtcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaHRtbENsYXNzID1cbiAgICAgICAgICAgIHRoaXMubGF5b3V0Tm9kZS50eXBlID09PSAnYXJyYXknID9cbiAgICAgICAgICAgICAgYWRkQ2xhc3Nlcyh0aGlzLm9wdGlvbnMuaHRtbENsYXNzLCAnbGlzdC1ncm91cCcpIDpcbiAgICAgICAgICAgIHRoaXMubGF5b3V0Tm9kZS5hcnJheUl0ZW0gJiYgdGhpcy5sYXlvdXROb2RlLnR5cGUgIT09ICckcmVmJyA/XG4gICAgICAgICAgICAgIGFkZENsYXNzZXModGhpcy5vcHRpb25zLmh0bWxDbGFzcywgJ2xpc3QtZ3JvdXAtaXRlbScpIDpcbiAgICAgICAgICAgICAgYWRkQ2xhc3Nlcyh0aGlzLm9wdGlvbnMuaHRtbENsYXNzLCAnZm9ybS1ncm91cCcpO1xuICAgICAgfVxuICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmh0bWxDbGFzcyA9ICcnO1xuICAgICAgdGhpcy5vcHRpb25zLmxhYmVsSHRtbENsYXNzID1cbiAgICAgICAgYWRkQ2xhc3Nlcyh0aGlzLm9wdGlvbnMubGFiZWxIdG1sQ2xhc3MsICdjb250cm9sLWxhYmVsJyk7XG4gICAgICB0aGlzLndpZGdldE9wdGlvbnMuYWN0aXZlQ2xhc3MgPVxuICAgICAgICBhZGRDbGFzc2VzKHRoaXMud2lkZ2V0T3B0aW9ucy5hY3RpdmVDbGFzcywgJ2FjdGl2ZScpO1xuICAgICAgdGhpcy5vcHRpb25zLmZpZWxkQWRkb25MZWZ0ID1cbiAgICAgICAgdGhpcy5vcHRpb25zLmZpZWxkQWRkb25MZWZ0IHx8IHRoaXMub3B0aW9ucy5wcmVwZW5kO1xuICAgICAgdGhpcy5vcHRpb25zLmZpZWxkQWRkb25SaWdodCA9XG4gICAgICAgIHRoaXMub3B0aW9ucy5maWVsZEFkZG9uUmlnaHQgfHwgdGhpcy5vcHRpb25zLmFwcGVuZDtcblxuICAgICAgLy8gQWRkIGFzdGVyaXNrIHRvIHRpdGxlcyBpZiByZXF1aXJlZFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy50aXRsZSAmJiB0aGlzLmxheW91dE5vZGUudHlwZSAhPT0gJ3RhYicgJiZcbiAgICAgICAgIXRoaXMub3B0aW9ucy5ub3RpdGxlICYmIHRoaXMub3B0aW9ucy5yZXF1aXJlZCAgJiZcbiAgICAgICAgIXRoaXMub3B0aW9ucy50aXRsZS5pbmNsdWRlcygnKicpXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnRpdGxlICs9ICcgPHN0cm9uZyBjbGFzcz1cInRleHQtZGFuZ2VyXCI+Kjwvc3Ryb25nPic7XG4gICAgICB9XG4gICAgICAvLyBTZXQgbWlzY2VsYW5lb3VzIHN0eWxlcyBhbmQgc2V0dGluZ3MgZm9yIGVhY2ggY29udHJvbCB0eXBlXG4gICAgICBzd2l0Y2ggKHRoaXMubGF5b3V0Tm9kZS50eXBlKSB7XG4gICAgICAgIC8vIENoZWNrYm94IGNvbnRyb2xzXG4gICAgICAgIGNhc2UgJ2NoZWNrYm94JzogY2FzZSAnY2hlY2tib3hlcyc6XG4gICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmh0bWxDbGFzcyA9IGFkZENsYXNzZXMoXG4gICAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuaHRtbENsYXNzLCAnY2hlY2tib3gnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NoZWNrYm94ZXMtaW5saW5lJzpcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuaHRtbENsYXNzID0gYWRkQ2xhc3NlcyhcbiAgICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5odG1sQ2xhc3MsICdjaGVja2JveCcpO1xuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5pdGVtTGFiZWxIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLml0ZW1MYWJlbEh0bWxDbGFzcywgJ2NoZWNrYm94LWlubGluZScpO1xuICAgICAgICBicmVhaztcbiAgICAgICAgLy8gUmFkaW8gY29udHJvbHNcbiAgICAgICAgY2FzZSAncmFkaW8nOiBjYXNlICdyYWRpb3MnOlxuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5odG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmh0bWxDbGFzcywgJ3JhZGlvJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyYWRpb3MtaW5saW5lJzpcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuaHRtbENsYXNzID0gYWRkQ2xhc3NlcyhcbiAgICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5odG1sQ2xhc3MsICdyYWRpbycpO1xuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5pdGVtTGFiZWxIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLml0ZW1MYWJlbEh0bWxDbGFzcywgJ3JhZGlvLWlubGluZScpO1xuICAgICAgICBicmVhaztcbiAgICAgICAgLy8gQnV0dG9uIHNldHMgLSBjaGVja2JveGJ1dHRvbnMgYW5kIHJhZGlvYnV0dG9uc1xuICAgICAgICBjYXNlICdjaGVja2JveGJ1dHRvbnMnOiBjYXNlICdyYWRpb2J1dHRvbnMnOlxuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5odG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmh0bWxDbGFzcywgJ2J0bi1ncm91cCcpO1xuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5pdGVtTGFiZWxIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLml0ZW1MYWJlbEh0bWxDbGFzcywgJ2J0bicpO1xuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5pdGVtTGFiZWxIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLml0ZW1MYWJlbEh0bWxDbGFzcywgdGhpcy5vcHRpb25zLnN0eWxlIHx8ICdidG4tZGVmYXVsdCcpO1xuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5maWVsZEh0bWxDbGFzcyA9IGFkZENsYXNzZXMoXG4gICAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuZmllbGRIdG1sQ2xhc3MsICdzci1vbmx5Jyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBTaW5nbGUgYnV0dG9uIGNvbnRyb2xzXG4gICAgICAgIGNhc2UgJ2J1dHRvbic6IGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmZpZWxkSHRtbENsYXNzID0gYWRkQ2xhc3NlcyhcbiAgICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5maWVsZEh0bWxDbGFzcywgJ2J0bicpO1xuICAgICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy5maWVsZEh0bWxDbGFzcyA9IGFkZENsYXNzZXMoXG4gICAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuZmllbGRIdG1sQ2xhc3MsIHRoaXMub3B0aW9ucy5zdHlsZSB8fCAnYnRuLWluZm8nKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIENvbnRhaW5lcnMgLSBhcnJheXMgYW5kIGZpZWxkc2V0c1xuICAgICAgICBjYXNlICdhcnJheSc6IGNhc2UgJ2ZpZWxkc2V0JzogY2FzZSAnc2VjdGlvbic6IGNhc2UgJ2NvbmRpdGlvbmFsJzpcbiAgICAgICAgY2FzZSAnYWR2YW5jZWRmaWVsZHNldCc6IGNhc2UgJ2F1dGhmaWVsZHNldCc6XG4gICAgICAgIGNhc2UgJ3NlbGVjdGZpZWxkc2V0JzogY2FzZSAnb3B0aW9uZmllbGRzZXQnOlxuICAgICAgICAgIHRoaXMub3B0aW9ucy5tZXNzYWdlTG9jYXRpb24gPSAndG9wJztcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3RhYmFycmF5JzogY2FzZSAndGFicyc6XG4gICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmh0bWxDbGFzcyA9IGFkZENsYXNzZXMoXG4gICAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuaHRtbENsYXNzLCAndGFiLWNvbnRlbnQnKTtcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuZmllbGRIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmZpZWxkSHRtbENsYXNzLCAndGFiLXBhbmUnKTtcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMubGFiZWxIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmxhYmVsSHRtbENsYXNzLCAnbmF2IG5hdi10YWJzJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICAvLyAnQWRkJyBidXR0b25zIC0gcmVmZXJlbmNlc1xuICAgICAgICBjYXNlICckcmVmJzpcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuZmllbGRIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmZpZWxkSHRtbENsYXNzLCAnYnRuIHB1bGwtcmlnaHQnKTtcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuZmllbGRIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmZpZWxkSHRtbENsYXNzLCB0aGlzLm9wdGlvbnMuc3R5bGUgfHwgJ2J0bi1kZWZhdWx0Jyk7XG4gICAgICAgICAgdGhpcy5vcHRpb25zLmljb24gPSAnZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzJztcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIERlZmF1bHQgLSBpbmNsdWRpbmcgcmVndWxhciBpbnB1dHNcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMuZmllbGRIdG1sQ2xhc3MgPSBhZGRDbGFzc2VzKFxuICAgICAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmZpZWxkSHRtbENsYXNzLCAnZm9ybS1jb250cm9sJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmZvcm1Db250cm9sKSB7XG4gICAgICAgIHRoaXMudXBkYXRlSGVscEJsb2NrKHRoaXMuZm9ybUNvbnRyb2wuc3RhdHVzKTtcbiAgICAgICAgdGhpcy5mb3JtQ29udHJvbC5zdGF0dXNDaGFuZ2VzLnN1YnNjcmliZShzdGF0dXMgPT4gdGhpcy51cGRhdGVIZWxwQmxvY2soc3RhdHVzKSk7XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgICAgIGNvbnN0IHZhcnM6IGFueVtdID0gW107XG4gICAgICAgICAgdGhpcy5kZWJ1Z091dHB1dCA9IG1hcCh2YXJzLCB0aGlzVmFyID0+IEpTT04uc3RyaW5naWZ5KHRoaXNWYXIsIG51bGwsIDIpKS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5mcmFtZXdvcmtJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfVxuXG4gIH1cblxuICB1cGRhdGVIZWxwQmxvY2soc3RhdHVzKSB7XG4gICAgdGhpcy5vcHRpb25zLmhlbHBCbG9jayA9IHN0YXR1cyA9PT0gJ0lOVkFMSUQnICYmXG4gICAgICB0aGlzLm9wdGlvbnMuZW5hYmxlRXJyb3JTdGF0ZSAmJiB0aGlzLmZvcm1Db250cm9sLmVycm9ycyAmJlxuICAgICAgKHRoaXMuZm9ybUNvbnRyb2wuZGlydHkgfHwgdGhpcy5vcHRpb25zLmZlZWRiYWNrT25SZW5kZXIpID9cbiAgICAgICAgdGhpcy5qc2YuZm9ybWF0RXJyb3JzKHRoaXMuZm9ybUNvbnRyb2wuZXJyb3JzLCB0aGlzLm9wdGlvbnMudmFsaWRhdGlvbk1lc3NhZ2VzKSA6XG4gICAgICAgIHRoaXMub3B0aW9ucy5kZXNjcmlwdGlvbiB8fCB0aGlzLm9wdGlvbnMuaGVscCB8fCBudWxsO1xuICB9XG5cbiAgc2V0VGl0bGUoKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHRoaXMubGF5b3V0Tm9kZS50eXBlKSB7XG4gICAgICBjYXNlICdidXR0b24nOiBjYXNlICdjaGVja2JveCc6IGNhc2UgJ3NlY3Rpb24nOiBjYXNlICdoZWxwJzogY2FzZSAnbXNnJzpcbiAgICAgIGNhc2UgJ3N1Ym1pdCc6IGNhc2UgJ21lc3NhZ2UnOiBjYXNlICd0YWJhcnJheSc6IGNhc2UgJ3RhYnMnOiBjYXNlICckcmVmJzpcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICBjYXNlICdhZHZhbmNlZGZpZWxkc2V0JzpcbiAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmV4cGFuZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMudGl0bGUgPSAnQWR2YW5jZWQgb3B0aW9ucyc7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgY2FzZSAnYXV0aGZpZWxkc2V0JzpcbiAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLmV4cGFuZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLndpZGdldE9wdGlvbnMudGl0bGUgPSAnQXV0aGVudGljYXRpb24gc2V0dGluZ3MnO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIGNhc2UgJ2ZpZWxkc2V0JzpcbiAgICAgICAgdGhpcy53aWRnZXRPcHRpb25zLnRpdGxlID0gdGhpcy5vcHRpb25zLnRpdGxlO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMud2lkZ2V0T3B0aW9ucy50aXRsZSA9IG51bGw7XG4gICAgICAgIHJldHVybiB0aGlzLmpzZi5zZXRJdGVtVGl0bGUodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlSXRlbSgpIHtcbiAgICB0aGlzLmpzZi5yZW1vdmVJdGVtKHRoaXMpO1xuICB9XG59XG4iXX0=