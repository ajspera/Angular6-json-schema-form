import * as tslib_1 from "tslib";
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { convertSchemaToDraft6 } from './shared/convert-schema-to-draft6.function';
import { DomSanitizer } from '@angular/platform-browser';
import { forEach, hasOwn } from './shared/utility.functions';
import { FrameworkLibraryService } from './framework-library/framework-library.service';
import { hasValue, inArray, isArray, isEmpty, isObject } from './shared/validator.functions';
import { JsonPointer } from './shared/jsonpointer.functions';
import { JsonSchemaFormService } from './json-schema-form.service';
import { resolveSchemaReferences } from './shared/json-schema.functions';
import { WidgetLibraryService } from './widget-library/widget-library.service';
export var JSON_SCHEMA_FORM_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(function () { return JsonSchemaFormComponent; }),
    multi: true,
};
/**
 * @module 'JsonSchemaFormComponent' - Angular JSON Schema Form
 *
 * Root module of the Angular JSON Schema Form client-side library,
 * an Angular library which generates an HTML form from a JSON schema
 * structured data model and/or a JSON Schema Form layout description.
 *
 * This library also validates input data by the user, using both validators on
 * individual controls to provide real-time feedback while the user is filling
 * out the form, and then validating the entire input against the schema when
 * the form is submitted to make sure the returned JSON data object is valid.
 *
 * This library is similar to, and mostly API compatible with:
 *
 * - JSON Schema Form's Angular Schema Form library for AngularJs
 *   http://schemaform.io
 *   http://schemaform.io/examples/bootstrap-example.html (examples)
 *
 * - Mozilla's react-jsonschema-form library for React
 *   https://github.com/mozilla-services/react-jsonschema-form
 *   https://mozilla-services.github.io/react-jsonschema-form (examples)
 *
 * - Joshfire's JSON Form library for jQuery
 *   https://github.com/joshfire/jsonform
 *   http://ulion.github.io/jsonform/playground (examples)
 *
 * This library depends on:
 *  - Angular (obviously)                  https://angular.io
 *  - lodash, JavaScript utility library   https://github.com/lodash/lodash
 *  - ajv, Another JSON Schema validator   https://github.com/epoberezkin/ajv
 *
 * In addition, the Example Playground also depends on:
 *  - brace, Browserified Ace editor       http://thlorenz.github.io/brace
 */
var JsonSchemaFormComponent = /** @class */ (function () {
    function JsonSchemaFormComponent(changeDetector, frameworkLibrary, widgetLibrary, jsf, sanitizer) {
        this.changeDetector = changeDetector;
        this.frameworkLibrary = frameworkLibrary;
        this.widgetLibrary = widgetLibrary;
        this.jsf = jsf;
        this.sanitizer = sanitizer;
        this.formValueSubscription = null;
        this.formInitialized = false;
        this.objectWrap = false; // Is non-object input schema wrapped in an object?
        this.previousInputs = {
            schema: null, layout: null, data: null, options: null, framework: null,
            widgets: null, form: null, model: null, JSONSchema: null, UISchema: null,
            formData: null, loadExternalAssets: null, debug: null,
        };
        // Outputs
        // tslint:disable-next-line:no-output-on-prefix
        this.onChanges = new EventEmitter(); // Live unvalidated internal form data
        // tslint:disable-next-line:no-output-on-prefix
        this.onSubmit = new EventEmitter(); // Complete validated form data
        this.isValid = new EventEmitter(); // Is current data valid?
        this.validationErrors = new EventEmitter(); // Validation errors (if any)
        this.formSchema = new EventEmitter(); // Final schema used to create form
        this.formLayout = new EventEmitter(); // Final layout used to create form
        // Outputs for possible 2-way data binding
        // Only the one input providing the initial form data will be bound.
        // If there is no inital data, input '{}' to activate 2-way data binding.
        // There is no 2-way binding if inital data is combined inside the 'form' input.
        this.dataChange = new EventEmitter();
        this.modelChange = new EventEmitter();
        this.formDataChange = new EventEmitter();
        this.ngModelChange = new EventEmitter();
    }
    Object.defineProperty(JsonSchemaFormComponent.prototype, "value", {
        get: function () {
            return this.objectWrap ? this.jsf.data['1'] : this.jsf.data;
        },
        set: function (value) {
            this.setFormValues(value, false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(JsonSchemaFormComponent.prototype, "stylesheets", {
        get: function () {
            var stylesheets = this.frameworkLibrary.getFrameworkStylesheets();
            var load = this.sanitizer.bypassSecurityTrustResourceUrl;
            return stylesheets.map(function (stylesheet) { return load(stylesheet); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(JsonSchemaFormComponent.prototype, "scripts", {
        get: function () {
            var scripts = this.frameworkLibrary.getFrameworkScripts();
            var load = this.sanitizer.bypassSecurityTrustResourceUrl;
            return scripts.map(function (script) { return load(script); });
        },
        enumerable: true,
        configurable: true
    });
    JsonSchemaFormComponent.prototype.ngOnInit = function () {
        this.updateForm();
    };
    JsonSchemaFormComponent.prototype.ngOnChanges = function () {
        this.updateForm();
    };
    JsonSchemaFormComponent.prototype.writeValue = function (value) {
        this.setFormValues(value, false);
        if (!this.formValuesInput) {
            this.formValuesInput = 'ngModel';
        }
    };
    JsonSchemaFormComponent.prototype.registerOnChange = function (fn) {
        this.onChange = fn;
    };
    JsonSchemaFormComponent.prototype.registerOnTouched = function (fn) {
        this.onTouched = fn;
    };
    JsonSchemaFormComponent.prototype.setDisabledState = function (isDisabled) {
        if (this.jsf.formOptions.formDisabled !== !!isDisabled) {
            this.jsf.formOptions.formDisabled = !!isDisabled;
            this.initializeForm();
        }
    };
    JsonSchemaFormComponent.prototype.updateForm = function () {
        var _this = this;
        if (!this.formInitialized || !this.formValuesInput ||
            (this.language && this.language !== this.jsf.language)) {
            this.initializeForm();
        }
        else {
            if (this.language && this.language !== this.jsf.language) {
                this.jsf.setLanguage(this.language);
            }
            // Get names of changed inputs
            var changedInput = Object.keys(this.previousInputs)
                .filter(function (input) { return _this.previousInputs[input] !== _this[input]; });
            var resetFirst = true;
            if (changedInput.length === 1 && changedInput[0] === 'form' &&
                this.formValuesInput.startsWith('form.')) {
                // If only 'form' input changed, get names of changed keys
                changedInput = Object.keys(this.previousInputs.form || {})
                    .filter(function (key) { return !isEqual(_this.previousInputs.form[key], _this.form[key]); })
                    .map(function (key) { return "form." + key; });
                resetFirst = false;
            }
            // If only input values have changed, update the form values
            if (changedInput.length === 1 && changedInput[0] === this.formValuesInput) {
                if (this.formValuesInput.indexOf('.') === -1) {
                    this.setFormValues(this[this.formValuesInput], resetFirst);
                }
                else {
                    var _a = tslib_1.__read(this.formValuesInput.split('.'), 2), input = _a[0], key = _a[1];
                    this.setFormValues(this[input][key], resetFirst);
                }
                // If anything else has changed, re-render the entire form
            }
            else if (changedInput.length) {
                this.initializeForm();
                if (this.onChange) {
                    this.onChange(this.jsf.formValues);
                }
                if (this.onTouched) {
                    this.onTouched(this.jsf.formValues);
                }
            }
            // Update previous inputs
            Object.keys(this.previousInputs)
                .filter(function (input) { return _this.previousInputs[input] !== _this[input]; })
                .forEach(function (input) { return _this.previousInputs[input] = _this[input]; });
        }
    };
    JsonSchemaFormComponent.prototype.setFormValues = function (formValues, resetFirst) {
        if (resetFirst === void 0) { resetFirst = true; }
        if (formValues) {
            var newFormValues = this.objectWrap ? formValues['1'] : formValues;
            if (!this.jsf.formGroup) {
                this.jsf.formValues = formValues;
                this.activateForm();
            }
            else if (resetFirst) {
                this.jsf.formGroup.reset();
            }
            if (this.jsf.formGroup) {
                this.jsf.formGroup.patchValue(newFormValues);
            }
            if (this.onChange) {
                this.onChange(newFormValues);
            }
            if (this.onTouched) {
                this.onTouched(newFormValues);
            }
        }
        else {
            this.jsf.formGroup.reset();
        }
    };
    JsonSchemaFormComponent.prototype.submitForm = function () {
        var validData = this.jsf.validData;
        this.onSubmit.emit(this.objectWrap ? validData['1'] : validData);
    };
    /**
     * 'initializeForm' function
     *
     * - Update 'schema', 'layout', and 'formValues', from inputs.
     *
     * - Create 'schemaRefLibrary' and 'schemaRecursiveRefMap'
     *   to resolve schema $ref links, including recursive $ref links.
     *
     * - Create 'dataRecursiveRefMap' to resolve recursive links in data
     *   and corectly set output formats for recursively nested values.
     *
     * - Create 'layoutRefLibrary' and 'templateRefLibrary' to store
     *   new layout nodes and formGroup elements to use when dynamically
     *   adding form components to arrays and recursive $ref points.
     *
     * - Create 'dataMap' to map the data to the schema and template.
     *
     * - Create the master 'formGroupTemplate' then from it 'formGroup'
     *   the Angular formGroup used to control the reactive form.
     */
    JsonSchemaFormComponent.prototype.initializeForm = function () {
        if (this.schema || this.layout || this.data || this.form || this.model ||
            this.JSONSchema || this.UISchema || this.formData || this.ngModel ||
            this.jsf.data) {
            this.jsf.resetAllValues(); // Reset all form values to defaults
            this.initializeOptions(); // Update options
            this.initializeSchema(); // Update schema, schemaRefLibrary,
            // schemaRecursiveRefMap, & dataRecursiveRefMap
            this.initializeLayout(); // Update layout, layoutRefLibrary,
            this.initializeData(); // Update formValues
            this.activateForm(); // Update dataMap, templateRefLibrary,
            // formGroupTemplate, formGroup
            // Uncomment individual lines to output debugging information to console:
            // (These always work.)
            // console.log('loading form...');
            // console.log('schema', this.jsf.schema);
            // console.log('layout', this.jsf.layout);
            // console.log('options', this.options);
            // console.log('formValues', this.jsf.formValues);
            // console.log('formGroupTemplate', this.jsf.formGroupTemplate);
            // console.log('formGroup', this.jsf.formGroup);
            // console.log('formGroup.value', this.jsf.formGroup.value);
            // console.log('schemaRefLibrary', this.jsf.schemaRefLibrary);
            // console.log('layoutRefLibrary', this.jsf.layoutRefLibrary);
            // console.log('templateRefLibrary', this.jsf.templateRefLibrary);
            // console.log('dataMap', this.jsf.dataMap);
            // console.log('arrayMap', this.jsf.arrayMap);
            // console.log('schemaRecursiveRefMap', this.jsf.schemaRecursiveRefMap);
            // console.log('dataRecursiveRefMap', this.jsf.dataRecursiveRefMap);
            // Uncomment individual lines to output debugging information to browser:
            // (These only work if the 'debug' option has also been set to 'true'.)
            if (this.debug || this.jsf.formOptions.debug) {
                var vars = [];
                // vars.push(this.jsf.schema);
                // vars.push(this.jsf.layout);
                // vars.push(this.options);
                // vars.push(this.jsf.formValues);
                // vars.push(this.jsf.formGroup.value);
                // vars.push(this.jsf.formGroupTemplate);
                // vars.push(this.jsf.formGroup);
                // vars.push(this.jsf.schemaRefLibrary);
                // vars.push(this.jsf.layoutRefLibrary);
                // vars.push(this.jsf.templateRefLibrary);
                // vars.push(this.jsf.dataMap);
                // vars.push(this.jsf.arrayMap);
                // vars.push(this.jsf.schemaRecursiveRefMap);
                // vars.push(this.jsf.dataRecursiveRefMap);
                this.debugOutput = vars.map(function (v) { return JSON.stringify(v, null, 2); }).join('\n');
            }
            this.formInitialized = true;
        }
    };
    /**
     * 'initializeOptions' function
     *
     * Initialize 'options' (global form options) and set framework
     * Combine available inputs:
     * 1. options - recommended
     * 2. form.options - Single input style
     */
    JsonSchemaFormComponent.prototype.initializeOptions = function () {
        var e_1, _a;
        if (this.language && this.language !== this.jsf.language) {
            this.jsf.setLanguage(this.language);
        }
        this.jsf.setOptions({ debug: !!this.debug });
        var loadExternalAssets = this.loadExternalAssets || false;
        var framework = this.framework || 'default';
        if (isObject(this.options)) {
            this.jsf.setOptions(this.options);
            loadExternalAssets = this.options.loadExternalAssets || loadExternalAssets;
            framework = this.options.framework || framework;
        }
        if (isObject(this.form) && isObject(this.form.options)) {
            this.jsf.setOptions(this.form.options);
            loadExternalAssets = this.form.options.loadExternalAssets || loadExternalAssets;
            framework = this.form.options.framework || framework;
        }
        if (isObject(this.widgets)) {
            this.jsf.setOptions({ widgets: this.widgets });
        }
        this.frameworkLibrary.setLoadExternalAssets(loadExternalAssets);
        this.frameworkLibrary.setFramework(framework);
        this.jsf.framework = this.frameworkLibrary.getFramework();
        if (isObject(this.jsf.formOptions.widgets)) {
            try {
                for (var _b = tslib_1.__values(Object.keys(this.jsf.formOptions.widgets)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var widget = _c.value;
                    this.widgetLibrary.registerWidget(widget, this.jsf.formOptions.widgets[widget]);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        if (isObject(this.form) && isObject(this.form.tpldata)) {
            this.jsf.setTpldata(this.form.tpldata);
        }
    };
    /**
     * 'initializeSchema' function
     *
     * Initialize 'schema'
     * Use first available input:
     * 1. schema - recommended / Angular Schema Form style
     * 2. form.schema - Single input / JSON Form style
     * 3. JSONSchema - React JSON Schema Form style
     * 4. form.JSONSchema - For testing single input React JSON Schema Forms
     * 5. form - For testing single schema-only inputs
     *
     * ... if no schema input found, the 'activateForm' function, below,
     *     will make two additional attempts to build a schema
     * 6. If layout input - build schema from layout
     * 7. If data input - build schema from data
     */
    JsonSchemaFormComponent.prototype.initializeSchema = function () {
        // TODO: update to allow non-object schemas
        if (isObject(this.schema)) {
            this.jsf.AngularSchemaFormCompatibility = true;
            this.jsf.schema = cloneDeep(this.schema);
        }
        else if (hasOwn(this.form, 'schema') && isObject(this.form.schema)) {
            this.jsf.schema = cloneDeep(this.form.schema);
        }
        else if (isObject(this.JSONSchema)) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            this.jsf.schema = cloneDeep(this.JSONSchema);
        }
        else if (hasOwn(this.form, 'JSONSchema') && isObject(this.form.JSONSchema)) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            this.jsf.schema = cloneDeep(this.form.JSONSchema);
        }
        else if (hasOwn(this.form, 'properties') && isObject(this.form.properties)) {
            this.jsf.schema = cloneDeep(this.form);
        }
        else if (isObject(this.form)) {
            // TODO: Handle other types of form input
        }
        if (!isEmpty(this.jsf.schema)) {
            // If other types also allowed, render schema as an object
            if (inArray('object', this.jsf.schema.type)) {
                this.jsf.schema.type = 'object';
            }
            // Wrap non-object schemas in object.
            if (hasOwn(this.jsf.schema, 'type') && this.jsf.schema.type !== 'object') {
                this.jsf.schema = {
                    'type': 'object',
                    'properties': { 1: this.jsf.schema }
                };
                this.objectWrap = true;
            }
            else if (!hasOwn(this.jsf.schema, 'type')) {
                // Add type = 'object' if missing
                if (isObject(this.jsf.schema.properties) ||
                    isObject(this.jsf.schema.patternProperties) ||
                    isObject(this.jsf.schema.additionalProperties)) {
                    this.jsf.schema.type = 'object';
                    // Fix JSON schema shorthand (JSON Form style)
                }
                else {
                    this.jsf.JsonFormCompatibility = true;
                    this.jsf.schema = {
                        'type': 'object',
                        'properties': this.jsf.schema
                    };
                }
            }
            // If needed, update JSON Schema to draft 6 format, including
            // draft 3 (JSON Form style) and draft 4 (Angular Schema Form style)
            this.jsf.schema = convertSchemaToDraft6(this.jsf.schema);
            // Initialize ajv and compile schema
            this.jsf.compileAjvSchema();
            // Create schemaRefLibrary, schemaRecursiveRefMap, dataRecursiveRefMap, & arrayMap
            this.jsf.schema = resolveSchemaReferences(this.jsf.schema, this.jsf.schemaRefLibrary, this.jsf.schemaRecursiveRefMap, this.jsf.dataRecursiveRefMap, this.jsf.arrayMap);
            if (hasOwn(this.jsf.schemaRefLibrary, '')) {
                this.jsf.hasRootReference = true;
            }
            // TODO: (?) Resolve external $ref links
            // // Create schemaRefLibrary & schemaRecursiveRefMap
            // this.parser.bundle(this.schema)
            //   .then(schema => this.schema = resolveSchemaReferences(
            //     schema, this.jsf.schemaRefLibrary,
            //     this.jsf.schemaRecursiveRefMap, this.jsf.dataRecursiveRefMap
            //   ));
        }
    };
    /**
     * 'initializeData' function
     *
     * Initialize 'formValues'
     * defulat or previously submitted values used to populate form
     * Use first available input:
     * 1. data - recommended
     * 2. model - Angular Schema Form style
     * 3. form.value - JSON Form style
     * 4. form.data - Single input style
     * 5. formData - React JSON Schema Form style
     * 6. form.formData - For easier testing of React JSON Schema Forms
     * 7. (none) no data - initialize data from schema and layout defaults only
     */
    JsonSchemaFormComponent.prototype.initializeData = function () {
        if (hasValue(this.data)) {
            this.jsf.formValues = cloneDeep(this.data);
            this.formValuesInput = 'data';
        }
        else if (hasValue(this.model)) {
            this.jsf.AngularSchemaFormCompatibility = true;
            this.jsf.formValues = cloneDeep(this.model);
            this.formValuesInput = 'model';
        }
        else if (hasValue(this.ngModel)) {
            this.jsf.AngularSchemaFormCompatibility = true;
            this.jsf.formValues = cloneDeep(this.ngModel);
            this.formValuesInput = 'ngModel';
        }
        else if (isObject(this.form) && hasValue(this.form.value)) {
            this.jsf.JsonFormCompatibility = true;
            this.jsf.formValues = cloneDeep(this.form.value);
            this.formValuesInput = 'form.value';
        }
        else if (isObject(this.form) && hasValue(this.form.data)) {
            this.jsf.formValues = cloneDeep(this.form.data);
            this.formValuesInput = 'form.data';
        }
        else if (hasValue(this.formData)) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            this.formValuesInput = 'formData';
        }
        else if (hasOwn(this.form, 'formData') && hasValue(this.form.formData)) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            this.jsf.formValues = cloneDeep(this.form.formData);
            this.formValuesInput = 'form.formData';
        }
        else {
            this.formValuesInput = null;
        }
    };
    /**
     * 'initializeLayout' function
     *
     * Initialize 'layout'
     * Use first available array input:
     * 1. layout - recommended
     * 2. form - Angular Schema Form style
     * 3. form.form - JSON Form style
     * 4. form.layout - Single input style
     * 5. (none) no layout - set default layout instead
     *    (full layout will be built later from the schema)
     *
     * Also, if alternate layout formats are available,
     * import from 'UISchema' or 'customFormItems'
     * used for React JSON Schema Form and JSON Form API compatibility
     * Use first available input:
     * 1. UISchema - React JSON Schema Form style
     * 2. form.UISchema - For testing single input React JSON Schema Forms
     * 2. form.customFormItems - JSON Form style
     * 3. (none) no input - don't import
     */
    JsonSchemaFormComponent.prototype.initializeLayout = function () {
        var _this = this;
        // Rename JSON Form-style 'options' lists to
        // Angular Schema Form-style 'titleMap' lists.
        var fixJsonFormOptions = function (layout) {
            if (isObject(layout) || isArray(layout)) {
                forEach(layout, function (value, key) {
                    if (hasOwn(value, 'options') && isObject(value.options)) {
                        value.titleMap = value.options;
                        delete value.options;
                    }
                }, 'top-down');
            }
            return layout;
        };
        // Check for layout inputs and, if found, initialize form layout
        if (isArray(this.layout)) {
            this.jsf.layout = cloneDeep(this.layout);
        }
        else if (isArray(this.form)) {
            this.jsf.AngularSchemaFormCompatibility = true;
            this.jsf.layout = cloneDeep(this.form);
        }
        else if (this.form && isArray(this.form.form)) {
            this.jsf.JsonFormCompatibility = true;
            this.jsf.layout = fixJsonFormOptions(cloneDeep(this.form.form));
        }
        else if (this.form && isArray(this.form.layout)) {
            this.jsf.layout = cloneDeep(this.form.layout);
        }
        else {
            this.jsf.layout = ['*'];
        }
        // Check for alternate layout inputs
        var alternateLayout = null;
        if (isObject(this.UISchema)) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            alternateLayout = cloneDeep(this.UISchema);
        }
        else if (hasOwn(this.form, 'UISchema')) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            alternateLayout = cloneDeep(this.form.UISchema);
        }
        else if (hasOwn(this.form, 'uiSchema')) {
            this.jsf.ReactJsonSchemaFormCompatibility = true;
            alternateLayout = cloneDeep(this.form.uiSchema);
        }
        else if (hasOwn(this.form, 'customFormItems')) {
            this.jsf.JsonFormCompatibility = true;
            alternateLayout = fixJsonFormOptions(cloneDeep(this.form.customFormItems));
        }
        // if alternate layout found, copy alternate layout options into schema
        if (alternateLayout) {
            JsonPointer.forEachDeep(alternateLayout, function (value, pointer) {
                var schemaPointer = pointer
                    .replace(/\//g, '/properties/')
                    .replace(/\/properties\/items\/properties\//g, '/items/properties/')
                    .replace(/\/properties\/titleMap\/properties\//g, '/titleMap/properties/');
                if (hasValue(value) && hasValue(pointer)) {
                    var key = JsonPointer.toKey(pointer);
                    var groupPointer = (JsonPointer.parse(schemaPointer) || []).slice(0, -2);
                    var itemPointer = void 0;
                    // If 'ui:order' object found, copy into object schema root
                    if (key.toLowerCase() === 'ui:order') {
                        itemPointer = tslib_1.__spread(groupPointer, ['ui:order']);
                        // Copy other alternate layout options to schema 'x-schema-form',
                        // (like Angular Schema Form options) and remove any 'ui:' prefixes
                    }
                    else {
                        if (key.slice(0, 3).toLowerCase() === 'ui:') {
                            key = key.slice(3);
                        }
                        itemPointer = tslib_1.__spread(groupPointer, ['x-schema-form', key]);
                    }
                    if (JsonPointer.has(_this.jsf.schema, groupPointer) &&
                        !JsonPointer.has(_this.jsf.schema, itemPointer)) {
                        JsonPointer.set(_this.jsf.schema, itemPointer, value);
                    }
                }
            });
        }
    };
    /**
     * 'activateForm' function
     *
     * ...continued from 'initializeSchema' function, above
     * If 'schema' has not been initialized (i.e. no schema input found)
     * 6. If layout input - build schema from layout input
     * 7. If data input - build schema from data input
     *
     * Create final layout,
     * build the FormGroup template and the Angular FormGroup,
     * subscribe to changes,
     * and activate the form.
     */
    JsonSchemaFormComponent.prototype.activateForm = function () {
        var _this = this;
        // If 'schema' not initialized
        if (isEmpty(this.jsf.schema)) {
            // TODO: If full layout input (with no '*'), build schema from layout
            // if (!this.jsf.layout.includes('*')) {
            //   this.jsf.buildSchemaFromLayout();
            // } else
            // If data input, build schema from data
            if (!isEmpty(this.jsf.formValues)) {
                this.jsf.buildSchemaFromData();
            }
        }
        if (!isEmpty(this.jsf.schema)) {
            // If not already initialized, initialize ajv and compile schema
            this.jsf.compileAjvSchema();
            // Update all layout elements, add values, widgets, and validators,
            // replace any '*' with a layout built from all schema elements,
            // and update the FormGroup template with any new validators
            this.jsf.buildLayout(this.widgetLibrary);
            // Build the Angular FormGroup template from the schema
            this.jsf.buildFormGroupTemplate(this.jsf.formValues);
            // Build the real Angular FormGroup from the FormGroup template
            this.jsf.buildFormGroup();
        }
        if (this.jsf.formGroup) {
            // Reset initial form values
            if (!isEmpty(this.jsf.formValues) &&
                this.jsf.formOptions.setSchemaDefaults !== true &&
                this.jsf.formOptions.setLayoutDefaults !== true) {
                this.setFormValues(this.jsf.formValues);
            }
            // TODO: Figure out how to display calculated values without changing object data
            // See http://ulion.github.io/jsonform/playground/?example=templating-values
            // Calculate references to other fields
            // if (!isEmpty(this.jsf.formGroup.value)) {
            //   forEach(this.jsf.formGroup.value, (value, key, object, rootObject) => {
            //     if (typeof value === 'string') {
            //       object[key] = this.jsf.parseText(value, value, rootObject, key);
            //     }
            //   }, 'top-down');
            // }
            // Subscribe to form changes to output live data, validation, and errors
            this.jsf.dataChanges.subscribe(function (data) {
                _this.onChanges.emit(_this.objectWrap ? data['1'] : data);
                if (_this.formValuesInput && _this.formValuesInput.indexOf('.') === -1) {
                    _this[_this.formValuesInput + "Change"].emit(_this.objectWrap ? data['1'] : data);
                }
            });
            // Trigger change detection on statusChanges to show updated errors
            this.jsf.formGroup.statusChanges.subscribe(function () { return _this.changeDetector.markForCheck(); });
            this.jsf.isValidChanges.subscribe(function (isValid) { return _this.isValid.emit(isValid); });
            this.jsf.validationErrorChanges.subscribe(function (err) { return _this.validationErrors.emit(err); });
            // Output final schema, final layout, and initial data
            this.formSchema.emit(this.jsf.schema);
            this.formLayout.emit(this.jsf.layout);
            this.onChanges.emit(this.objectWrap ? this.jsf.data['1'] : this.jsf.data);
            // If validateOnRender, output initial validation and any errors
            var validateOnRender_1 = JsonPointer.get(this.jsf, '/formOptions/validateOnRender');
            if (validateOnRender_1) { // validateOnRender === 'auto' || true
                var touchAll_1 = function (control) {
                    if (validateOnRender_1 === true || hasValue(control.value)) {
                        control.markAsTouched();
                    }
                    Object.keys(control.controls || {})
                        .forEach(function (key) { return touchAll_1(control.controls[key]); });
                };
                touchAll_1(this.jsf.formGroup);
                this.isValid.emit(this.jsf.isValid);
                this.validationErrors.emit(this.jsf.ajvErrors);
            }
        }
    };
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "schema", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Array)
    ], JsonSchemaFormComponent.prototype, "layout", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "data", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "options", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "framework", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "widgets", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "form", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "model", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "JSONSchema", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "UISchema", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "formData", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "ngModel", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", String)
    ], JsonSchemaFormComponent.prototype, "language", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Boolean)
    ], JsonSchemaFormComponent.prototype, "loadExternalAssets", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Boolean)
    ], JsonSchemaFormComponent.prototype, "debug", void 0);
    tslib_1.__decorate([
        Input(),
        tslib_1.__metadata("design:type", Object),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], JsonSchemaFormComponent.prototype, "value", null);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "onChanges", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "onSubmit", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "isValid", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "validationErrors", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "formSchema", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "formLayout", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "dataChange", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "modelChange", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "formDataChange", void 0);
    tslib_1.__decorate([
        Output(),
        tslib_1.__metadata("design:type", Object)
    ], JsonSchemaFormComponent.prototype, "ngModelChange", void 0);
    JsonSchemaFormComponent = tslib_1.__decorate([
        Component({
            // tslint:disable-next-line:component-selector
            selector: 'json-schema-form',
            template: "\n    <div *ngFor=\"let stylesheet of stylesheets\">\n      <link rel=\"stylesheet\" [href]=\"stylesheet\">\n    </div>\n    <div *ngFor=\"let script of scripts\">\n      <script type=\"text/javascript\" [src]=\"script\"></script>\n    </div>\n    <form class=\"json-schema-form\" (ngSubmit)=\"submitForm()\">\n      <root-widget [layout]=\"jsf?.layout\"></root-widget>\n    </form>\n    <div *ngIf=\"debug || jsf?.formOptions?.debug\">\n      Debug output: <pre>{{debugOutput}}</pre>\n    </div>",
            changeDetection: ChangeDetectionStrategy.OnPush,
            // Adding 'JsonSchemaFormService' here, instead of in the module,
            // creates a separate instance of the service for each component
            providers: [JsonSchemaFormService, JSON_SCHEMA_FORM_VALUE_ACCESSOR]
        }),
        tslib_1.__metadata("design:paramtypes", [ChangeDetectorRef,
            FrameworkLibraryService,
            WidgetLibraryService,
            JsonSchemaFormService,
            DomSanitizer])
    ], JsonSchemaFormComponent);
    return JsonSchemaFormComponent;
}());
export { JsonSchemaFormComponent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEtZm9ybS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9hbmd1bGFyNi1qc29uLXNjaGVtYS1mb3JtLyIsInNvdXJjZXMiOlsibGliL2pzb24tc2NoZW1hLWZvcm0uY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLFNBQVMsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQztBQUVyQyxPQUFPLEVBQ0wsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixTQUFTLEVBQ1QsWUFBWSxFQUNaLFVBQVUsRUFDVixLQUFLLEVBR0wsTUFBTSxFQUNMLE1BQU0sZUFBZSxDQUFDO0FBQ3pCLE9BQU8sRUFBd0IsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLDJCQUEyQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUNMLFFBQVEsRUFDUixPQUFPLEVBQ1AsT0FBTyxFQUNQLE9BQU8sRUFDUCxRQUFRLEVBQ1AsTUFBTSw4QkFBOEIsQ0FBQztBQUN4QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJL0UsTUFBTSxDQUFDLElBQU0sK0JBQStCLEdBQVE7SUFDbEQsT0FBTyxFQUFFLGlCQUFpQjtJQUMxQixX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Q2YsdUJBQXVCO1lBQzFCLG9CQUFvQjtZQUMvQixxQkFBcUI7WUFDZCxZQUFZO09BL0V0Qix1QkFBdUIsQ0Erb0JuQztJQUFELDhCQUFDO0NBQUEsQUEvb0JELElBK29CQztTQS9vQlksdUJBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNsb25lRGVlcCBmcm9tICdsb2Rhc2gvY2xvbmVEZWVwJztcbmltcG9ydCBpc0VxdWFsIGZyb20gJ2xvZGFzaC9pc0VxdWFsJztcblxuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBDb21wb25lbnQsXG4gIEV2ZW50RW1pdHRlcixcbiAgZm9yd2FyZFJlZixcbiAgSW5wdXQsXG4gIE9uQ2hhbmdlcyxcbiAgT25Jbml0LFxuICBPdXRwdXRcbiAgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvbnRyb2xWYWx1ZUFjY2Vzc29yLCBOR19WQUxVRV9BQ0NFU1NPUiB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcbmltcG9ydCB7IGNvbnZlcnRTY2hlbWFUb0RyYWZ0NiB9IGZyb20gJy4vc2hhcmVkL2NvbnZlcnQtc2NoZW1hLXRvLWRyYWZ0Ni5mdW5jdGlvbic7XG5pbXBvcnQgeyBEb21TYW5pdGl6ZXIsIFNhZmVSZXNvdXJjZVVybCB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuaW1wb3J0IHsgZm9yRWFjaCwgaGFzT3duIH0gZnJvbSAnLi9zaGFyZWQvdXRpbGl0eS5mdW5jdGlvbnMnO1xuaW1wb3J0IHsgRnJhbWV3b3JrTGlicmFyeVNlcnZpY2UgfSBmcm9tICcuL2ZyYW1ld29yay1saWJyYXJ5L2ZyYW1ld29yay1saWJyYXJ5LnNlcnZpY2UnO1xuaW1wb3J0IHtcbiAgaGFzVmFsdWUsXG4gIGluQXJyYXksXG4gIGlzQXJyYXksXG4gIGlzRW1wdHksXG4gIGlzT2JqZWN0XG4gIH0gZnJvbSAnLi9zaGFyZWQvdmFsaWRhdG9yLmZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBKc29uUG9pbnRlciB9IGZyb20gJy4vc2hhcmVkL2pzb25wb2ludGVyLmZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBKc29uU2NoZW1hRm9ybVNlcnZpY2UgfSBmcm9tICcuL2pzb24tc2NoZW1hLWZvcm0uc2VydmljZSc7XG5pbXBvcnQgeyByZXNvbHZlU2NoZW1hUmVmZXJlbmNlcyB9IGZyb20gJy4vc2hhcmVkL2pzb24tc2NoZW1hLmZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBXaWRnZXRMaWJyYXJ5U2VydmljZSB9IGZyb20gJy4vd2lkZ2V0LWxpYnJhcnkvd2lkZ2V0LWxpYnJhcnkuc2VydmljZSc7XG5cblxuXG5leHBvcnQgY29uc3QgSlNPTl9TQ0hFTUFfRk9STV9WQUxVRV9BQ0NFU1NPUjogYW55ID0ge1xuICBwcm92aWRlOiBOR19WQUxVRV9BQ0NFU1NPUixcbiAgdXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gSnNvblNjaGVtYUZvcm1Db21wb25lbnQpLFxuICBtdWx0aTogdHJ1ZSxcbn07XG5cbi8qKlxuICogQG1vZHVsZSAnSnNvblNjaGVtYUZvcm1Db21wb25lbnQnIC0gQW5ndWxhciBKU09OIFNjaGVtYSBGb3JtXG4gKlxuICogUm9vdCBtb2R1bGUgb2YgdGhlIEFuZ3VsYXIgSlNPTiBTY2hlbWEgRm9ybSBjbGllbnQtc2lkZSBsaWJyYXJ5LFxuICogYW4gQW5ndWxhciBsaWJyYXJ5IHdoaWNoIGdlbmVyYXRlcyBhbiBIVE1MIGZvcm0gZnJvbSBhIEpTT04gc2NoZW1hXG4gKiBzdHJ1Y3R1cmVkIGRhdGEgbW9kZWwgYW5kL29yIGEgSlNPTiBTY2hlbWEgRm9ybSBsYXlvdXQgZGVzY3JpcHRpb24uXG4gKlxuICogVGhpcyBsaWJyYXJ5IGFsc28gdmFsaWRhdGVzIGlucHV0IGRhdGEgYnkgdGhlIHVzZXIsIHVzaW5nIGJvdGggdmFsaWRhdG9ycyBvblxuICogaW5kaXZpZHVhbCBjb250cm9scyB0byBwcm92aWRlIHJlYWwtdGltZSBmZWVkYmFjayB3aGlsZSB0aGUgdXNlciBpcyBmaWxsaW5nXG4gKiBvdXQgdGhlIGZvcm0sIGFuZCB0aGVuIHZhbGlkYXRpbmcgdGhlIGVudGlyZSBpbnB1dCBhZ2FpbnN0IHRoZSBzY2hlbWEgd2hlblxuICogdGhlIGZvcm0gaXMgc3VibWl0dGVkIHRvIG1ha2Ugc3VyZSB0aGUgcmV0dXJuZWQgSlNPTiBkYXRhIG9iamVjdCBpcyB2YWxpZC5cbiAqXG4gKiBUaGlzIGxpYnJhcnkgaXMgc2ltaWxhciB0bywgYW5kIG1vc3RseSBBUEkgY29tcGF0aWJsZSB3aXRoOlxuICpcbiAqIC0gSlNPTiBTY2hlbWEgRm9ybSdzIEFuZ3VsYXIgU2NoZW1hIEZvcm0gbGlicmFyeSBmb3IgQW5ndWxhckpzXG4gKiAgIGh0dHA6Ly9zY2hlbWFmb3JtLmlvXG4gKiAgIGh0dHA6Ly9zY2hlbWFmb3JtLmlvL2V4YW1wbGVzL2Jvb3RzdHJhcC1leGFtcGxlLmh0bWwgKGV4YW1wbGVzKVxuICpcbiAqIC0gTW96aWxsYSdzIHJlYWN0LWpzb25zY2hlbWEtZm9ybSBsaWJyYXJ5IGZvciBSZWFjdFxuICogICBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS1zZXJ2aWNlcy9yZWFjdC1qc29uc2NoZW1hLWZvcm1cbiAqICAgaHR0cHM6Ly9tb3ppbGxhLXNlcnZpY2VzLmdpdGh1Yi5pby9yZWFjdC1qc29uc2NoZW1hLWZvcm0gKGV4YW1wbGVzKVxuICpcbiAqIC0gSm9zaGZpcmUncyBKU09OIEZvcm0gbGlicmFyeSBmb3IgalF1ZXJ5XG4gKiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3NoZmlyZS9qc29uZm9ybVxuICogICBodHRwOi8vdWxpb24uZ2l0aHViLmlvL2pzb25mb3JtL3BsYXlncm91bmQgKGV4YW1wbGVzKVxuICpcbiAqIFRoaXMgbGlicmFyeSBkZXBlbmRzIG9uOlxuICogIC0gQW5ndWxhciAob2J2aW91c2x5KSAgICAgICAgICAgICAgICAgIGh0dHBzOi8vYW5ndWxhci5pb1xuICogIC0gbG9kYXNoLCBKYXZhU2NyaXB0IHV0aWxpdHkgbGlicmFyeSAgIGh0dHBzOi8vZ2l0aHViLmNvbS9sb2Rhc2gvbG9kYXNoXG4gKiAgLSBhanYsIEFub3RoZXIgSlNPTiBTY2hlbWEgdmFsaWRhdG9yICAgaHR0cHM6Ly9naXRodWIuY29tL2Vwb2JlcmV6a2luL2FqdlxuICpcbiAqIEluIGFkZGl0aW9uLCB0aGUgRXhhbXBsZSBQbGF5Z3JvdW5kIGFsc28gZGVwZW5kcyBvbjpcbiAqICAtIGJyYWNlLCBCcm93c2VyaWZpZWQgQWNlIGVkaXRvciAgICAgICBodHRwOi8vdGhsb3JlbnouZ2l0aHViLmlvL2JyYWNlXG4gKi9cbkBDb21wb25lbnQoe1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Y29tcG9uZW50LXNlbGVjdG9yXG4gIHNlbGVjdG9yOiAnanNvbi1zY2hlbWEtZm9ybScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGRpdiAqbmdGb3I9XCJsZXQgc3R5bGVzaGVldCBvZiBzdHlsZXNoZWV0c1wiPlxuICAgICAgPGxpbmsgcmVsPVwic3R5bGVzaGVldFwiIFtocmVmXT1cInN0eWxlc2hlZXRcIj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2ICpuZ0Zvcj1cImxldCBzY3JpcHQgb2Ygc2NyaXB0c1wiPlxuICAgICAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgW3NyY109XCJzY3JpcHRcIj48L3NjcmlwdD5cbiAgICA8L2Rpdj5cbiAgICA8Zm9ybSBjbGFzcz1cImpzb24tc2NoZW1hLWZvcm1cIiAobmdTdWJtaXQpPVwic3VibWl0Rm9ybSgpXCI+XG4gICAgICA8cm9vdC13aWRnZXQgW2xheW91dF09XCJqc2Y/LmxheW91dFwiPjwvcm9vdC13aWRnZXQ+XG4gICAgPC9mb3JtPlxuICAgIDxkaXYgKm5nSWY9XCJkZWJ1ZyB8fCBqc2Y/LmZvcm1PcHRpb25zPy5kZWJ1Z1wiPlxuICAgICAgRGVidWcgb3V0cHV0OiA8cHJlPnt7ZGVidWdPdXRwdXR9fTwvcHJlPlxuICAgIDwvZGl2PmAsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICAvLyBBZGRpbmcgJ0pzb25TY2hlbWFGb3JtU2VydmljZScgaGVyZSwgaW5zdGVhZCBvZiBpbiB0aGUgbW9kdWxlLFxuICAvLyBjcmVhdGVzIGEgc2VwYXJhdGUgaW5zdGFuY2Ugb2YgdGhlIHNlcnZpY2UgZm9yIGVhY2ggY29tcG9uZW50XG4gIHByb3ZpZGVyczogIFsgSnNvblNjaGVtYUZvcm1TZXJ2aWNlLCBKU09OX1NDSEVNQV9GT1JNX1ZBTFVFX0FDQ0VTU09SIF0sXG59KVxuZXhwb3J0IGNsYXNzIEpzb25TY2hlbWFGb3JtQ29tcG9uZW50IGltcGxlbWVudHMgQ29udHJvbFZhbHVlQWNjZXNzb3IsIE9uQ2hhbmdlcywgT25Jbml0IHtcbiAgZGVidWdPdXRwdXQ6IGFueTsgLy8gRGVidWcgaW5mb3JtYXRpb24sIGlmIHJlcXVlc3RlZFxuICBmb3JtVmFsdWVTdWJzY3JpcHRpb246IGFueSA9IG51bGw7XG4gIGZvcm1Jbml0aWFsaXplZCA9IGZhbHNlO1xuICBvYmplY3RXcmFwID0gZmFsc2U7IC8vIElzIG5vbi1vYmplY3QgaW5wdXQgc2NoZW1hIHdyYXBwZWQgaW4gYW4gb2JqZWN0P1xuXG4gIGZvcm1WYWx1ZXNJbnB1dDogc3RyaW5nOyAvLyBOYW1lIG9mIHRoZSBpbnB1dCBwcm92aWRpbmcgdGhlIGZvcm0gZGF0YVxuICBwcmV2aW91c0lucHV0czogeyAvLyBQcmV2aW91cyBpbnB1dCB2YWx1ZXMsIHRvIGRldGVjdCB3aGljaCBpbnB1dCB0cmlnZ2VycyBvbkNoYW5nZXNcbiAgICBzY2hlbWE6IGFueSwgbGF5b3V0OiBhbnlbXSwgZGF0YTogYW55LCBvcHRpb25zOiBhbnksIGZyYW1ld29yazogYW55fHN0cmluZyxcbiAgICB3aWRnZXRzOiBhbnksIGZvcm06IGFueSwgbW9kZWw6IGFueSwgSlNPTlNjaGVtYTogYW55LCBVSVNjaGVtYTogYW55LFxuICAgIGZvcm1EYXRhOiBhbnksIGxvYWRFeHRlcm5hbEFzc2V0czogYm9vbGVhbiwgZGVidWc6IGJvb2xlYW4sXG4gIH0gPSB7XG4gICAgc2NoZW1hOiBudWxsLCBsYXlvdXQ6IG51bGwsIGRhdGE6IG51bGwsIG9wdGlvbnM6IG51bGwsIGZyYW1ld29yazogbnVsbCxcbiAgICB3aWRnZXRzOiBudWxsLCBmb3JtOiBudWxsLCBtb2RlbDogbnVsbCwgSlNPTlNjaGVtYTogbnVsbCwgVUlTY2hlbWE6IG51bGwsXG4gICAgZm9ybURhdGE6IG51bGwsIGxvYWRFeHRlcm5hbEFzc2V0czogbnVsbCwgZGVidWc6IG51bGwsXG4gIH07XG5cbiAgLy8gUmVjb21tZW5kZWQgaW5wdXRzXG4gIEBJbnB1dCgpIHNjaGVtYTogYW55OyAvLyBUaGUgSlNPTiBTY2hlbWFcbiAgQElucHV0KCkgbGF5b3V0OiBhbnlbXTsgLy8gVGhlIGZvcm0gbGF5b3V0XG4gIEBJbnB1dCgpIGRhdGE6IGFueTsgLy8gVGhlIGZvcm0gZGF0YVxuICBASW5wdXQoKSBvcHRpb25zOiBhbnk7IC8vIFRoZSBnbG9iYWwgZm9ybSBvcHRpb25zXG4gIEBJbnB1dCgpIGZyYW1ld29yazogYW55fHN0cmluZzsgLy8gVGhlIGZyYW1ld29yayB0byBsb2FkXG4gIEBJbnB1dCgpIHdpZGdldHM6IGFueTsgLy8gQW55IGN1c3RvbSB3aWRnZXRzIHRvIGxvYWRcblxuICAvLyBBbHRlcm5hdGUgY29tYmluZWQgc2luZ2xlIGlucHV0XG4gIEBJbnB1dCgpIGZvcm06IGFueTsgLy8gRm9yIHRlc3RpbmcsIGFuZCBKU09OIFNjaGVtYSBGb3JtIEFQSSBjb21wYXRpYmlsaXR5XG5cbiAgLy8gQW5ndWxhciBTY2hlbWEgRm9ybSBBUEkgY29tcGF0aWJpbGl0eSBpbnB1dFxuICBASW5wdXQoKSBtb2RlbDogYW55OyAvLyBBbHRlcm5hdGUgaW5wdXQgZm9yIGZvcm0gZGF0YVxuXG4gIC8vIFJlYWN0IEpTT04gU2NoZW1hIEZvcm0gQVBJIGNvbXBhdGliaWxpdHkgaW5wdXRzXG4gIEBJbnB1dCgpIEpTT05TY2hlbWE6IGFueTsgLy8gQWx0ZXJuYXRlIGlucHV0IGZvciBKU09OIFNjaGVtYVxuICBASW5wdXQoKSBVSVNjaGVtYTogYW55OyAvLyBVSSBzY2hlbWEgLSBhbHRlcm5hdGUgZm9ybSBsYXlvdXQgZm9ybWF0XG4gIEBJbnB1dCgpIGZvcm1EYXRhOiBhbnk7IC8vIEFsdGVybmF0ZSBpbnB1dCBmb3IgZm9ybSBkYXRhXG5cbiAgQElucHV0KCkgbmdNb2RlbDogYW55OyAvLyBBbHRlcm5hdGUgaW5wdXQgZm9yIEFuZ3VsYXIgZm9ybXNcblxuICBASW5wdXQoKSBsYW5ndWFnZTogc3RyaW5nOyAvLyBMYW5ndWFnZVxuXG4gIC8vIERldmVsb3BtZW50IGlucHV0cywgZm9yIHRlc3RpbmcgYW5kIGRlYnVnZ2luZ1xuICBASW5wdXQoKSBsb2FkRXh0ZXJuYWxBc3NldHM6IGJvb2xlYW47IC8vIExvYWQgZXh0ZXJuYWwgZnJhbWV3b3JrIGFzc2V0cz9cbiAgQElucHV0KCkgZGVidWc6IGJvb2xlYW47IC8vIFNob3cgZGVidWcgaW5mb3JtYXRpb24/XG5cbiAgQElucHV0KClcbiAgZ2V0IHZhbHVlKCk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMub2JqZWN0V3JhcCA/IHRoaXMuanNmLmRhdGFbJzEnXSA6IHRoaXMuanNmLmRhdGE7XG4gIH1cbiAgc2V0IHZhbHVlKHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLnNldEZvcm1WYWx1ZXModmFsdWUsIGZhbHNlKTtcbiAgfVxuXG4gIC8vIE91dHB1dHNcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW91dHB1dC1vbi1wcmVmaXhcbiAgQE91dHB1dCgpIG9uQ2hhbmdlcyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpOyAvLyBMaXZlIHVudmFsaWRhdGVkIGludGVybmFsIGZvcm0gZGF0YVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tb3V0cHV0LW9uLXByZWZpeFxuICBAT3V0cHV0KCkgb25TdWJtaXQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTsgLy8gQ29tcGxldGUgdmFsaWRhdGVkIGZvcm0gZGF0YVxuICBAT3V0cHV0KCkgaXNWYWxpZCA9IG5ldyBFdmVudEVtaXR0ZXI8Ym9vbGVhbj4oKTsgLy8gSXMgY3VycmVudCBkYXRhIHZhbGlkP1xuICBAT3V0cHV0KCkgdmFsaWRhdGlvbkVycm9ycyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpOyAvLyBWYWxpZGF0aW9uIGVycm9ycyAoaWYgYW55KVxuICBAT3V0cHV0KCkgZm9ybVNjaGVtYSA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpOyAvLyBGaW5hbCBzY2hlbWEgdXNlZCB0byBjcmVhdGUgZm9ybVxuICBAT3V0cHV0KCkgZm9ybUxheW91dCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpOyAvLyBGaW5hbCBsYXlvdXQgdXNlZCB0byBjcmVhdGUgZm9ybVxuXG4gIC8vIE91dHB1dHMgZm9yIHBvc3NpYmxlIDItd2F5IGRhdGEgYmluZGluZ1xuICAvLyBPbmx5IHRoZSBvbmUgaW5wdXQgcHJvdmlkaW5nIHRoZSBpbml0aWFsIGZvcm0gZGF0YSB3aWxsIGJlIGJvdW5kLlxuICAvLyBJZiB0aGVyZSBpcyBubyBpbml0YWwgZGF0YSwgaW5wdXQgJ3t9JyB0byBhY3RpdmF0ZSAyLXdheSBkYXRhIGJpbmRpbmcuXG4gIC8vIFRoZXJlIGlzIG5vIDItd2F5IGJpbmRpbmcgaWYgaW5pdGFsIGRhdGEgaXMgY29tYmluZWQgaW5zaWRlIHRoZSAnZm9ybScgaW5wdXQuXG4gIEBPdXRwdXQoKSBkYXRhQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoKSBtb2RlbENoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCkgZm9ybURhdGFDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgpIG5nTW9kZWxDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcblxuICBvbkNoYW5nZTogRnVuY3Rpb247XG4gIG9uVG91Y2hlZDogRnVuY3Rpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBjaGFuZ2VEZXRlY3RvcjogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgcHJpdmF0ZSBmcmFtZXdvcmtMaWJyYXJ5OiBGcmFtZXdvcmtMaWJyYXJ5U2VydmljZSxcbiAgICBwcml2YXRlIHdpZGdldExpYnJhcnk6IFdpZGdldExpYnJhcnlTZXJ2aWNlLFxuICAgIHB1YmxpYyBqc2Y6IEpzb25TY2hlbWFGb3JtU2VydmljZSxcbiAgICBwcml2YXRlIHNhbml0aXplcjogRG9tU2FuaXRpemVyXG4gICkgeyB9XG5cbiAgZ2V0IHN0eWxlc2hlZXRzKCk6IFNhZmVSZXNvdXJjZVVybFtdIHtcbiAgICBjb25zdCBzdHlsZXNoZWV0cyA9IHRoaXMuZnJhbWV3b3JrTGlicmFyeS5nZXRGcmFtZXdvcmtTdHlsZXNoZWV0cygpO1xuICAgIGNvbnN0IGxvYWQgPSB0aGlzLnNhbml0aXplci5ieXBhc3NTZWN1cml0eVRydXN0UmVzb3VyY2VVcmw7XG4gICAgcmV0dXJuIHN0eWxlc2hlZXRzLm1hcChzdHlsZXNoZWV0ID0+IGxvYWQoc3R5bGVzaGVldCkpO1xuICB9XG5cbiAgZ2V0IHNjcmlwdHMoKTogU2FmZVJlc291cmNlVXJsW10ge1xuICAgIGNvbnN0IHNjcmlwdHMgPSB0aGlzLmZyYW1ld29ya0xpYnJhcnkuZ2V0RnJhbWV3b3JrU2NyaXB0cygpO1xuICAgIGNvbnN0IGxvYWQgPSB0aGlzLnNhbml0aXplci5ieXBhc3NTZWN1cml0eVRydXN0UmVzb3VyY2VVcmw7XG4gICAgcmV0dXJuIHNjcmlwdHMubWFwKHNjcmlwdCA9PiBsb2FkKHNjcmlwdCkpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgdGhpcy51cGRhdGVGb3JtKCk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcygpIHtcbiAgICB0aGlzLnVwZGF0ZUZvcm0oKTtcbiAgfVxuXG4gIHdyaXRlVmFsdWUodmFsdWU6IGFueSkge1xuICAgIHRoaXMuc2V0Rm9ybVZhbHVlcyh2YWx1ZSwgZmFsc2UpO1xuICAgIGlmICghdGhpcy5mb3JtVmFsdWVzSW5wdXQpIHsgdGhpcy5mb3JtVmFsdWVzSW5wdXQgPSAnbmdNb2RlbCc7IH1cbiAgfVxuXG4gIHJlZ2lzdGVyT25DaGFuZ2UoZm46IEZ1bmN0aW9uKSB7XG4gICAgdGhpcy5vbkNoYW5nZSA9IGZuO1xuICB9XG5cbiAgcmVnaXN0ZXJPblRvdWNoZWQoZm46IEZ1bmN0aW9uKSB7XG4gICAgdGhpcy5vblRvdWNoZWQgPSBmbjtcbiAgfVxuXG4gIHNldERpc2FibGVkU3RhdGUoaXNEaXNhYmxlZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLmpzZi5mb3JtT3B0aW9ucy5mb3JtRGlzYWJsZWQgIT09ICEhaXNEaXNhYmxlZCkge1xuICAgICAgdGhpcy5qc2YuZm9ybU9wdGlvbnMuZm9ybURpc2FibGVkID0gISFpc0Rpc2FibGVkO1xuICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZUZvcm0oKSB7XG4gICAgaWYgKCF0aGlzLmZvcm1Jbml0aWFsaXplZCB8fCAhdGhpcy5mb3JtVmFsdWVzSW5wdXQgfHxcbiAgICAgICh0aGlzLmxhbmd1YWdlICYmIHRoaXMubGFuZ3VhZ2UgIT09IHRoaXMuanNmLmxhbmd1YWdlKVxuICAgICkge1xuICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5sYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlICE9PSB0aGlzLmpzZi5sYW5ndWFnZSkge1xuICAgICAgICB0aGlzLmpzZi5zZXRMYW5ndWFnZSh0aGlzLmxhbmd1YWdlKTtcbiAgICAgIH1cblxuICAgICAgLy8gR2V0IG5hbWVzIG9mIGNoYW5nZWQgaW5wdXRzXG4gICAgICBsZXQgY2hhbmdlZElucHV0ID0gT2JqZWN0LmtleXModGhpcy5wcmV2aW91c0lucHV0cylcbiAgICAgICAgLmZpbHRlcihpbnB1dCA9PiB0aGlzLnByZXZpb3VzSW5wdXRzW2lucHV0XSAhPT0gdGhpc1tpbnB1dF0pO1xuICAgICAgbGV0IHJlc2V0Rmlyc3QgPSB0cnVlO1xuICAgICAgaWYgKGNoYW5nZWRJbnB1dC5sZW5ndGggPT09IDEgJiYgY2hhbmdlZElucHV0WzBdID09PSAnZm9ybScgJiZcbiAgICAgICAgdGhpcy5mb3JtVmFsdWVzSW5wdXQuc3RhcnRzV2l0aCgnZm9ybS4nKVxuICAgICAgKSB7XG4gICAgICAgIC8vIElmIG9ubHkgJ2Zvcm0nIGlucHV0IGNoYW5nZWQsIGdldCBuYW1lcyBvZiBjaGFuZ2VkIGtleXNcbiAgICAgICAgY2hhbmdlZElucHV0ID0gT2JqZWN0LmtleXModGhpcy5wcmV2aW91c0lucHV0cy5mb3JtIHx8IHt9KVxuICAgICAgICAgIC5maWx0ZXIoa2V5ID0+ICFpc0VxdWFsKHRoaXMucHJldmlvdXNJbnB1dHMuZm9ybVtrZXldLCB0aGlzLmZvcm1ba2V5XSkpXG4gICAgICAgICAgLm1hcChrZXkgPT4gYGZvcm0uJHtrZXl9YCk7XG4gICAgICAgIHJlc2V0Rmlyc3QgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgb25seSBpbnB1dCB2YWx1ZXMgaGF2ZSBjaGFuZ2VkLCB1cGRhdGUgdGhlIGZvcm0gdmFsdWVzXG4gICAgICBpZiAoY2hhbmdlZElucHV0Lmxlbmd0aCA9PT0gMSAmJiBjaGFuZ2VkSW5wdXRbMF0gPT09IHRoaXMuZm9ybVZhbHVlc0lucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLmZvcm1WYWx1ZXNJbnB1dC5pbmRleE9mKCcuJykgPT09IC0xKSB7XG4gICAgICAgICAgdGhpcy5zZXRGb3JtVmFsdWVzKHRoaXNbdGhpcy5mb3JtVmFsdWVzSW5wdXRdLCByZXNldEZpcnN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBbaW5wdXQsIGtleV0gPSB0aGlzLmZvcm1WYWx1ZXNJbnB1dC5zcGxpdCgnLicpO1xuICAgICAgICAgIHRoaXMuc2V0Rm9ybVZhbHVlcyh0aGlzW2lucHV0XVtrZXldLCByZXNldEZpcnN0KTtcbiAgICAgICAgfVxuXG4gICAgICAvLyBJZiBhbnl0aGluZyBlbHNlIGhhcyBjaGFuZ2VkLCByZS1yZW5kZXIgdGhlIGVudGlyZSBmb3JtXG4gICAgICB9IGVsc2UgaWYgKGNoYW5nZWRJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBpZiAodGhpcy5vbkNoYW5nZSkgeyB0aGlzLm9uQ2hhbmdlKHRoaXMuanNmLmZvcm1WYWx1ZXMpOyB9XG4gICAgICAgIGlmICh0aGlzLm9uVG91Y2hlZCkgeyB0aGlzLm9uVG91Y2hlZCh0aGlzLmpzZi5mb3JtVmFsdWVzKTsgfVxuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgcHJldmlvdXMgaW5wdXRzXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLnByZXZpb3VzSW5wdXRzKVxuICAgICAgICAuZmlsdGVyKGlucHV0ID0+IHRoaXMucHJldmlvdXNJbnB1dHNbaW5wdXRdICE9PSB0aGlzW2lucHV0XSlcbiAgICAgICAgLmZvckVhY2goaW5wdXQgPT4gdGhpcy5wcmV2aW91c0lucHV0c1tpbnB1dF0gPSB0aGlzW2lucHV0XSk7XG4gICAgfVxuICB9XG5cbiAgc2V0Rm9ybVZhbHVlcyhmb3JtVmFsdWVzOiBhbnksIHJlc2V0Rmlyc3QgPSB0cnVlKSB7XG4gICAgaWYgKGZvcm1WYWx1ZXMpIHtcbiAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSB0aGlzLm9iamVjdFdyYXAgPyBmb3JtVmFsdWVzWycxJ10gOiBmb3JtVmFsdWVzO1xuICAgICAgaWYgKCF0aGlzLmpzZi5mb3JtR3JvdXApIHtcbiAgICAgICAgdGhpcy5qc2YuZm9ybVZhbHVlcyA9IGZvcm1WYWx1ZXM7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVGb3JtKCk7XG4gICAgICB9IGVsc2UgaWYgKHJlc2V0Rmlyc3QpIHtcbiAgICAgICAgdGhpcy5qc2YuZm9ybUdyb3VwLnJlc2V0KCk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5qc2YuZm9ybUdyb3VwKSB7XG4gICAgICAgIHRoaXMuanNmLmZvcm1Hcm91cC5wYXRjaFZhbHVlKG5ld0Zvcm1WYWx1ZXMpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub25DaGFuZ2UpIHsgdGhpcy5vbkNoYW5nZShuZXdGb3JtVmFsdWVzKTsgfVxuICAgICAgaWYgKHRoaXMub25Ub3VjaGVkKSB7IHRoaXMub25Ub3VjaGVkKG5ld0Zvcm1WYWx1ZXMpOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuanNmLmZvcm1Hcm91cC5yZXNldCgpO1xuICAgIH1cbiAgfVxuXG4gIHN1Ym1pdEZvcm0oKSB7XG4gICAgY29uc3QgdmFsaWREYXRhID0gdGhpcy5qc2YudmFsaWREYXRhO1xuICAgIHRoaXMub25TdWJtaXQuZW1pdCh0aGlzLm9iamVjdFdyYXAgPyB2YWxpZERhdGFbJzEnXSA6IHZhbGlkRGF0YSk7XG4gIH1cblxuICAvKipcbiAgICogJ2luaXRpYWxpemVGb3JtJyBmdW5jdGlvblxuICAgKlxuICAgKiAtIFVwZGF0ZSAnc2NoZW1hJywgJ2xheW91dCcsIGFuZCAnZm9ybVZhbHVlcycsIGZyb20gaW5wdXRzLlxuICAgKlxuICAgKiAtIENyZWF0ZSAnc2NoZW1hUmVmTGlicmFyeScgYW5kICdzY2hlbWFSZWN1cnNpdmVSZWZNYXAnXG4gICAqICAgdG8gcmVzb2x2ZSBzY2hlbWEgJHJlZiBsaW5rcywgaW5jbHVkaW5nIHJlY3Vyc2l2ZSAkcmVmIGxpbmtzLlxuICAgKlxuICAgKiAtIENyZWF0ZSAnZGF0YVJlY3Vyc2l2ZVJlZk1hcCcgdG8gcmVzb2x2ZSByZWN1cnNpdmUgbGlua3MgaW4gZGF0YVxuICAgKiAgIGFuZCBjb3JlY3RseSBzZXQgb3V0cHV0IGZvcm1hdHMgZm9yIHJlY3Vyc2l2ZWx5IG5lc3RlZCB2YWx1ZXMuXG4gICAqXG4gICAqIC0gQ3JlYXRlICdsYXlvdXRSZWZMaWJyYXJ5JyBhbmQgJ3RlbXBsYXRlUmVmTGlicmFyeScgdG8gc3RvcmVcbiAgICogICBuZXcgbGF5b3V0IG5vZGVzIGFuZCBmb3JtR3JvdXAgZWxlbWVudHMgdG8gdXNlIHdoZW4gZHluYW1pY2FsbHlcbiAgICogICBhZGRpbmcgZm9ybSBjb21wb25lbnRzIHRvIGFycmF5cyBhbmQgcmVjdXJzaXZlICRyZWYgcG9pbnRzLlxuICAgKlxuICAgKiAtIENyZWF0ZSAnZGF0YU1hcCcgdG8gbWFwIHRoZSBkYXRhIHRvIHRoZSBzY2hlbWEgYW5kIHRlbXBsYXRlLlxuICAgKlxuICAgKiAtIENyZWF0ZSB0aGUgbWFzdGVyICdmb3JtR3JvdXBUZW1wbGF0ZScgdGhlbiBmcm9tIGl0ICdmb3JtR3JvdXAnXG4gICAqICAgdGhlIEFuZ3VsYXIgZm9ybUdyb3VwIHVzZWQgdG8gY29udHJvbCB0aGUgcmVhY3RpdmUgZm9ybS5cbiAgICovXG4gIGluaXRpYWxpemVGb3JtKCkge1xuICAgIGlmIChcbiAgICAgIHRoaXMuc2NoZW1hIHx8IHRoaXMubGF5b3V0IHx8IHRoaXMuZGF0YSB8fCB0aGlzLmZvcm0gfHwgdGhpcy5tb2RlbCB8fFxuICAgICAgdGhpcy5KU09OU2NoZW1hIHx8IHRoaXMuVUlTY2hlbWEgfHwgdGhpcy5mb3JtRGF0YSB8fCB0aGlzLm5nTW9kZWwgfHxcbiAgICAgIHRoaXMuanNmLmRhdGFcbiAgICApIHtcblxuICAgICAgdGhpcy5qc2YucmVzZXRBbGxWYWx1ZXMoKTsgIC8vIFJlc2V0IGFsbCBmb3JtIHZhbHVlcyB0byBkZWZhdWx0c1xuICAgICAgdGhpcy5pbml0aWFsaXplT3B0aW9ucygpOyAgIC8vIFVwZGF0ZSBvcHRpb25zXG4gICAgICB0aGlzLmluaXRpYWxpemVTY2hlbWEoKTsgICAgLy8gVXBkYXRlIHNjaGVtYSwgc2NoZW1hUmVmTGlicmFyeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzY2hlbWFSZWN1cnNpdmVSZWZNYXAsICYgZGF0YVJlY3Vyc2l2ZVJlZk1hcFxuICAgICAgdGhpcy5pbml0aWFsaXplTGF5b3V0KCk7ICAgIC8vIFVwZGF0ZSBsYXlvdXQsIGxheW91dFJlZkxpYnJhcnksXG4gICAgICB0aGlzLmluaXRpYWxpemVEYXRhKCk7ICAgICAgLy8gVXBkYXRlIGZvcm1WYWx1ZXNcbiAgICAgIHRoaXMuYWN0aXZhdGVGb3JtKCk7ICAgICAgICAvLyBVcGRhdGUgZGF0YU1hcCwgdGVtcGxhdGVSZWZMaWJyYXJ5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvcm1Hcm91cFRlbXBsYXRlLCBmb3JtR3JvdXBcblxuICAgICAgLy8gVW5jb21tZW50IGluZGl2aWR1YWwgbGluZXMgdG8gb3V0cHV0IGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0byBjb25zb2xlOlxuICAgICAgLy8gKFRoZXNlIGFsd2F5cyB3b3JrLilcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdsb2FkaW5nIGZvcm0uLi4nKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdzY2hlbWEnLCB0aGlzLmpzZi5zY2hlbWEpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2xheW91dCcsIHRoaXMuanNmLmxheW91dCk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnb3B0aW9ucycsIHRoaXMub3B0aW9ucyk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZm9ybVZhbHVlcycsIHRoaXMuanNmLmZvcm1WYWx1ZXMpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2Zvcm1Hcm91cFRlbXBsYXRlJywgdGhpcy5qc2YuZm9ybUdyb3VwVGVtcGxhdGUpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2Zvcm1Hcm91cCcsIHRoaXMuanNmLmZvcm1Hcm91cCk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZm9ybUdyb3VwLnZhbHVlJywgdGhpcy5qc2YuZm9ybUdyb3VwLnZhbHVlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdzY2hlbWFSZWZMaWJyYXJ5JywgdGhpcy5qc2Yuc2NoZW1hUmVmTGlicmFyeSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnbGF5b3V0UmVmTGlicmFyeScsIHRoaXMuanNmLmxheW91dFJlZkxpYnJhcnkpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ3RlbXBsYXRlUmVmTGlicmFyeScsIHRoaXMuanNmLnRlbXBsYXRlUmVmTGlicmFyeSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZGF0YU1hcCcsIHRoaXMuanNmLmRhdGFNYXApO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2FycmF5TWFwJywgdGhpcy5qc2YuYXJyYXlNYXApO1xuICAgICAgLy8gY29uc29sZS5sb2coJ3NjaGVtYVJlY3Vyc2l2ZVJlZk1hcCcsIHRoaXMuanNmLnNjaGVtYVJlY3Vyc2l2ZVJlZk1hcCk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZGF0YVJlY3Vyc2l2ZVJlZk1hcCcsIHRoaXMuanNmLmRhdGFSZWN1cnNpdmVSZWZNYXApO1xuXG4gICAgICAvLyBVbmNvbW1lbnQgaW5kaXZpZHVhbCBsaW5lcyB0byBvdXRwdXQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRvIGJyb3dzZXI6XG4gICAgICAvLyAoVGhlc2Ugb25seSB3b3JrIGlmIHRoZSAnZGVidWcnIG9wdGlvbiBoYXMgYWxzbyBiZWVuIHNldCB0byAndHJ1ZScuKVxuICAgICAgaWYgKHRoaXMuZGVidWcgfHwgdGhpcy5qc2YuZm9ybU9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgY29uc3QgdmFyczogYW55W10gPSBbXTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLnNjaGVtYSk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5sYXlvdXQpO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5vcHRpb25zKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmZvcm1WYWx1ZXMpO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5qc2YuZm9ybUdyb3VwLnZhbHVlKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmZvcm1Hcm91cFRlbXBsYXRlKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmZvcm1Hcm91cCk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5zY2hlbWFSZWZMaWJyYXJ5KTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmxheW91dFJlZkxpYnJhcnkpO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5qc2YudGVtcGxhdGVSZWZMaWJyYXJ5KTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmRhdGFNYXApO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5qc2YuYXJyYXlNYXApO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5qc2Yuc2NoZW1hUmVjdXJzaXZlUmVmTWFwKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmRhdGFSZWN1cnNpdmVSZWZNYXApO1xuICAgICAgICB0aGlzLmRlYnVnT3V0cHV0ID0gdmFycy5tYXAodiA9PiBKU09OLnN0cmluZ2lmeSh2LCBudWxsLCAyKSkuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICdpbml0aWFsaXplT3B0aW9ucycgZnVuY3Rpb25cbiAgICpcbiAgICogSW5pdGlhbGl6ZSAnb3B0aW9ucycgKGdsb2JhbCBmb3JtIG9wdGlvbnMpIGFuZCBzZXQgZnJhbWV3b3JrXG4gICAqIENvbWJpbmUgYXZhaWxhYmxlIGlucHV0czpcbiAgICogMS4gb3B0aW9ucyAtIHJlY29tbWVuZGVkXG4gICAqIDIuIGZvcm0ub3B0aW9ucyAtIFNpbmdsZSBpbnB1dCBzdHlsZVxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplT3B0aW9ucygpIHtcbiAgICBpZiAodGhpcy5sYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlICE9PSB0aGlzLmpzZi5sYW5ndWFnZSkge1xuICAgICAgdGhpcy5qc2Yuc2V0TGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgfVxuICAgIHRoaXMuanNmLnNldE9wdGlvbnMoeyBkZWJ1ZzogISF0aGlzLmRlYnVnIH0pO1xuICAgIGxldCBsb2FkRXh0ZXJuYWxBc3NldHM6IGJvb2xlYW4gPSB0aGlzLmxvYWRFeHRlcm5hbEFzc2V0cyB8fCBmYWxzZTtcbiAgICBsZXQgZnJhbWV3b3JrOiBhbnkgPSB0aGlzLmZyYW1ld29yayB8fCAnZGVmYXVsdCc7XG4gICAgaWYgKGlzT2JqZWN0KHRoaXMub3B0aW9ucykpIHtcbiAgICAgIHRoaXMuanNmLnNldE9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICAgIGxvYWRFeHRlcm5hbEFzc2V0cyA9IHRoaXMub3B0aW9ucy5sb2FkRXh0ZXJuYWxBc3NldHMgfHwgbG9hZEV4dGVybmFsQXNzZXRzO1xuICAgICAgZnJhbWV3b3JrID0gdGhpcy5vcHRpb25zLmZyYW1ld29yayB8fCBmcmFtZXdvcms7XG4gICAgfVxuICAgIGlmIChpc09iamVjdCh0aGlzLmZvcm0pICYmIGlzT2JqZWN0KHRoaXMuZm9ybS5vcHRpb25zKSkge1xuICAgICAgdGhpcy5qc2Yuc2V0T3B0aW9ucyh0aGlzLmZvcm0ub3B0aW9ucyk7XG4gICAgICBsb2FkRXh0ZXJuYWxBc3NldHMgPSB0aGlzLmZvcm0ub3B0aW9ucy5sb2FkRXh0ZXJuYWxBc3NldHMgfHwgbG9hZEV4dGVybmFsQXNzZXRzO1xuICAgICAgZnJhbWV3b3JrID0gdGhpcy5mb3JtLm9wdGlvbnMuZnJhbWV3b3JrIHx8IGZyYW1ld29yaztcbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KHRoaXMud2lkZ2V0cykpIHtcbiAgICAgIHRoaXMuanNmLnNldE9wdGlvbnMoeyB3aWRnZXRzOiB0aGlzLndpZGdldHMgfSk7XG4gICAgfVxuICAgIHRoaXMuZnJhbWV3b3JrTGlicmFyeS5zZXRMb2FkRXh0ZXJuYWxBc3NldHMobG9hZEV4dGVybmFsQXNzZXRzKTtcbiAgICB0aGlzLmZyYW1ld29ya0xpYnJhcnkuc2V0RnJhbWV3b3JrKGZyYW1ld29yayk7XG4gICAgdGhpcy5qc2YuZnJhbWV3b3JrID0gdGhpcy5mcmFtZXdvcmtMaWJyYXJ5LmdldEZyYW1ld29yaygpO1xuICAgIGlmIChpc09iamVjdCh0aGlzLmpzZi5mb3JtT3B0aW9ucy53aWRnZXRzKSkge1xuICAgICAgZm9yIChjb25zdCB3aWRnZXQgb2YgT2JqZWN0LmtleXModGhpcy5qc2YuZm9ybU9wdGlvbnMud2lkZ2V0cykpIHtcbiAgICAgICAgdGhpcy53aWRnZXRMaWJyYXJ5LnJlZ2lzdGVyV2lkZ2V0KHdpZGdldCwgdGhpcy5qc2YuZm9ybU9wdGlvbnMud2lkZ2V0c1t3aWRnZXRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KHRoaXMuZm9ybSkgJiYgaXNPYmplY3QodGhpcy5mb3JtLnRwbGRhdGEpKSB7XG4gICAgICB0aGlzLmpzZi5zZXRUcGxkYXRhKHRoaXMuZm9ybS50cGxkYXRhKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogJ2luaXRpYWxpemVTY2hlbWEnIGZ1bmN0aW9uXG4gICAqXG4gICAqIEluaXRpYWxpemUgJ3NjaGVtYSdcbiAgICogVXNlIGZpcnN0IGF2YWlsYWJsZSBpbnB1dDpcbiAgICogMS4gc2NoZW1hIC0gcmVjb21tZW5kZWQgLyBBbmd1bGFyIFNjaGVtYSBGb3JtIHN0eWxlXG4gICAqIDIuIGZvcm0uc2NoZW1hIC0gU2luZ2xlIGlucHV0IC8gSlNPTiBGb3JtIHN0eWxlXG4gICAqIDMuIEpTT05TY2hlbWEgLSBSZWFjdCBKU09OIFNjaGVtYSBGb3JtIHN0eWxlXG4gICAqIDQuIGZvcm0uSlNPTlNjaGVtYSAtIEZvciB0ZXN0aW5nIHNpbmdsZSBpbnB1dCBSZWFjdCBKU09OIFNjaGVtYSBGb3Jtc1xuICAgKiA1LiBmb3JtIC0gRm9yIHRlc3Rpbmcgc2luZ2xlIHNjaGVtYS1vbmx5IGlucHV0c1xuICAgKlxuICAgKiAuLi4gaWYgbm8gc2NoZW1hIGlucHV0IGZvdW5kLCB0aGUgJ2FjdGl2YXRlRm9ybScgZnVuY3Rpb24sIGJlbG93LFxuICAgKiAgICAgd2lsbCBtYWtlIHR3byBhZGRpdGlvbmFsIGF0dGVtcHRzIHRvIGJ1aWxkIGEgc2NoZW1hXG4gICAqIDYuIElmIGxheW91dCBpbnB1dCAtIGJ1aWxkIHNjaGVtYSBmcm9tIGxheW91dFxuICAgKiA3LiBJZiBkYXRhIGlucHV0IC0gYnVpbGQgc2NoZW1hIGZyb20gZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplU2NoZW1hKCkge1xuXG4gICAgLy8gVE9ETzogdXBkYXRlIHRvIGFsbG93IG5vbi1vYmplY3Qgc2NoZW1hc1xuXG4gICAgaWYgKGlzT2JqZWN0KHRoaXMuc2NoZW1hKSkge1xuICAgICAgdGhpcy5qc2YuQW5ndWxhclNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLnNjaGVtYSA9IGNsb25lRGVlcCh0aGlzLnNjaGVtYSk7XG4gICAgfSBlbHNlIGlmIChoYXNPd24odGhpcy5mb3JtLCAnc2NoZW1hJykgJiYgaXNPYmplY3QodGhpcy5mb3JtLnNjaGVtYSkpIHtcbiAgICAgIHRoaXMuanNmLnNjaGVtYSA9IGNsb25lRGVlcCh0aGlzLmZvcm0uc2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuSlNPTlNjaGVtYSkpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLnNjaGVtYSA9IGNsb25lRGVlcCh0aGlzLkpTT05TY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoaGFzT3duKHRoaXMuZm9ybSwgJ0pTT05TY2hlbWEnKSAmJiBpc09iamVjdCh0aGlzLmZvcm0uSlNPTlNjaGVtYSkpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLnNjaGVtYSA9IGNsb25lRGVlcCh0aGlzLmZvcm0uSlNPTlNjaGVtYSk7XG4gICAgfSBlbHNlIGlmIChoYXNPd24odGhpcy5mb3JtLCAncHJvcGVydGllcycpICYmIGlzT2JqZWN0KHRoaXMuZm9ybS5wcm9wZXJ0aWVzKSkge1xuICAgICAgdGhpcy5qc2Yuc2NoZW1hID0gY2xvbmVEZWVwKHRoaXMuZm9ybSk7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdCh0aGlzLmZvcm0pKSB7XG4gICAgICAvLyBUT0RPOiBIYW5kbGUgb3RoZXIgdHlwZXMgb2YgZm9ybSBpbnB1dFxuICAgIH1cblxuICAgIGlmICghaXNFbXB0eSh0aGlzLmpzZi5zY2hlbWEpKSB7XG5cbiAgICAgIC8vIElmIG90aGVyIHR5cGVzIGFsc28gYWxsb3dlZCwgcmVuZGVyIHNjaGVtYSBhcyBhbiBvYmplY3RcbiAgICAgIGlmIChpbkFycmF5KCdvYmplY3QnLCB0aGlzLmpzZi5zY2hlbWEudHlwZSkpIHtcbiAgICAgICAgdGhpcy5qc2Yuc2NoZW1hLnR5cGUgPSAnb2JqZWN0JztcbiAgICAgIH1cblxuICAgICAgLy8gV3JhcCBub24tb2JqZWN0IHNjaGVtYXMgaW4gb2JqZWN0LlxuICAgICAgaWYgKGhhc093bih0aGlzLmpzZi5zY2hlbWEsICd0eXBlJykgJiYgdGhpcy5qc2Yuc2NoZW1hLnR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMuanNmLnNjaGVtYSA9IHtcbiAgICAgICAgICAndHlwZSc6ICdvYmplY3QnLFxuICAgICAgICAgICdwcm9wZXJ0aWVzJzogeyAxOiB0aGlzLmpzZi5zY2hlbWEgfVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLm9iamVjdFdyYXAgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmICghaGFzT3duKHRoaXMuanNmLnNjaGVtYSwgJ3R5cGUnKSkge1xuXG4gICAgICAgIC8vIEFkZCB0eXBlID0gJ29iamVjdCcgaWYgbWlzc2luZ1xuICAgICAgICBpZiAoaXNPYmplY3QodGhpcy5qc2Yuc2NoZW1hLnByb3BlcnRpZXMpIHx8XG4gICAgICAgICAgaXNPYmplY3QodGhpcy5qc2Yuc2NoZW1hLnBhdHRlcm5Qcm9wZXJ0aWVzKSB8fFxuICAgICAgICAgIGlzT2JqZWN0KHRoaXMuanNmLnNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcylcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5qc2Yuc2NoZW1hLnR5cGUgPSAnb2JqZWN0JztcblxuICAgICAgICAvLyBGaXggSlNPTiBzY2hlbWEgc2hvcnRoYW5kIChKU09OIEZvcm0gc3R5bGUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5qc2YuSnNvbkZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmpzZi5zY2hlbWEgPSB7XG4gICAgICAgICAgICAndHlwZSc6ICdvYmplY3QnLFxuICAgICAgICAgICAgJ3Byb3BlcnRpZXMnOiB0aGlzLmpzZi5zY2hlbWFcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG5lZWRlZCwgdXBkYXRlIEpTT04gU2NoZW1hIHRvIGRyYWZ0IDYgZm9ybWF0LCBpbmNsdWRpbmdcbiAgICAgIC8vIGRyYWZ0IDMgKEpTT04gRm9ybSBzdHlsZSkgYW5kIGRyYWZ0IDQgKEFuZ3VsYXIgU2NoZW1hIEZvcm0gc3R5bGUpXG4gICAgICB0aGlzLmpzZi5zY2hlbWEgPSBjb252ZXJ0U2NoZW1hVG9EcmFmdDYodGhpcy5qc2Yuc2NoZW1hKTtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSBhanYgYW5kIGNvbXBpbGUgc2NoZW1hXG4gICAgICB0aGlzLmpzZi5jb21waWxlQWp2U2NoZW1hKCk7XG5cbiAgICAgIC8vIENyZWF0ZSBzY2hlbWFSZWZMaWJyYXJ5LCBzY2hlbWFSZWN1cnNpdmVSZWZNYXAsIGRhdGFSZWN1cnNpdmVSZWZNYXAsICYgYXJyYXlNYXBcbiAgICAgIHRoaXMuanNmLnNjaGVtYSA9IHJlc29sdmVTY2hlbWFSZWZlcmVuY2VzKFxuICAgICAgICB0aGlzLmpzZi5zY2hlbWEsIHRoaXMuanNmLnNjaGVtYVJlZkxpYnJhcnksIHRoaXMuanNmLnNjaGVtYVJlY3Vyc2l2ZVJlZk1hcCxcbiAgICAgICAgdGhpcy5qc2YuZGF0YVJlY3Vyc2l2ZVJlZk1hcCwgdGhpcy5qc2YuYXJyYXlNYXBcbiAgICAgICk7XG4gICAgICBpZiAoaGFzT3duKHRoaXMuanNmLnNjaGVtYVJlZkxpYnJhcnksICcnKSkge1xuICAgICAgICB0aGlzLmpzZi5oYXNSb290UmVmZXJlbmNlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogKD8pIFJlc29sdmUgZXh0ZXJuYWwgJHJlZiBsaW5rc1xuICAgICAgLy8gLy8gQ3JlYXRlIHNjaGVtYVJlZkxpYnJhcnkgJiBzY2hlbWFSZWN1cnNpdmVSZWZNYXBcbiAgICAgIC8vIHRoaXMucGFyc2VyLmJ1bmRsZSh0aGlzLnNjaGVtYSlcbiAgICAgIC8vICAgLnRoZW4oc2NoZW1hID0+IHRoaXMuc2NoZW1hID0gcmVzb2x2ZVNjaGVtYVJlZmVyZW5jZXMoXG4gICAgICAvLyAgICAgc2NoZW1hLCB0aGlzLmpzZi5zY2hlbWFSZWZMaWJyYXJ5LFxuICAgICAgLy8gICAgIHRoaXMuanNmLnNjaGVtYVJlY3Vyc2l2ZVJlZk1hcCwgdGhpcy5qc2YuZGF0YVJlY3Vyc2l2ZVJlZk1hcFxuICAgICAgLy8gICApKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogJ2luaXRpYWxpemVEYXRhJyBmdW5jdGlvblxuICAgKlxuICAgKiBJbml0aWFsaXplICdmb3JtVmFsdWVzJ1xuICAgKiBkZWZ1bGF0IG9yIHByZXZpb3VzbHkgc3VibWl0dGVkIHZhbHVlcyB1c2VkIHRvIHBvcHVsYXRlIGZvcm1cbiAgICogVXNlIGZpcnN0IGF2YWlsYWJsZSBpbnB1dDpcbiAgICogMS4gZGF0YSAtIHJlY29tbWVuZGVkXG4gICAqIDIuIG1vZGVsIC0gQW5ndWxhciBTY2hlbWEgRm9ybSBzdHlsZVxuICAgKiAzLiBmb3JtLnZhbHVlIC0gSlNPTiBGb3JtIHN0eWxlXG4gICAqIDQuIGZvcm0uZGF0YSAtIFNpbmdsZSBpbnB1dCBzdHlsZVxuICAgKiA1LiBmb3JtRGF0YSAtIFJlYWN0IEpTT04gU2NoZW1hIEZvcm0gc3R5bGVcbiAgICogNi4gZm9ybS5mb3JtRGF0YSAtIEZvciBlYXNpZXIgdGVzdGluZyBvZiBSZWFjdCBKU09OIFNjaGVtYSBGb3Jtc1xuICAgKiA3LiAobm9uZSkgbm8gZGF0YSAtIGluaXRpYWxpemUgZGF0YSBmcm9tIHNjaGVtYSBhbmQgbGF5b3V0IGRlZmF1bHRzIG9ubHlcbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZURhdGEoKSB7XG4gICAgaWYgKGhhc1ZhbHVlKHRoaXMuZGF0YSkpIHtcbiAgICAgIHRoaXMuanNmLmZvcm1WYWx1ZXMgPSBjbG9uZURlZXAodGhpcy5kYXRhKTtcbiAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ2RhdGEnO1xuICAgIH0gZWxzZSBpZiAoaGFzVmFsdWUodGhpcy5tb2RlbCkpIHtcbiAgICAgIHRoaXMuanNmLkFuZ3VsYXJTY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5mb3JtVmFsdWVzID0gY2xvbmVEZWVwKHRoaXMubW9kZWwpO1xuICAgICAgdGhpcy5mb3JtVmFsdWVzSW5wdXQgPSAnbW9kZWwnO1xuICAgIH0gZWxzZSBpZiAoaGFzVmFsdWUodGhpcy5uZ01vZGVsKSkge1xuICAgICAgdGhpcy5qc2YuQW5ndWxhclNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLmZvcm1WYWx1ZXMgPSBjbG9uZURlZXAodGhpcy5uZ01vZGVsKTtcbiAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ25nTW9kZWwnO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodGhpcy5mb3JtKSAmJiBoYXNWYWx1ZSh0aGlzLmZvcm0udmFsdWUpKSB7XG4gICAgICB0aGlzLmpzZi5Kc29uRm9ybUNvbXBhdGliaWxpdHkgPSB0cnVlO1xuICAgICAgdGhpcy5qc2YuZm9ybVZhbHVlcyA9IGNsb25lRGVlcCh0aGlzLmZvcm0udmFsdWUpO1xuICAgICAgdGhpcy5mb3JtVmFsdWVzSW5wdXQgPSAnZm9ybS52YWx1ZSc7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdCh0aGlzLmZvcm0pICYmIGhhc1ZhbHVlKHRoaXMuZm9ybS5kYXRhKSkge1xuICAgICAgdGhpcy5qc2YuZm9ybVZhbHVlcyA9IGNsb25lRGVlcCh0aGlzLmZvcm0uZGF0YSk7XG4gICAgICB0aGlzLmZvcm1WYWx1ZXNJbnB1dCA9ICdmb3JtLmRhdGEnO1xuICAgIH0gZWxzZSBpZiAoaGFzVmFsdWUodGhpcy5mb3JtRGF0YSkpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ2Zvcm1EYXRhJztcbiAgICB9IGVsc2UgaWYgKGhhc093bih0aGlzLmZvcm0sICdmb3JtRGF0YScpICYmIGhhc1ZhbHVlKHRoaXMuZm9ybS5mb3JtRGF0YSkpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLmZvcm1WYWx1ZXMgPSBjbG9uZURlZXAodGhpcy5mb3JtLmZvcm1EYXRhKTtcbiAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ2Zvcm0uZm9ybURhdGEnO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZvcm1WYWx1ZXNJbnB1dCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICdpbml0aWFsaXplTGF5b3V0JyBmdW5jdGlvblxuICAgKlxuICAgKiBJbml0aWFsaXplICdsYXlvdXQnXG4gICAqIFVzZSBmaXJzdCBhdmFpbGFibGUgYXJyYXkgaW5wdXQ6XG4gICAqIDEuIGxheW91dCAtIHJlY29tbWVuZGVkXG4gICAqIDIuIGZvcm0gLSBBbmd1bGFyIFNjaGVtYSBGb3JtIHN0eWxlXG4gICAqIDMuIGZvcm0uZm9ybSAtIEpTT04gRm9ybSBzdHlsZVxuICAgKiA0LiBmb3JtLmxheW91dCAtIFNpbmdsZSBpbnB1dCBzdHlsZVxuICAgKiA1LiAobm9uZSkgbm8gbGF5b3V0IC0gc2V0IGRlZmF1bHQgbGF5b3V0IGluc3RlYWRcbiAgICogICAgKGZ1bGwgbGF5b3V0IHdpbGwgYmUgYnVpbHQgbGF0ZXIgZnJvbSB0aGUgc2NoZW1hKVxuICAgKlxuICAgKiBBbHNvLCBpZiBhbHRlcm5hdGUgbGF5b3V0IGZvcm1hdHMgYXJlIGF2YWlsYWJsZSxcbiAgICogaW1wb3J0IGZyb20gJ1VJU2NoZW1hJyBvciAnY3VzdG9tRm9ybUl0ZW1zJ1xuICAgKiB1c2VkIGZvciBSZWFjdCBKU09OIFNjaGVtYSBGb3JtIGFuZCBKU09OIEZvcm0gQVBJIGNvbXBhdGliaWxpdHlcbiAgICogVXNlIGZpcnN0IGF2YWlsYWJsZSBpbnB1dDpcbiAgICogMS4gVUlTY2hlbWEgLSBSZWFjdCBKU09OIFNjaGVtYSBGb3JtIHN0eWxlXG4gICAqIDIuIGZvcm0uVUlTY2hlbWEgLSBGb3IgdGVzdGluZyBzaW5nbGUgaW5wdXQgUmVhY3QgSlNPTiBTY2hlbWEgRm9ybXNcbiAgICogMi4gZm9ybS5jdXN0b21Gb3JtSXRlbXMgLSBKU09OIEZvcm0gc3R5bGVcbiAgICogMy4gKG5vbmUpIG5vIGlucHV0IC0gZG9uJ3QgaW1wb3J0XG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVMYXlvdXQoKSB7XG5cbiAgICAvLyBSZW5hbWUgSlNPTiBGb3JtLXN0eWxlICdvcHRpb25zJyBsaXN0cyB0b1xuICAgIC8vIEFuZ3VsYXIgU2NoZW1hIEZvcm0tc3R5bGUgJ3RpdGxlTWFwJyBsaXN0cy5cbiAgICBjb25zdCBmaXhKc29uRm9ybU9wdGlvbnMgPSAobGF5b3V0OiBhbnkpOiBhbnkgPT4ge1xuICAgICAgaWYgKGlzT2JqZWN0KGxheW91dCkgfHwgaXNBcnJheShsYXlvdXQpKSB7XG4gICAgICAgIGZvckVhY2gobGF5b3V0LCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgIGlmIChoYXNPd24odmFsdWUsICdvcHRpb25zJykgJiYgaXNPYmplY3QodmFsdWUub3B0aW9ucykpIHtcbiAgICAgICAgICAgIHZhbHVlLnRpdGxlTWFwID0gdmFsdWUub3B0aW9ucztcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZS5vcHRpb25zO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgJ3RvcC1kb3duJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGF5b3V0O1xuICAgIH07XG5cbiAgICAvLyBDaGVjayBmb3IgbGF5b3V0IGlucHV0cyBhbmQsIGlmIGZvdW5kLCBpbml0aWFsaXplIGZvcm0gbGF5b3V0XG4gICAgaWYgKGlzQXJyYXkodGhpcy5sYXlvdXQpKSB7XG4gICAgICB0aGlzLmpzZi5sYXlvdXQgPSBjbG9uZURlZXAodGhpcy5sYXlvdXQpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheSh0aGlzLmZvcm0pKSB7XG4gICAgICB0aGlzLmpzZi5Bbmd1bGFyU2NoZW1hRm9ybUNvbXBhdGliaWxpdHkgPSB0cnVlO1xuICAgICAgdGhpcy5qc2YubGF5b3V0ID0gY2xvbmVEZWVwKHRoaXMuZm9ybSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmZvcm0gJiYgaXNBcnJheSh0aGlzLmZvcm0uZm9ybSkpIHtcbiAgICAgIHRoaXMuanNmLkpzb25Gb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5sYXlvdXQgPSBmaXhKc29uRm9ybU9wdGlvbnMoY2xvbmVEZWVwKHRoaXMuZm9ybS5mb3JtKSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmZvcm0gJiYgaXNBcnJheSh0aGlzLmZvcm0ubGF5b3V0KSkge1xuICAgICAgdGhpcy5qc2YubGF5b3V0ID0gY2xvbmVEZWVwKHRoaXMuZm9ybS5sYXlvdXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmpzZi5sYXlvdXQgPSBbJyonXTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgYWx0ZXJuYXRlIGxheW91dCBpbnB1dHNcbiAgICBsZXQgYWx0ZXJuYXRlTGF5b3V0OiBhbnkgPSBudWxsO1xuICAgIGlmIChpc09iamVjdCh0aGlzLlVJU2NoZW1hKSkge1xuICAgICAgdGhpcy5qc2YuUmVhY3RKc29uU2NoZW1hRm9ybUNvbXBhdGliaWxpdHkgPSB0cnVlO1xuICAgICAgYWx0ZXJuYXRlTGF5b3V0ID0gY2xvbmVEZWVwKHRoaXMuVUlTY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoaGFzT3duKHRoaXMuZm9ybSwgJ1VJU2NoZW1hJykpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIGFsdGVybmF0ZUxheW91dCA9IGNsb25lRGVlcCh0aGlzLmZvcm0uVUlTY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoaGFzT3duKHRoaXMuZm9ybSwgJ3VpU2NoZW1hJykpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIGFsdGVybmF0ZUxheW91dCA9IGNsb25lRGVlcCh0aGlzLmZvcm0udWlTY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoaGFzT3duKHRoaXMuZm9ybSwgJ2N1c3RvbUZvcm1JdGVtcycpKSB7XG4gICAgICB0aGlzLmpzZi5Kc29uRm9ybUNvbXBhdGliaWxpdHkgPSB0cnVlO1xuICAgICAgYWx0ZXJuYXRlTGF5b3V0ID0gZml4SnNvbkZvcm1PcHRpb25zKGNsb25lRGVlcCh0aGlzLmZvcm0uY3VzdG9tRm9ybUl0ZW1zKSk7XG4gICAgfVxuXG4gICAgLy8gaWYgYWx0ZXJuYXRlIGxheW91dCBmb3VuZCwgY29weSBhbHRlcm5hdGUgbGF5b3V0IG9wdGlvbnMgaW50byBzY2hlbWFcbiAgICBpZiAoYWx0ZXJuYXRlTGF5b3V0KSB7XG4gICAgICBKc29uUG9pbnRlci5mb3JFYWNoRGVlcChhbHRlcm5hdGVMYXlvdXQsICh2YWx1ZSwgcG9pbnRlcikgPT4ge1xuICAgICAgICBjb25zdCBzY2hlbWFQb2ludGVyID0gcG9pbnRlclxuICAgICAgICAgIC5yZXBsYWNlKC9cXC8vZywgJy9wcm9wZXJ0aWVzLycpXG4gICAgICAgICAgLnJlcGxhY2UoL1xcL3Byb3BlcnRpZXNcXC9pdGVtc1xcL3Byb3BlcnRpZXNcXC8vZywgJy9pdGVtcy9wcm9wZXJ0aWVzLycpXG4gICAgICAgICAgLnJlcGxhY2UoL1xcL3Byb3BlcnRpZXNcXC90aXRsZU1hcFxcL3Byb3BlcnRpZXNcXC8vZywgJy90aXRsZU1hcC9wcm9wZXJ0aWVzLycpO1xuICAgICAgICBpZiAoaGFzVmFsdWUodmFsdWUpICYmIGhhc1ZhbHVlKHBvaW50ZXIpKSB7XG4gICAgICAgICAgbGV0IGtleSA9IEpzb25Qb2ludGVyLnRvS2V5KHBvaW50ZXIpO1xuICAgICAgICAgIGNvbnN0IGdyb3VwUG9pbnRlciA9IChKc29uUG9pbnRlci5wYXJzZShzY2hlbWFQb2ludGVyKSB8fCBbXSkuc2xpY2UoMCwgLTIpO1xuICAgICAgICAgIGxldCBpdGVtUG9pbnRlcjogc3RyaW5nIHwgc3RyaW5nW107XG5cbiAgICAgICAgICAvLyBJZiAndWk6b3JkZXInIG9iamVjdCBmb3VuZCwgY29weSBpbnRvIG9iamVjdCBzY2hlbWEgcm9vdFxuICAgICAgICAgIGlmIChrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3VpOm9yZGVyJykge1xuICAgICAgICAgICAgaXRlbVBvaW50ZXIgPSBbLi4uZ3JvdXBQb2ludGVyLCAndWk6b3JkZXInXTtcblxuICAgICAgICAgIC8vIENvcHkgb3RoZXIgYWx0ZXJuYXRlIGxheW91dCBvcHRpb25zIHRvIHNjaGVtYSAneC1zY2hlbWEtZm9ybScsXG4gICAgICAgICAgLy8gKGxpa2UgQW5ndWxhciBTY2hlbWEgRm9ybSBvcHRpb25zKSBhbmQgcmVtb3ZlIGFueSAndWk6JyBwcmVmaXhlc1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoa2V5LnNsaWNlKDAsIDMpLnRvTG93ZXJDYXNlKCkgPT09ICd1aTonKSB7IGtleSA9IGtleS5zbGljZSgzKTsgfVxuICAgICAgICAgICAgaXRlbVBvaW50ZXIgPSBbLi4uZ3JvdXBQb2ludGVyLCAneC1zY2hlbWEtZm9ybScsIGtleV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChKc29uUG9pbnRlci5oYXModGhpcy5qc2Yuc2NoZW1hLCBncm91cFBvaW50ZXIpICYmXG4gICAgICAgICAgICAhSnNvblBvaW50ZXIuaGFzKHRoaXMuanNmLnNjaGVtYSwgaXRlbVBvaW50ZXIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBKc29uUG9pbnRlci5zZXQodGhpcy5qc2Yuc2NoZW1hLCBpdGVtUG9pbnRlciwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICdhY3RpdmF0ZUZvcm0nIGZ1bmN0aW9uXG4gICAqXG4gICAqIC4uLmNvbnRpbnVlZCBmcm9tICdpbml0aWFsaXplU2NoZW1hJyBmdW5jdGlvbiwgYWJvdmVcbiAgICogSWYgJ3NjaGVtYScgaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIChpLmUuIG5vIHNjaGVtYSBpbnB1dCBmb3VuZClcbiAgICogNi4gSWYgbGF5b3V0IGlucHV0IC0gYnVpbGQgc2NoZW1hIGZyb20gbGF5b3V0IGlucHV0XG4gICAqIDcuIElmIGRhdGEgaW5wdXQgLSBidWlsZCBzY2hlbWEgZnJvbSBkYXRhIGlucHV0XG4gICAqXG4gICAqIENyZWF0ZSBmaW5hbCBsYXlvdXQsXG4gICAqIGJ1aWxkIHRoZSBGb3JtR3JvdXAgdGVtcGxhdGUgYW5kIHRoZSBBbmd1bGFyIEZvcm1Hcm91cCxcbiAgICogc3Vic2NyaWJlIHRvIGNoYW5nZXMsXG4gICAqIGFuZCBhY3RpdmF0ZSB0aGUgZm9ybS5cbiAgICovXG4gIHByaXZhdGUgYWN0aXZhdGVGb3JtKCkge1xuXG4gICAgLy8gSWYgJ3NjaGVtYScgbm90IGluaXRpYWxpemVkXG4gICAgaWYgKGlzRW1wdHkodGhpcy5qc2Yuc2NoZW1hKSkge1xuXG4gICAgICAvLyBUT0RPOiBJZiBmdWxsIGxheW91dCBpbnB1dCAod2l0aCBubyAnKicpLCBidWlsZCBzY2hlbWEgZnJvbSBsYXlvdXRcbiAgICAgIC8vIGlmICghdGhpcy5qc2YubGF5b3V0LmluY2x1ZGVzKCcqJykpIHtcbiAgICAgIC8vICAgdGhpcy5qc2YuYnVpbGRTY2hlbWFGcm9tTGF5b3V0KCk7XG4gICAgICAvLyB9IGVsc2VcblxuICAgICAgLy8gSWYgZGF0YSBpbnB1dCwgYnVpbGQgc2NoZW1hIGZyb20gZGF0YVxuICAgICAgaWYgKCFpc0VtcHR5KHRoaXMuanNmLmZvcm1WYWx1ZXMpKSB7XG4gICAgICAgIHRoaXMuanNmLmJ1aWxkU2NoZW1hRnJvbURhdGEoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWlzRW1wdHkodGhpcy5qc2Yuc2NoZW1hKSkge1xuXG4gICAgICAvLyBJZiBub3QgYWxyZWFkeSBpbml0aWFsaXplZCwgaW5pdGlhbGl6ZSBhanYgYW5kIGNvbXBpbGUgc2NoZW1hXG4gICAgICB0aGlzLmpzZi5jb21waWxlQWp2U2NoZW1hKCk7XG5cbiAgICAgIC8vIFVwZGF0ZSBhbGwgbGF5b3V0IGVsZW1lbnRzLCBhZGQgdmFsdWVzLCB3aWRnZXRzLCBhbmQgdmFsaWRhdG9ycyxcbiAgICAgIC8vIHJlcGxhY2UgYW55ICcqJyB3aXRoIGEgbGF5b3V0IGJ1aWx0IGZyb20gYWxsIHNjaGVtYSBlbGVtZW50cyxcbiAgICAgIC8vIGFuZCB1cGRhdGUgdGhlIEZvcm1Hcm91cCB0ZW1wbGF0ZSB3aXRoIGFueSBuZXcgdmFsaWRhdG9yc1xuICAgICAgdGhpcy5qc2YuYnVpbGRMYXlvdXQodGhpcy53aWRnZXRMaWJyYXJ5KTtcblxuICAgICAgLy8gQnVpbGQgdGhlIEFuZ3VsYXIgRm9ybUdyb3VwIHRlbXBsYXRlIGZyb20gdGhlIHNjaGVtYVxuICAgICAgdGhpcy5qc2YuYnVpbGRGb3JtR3JvdXBUZW1wbGF0ZSh0aGlzLmpzZi5mb3JtVmFsdWVzKTtcblxuICAgICAgLy8gQnVpbGQgdGhlIHJlYWwgQW5ndWxhciBGb3JtR3JvdXAgZnJvbSB0aGUgRm9ybUdyb3VwIHRlbXBsYXRlXG4gICAgICB0aGlzLmpzZi5idWlsZEZvcm1Hcm91cCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmpzZi5mb3JtR3JvdXApIHtcblxuICAgICAgLy8gUmVzZXQgaW5pdGlhbCBmb3JtIHZhbHVlc1xuICAgICAgaWYgKCFpc0VtcHR5KHRoaXMuanNmLmZvcm1WYWx1ZXMpICYmXG4gICAgICAgIHRoaXMuanNmLmZvcm1PcHRpb25zLnNldFNjaGVtYURlZmF1bHRzICE9PSB0cnVlICYmXG4gICAgICAgIHRoaXMuanNmLmZvcm1PcHRpb25zLnNldExheW91dERlZmF1bHRzICE9PSB0cnVlXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5zZXRGb3JtVmFsdWVzKHRoaXMuanNmLmZvcm1WYWx1ZXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPOiBGaWd1cmUgb3V0IGhvdyB0byBkaXNwbGF5IGNhbGN1bGF0ZWQgdmFsdWVzIHdpdGhvdXQgY2hhbmdpbmcgb2JqZWN0IGRhdGFcbiAgICAgIC8vIFNlZSBodHRwOi8vdWxpb24uZ2l0aHViLmlvL2pzb25mb3JtL3BsYXlncm91bmQvP2V4YW1wbGU9dGVtcGxhdGluZy12YWx1ZXNcbiAgICAgIC8vIENhbGN1bGF0ZSByZWZlcmVuY2VzIHRvIG90aGVyIGZpZWxkc1xuICAgICAgLy8gaWYgKCFpc0VtcHR5KHRoaXMuanNmLmZvcm1Hcm91cC52YWx1ZSkpIHtcbiAgICAgIC8vICAgZm9yRWFjaCh0aGlzLmpzZi5mb3JtR3JvdXAudmFsdWUsICh2YWx1ZSwga2V5LCBvYmplY3QsIHJvb3RPYmplY3QpID0+IHtcbiAgICAgIC8vICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gICAgICAgb2JqZWN0W2tleV0gPSB0aGlzLmpzZi5wYXJzZVRleHQodmFsdWUsIHZhbHVlLCByb290T2JqZWN0LCBrZXkpO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfSwgJ3RvcC1kb3duJyk7XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIFN1YnNjcmliZSB0byBmb3JtIGNoYW5nZXMgdG8gb3V0cHV0IGxpdmUgZGF0YSwgdmFsaWRhdGlvbiwgYW5kIGVycm9yc1xuICAgICAgdGhpcy5qc2YuZGF0YUNoYW5nZXMuc3Vic2NyaWJlKGRhdGEgPT4ge1xuICAgICAgICB0aGlzLm9uQ2hhbmdlcy5lbWl0KHRoaXMub2JqZWN0V3JhcCA/IGRhdGFbJzEnXSA6IGRhdGEpO1xuICAgICAgICBpZiAodGhpcy5mb3JtVmFsdWVzSW5wdXQgJiYgdGhpcy5mb3JtVmFsdWVzSW5wdXQuaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgIHRoaXNbYCR7dGhpcy5mb3JtVmFsdWVzSW5wdXR9Q2hhbmdlYF0uZW1pdCh0aGlzLm9iamVjdFdyYXAgPyBkYXRhWycxJ10gOiBkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbiBvbiBzdGF0dXNDaGFuZ2VzIHRvIHNob3cgdXBkYXRlZCBlcnJvcnNcbiAgICAgIHRoaXMuanNmLmZvcm1Hcm91cC5zdGF0dXNDaGFuZ2VzLnN1YnNjcmliZSgoKSA9PiB0aGlzLmNoYW5nZURldGVjdG9yLm1hcmtGb3JDaGVjaygpKTtcbiAgICAgIHRoaXMuanNmLmlzVmFsaWRDaGFuZ2VzLnN1YnNjcmliZShpc1ZhbGlkID0+IHRoaXMuaXNWYWxpZC5lbWl0KGlzVmFsaWQpKTtcbiAgICAgIHRoaXMuanNmLnZhbGlkYXRpb25FcnJvckNoYW5nZXMuc3Vic2NyaWJlKGVyciA9PiB0aGlzLnZhbGlkYXRpb25FcnJvcnMuZW1pdChlcnIpKTtcblxuICAgICAgLy8gT3V0cHV0IGZpbmFsIHNjaGVtYSwgZmluYWwgbGF5b3V0LCBhbmQgaW5pdGlhbCBkYXRhXG4gICAgICB0aGlzLmZvcm1TY2hlbWEuZW1pdCh0aGlzLmpzZi5zY2hlbWEpO1xuICAgICAgdGhpcy5mb3JtTGF5b3V0LmVtaXQodGhpcy5qc2YubGF5b3V0KTtcbiAgICAgIHRoaXMub25DaGFuZ2VzLmVtaXQodGhpcy5vYmplY3RXcmFwID8gdGhpcy5qc2YuZGF0YVsnMSddIDogdGhpcy5qc2YuZGF0YSk7XG5cbiAgICAgIC8vIElmIHZhbGlkYXRlT25SZW5kZXIsIG91dHB1dCBpbml0aWFsIHZhbGlkYXRpb24gYW5kIGFueSBlcnJvcnNcbiAgICAgIGNvbnN0IHZhbGlkYXRlT25SZW5kZXIgPVxuICAgICAgICBKc29uUG9pbnRlci5nZXQodGhpcy5qc2YsICcvZm9ybU9wdGlvbnMvdmFsaWRhdGVPblJlbmRlcicpO1xuICAgICAgaWYgKHZhbGlkYXRlT25SZW5kZXIpIHsgLy8gdmFsaWRhdGVPblJlbmRlciA9PT0gJ2F1dG8nIHx8IHRydWVcbiAgICAgICAgY29uc3QgdG91Y2hBbGwgPSAoY29udHJvbCkgPT4ge1xuICAgICAgICAgIGlmICh2YWxpZGF0ZU9uUmVuZGVyID09PSB0cnVlIHx8IGhhc1ZhbHVlKGNvbnRyb2wudmFsdWUpKSB7XG4gICAgICAgICAgICBjb250cm9sLm1hcmtBc1RvdWNoZWQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgT2JqZWN0LmtleXMoY29udHJvbC5jb250cm9scyB8fCB7fSlcbiAgICAgICAgICAgIC5mb3JFYWNoKGtleSA9PiB0b3VjaEFsbChjb250cm9sLmNvbnRyb2xzW2tleV0pKTtcbiAgICAgICAgfTtcbiAgICAgICAgdG91Y2hBbGwodGhpcy5qc2YuZm9ybUdyb3VwKTtcbiAgICAgICAgdGhpcy5pc1ZhbGlkLmVtaXQodGhpcy5qc2YuaXNWYWxpZCk7XG4gICAgICAgIHRoaXMudmFsaWRhdGlvbkVycm9ycy5lbWl0KHRoaXMuanNmLmFqdkVycm9ycyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=