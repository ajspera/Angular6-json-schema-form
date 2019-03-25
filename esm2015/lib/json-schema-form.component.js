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
export const JSON_SCHEMA_FORM_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => JsonSchemaFormComponent),
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
let JsonSchemaFormComponent = class JsonSchemaFormComponent {
    constructor(changeDetector, frameworkLibrary, widgetLibrary, jsf, sanitizer) {
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
    get value() {
        return this.objectWrap ? this.jsf.data['1'] : this.jsf.data;
    }
    set value(value) {
        this.setFormValues(value, false);
    }
    get stylesheets() {
        const stylesheets = this.frameworkLibrary.getFrameworkStylesheets();
        const load = this.sanitizer.bypassSecurityTrustResourceUrl;
        return stylesheets.map(stylesheet => load(stylesheet));
    }
    get scripts() {
        const scripts = this.frameworkLibrary.getFrameworkScripts();
        const load = this.sanitizer.bypassSecurityTrustResourceUrl;
        return scripts.map(script => load(script));
    }
    ngOnInit() {
        this.updateForm();
    }
    ngOnChanges() {
        this.updateForm();
    }
    writeValue(value) {
        this.setFormValues(value, false);
        if (!this.formValuesInput) {
            this.formValuesInput = 'ngModel';
        }
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled) {
        if (this.jsf.formOptions.formDisabled !== !!isDisabled) {
            this.jsf.formOptions.formDisabled = !!isDisabled;
            this.initializeForm();
        }
    }
    updateForm() {
        if (!this.formInitialized || !this.formValuesInput ||
            (this.language && this.language !== this.jsf.language)) {
            this.initializeForm();
        }
        else {
            if (this.language && this.language !== this.jsf.language) {
                this.jsf.setLanguage(this.language);
            }
            // Get names of changed inputs
            let changedInput = Object.keys(this.previousInputs)
                .filter(input => this.previousInputs[input] !== this[input]);
            let resetFirst = true;
            if (changedInput.length === 1 && changedInput[0] === 'form' &&
                this.formValuesInput.startsWith('form.')) {
                // If only 'form' input changed, get names of changed keys
                changedInput = Object.keys(this.previousInputs.form || {})
                    .filter(key => !isEqual(this.previousInputs.form[key], this.form[key]))
                    .map(key => `form.${key}`);
                resetFirst = false;
            }
            // If only input values have changed, update the form values
            if (changedInput.length === 1 && changedInput[0] === this.formValuesInput) {
                if (this.formValuesInput.indexOf('.') === -1) {
                    this.setFormValues(this[this.formValuesInput], resetFirst);
                }
                else {
                    const [input, key] = this.formValuesInput.split('.');
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
                .filter(input => this.previousInputs[input] !== this[input])
                .forEach(input => this.previousInputs[input] = this[input]);
        }
    }
    setFormValues(formValues, resetFirst = true) {
        if (formValues) {
            const newFormValues = this.objectWrap ? formValues['1'] : formValues;
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
    }
    submitForm() {
        const validData = this.jsf.validData;
        this.onSubmit.emit(this.objectWrap ? validData['1'] : validData);
    }
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
    initializeForm() {
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
                const vars = [];
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
                this.debugOutput = vars.map(v => JSON.stringify(v, null, 2)).join('\n');
            }
            this.formInitialized = true;
        }
    }
    /**
     * 'initializeOptions' function
     *
     * Initialize 'options' (global form options) and set framework
     * Combine available inputs:
     * 1. options - recommended
     * 2. form.options - Single input style
     */
    initializeOptions() {
        if (this.language && this.language !== this.jsf.language) {
            this.jsf.setLanguage(this.language);
        }
        this.jsf.setOptions({ debug: !!this.debug });
        let loadExternalAssets = this.loadExternalAssets || false;
        let framework = this.framework || 'default';
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
            for (const widget of Object.keys(this.jsf.formOptions.widgets)) {
                this.widgetLibrary.registerWidget(widget, this.jsf.formOptions.widgets[widget]);
            }
        }
        if (isObject(this.form) && isObject(this.form.tpldata)) {
            this.jsf.setTpldata(this.form.tpldata);
        }
    }
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
    initializeSchema() {
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
    }
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
    initializeData() {
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
    }
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
    initializeLayout() {
        // Rename JSON Form-style 'options' lists to
        // Angular Schema Form-style 'titleMap' lists.
        const fixJsonFormOptions = (layout) => {
            if (isObject(layout) || isArray(layout)) {
                forEach(layout, (value, key) => {
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
        let alternateLayout = null;
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
            JsonPointer.forEachDeep(alternateLayout, (value, pointer) => {
                const schemaPointer = pointer
                    .replace(/\//g, '/properties/')
                    .replace(/\/properties\/items\/properties\//g, '/items/properties/')
                    .replace(/\/properties\/titleMap\/properties\//g, '/titleMap/properties/');
                if (hasValue(value) && hasValue(pointer)) {
                    let key = JsonPointer.toKey(pointer);
                    const groupPointer = (JsonPointer.parse(schemaPointer) || []).slice(0, -2);
                    let itemPointer;
                    // If 'ui:order' object found, copy into object schema root
                    if (key.toLowerCase() === 'ui:order') {
                        itemPointer = [...groupPointer, 'ui:order'];
                        // Copy other alternate layout options to schema 'x-schema-form',
                        // (like Angular Schema Form options) and remove any 'ui:' prefixes
                    }
                    else {
                        if (key.slice(0, 3).toLowerCase() === 'ui:') {
                            key = key.slice(3);
                        }
                        itemPointer = [...groupPointer, 'x-schema-form', key];
                    }
                    if (JsonPointer.has(this.jsf.schema, groupPointer) &&
                        !JsonPointer.has(this.jsf.schema, itemPointer)) {
                        JsonPointer.set(this.jsf.schema, itemPointer, value);
                    }
                }
            });
        }
    }
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
    activateForm() {
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
            this.jsf.dataChanges.subscribe(data => {
                this.onChanges.emit(this.objectWrap ? data['1'] : data);
                if (this.formValuesInput && this.formValuesInput.indexOf('.') === -1) {
                    this[`${this.formValuesInput}Change`].emit(this.objectWrap ? data['1'] : data);
                }
            });
            // Trigger change detection on statusChanges to show updated errors
            this.jsf.formGroup.statusChanges.subscribe(() => this.changeDetector.markForCheck());
            this.jsf.isValidChanges.subscribe(isValid => this.isValid.emit(isValid));
            this.jsf.validationErrorChanges.subscribe(err => this.validationErrors.emit(err));
            // Output final schema, final layout, and initial data
            this.formSchema.emit(this.jsf.schema);
            this.formLayout.emit(this.jsf.layout);
            this.onChanges.emit(this.objectWrap ? this.jsf.data['1'] : this.jsf.data);
            // If validateOnRender, output initial validation and any errors
            const validateOnRender = JsonPointer.get(this.jsf, '/formOptions/validateOnRender');
            if (validateOnRender) { // validateOnRender === 'auto' || true
                const touchAll = (control) => {
                    if (validateOnRender === true || hasValue(control.value)) {
                        control.markAsTouched();
                    }
                    Object.keys(control.controls || {})
                        .forEach(key => touchAll(control.controls[key]));
                };
                touchAll(this.jsf.formGroup);
                this.isValid.emit(this.jsf.isValid);
                this.validationErrors.emit(this.jsf.ajvErrors);
            }
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
        template: `
    <div *ngFor="let stylesheet of stylesheets">
      <link rel="stylesheet" [href]="stylesheet">
    </div>
    <div *ngFor="let script of scripts">
      <script type="text/javascript" [src]="script"></script>
    </div>
    <form class="json-schema-form" (ngSubmit)="submitForm()">
      <root-widget [layout]="jsf?.layout"></root-widget>
    </form>
    <div *ngIf="debug || jsf?.formOptions?.debug">
      Debug output: <pre>{{debugOutput}}</pre>
    </div>`,
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
export { JsonSchemaFormComponent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEtZm9ybS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9hbmd1bGFyNi1qc29uLXNjaGVtYS1mb3JtLyIsInNvdXJjZXMiOlsibGliL2pzb24tc2NoZW1hLWZvcm0uY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLFNBQVMsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQztBQUVyQyxPQUFPLEVBQ0wsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixTQUFTLEVBQ1QsWUFBWSxFQUNaLFVBQVUsRUFDVixLQUFLLEVBR0wsTUFBTSxFQUNMLE1BQU0sZUFBZSxDQUFDO0FBQ3pCLE9BQU8sRUFBd0IsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLDJCQUEyQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUNMLFFBQVEsRUFDUixPQUFPLEVBQ1AsT0FBTyxFQUNQLE9BQU8sRUFDUCxRQUFRLEVBQ1AsTUFBTSw4QkFBOEIsQ0FBQztBQUN4QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJL0UsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQVE7SUFDbEQsT0FBTyxFQUFFLGlCQUFpQjtJQUMxQixX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O3lEQUFlO0FBQ2Q7SUFBUixLQUFLLEVBQUU7O3lEQUFlO0FBRWQ7SUFBUixLQUFLLEVBQUU7O3dEQUFjO0FBRWI7SUFBUixLQUFLLEVBQUU7O3lEQUFrQjtBQUdqQjtJQUFSLEtBQUssRUFBRTs7bUVBQTZCO0FBQzVCO0lBQVIsS0FBSyxFQUFFOztzREFBZ0I7QUFHeEI7SUFEQyxLQUFLLEVBQUU7OztvREFHUDtBQU9TO0lBQVQsTUFBTSxFQUFFOzswREFBcUM7QUFFcEM7SUFBVCxNQUFNLEVBQUU7O3lEQUFvQztBQUNuQztJQUFULE1BQU0sRUFBRTs7d0RBQXVDO0FBQ3RDO0lBQVQsTUFBTSxFQUFFOztpRUFBNEM7QUFDM0M7SUFBVCxNQUFNLEVBQUU7OzJEQUFzQztBQUNyQztJQUFULE1BQU0sRUFBRTs7MkRBQXNDO0FBTXJDO0lBQVQsTUFBTSxFQUFFOzsyREFBc0M7QUFDckM7SUFBVCxNQUFNLEVBQUU7OzREQUF1QztBQUN0QztJQUFULE1BQU0sRUFBRTs7K0RBQTBDO0FBQ3pDO0lBQVQsTUFBTSxFQUFFOzs4REFBeUM7QUFyRXZDLHVCQUF1QjtJQXJCbkMsU0FBUyxDQUFDO1FBQ1QsOENBQThDO1FBQzlDLFFBQVEsRUFBRSxrQkFBa0I7UUFDNUIsUUFBUSxFQUFFOzs7Ozs7Ozs7Ozs7V0FZRDtRQUNULGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxNQUFNO1FBQy9DLGlFQUFpRTtRQUNqRSxnRUFBZ0U7UUFDaEUsU0FBUyxFQUFHLENBQUUscUJBQXFCLEVBQUUsK0JBQStCLENBQUU7S0FDdkUsQ0FBQzs2Q0E0RTBCLGlCQUFpQjtRQUNmLHVCQUF1QjtRQUMxQixvQkFBb0I7UUFDL0IscUJBQXFCO1FBQ2QsWUFBWTtHQS9FdEIsdUJBQXVCLENBK29CbkM7U0Evb0JZLHVCQUF1QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjbG9uZURlZXAgZnJvbSAnbG9kYXNoL2Nsb25lRGVlcCc7XG5pbXBvcnQgaXNFcXVhbCBmcm9tICdsb2Rhc2gvaXNFcXVhbCc7XG5cbmltcG9ydCB7XG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29tcG9uZW50LFxuICBFdmVudEVtaXR0ZXIsXG4gIGZvcndhcmRSZWYsXG4gIElucHV0LFxuICBPbkNoYW5nZXMsXG4gIE9uSW5pdCxcbiAgT3V0cHV0XG4gIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMVUVfQUNDRVNTT1IgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBjb252ZXJ0U2NoZW1hVG9EcmFmdDYgfSBmcm9tICcuL3NoYXJlZC9jb252ZXJ0LXNjaGVtYS10by1kcmFmdDYuZnVuY3Rpb24nO1xuaW1wb3J0IHsgRG9tU2FuaXRpemVyLCBTYWZlUmVzb3VyY2VVcmwgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcbmltcG9ydCB7IGZvckVhY2gsIGhhc093biB9IGZyb20gJy4vc2hhcmVkL3V0aWxpdHkuZnVuY3Rpb25zJztcbmltcG9ydCB7IEZyYW1ld29ya0xpYnJhcnlTZXJ2aWNlIH0gZnJvbSAnLi9mcmFtZXdvcmstbGlicmFyeS9mcmFtZXdvcmstbGlicmFyeS5zZXJ2aWNlJztcbmltcG9ydCB7XG4gIGhhc1ZhbHVlLFxuICBpbkFycmF5LFxuICBpc0FycmF5LFxuICBpc0VtcHR5LFxuICBpc09iamVjdFxuICB9IGZyb20gJy4vc2hhcmVkL3ZhbGlkYXRvci5mdW5jdGlvbnMnO1xuaW1wb3J0IHsgSnNvblBvaW50ZXIgfSBmcm9tICcuL3NoYXJlZC9qc29ucG9pbnRlci5mdW5jdGlvbnMnO1xuaW1wb3J0IHsgSnNvblNjaGVtYUZvcm1TZXJ2aWNlIH0gZnJvbSAnLi9qc29uLXNjaGVtYS1mb3JtLnNlcnZpY2UnO1xuaW1wb3J0IHsgcmVzb2x2ZVNjaGVtYVJlZmVyZW5jZXMgfSBmcm9tICcuL3NoYXJlZC9qc29uLXNjaGVtYS5mdW5jdGlvbnMnO1xuaW1wb3J0IHsgV2lkZ2V0TGlicmFyeVNlcnZpY2UgfSBmcm9tICcuL3dpZGdldC1saWJyYXJ5L3dpZGdldC1saWJyYXJ5LnNlcnZpY2UnO1xuXG5cblxuZXhwb3J0IGNvbnN0IEpTT05fU0NIRU1BX0ZPUk1fVkFMVUVfQUNDRVNTT1I6IGFueSA9IHtcbiAgcHJvdmlkZTogTkdfVkFMVUVfQUNDRVNTT1IsXG4gIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IEpzb25TY2hlbWFGb3JtQ29tcG9uZW50KSxcbiAgbXVsdGk6IHRydWUsXG59O1xuXG4vKipcbiAqIEBtb2R1bGUgJ0pzb25TY2hlbWFGb3JtQ29tcG9uZW50JyAtIEFuZ3VsYXIgSlNPTiBTY2hlbWEgRm9ybVxuICpcbiAqIFJvb3QgbW9kdWxlIG9mIHRoZSBBbmd1bGFyIEpTT04gU2NoZW1hIEZvcm0gY2xpZW50LXNpZGUgbGlicmFyeSxcbiAqIGFuIEFuZ3VsYXIgbGlicmFyeSB3aGljaCBnZW5lcmF0ZXMgYW4gSFRNTCBmb3JtIGZyb20gYSBKU09OIHNjaGVtYVxuICogc3RydWN0dXJlZCBkYXRhIG1vZGVsIGFuZC9vciBhIEpTT04gU2NoZW1hIEZvcm0gbGF5b3V0IGRlc2NyaXB0aW9uLlxuICpcbiAqIFRoaXMgbGlicmFyeSBhbHNvIHZhbGlkYXRlcyBpbnB1dCBkYXRhIGJ5IHRoZSB1c2VyLCB1c2luZyBib3RoIHZhbGlkYXRvcnMgb25cbiAqIGluZGl2aWR1YWwgY29udHJvbHMgdG8gcHJvdmlkZSByZWFsLXRpbWUgZmVlZGJhY2sgd2hpbGUgdGhlIHVzZXIgaXMgZmlsbGluZ1xuICogb3V0IHRoZSBmb3JtLCBhbmQgdGhlbiB2YWxpZGF0aW5nIHRoZSBlbnRpcmUgaW5wdXQgYWdhaW5zdCB0aGUgc2NoZW1hIHdoZW5cbiAqIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZCB0byBtYWtlIHN1cmUgdGhlIHJldHVybmVkIEpTT04gZGF0YSBvYmplY3QgaXMgdmFsaWQuXG4gKlxuICogVGhpcyBsaWJyYXJ5IGlzIHNpbWlsYXIgdG8sIGFuZCBtb3N0bHkgQVBJIGNvbXBhdGlibGUgd2l0aDpcbiAqXG4gKiAtIEpTT04gU2NoZW1hIEZvcm0ncyBBbmd1bGFyIFNjaGVtYSBGb3JtIGxpYnJhcnkgZm9yIEFuZ3VsYXJKc1xuICogICBodHRwOi8vc2NoZW1hZm9ybS5pb1xuICogICBodHRwOi8vc2NoZW1hZm9ybS5pby9leGFtcGxlcy9ib290c3RyYXAtZXhhbXBsZS5odG1sIChleGFtcGxlcylcbiAqXG4gKiAtIE1vemlsbGEncyByZWFjdC1qc29uc2NoZW1hLWZvcm0gbGlicmFyeSBmb3IgUmVhY3RcbiAqICAgaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEtc2VydmljZXMvcmVhY3QtanNvbnNjaGVtYS1mb3JtXG4gKiAgIGh0dHBzOi8vbW96aWxsYS1zZXJ2aWNlcy5naXRodWIuaW8vcmVhY3QtanNvbnNjaGVtYS1mb3JtIChleGFtcGxlcylcbiAqXG4gKiAtIEpvc2hmaXJlJ3MgSlNPTiBGb3JtIGxpYnJhcnkgZm9yIGpRdWVyeVxuICogICBodHRwczovL2dpdGh1Yi5jb20vam9zaGZpcmUvanNvbmZvcm1cbiAqICAgaHR0cDovL3VsaW9uLmdpdGh1Yi5pby9qc29uZm9ybS9wbGF5Z3JvdW5kIChleGFtcGxlcylcbiAqXG4gKiBUaGlzIGxpYnJhcnkgZGVwZW5kcyBvbjpcbiAqICAtIEFuZ3VsYXIgKG9idmlvdXNseSkgICAgICAgICAgICAgICAgICBodHRwczovL2FuZ3VsYXIuaW9cbiAqICAtIGxvZGFzaCwgSmF2YVNjcmlwdCB1dGlsaXR5IGxpYnJhcnkgICBodHRwczovL2dpdGh1Yi5jb20vbG9kYXNoL2xvZGFzaFxuICogIC0gYWp2LCBBbm90aGVyIEpTT04gU2NoZW1hIHZhbGlkYXRvciAgIGh0dHBzOi8vZ2l0aHViLmNvbS9lcG9iZXJlemtpbi9hanZcbiAqXG4gKiBJbiBhZGRpdGlvbiwgdGhlIEV4YW1wbGUgUGxheWdyb3VuZCBhbHNvIGRlcGVuZHMgb246XG4gKiAgLSBicmFjZSwgQnJvd3NlcmlmaWVkIEFjZSBlZGl0b3IgICAgICAgaHR0cDovL3RobG9yZW56LmdpdGh1Yi5pby9icmFjZVxuICovXG5AQ29tcG9uZW50KHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmNvbXBvbmVudC1zZWxlY3RvclxuICBzZWxlY3RvcjogJ2pzb24tc2NoZW1hLWZvcm0nLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxkaXYgKm5nRm9yPVwibGV0IHN0eWxlc2hlZXQgb2Ygc3R5bGVzaGVldHNcIj5cbiAgICAgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiBbaHJlZl09XCJzdHlsZXNoZWV0XCI+XG4gICAgPC9kaXY+XG4gICAgPGRpdiAqbmdGb3I9XCJsZXQgc2NyaXB0IG9mIHNjcmlwdHNcIj5cbiAgICAgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIFtzcmNdPVwic2NyaXB0XCI+PC9zY3JpcHQ+XG4gICAgPC9kaXY+XG4gICAgPGZvcm0gY2xhc3M9XCJqc29uLXNjaGVtYS1mb3JtXCIgKG5nU3VibWl0KT1cInN1Ym1pdEZvcm0oKVwiPlxuICAgICAgPHJvb3Qtd2lkZ2V0IFtsYXlvdXRdPVwianNmPy5sYXlvdXRcIj48L3Jvb3Qtd2lkZ2V0PlxuICAgIDwvZm9ybT5cbiAgICA8ZGl2ICpuZ0lmPVwiZGVidWcgfHwganNmPy5mb3JtT3B0aW9ucz8uZGVidWdcIj5cbiAgICAgIERlYnVnIG91dHB1dDogPHByZT57e2RlYnVnT3V0cHV0fX08L3ByZT5cbiAgICA8L2Rpdj5gLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgLy8gQWRkaW5nICdKc29uU2NoZW1hRm9ybVNlcnZpY2UnIGhlcmUsIGluc3RlYWQgb2YgaW4gdGhlIG1vZHVsZSxcbiAgLy8gY3JlYXRlcyBhIHNlcGFyYXRlIGluc3RhbmNlIG9mIHRoZSBzZXJ2aWNlIGZvciBlYWNoIGNvbXBvbmVudFxuICBwcm92aWRlcnM6ICBbIEpzb25TY2hlbWFGb3JtU2VydmljZSwgSlNPTl9TQ0hFTUFfRk9STV9WQUxVRV9BQ0NFU1NPUiBdLFxufSlcbmV4cG9ydCBjbGFzcyBKc29uU2NoZW1hRm9ybUNvbXBvbmVudCBpbXBsZW1lbnRzIENvbnRyb2xWYWx1ZUFjY2Vzc29yLCBPbkNoYW5nZXMsIE9uSW5pdCB7XG4gIGRlYnVnT3V0cHV0OiBhbnk7IC8vIERlYnVnIGluZm9ybWF0aW9uLCBpZiByZXF1ZXN0ZWRcbiAgZm9ybVZhbHVlU3Vic2NyaXB0aW9uOiBhbnkgPSBudWxsO1xuICBmb3JtSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgb2JqZWN0V3JhcCA9IGZhbHNlOyAvLyBJcyBub24tb2JqZWN0IGlucHV0IHNjaGVtYSB3cmFwcGVkIGluIGFuIG9iamVjdD9cblxuICBmb3JtVmFsdWVzSW5wdXQ6IHN0cmluZzsgLy8gTmFtZSBvZiB0aGUgaW5wdXQgcHJvdmlkaW5nIHRoZSBmb3JtIGRhdGFcbiAgcHJldmlvdXNJbnB1dHM6IHsgLy8gUHJldmlvdXMgaW5wdXQgdmFsdWVzLCB0byBkZXRlY3Qgd2hpY2ggaW5wdXQgdHJpZ2dlcnMgb25DaGFuZ2VzXG4gICAgc2NoZW1hOiBhbnksIGxheW91dDogYW55W10sIGRhdGE6IGFueSwgb3B0aW9uczogYW55LCBmcmFtZXdvcms6IGFueXxzdHJpbmcsXG4gICAgd2lkZ2V0czogYW55LCBmb3JtOiBhbnksIG1vZGVsOiBhbnksIEpTT05TY2hlbWE6IGFueSwgVUlTY2hlbWE6IGFueSxcbiAgICBmb3JtRGF0YTogYW55LCBsb2FkRXh0ZXJuYWxBc3NldHM6IGJvb2xlYW4sIGRlYnVnOiBib29sZWFuLFxuICB9ID0ge1xuICAgIHNjaGVtYTogbnVsbCwgbGF5b3V0OiBudWxsLCBkYXRhOiBudWxsLCBvcHRpb25zOiBudWxsLCBmcmFtZXdvcms6IG51bGwsXG4gICAgd2lkZ2V0czogbnVsbCwgZm9ybTogbnVsbCwgbW9kZWw6IG51bGwsIEpTT05TY2hlbWE6IG51bGwsIFVJU2NoZW1hOiBudWxsLFxuICAgIGZvcm1EYXRhOiBudWxsLCBsb2FkRXh0ZXJuYWxBc3NldHM6IG51bGwsIGRlYnVnOiBudWxsLFxuICB9O1xuXG4gIC8vIFJlY29tbWVuZGVkIGlucHV0c1xuICBASW5wdXQoKSBzY2hlbWE6IGFueTsgLy8gVGhlIEpTT04gU2NoZW1hXG4gIEBJbnB1dCgpIGxheW91dDogYW55W107IC8vIFRoZSBmb3JtIGxheW91dFxuICBASW5wdXQoKSBkYXRhOiBhbnk7IC8vIFRoZSBmb3JtIGRhdGFcbiAgQElucHV0KCkgb3B0aW9uczogYW55OyAvLyBUaGUgZ2xvYmFsIGZvcm0gb3B0aW9uc1xuICBASW5wdXQoKSBmcmFtZXdvcms6IGFueXxzdHJpbmc7IC8vIFRoZSBmcmFtZXdvcmsgdG8gbG9hZFxuICBASW5wdXQoKSB3aWRnZXRzOiBhbnk7IC8vIEFueSBjdXN0b20gd2lkZ2V0cyB0byBsb2FkXG5cbiAgLy8gQWx0ZXJuYXRlIGNvbWJpbmVkIHNpbmdsZSBpbnB1dFxuICBASW5wdXQoKSBmb3JtOiBhbnk7IC8vIEZvciB0ZXN0aW5nLCBhbmQgSlNPTiBTY2hlbWEgRm9ybSBBUEkgY29tcGF0aWJpbGl0eVxuXG4gIC8vIEFuZ3VsYXIgU2NoZW1hIEZvcm0gQVBJIGNvbXBhdGliaWxpdHkgaW5wdXRcbiAgQElucHV0KCkgbW9kZWw6IGFueTsgLy8gQWx0ZXJuYXRlIGlucHV0IGZvciBmb3JtIGRhdGFcblxuICAvLyBSZWFjdCBKU09OIFNjaGVtYSBGb3JtIEFQSSBjb21wYXRpYmlsaXR5IGlucHV0c1xuICBASW5wdXQoKSBKU09OU2NoZW1hOiBhbnk7IC8vIEFsdGVybmF0ZSBpbnB1dCBmb3IgSlNPTiBTY2hlbWFcbiAgQElucHV0KCkgVUlTY2hlbWE6IGFueTsgLy8gVUkgc2NoZW1hIC0gYWx0ZXJuYXRlIGZvcm0gbGF5b3V0IGZvcm1hdFxuICBASW5wdXQoKSBmb3JtRGF0YTogYW55OyAvLyBBbHRlcm5hdGUgaW5wdXQgZm9yIGZvcm0gZGF0YVxuXG4gIEBJbnB1dCgpIG5nTW9kZWw6IGFueTsgLy8gQWx0ZXJuYXRlIGlucHV0IGZvciBBbmd1bGFyIGZvcm1zXG5cbiAgQElucHV0KCkgbGFuZ3VhZ2U6IHN0cmluZzsgLy8gTGFuZ3VhZ2VcblxuICAvLyBEZXZlbG9wbWVudCBpbnB1dHMsIGZvciB0ZXN0aW5nIGFuZCBkZWJ1Z2dpbmdcbiAgQElucHV0KCkgbG9hZEV4dGVybmFsQXNzZXRzOiBib29sZWFuOyAvLyBMb2FkIGV4dGVybmFsIGZyYW1ld29yayBhc3NldHM/XG4gIEBJbnB1dCgpIGRlYnVnOiBib29sZWFuOyAvLyBTaG93IGRlYnVnIGluZm9ybWF0aW9uP1xuXG4gIEBJbnB1dCgpXG4gIGdldCB2YWx1ZSgpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLm9iamVjdFdyYXAgPyB0aGlzLmpzZi5kYXRhWycxJ10gOiB0aGlzLmpzZi5kYXRhO1xuICB9XG4gIHNldCB2YWx1ZSh2YWx1ZTogYW55KSB7XG4gICAgdGhpcy5zZXRGb3JtVmFsdWVzKHZhbHVlLCBmYWxzZSk7XG4gIH1cblxuICAvLyBPdXRwdXRzXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1vdXRwdXQtb24tcHJlZml4XG4gIEBPdXRwdXQoKSBvbkNoYW5nZXMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTsgLy8gTGl2ZSB1bnZhbGlkYXRlZCBpbnRlcm5hbCBmb3JtIGRhdGFcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW91dHB1dC1vbi1wcmVmaXhcbiAgQE91dHB1dCgpIG9uU3VibWl0ID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7IC8vIENvbXBsZXRlIHZhbGlkYXRlZCBmb3JtIGRhdGFcbiAgQE91dHB1dCgpIGlzVmFsaWQgPSBuZXcgRXZlbnRFbWl0dGVyPGJvb2xlYW4+KCk7IC8vIElzIGN1cnJlbnQgZGF0YSB2YWxpZD9cbiAgQE91dHB1dCgpIHZhbGlkYXRpb25FcnJvcnMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTsgLy8gVmFsaWRhdGlvbiBlcnJvcnMgKGlmIGFueSlcbiAgQE91dHB1dCgpIGZvcm1TY2hlbWEgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTsgLy8gRmluYWwgc2NoZW1hIHVzZWQgdG8gY3JlYXRlIGZvcm1cbiAgQE91dHB1dCgpIGZvcm1MYXlvdXQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTsgLy8gRmluYWwgbGF5b3V0IHVzZWQgdG8gY3JlYXRlIGZvcm1cblxuICAvLyBPdXRwdXRzIGZvciBwb3NzaWJsZSAyLXdheSBkYXRhIGJpbmRpbmdcbiAgLy8gT25seSB0aGUgb25lIGlucHV0IHByb3ZpZGluZyB0aGUgaW5pdGlhbCBmb3JtIGRhdGEgd2lsbCBiZSBib3VuZC5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gaW5pdGFsIGRhdGEsIGlucHV0ICd7fScgdG8gYWN0aXZhdGUgMi13YXkgZGF0YSBiaW5kaW5nLlxuICAvLyBUaGVyZSBpcyBubyAyLXdheSBiaW5kaW5nIGlmIGluaXRhbCBkYXRhIGlzIGNvbWJpbmVkIGluc2lkZSB0aGUgJ2Zvcm0nIGlucHV0LlxuICBAT3V0cHV0KCkgZGF0YUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCkgbW9kZWxDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgpIGZvcm1EYXRhQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoKSBuZ01vZGVsQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG5cbiAgb25DaGFuZ2U6IEZ1bmN0aW9uO1xuICBvblRvdWNoZWQ6IEZ1bmN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3I6IENoYW5nZURldGVjdG9yUmVmLFxuICAgIHByaXZhdGUgZnJhbWV3b3JrTGlicmFyeTogRnJhbWV3b3JrTGlicmFyeVNlcnZpY2UsXG4gICAgcHJpdmF0ZSB3aWRnZXRMaWJyYXJ5OiBXaWRnZXRMaWJyYXJ5U2VydmljZSxcbiAgICBwdWJsaWMganNmOiBKc29uU2NoZW1hRm9ybVNlcnZpY2UsXG4gICAgcHJpdmF0ZSBzYW5pdGl6ZXI6IERvbVNhbml0aXplclxuICApIHsgfVxuXG4gIGdldCBzdHlsZXNoZWV0cygpOiBTYWZlUmVzb3VyY2VVcmxbXSB7XG4gICAgY29uc3Qgc3R5bGVzaGVldHMgPSB0aGlzLmZyYW1ld29ya0xpYnJhcnkuZ2V0RnJhbWV3b3JrU3R5bGVzaGVldHMoKTtcbiAgICBjb25zdCBsb2FkID0gdGhpcy5zYW5pdGl6ZXIuYnlwYXNzU2VjdXJpdHlUcnVzdFJlc291cmNlVXJsO1xuICAgIHJldHVybiBzdHlsZXNoZWV0cy5tYXAoc3R5bGVzaGVldCA9PiBsb2FkKHN0eWxlc2hlZXQpKTtcbiAgfVxuXG4gIGdldCBzY3JpcHRzKCk6IFNhZmVSZXNvdXJjZVVybFtdIHtcbiAgICBjb25zdCBzY3JpcHRzID0gdGhpcy5mcmFtZXdvcmtMaWJyYXJ5LmdldEZyYW1ld29ya1NjcmlwdHMoKTtcbiAgICBjb25zdCBsb2FkID0gdGhpcy5zYW5pdGl6ZXIuYnlwYXNzU2VjdXJpdHlUcnVzdFJlc291cmNlVXJsO1xuICAgIHJldHVybiBzY3JpcHRzLm1hcChzY3JpcHQgPT4gbG9hZChzY3JpcHQpKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIHRoaXMudXBkYXRlRm9ybSgpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoKSB7XG4gICAgdGhpcy51cGRhdGVGb3JtKCk7XG4gIH1cblxuICB3cml0ZVZhbHVlKHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLnNldEZvcm1WYWx1ZXModmFsdWUsIGZhbHNlKTtcbiAgICBpZiAoIXRoaXMuZm9ybVZhbHVlc0lucHV0KSB7IHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ25nTW9kZWwnOyB9XG4gIH1cblxuICByZWdpc3Rlck9uQ2hhbmdlKGZuOiBGdW5jdGlvbikge1xuICAgIHRoaXMub25DaGFuZ2UgPSBmbjtcbiAgfVxuXG4gIHJlZ2lzdGVyT25Ub3VjaGVkKGZuOiBGdW5jdGlvbikge1xuICAgIHRoaXMub25Ub3VjaGVkID0gZm47XG4gIH1cblxuICBzZXREaXNhYmxlZFN0YXRlKGlzRGlzYWJsZWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5qc2YuZm9ybU9wdGlvbnMuZm9ybURpc2FibGVkICE9PSAhIWlzRGlzYWJsZWQpIHtcbiAgICAgIHRoaXMuanNmLmZvcm1PcHRpb25zLmZvcm1EaXNhYmxlZCA9ICEhaXNEaXNhYmxlZDtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVGb3JtKCkge1xuICAgIGlmICghdGhpcy5mb3JtSW5pdGlhbGl6ZWQgfHwgIXRoaXMuZm9ybVZhbHVlc0lucHV0IHx8XG4gICAgICAodGhpcy5sYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlICE9PSB0aGlzLmpzZi5sYW5ndWFnZSlcbiAgICApIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMubGFuZ3VhZ2UgJiYgdGhpcy5sYW5ndWFnZSAhPT0gdGhpcy5qc2YubGFuZ3VhZ2UpIHtcbiAgICAgICAgdGhpcy5qc2Yuc2V0TGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCBuYW1lcyBvZiBjaGFuZ2VkIGlucHV0c1xuICAgICAgbGV0IGNoYW5nZWRJbnB1dCA9IE9iamVjdC5rZXlzKHRoaXMucHJldmlvdXNJbnB1dHMpXG4gICAgICAgIC5maWx0ZXIoaW5wdXQgPT4gdGhpcy5wcmV2aW91c0lucHV0c1tpbnB1dF0gIT09IHRoaXNbaW5wdXRdKTtcbiAgICAgIGxldCByZXNldEZpcnN0ID0gdHJ1ZTtcbiAgICAgIGlmIChjaGFuZ2VkSW5wdXQubGVuZ3RoID09PSAxICYmIGNoYW5nZWRJbnB1dFswXSA9PT0gJ2Zvcm0nICYmXG4gICAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0LnN0YXJ0c1dpdGgoJ2Zvcm0uJylcbiAgICAgICkge1xuICAgICAgICAvLyBJZiBvbmx5ICdmb3JtJyBpbnB1dCBjaGFuZ2VkLCBnZXQgbmFtZXMgb2YgY2hhbmdlZCBrZXlzXG4gICAgICAgIGNoYW5nZWRJbnB1dCA9IE9iamVjdC5rZXlzKHRoaXMucHJldmlvdXNJbnB1dHMuZm9ybSB8fCB7fSlcbiAgICAgICAgICAuZmlsdGVyKGtleSA9PiAhaXNFcXVhbCh0aGlzLnByZXZpb3VzSW5wdXRzLmZvcm1ba2V5XSwgdGhpcy5mb3JtW2tleV0pKVxuICAgICAgICAgIC5tYXAoa2V5ID0+IGBmb3JtLiR7a2V5fWApO1xuICAgICAgICByZXNldEZpcnN0ID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG9ubHkgaW5wdXQgdmFsdWVzIGhhdmUgY2hhbmdlZCwgdXBkYXRlIHRoZSBmb3JtIHZhbHVlc1xuICAgICAgaWYgKGNoYW5nZWRJbnB1dC5sZW5ndGggPT09IDEgJiYgY2hhbmdlZElucHV0WzBdID09PSB0aGlzLmZvcm1WYWx1ZXNJbnB1dCkge1xuICAgICAgICBpZiAodGhpcy5mb3JtVmFsdWVzSW5wdXQuaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgIHRoaXMuc2V0Rm9ybVZhbHVlcyh0aGlzW3RoaXMuZm9ybVZhbHVlc0lucHV0XSwgcmVzZXRGaXJzdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgW2lucHV0LCBrZXldID0gdGhpcy5mb3JtVmFsdWVzSW5wdXQuc3BsaXQoJy4nKTtcbiAgICAgICAgICB0aGlzLnNldEZvcm1WYWx1ZXModGhpc1tpbnB1dF1ba2V5XSwgcmVzZXRGaXJzdCk7XG4gICAgICAgIH1cblxuICAgICAgLy8gSWYgYW55dGhpbmcgZWxzZSBoYXMgY2hhbmdlZCwgcmUtcmVuZGVyIHRoZSBlbnRpcmUgZm9ybVxuICAgICAgfSBlbHNlIGlmIChjaGFuZ2VkSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgaWYgKHRoaXMub25DaGFuZ2UpIHsgdGhpcy5vbkNoYW5nZSh0aGlzLmpzZi5mb3JtVmFsdWVzKTsgfVxuICAgICAgICBpZiAodGhpcy5vblRvdWNoZWQpIHsgdGhpcy5vblRvdWNoZWQodGhpcy5qc2YuZm9ybVZhbHVlcyk7IH1cbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHByZXZpb3VzIGlucHV0c1xuICAgICAgT2JqZWN0LmtleXModGhpcy5wcmV2aW91c0lucHV0cylcbiAgICAgICAgLmZpbHRlcihpbnB1dCA9PiB0aGlzLnByZXZpb3VzSW5wdXRzW2lucHV0XSAhPT0gdGhpc1tpbnB1dF0pXG4gICAgICAgIC5mb3JFYWNoKGlucHV0ID0+IHRoaXMucHJldmlvdXNJbnB1dHNbaW5wdXRdID0gdGhpc1tpbnB1dF0pO1xuICAgIH1cbiAgfVxuXG4gIHNldEZvcm1WYWx1ZXMoZm9ybVZhbHVlczogYW55LCByZXNldEZpcnN0ID0gdHJ1ZSkge1xuICAgIGlmIChmb3JtVmFsdWVzKSB7XG4gICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gdGhpcy5vYmplY3RXcmFwID8gZm9ybVZhbHVlc1snMSddIDogZm9ybVZhbHVlcztcbiAgICAgIGlmICghdGhpcy5qc2YuZm9ybUdyb3VwKSB7XG4gICAgICAgIHRoaXMuanNmLmZvcm1WYWx1ZXMgPSBmb3JtVmFsdWVzO1xuICAgICAgICB0aGlzLmFjdGl2YXRlRm9ybSgpO1xuICAgICAgfSBlbHNlIGlmIChyZXNldEZpcnN0KSB7XG4gICAgICAgIHRoaXMuanNmLmZvcm1Hcm91cC5yZXNldCgpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuanNmLmZvcm1Hcm91cCkge1xuICAgICAgICB0aGlzLmpzZi5mb3JtR3JvdXAucGF0Y2hWYWx1ZShuZXdGb3JtVmFsdWVzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9uQ2hhbmdlKSB7IHRoaXMub25DaGFuZ2UobmV3Rm9ybVZhbHVlcyk7IH1cbiAgICAgIGlmICh0aGlzLm9uVG91Y2hlZCkgeyB0aGlzLm9uVG91Y2hlZChuZXdGb3JtVmFsdWVzKTsgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmpzZi5mb3JtR3JvdXAucmVzZXQoKTtcbiAgICB9XG4gIH1cblxuICBzdWJtaXRGb3JtKCkge1xuICAgIGNvbnN0IHZhbGlkRGF0YSA9IHRoaXMuanNmLnZhbGlkRGF0YTtcbiAgICB0aGlzLm9uU3VibWl0LmVtaXQodGhpcy5vYmplY3RXcmFwID8gdmFsaWREYXRhWycxJ10gOiB2YWxpZERhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqICdpbml0aWFsaXplRm9ybScgZnVuY3Rpb25cbiAgICpcbiAgICogLSBVcGRhdGUgJ3NjaGVtYScsICdsYXlvdXQnLCBhbmQgJ2Zvcm1WYWx1ZXMnLCBmcm9tIGlucHV0cy5cbiAgICpcbiAgICogLSBDcmVhdGUgJ3NjaGVtYVJlZkxpYnJhcnknIGFuZCAnc2NoZW1hUmVjdXJzaXZlUmVmTWFwJ1xuICAgKiAgIHRvIHJlc29sdmUgc2NoZW1hICRyZWYgbGlua3MsIGluY2x1ZGluZyByZWN1cnNpdmUgJHJlZiBsaW5rcy5cbiAgICpcbiAgICogLSBDcmVhdGUgJ2RhdGFSZWN1cnNpdmVSZWZNYXAnIHRvIHJlc29sdmUgcmVjdXJzaXZlIGxpbmtzIGluIGRhdGFcbiAgICogICBhbmQgY29yZWN0bHkgc2V0IG91dHB1dCBmb3JtYXRzIGZvciByZWN1cnNpdmVseSBuZXN0ZWQgdmFsdWVzLlxuICAgKlxuICAgKiAtIENyZWF0ZSAnbGF5b3V0UmVmTGlicmFyeScgYW5kICd0ZW1wbGF0ZVJlZkxpYnJhcnknIHRvIHN0b3JlXG4gICAqICAgbmV3IGxheW91dCBub2RlcyBhbmQgZm9ybUdyb3VwIGVsZW1lbnRzIHRvIHVzZSB3aGVuIGR5bmFtaWNhbGx5XG4gICAqICAgYWRkaW5nIGZvcm0gY29tcG9uZW50cyB0byBhcnJheXMgYW5kIHJlY3Vyc2l2ZSAkcmVmIHBvaW50cy5cbiAgICpcbiAgICogLSBDcmVhdGUgJ2RhdGFNYXAnIHRvIG1hcCB0aGUgZGF0YSB0byB0aGUgc2NoZW1hIGFuZCB0ZW1wbGF0ZS5cbiAgICpcbiAgICogLSBDcmVhdGUgdGhlIG1hc3RlciAnZm9ybUdyb3VwVGVtcGxhdGUnIHRoZW4gZnJvbSBpdCAnZm9ybUdyb3VwJ1xuICAgKiAgIHRoZSBBbmd1bGFyIGZvcm1Hcm91cCB1c2VkIHRvIGNvbnRyb2wgdGhlIHJlYWN0aXZlIGZvcm0uXG4gICAqL1xuICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnNjaGVtYSB8fCB0aGlzLmxheW91dCB8fCB0aGlzLmRhdGEgfHwgdGhpcy5mb3JtIHx8IHRoaXMubW9kZWwgfHxcbiAgICAgIHRoaXMuSlNPTlNjaGVtYSB8fCB0aGlzLlVJU2NoZW1hIHx8IHRoaXMuZm9ybURhdGEgfHwgdGhpcy5uZ01vZGVsIHx8XG4gICAgICB0aGlzLmpzZi5kYXRhXG4gICAgKSB7XG5cbiAgICAgIHRoaXMuanNmLnJlc2V0QWxsVmFsdWVzKCk7ICAvLyBSZXNldCBhbGwgZm9ybSB2YWx1ZXMgdG8gZGVmYXVsdHNcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU9wdGlvbnMoKTsgICAvLyBVcGRhdGUgb3B0aW9uc1xuICAgICAgdGhpcy5pbml0aWFsaXplU2NoZW1hKCk7ICAgIC8vIFVwZGF0ZSBzY2hlbWEsIHNjaGVtYVJlZkxpYnJhcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2NoZW1hUmVjdXJzaXZlUmVmTWFwLCAmIGRhdGFSZWN1cnNpdmVSZWZNYXBcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUxheW91dCgpOyAgICAvLyBVcGRhdGUgbGF5b3V0LCBsYXlvdXRSZWZMaWJyYXJ5LFxuICAgICAgdGhpcy5pbml0aWFsaXplRGF0YSgpOyAgICAgIC8vIFVwZGF0ZSBmb3JtVmFsdWVzXG4gICAgICB0aGlzLmFjdGl2YXRlRm9ybSgpOyAgICAgICAgLy8gVXBkYXRlIGRhdGFNYXAsIHRlbXBsYXRlUmVmTGlicmFyeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmb3JtR3JvdXBUZW1wbGF0ZSwgZm9ybUdyb3VwXG5cbiAgICAgIC8vIFVuY29tbWVudCBpbmRpdmlkdWFsIGxpbmVzIHRvIG91dHB1dCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdG8gY29uc29sZTpcbiAgICAgIC8vIChUaGVzZSBhbHdheXMgd29yay4pXG4gICAgICAvLyBjb25zb2xlLmxvZygnbG9hZGluZyBmb3JtLi4uJyk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnc2NoZW1hJywgdGhpcy5qc2Yuc2NoZW1hKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdsYXlvdXQnLCB0aGlzLmpzZi5sYXlvdXQpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ29wdGlvbnMnLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2Zvcm1WYWx1ZXMnLCB0aGlzLmpzZi5mb3JtVmFsdWVzKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdmb3JtR3JvdXBUZW1wbGF0ZScsIHRoaXMuanNmLmZvcm1Hcm91cFRlbXBsYXRlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdmb3JtR3JvdXAnLCB0aGlzLmpzZi5mb3JtR3JvdXApO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2Zvcm1Hcm91cC52YWx1ZScsIHRoaXMuanNmLmZvcm1Hcm91cC52YWx1ZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnc2NoZW1hUmVmTGlicmFyeScsIHRoaXMuanNmLnNjaGVtYVJlZkxpYnJhcnkpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2xheW91dFJlZkxpYnJhcnknLCB0aGlzLmpzZi5sYXlvdXRSZWZMaWJyYXJ5KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCd0ZW1wbGF0ZVJlZkxpYnJhcnknLCB0aGlzLmpzZi50ZW1wbGF0ZVJlZkxpYnJhcnkpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2RhdGFNYXAnLCB0aGlzLmpzZi5kYXRhTWFwKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdhcnJheU1hcCcsIHRoaXMuanNmLmFycmF5TWFwKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdzY2hlbWFSZWN1cnNpdmVSZWZNYXAnLCB0aGlzLmpzZi5zY2hlbWFSZWN1cnNpdmVSZWZNYXApO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2RhdGFSZWN1cnNpdmVSZWZNYXAnLCB0aGlzLmpzZi5kYXRhUmVjdXJzaXZlUmVmTWFwKTtcblxuICAgICAgLy8gVW5jb21tZW50IGluZGl2aWR1YWwgbGluZXMgdG8gb3V0cHV0IGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0byBicm93c2VyOlxuICAgICAgLy8gKFRoZXNlIG9ubHkgd29yayBpZiB0aGUgJ2RlYnVnJyBvcHRpb24gaGFzIGFsc28gYmVlbiBzZXQgdG8gJ3RydWUnLilcbiAgICAgIGlmICh0aGlzLmRlYnVnIHx8IHRoaXMuanNmLmZvcm1PcHRpb25zLmRlYnVnKSB7XG4gICAgICAgIGNvbnN0IHZhcnM6IGFueVtdID0gW107XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5zY2hlbWEpO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5qc2YubGF5b3V0KTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMub3B0aW9ucyk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5mb3JtVmFsdWVzKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmZvcm1Hcm91cC52YWx1ZSk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5mb3JtR3JvdXBUZW1wbGF0ZSk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5mb3JtR3JvdXApO1xuICAgICAgICAvLyB2YXJzLnB1c2godGhpcy5qc2Yuc2NoZW1hUmVmTGlicmFyeSk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5sYXlvdXRSZWZMaWJyYXJ5KTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLnRlbXBsYXRlUmVmTGlicmFyeSk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5kYXRhTWFwKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLmFycmF5TWFwKTtcbiAgICAgICAgLy8gdmFycy5wdXNoKHRoaXMuanNmLnNjaGVtYVJlY3Vyc2l2ZVJlZk1hcCk7XG4gICAgICAgIC8vIHZhcnMucHVzaCh0aGlzLmpzZi5kYXRhUmVjdXJzaXZlUmVmTWFwKTtcbiAgICAgICAgdGhpcy5kZWJ1Z091dHB1dCA9IHZhcnMubWFwKHYgPT4gSlNPTi5zdHJpbmdpZnkodiwgbnVsbCwgMikpLmpvaW4oJ1xcbicpO1xuICAgICAgfVxuICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiAnaW5pdGlhbGl6ZU9wdGlvbnMnIGZ1bmN0aW9uXG4gICAqXG4gICAqIEluaXRpYWxpemUgJ29wdGlvbnMnIChnbG9iYWwgZm9ybSBvcHRpb25zKSBhbmQgc2V0IGZyYW1ld29ya1xuICAgKiBDb21iaW5lIGF2YWlsYWJsZSBpbnB1dHM6XG4gICAqIDEuIG9wdGlvbnMgLSByZWNvbW1lbmRlZFxuICAgKiAyLiBmb3JtLm9wdGlvbnMgLSBTaW5nbGUgaW5wdXQgc3R5bGVcbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZU9wdGlvbnMoKSB7XG4gICAgaWYgKHRoaXMubGFuZ3VhZ2UgJiYgdGhpcy5sYW5ndWFnZSAhPT0gdGhpcy5qc2YubGFuZ3VhZ2UpIHtcbiAgICAgIHRoaXMuanNmLnNldExhbmd1YWdlKHRoaXMubGFuZ3VhZ2UpO1xuICAgIH1cbiAgICB0aGlzLmpzZi5zZXRPcHRpb25zKHsgZGVidWc6ICEhdGhpcy5kZWJ1ZyB9KTtcbiAgICBsZXQgbG9hZEV4dGVybmFsQXNzZXRzOiBib29sZWFuID0gdGhpcy5sb2FkRXh0ZXJuYWxBc3NldHMgfHwgZmFsc2U7XG4gICAgbGV0IGZyYW1ld29yazogYW55ID0gdGhpcy5mcmFtZXdvcmsgfHwgJ2RlZmF1bHQnO1xuICAgIGlmIChpc09iamVjdCh0aGlzLm9wdGlvbnMpKSB7XG4gICAgICB0aGlzLmpzZi5zZXRPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgICBsb2FkRXh0ZXJuYWxBc3NldHMgPSB0aGlzLm9wdGlvbnMubG9hZEV4dGVybmFsQXNzZXRzIHx8IGxvYWRFeHRlcm5hbEFzc2V0cztcbiAgICAgIGZyYW1ld29yayA9IHRoaXMub3B0aW9ucy5mcmFtZXdvcmsgfHwgZnJhbWV3b3JrO1xuICAgIH1cbiAgICBpZiAoaXNPYmplY3QodGhpcy5mb3JtKSAmJiBpc09iamVjdCh0aGlzLmZvcm0ub3B0aW9ucykpIHtcbiAgICAgIHRoaXMuanNmLnNldE9wdGlvbnModGhpcy5mb3JtLm9wdGlvbnMpO1xuICAgICAgbG9hZEV4dGVybmFsQXNzZXRzID0gdGhpcy5mb3JtLm9wdGlvbnMubG9hZEV4dGVybmFsQXNzZXRzIHx8IGxvYWRFeHRlcm5hbEFzc2V0cztcbiAgICAgIGZyYW1ld29yayA9IHRoaXMuZm9ybS5vcHRpb25zLmZyYW1ld29yayB8fCBmcmFtZXdvcms7XG4gICAgfVxuICAgIGlmIChpc09iamVjdCh0aGlzLndpZGdldHMpKSB7XG4gICAgICB0aGlzLmpzZi5zZXRPcHRpb25zKHsgd2lkZ2V0czogdGhpcy53aWRnZXRzIH0pO1xuICAgIH1cbiAgICB0aGlzLmZyYW1ld29ya0xpYnJhcnkuc2V0TG9hZEV4dGVybmFsQXNzZXRzKGxvYWRFeHRlcm5hbEFzc2V0cyk7XG4gICAgdGhpcy5mcmFtZXdvcmtMaWJyYXJ5LnNldEZyYW1ld29yayhmcmFtZXdvcmspO1xuICAgIHRoaXMuanNmLmZyYW1ld29yayA9IHRoaXMuZnJhbWV3b3JrTGlicmFyeS5nZXRGcmFtZXdvcmsoKTtcbiAgICBpZiAoaXNPYmplY3QodGhpcy5qc2YuZm9ybU9wdGlvbnMud2lkZ2V0cykpIHtcbiAgICAgIGZvciAoY29uc3Qgd2lkZ2V0IG9mIE9iamVjdC5rZXlzKHRoaXMuanNmLmZvcm1PcHRpb25zLndpZGdldHMpKSB7XG4gICAgICAgIHRoaXMud2lkZ2V0TGlicmFyeS5yZWdpc3RlcldpZGdldCh3aWRnZXQsIHRoaXMuanNmLmZvcm1PcHRpb25zLndpZGdldHNbd2lkZ2V0XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc09iamVjdCh0aGlzLmZvcm0pICYmIGlzT2JqZWN0KHRoaXMuZm9ybS50cGxkYXRhKSkge1xuICAgICAgdGhpcy5qc2Yuc2V0VHBsZGF0YSh0aGlzLmZvcm0udHBsZGF0YSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICdpbml0aWFsaXplU2NoZW1hJyBmdW5jdGlvblxuICAgKlxuICAgKiBJbml0aWFsaXplICdzY2hlbWEnXG4gICAqIFVzZSBmaXJzdCBhdmFpbGFibGUgaW5wdXQ6XG4gICAqIDEuIHNjaGVtYSAtIHJlY29tbWVuZGVkIC8gQW5ndWxhciBTY2hlbWEgRm9ybSBzdHlsZVxuICAgKiAyLiBmb3JtLnNjaGVtYSAtIFNpbmdsZSBpbnB1dCAvIEpTT04gRm9ybSBzdHlsZVxuICAgKiAzLiBKU09OU2NoZW1hIC0gUmVhY3QgSlNPTiBTY2hlbWEgRm9ybSBzdHlsZVxuICAgKiA0LiBmb3JtLkpTT05TY2hlbWEgLSBGb3IgdGVzdGluZyBzaW5nbGUgaW5wdXQgUmVhY3QgSlNPTiBTY2hlbWEgRm9ybXNcbiAgICogNS4gZm9ybSAtIEZvciB0ZXN0aW5nIHNpbmdsZSBzY2hlbWEtb25seSBpbnB1dHNcbiAgICpcbiAgICogLi4uIGlmIG5vIHNjaGVtYSBpbnB1dCBmb3VuZCwgdGhlICdhY3RpdmF0ZUZvcm0nIGZ1bmN0aW9uLCBiZWxvdyxcbiAgICogICAgIHdpbGwgbWFrZSB0d28gYWRkaXRpb25hbCBhdHRlbXB0cyB0byBidWlsZCBhIHNjaGVtYVxuICAgKiA2LiBJZiBsYXlvdXQgaW5wdXQgLSBidWlsZCBzY2hlbWEgZnJvbSBsYXlvdXRcbiAgICogNy4gSWYgZGF0YSBpbnB1dCAtIGJ1aWxkIHNjaGVtYSBmcm9tIGRhdGFcbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZVNjaGVtYSgpIHtcblxuICAgIC8vIFRPRE86IHVwZGF0ZSB0byBhbGxvdyBub24tb2JqZWN0IHNjaGVtYXNcblxuICAgIGlmIChpc09iamVjdCh0aGlzLnNjaGVtYSkpIHtcbiAgICAgIHRoaXMuanNmLkFuZ3VsYXJTY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5zY2hlbWEgPSBjbG9uZURlZXAodGhpcy5zY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoaGFzT3duKHRoaXMuZm9ybSwgJ3NjaGVtYScpICYmIGlzT2JqZWN0KHRoaXMuZm9ybS5zY2hlbWEpKSB7XG4gICAgICB0aGlzLmpzZi5zY2hlbWEgPSBjbG9uZURlZXAodGhpcy5mb3JtLnNjaGVtYSk7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdCh0aGlzLkpTT05TY2hlbWEpKSB7XG4gICAgICB0aGlzLmpzZi5SZWFjdEpzb25TY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5zY2hlbWEgPSBjbG9uZURlZXAodGhpcy5KU09OU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKGhhc093bih0aGlzLmZvcm0sICdKU09OU2NoZW1hJykgJiYgaXNPYmplY3QodGhpcy5mb3JtLkpTT05TY2hlbWEpKSB7XG4gICAgICB0aGlzLmpzZi5SZWFjdEpzb25TY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5zY2hlbWEgPSBjbG9uZURlZXAodGhpcy5mb3JtLkpTT05TY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoaGFzT3duKHRoaXMuZm9ybSwgJ3Byb3BlcnRpZXMnKSAmJiBpc09iamVjdCh0aGlzLmZvcm0ucHJvcGVydGllcykpIHtcbiAgICAgIHRoaXMuanNmLnNjaGVtYSA9IGNsb25lRGVlcCh0aGlzLmZvcm0pO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodGhpcy5mb3JtKSkge1xuICAgICAgLy8gVE9ETzogSGFuZGxlIG90aGVyIHR5cGVzIG9mIGZvcm0gaW5wdXRcbiAgICB9XG5cbiAgICBpZiAoIWlzRW1wdHkodGhpcy5qc2Yuc2NoZW1hKSkge1xuXG4gICAgICAvLyBJZiBvdGhlciB0eXBlcyBhbHNvIGFsbG93ZWQsIHJlbmRlciBzY2hlbWEgYXMgYW4gb2JqZWN0XG4gICAgICBpZiAoaW5BcnJheSgnb2JqZWN0JywgdGhpcy5qc2Yuc2NoZW1hLnR5cGUpKSB7XG4gICAgICAgIHRoaXMuanNmLnNjaGVtYS50eXBlID0gJ29iamVjdCc7XG4gICAgICB9XG5cbiAgICAgIC8vIFdyYXAgbm9uLW9iamVjdCBzY2hlbWFzIGluIG9iamVjdC5cbiAgICAgIGlmIChoYXNPd24odGhpcy5qc2Yuc2NoZW1hLCAndHlwZScpICYmIHRoaXMuanNmLnNjaGVtYS50eXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLmpzZi5zY2hlbWEgPSB7XG4gICAgICAgICAgJ3R5cGUnOiAnb2JqZWN0JyxcbiAgICAgICAgICAncHJvcGVydGllcyc6IHsgMTogdGhpcy5qc2Yuc2NoZW1hIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5vYmplY3RXcmFwID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoIWhhc093bih0aGlzLmpzZi5zY2hlbWEsICd0eXBlJykpIHtcblxuICAgICAgICAvLyBBZGQgdHlwZSA9ICdvYmplY3QnIGlmIG1pc3NpbmdcbiAgICAgICAgaWYgKGlzT2JqZWN0KHRoaXMuanNmLnNjaGVtYS5wcm9wZXJ0aWVzKSB8fFxuICAgICAgICAgIGlzT2JqZWN0KHRoaXMuanNmLnNjaGVtYS5wYXR0ZXJuUHJvcGVydGllcykgfHxcbiAgICAgICAgICBpc09iamVjdCh0aGlzLmpzZi5zY2hlbWEuYWRkaXRpb25hbFByb3BlcnRpZXMpXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMuanNmLnNjaGVtYS50eXBlID0gJ29iamVjdCc7XG5cbiAgICAgICAgLy8gRml4IEpTT04gc2NoZW1hIHNob3J0aGFuZCAoSlNPTiBGb3JtIHN0eWxlKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuanNmLkpzb25Gb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICAgICAgdGhpcy5qc2Yuc2NoZW1hID0ge1xuICAgICAgICAgICAgJ3R5cGUnOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICdwcm9wZXJ0aWVzJzogdGhpcy5qc2Yuc2NoZW1hXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiBuZWVkZWQsIHVwZGF0ZSBKU09OIFNjaGVtYSB0byBkcmFmdCA2IGZvcm1hdCwgaW5jbHVkaW5nXG4gICAgICAvLyBkcmFmdCAzIChKU09OIEZvcm0gc3R5bGUpIGFuZCBkcmFmdCA0IChBbmd1bGFyIFNjaGVtYSBGb3JtIHN0eWxlKVxuICAgICAgdGhpcy5qc2Yuc2NoZW1hID0gY29udmVydFNjaGVtYVRvRHJhZnQ2KHRoaXMuanNmLnNjaGVtYSk7XG5cbiAgICAgIC8vIEluaXRpYWxpemUgYWp2IGFuZCBjb21waWxlIHNjaGVtYVxuICAgICAgdGhpcy5qc2YuY29tcGlsZUFqdlNjaGVtYSgpO1xuXG4gICAgICAvLyBDcmVhdGUgc2NoZW1hUmVmTGlicmFyeSwgc2NoZW1hUmVjdXJzaXZlUmVmTWFwLCBkYXRhUmVjdXJzaXZlUmVmTWFwLCAmIGFycmF5TWFwXG4gICAgICB0aGlzLmpzZi5zY2hlbWEgPSByZXNvbHZlU2NoZW1hUmVmZXJlbmNlcyhcbiAgICAgICAgdGhpcy5qc2Yuc2NoZW1hLCB0aGlzLmpzZi5zY2hlbWFSZWZMaWJyYXJ5LCB0aGlzLmpzZi5zY2hlbWFSZWN1cnNpdmVSZWZNYXAsXG4gICAgICAgIHRoaXMuanNmLmRhdGFSZWN1cnNpdmVSZWZNYXAsIHRoaXMuanNmLmFycmF5TWFwXG4gICAgICApO1xuICAgICAgaWYgKGhhc093bih0aGlzLmpzZi5zY2hlbWFSZWZMaWJyYXJ5LCAnJykpIHtcbiAgICAgICAgdGhpcy5qc2YuaGFzUm9vdFJlZmVyZW5jZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86ICg/KSBSZXNvbHZlIGV4dGVybmFsICRyZWYgbGlua3NcbiAgICAgIC8vIC8vIENyZWF0ZSBzY2hlbWFSZWZMaWJyYXJ5ICYgc2NoZW1hUmVjdXJzaXZlUmVmTWFwXG4gICAgICAvLyB0aGlzLnBhcnNlci5idW5kbGUodGhpcy5zY2hlbWEpXG4gICAgICAvLyAgIC50aGVuKHNjaGVtYSA9PiB0aGlzLnNjaGVtYSA9IHJlc29sdmVTY2hlbWFSZWZlcmVuY2VzKFxuICAgICAgLy8gICAgIHNjaGVtYSwgdGhpcy5qc2Yuc2NoZW1hUmVmTGlicmFyeSxcbiAgICAgIC8vICAgICB0aGlzLmpzZi5zY2hlbWFSZWN1cnNpdmVSZWZNYXAsIHRoaXMuanNmLmRhdGFSZWN1cnNpdmVSZWZNYXBcbiAgICAgIC8vICAgKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICdpbml0aWFsaXplRGF0YScgZnVuY3Rpb25cbiAgICpcbiAgICogSW5pdGlhbGl6ZSAnZm9ybVZhbHVlcydcbiAgICogZGVmdWxhdCBvciBwcmV2aW91c2x5IHN1Ym1pdHRlZCB2YWx1ZXMgdXNlZCB0byBwb3B1bGF0ZSBmb3JtXG4gICAqIFVzZSBmaXJzdCBhdmFpbGFibGUgaW5wdXQ6XG4gICAqIDEuIGRhdGEgLSByZWNvbW1lbmRlZFxuICAgKiAyLiBtb2RlbCAtIEFuZ3VsYXIgU2NoZW1hIEZvcm0gc3R5bGVcbiAgICogMy4gZm9ybS52YWx1ZSAtIEpTT04gRm9ybSBzdHlsZVxuICAgKiA0LiBmb3JtLmRhdGEgLSBTaW5nbGUgaW5wdXQgc3R5bGVcbiAgICogNS4gZm9ybURhdGEgLSBSZWFjdCBKU09OIFNjaGVtYSBGb3JtIHN0eWxlXG4gICAqIDYuIGZvcm0uZm9ybURhdGEgLSBGb3IgZWFzaWVyIHRlc3Rpbmcgb2YgUmVhY3QgSlNPTiBTY2hlbWEgRm9ybXNcbiAgICogNy4gKG5vbmUpIG5vIGRhdGEgLSBpbml0aWFsaXplIGRhdGEgZnJvbSBzY2hlbWEgYW5kIGxheW91dCBkZWZhdWx0cyBvbmx5XG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVEYXRhKCkge1xuICAgIGlmIChoYXNWYWx1ZSh0aGlzLmRhdGEpKSB7XG4gICAgICB0aGlzLmpzZi5mb3JtVmFsdWVzID0gY2xvbmVEZWVwKHRoaXMuZGF0YSk7XG4gICAgICB0aGlzLmZvcm1WYWx1ZXNJbnB1dCA9ICdkYXRhJztcbiAgICB9IGVsc2UgaWYgKGhhc1ZhbHVlKHRoaXMubW9kZWwpKSB7XG4gICAgICB0aGlzLmpzZi5Bbmd1bGFyU2NoZW1hRm9ybUNvbXBhdGliaWxpdHkgPSB0cnVlO1xuICAgICAgdGhpcy5qc2YuZm9ybVZhbHVlcyA9IGNsb25lRGVlcCh0aGlzLm1vZGVsKTtcbiAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ21vZGVsJztcbiAgICB9IGVsc2UgaWYgKGhhc1ZhbHVlKHRoaXMubmdNb2RlbCkpIHtcbiAgICAgIHRoaXMuanNmLkFuZ3VsYXJTY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5mb3JtVmFsdWVzID0gY2xvbmVEZWVwKHRoaXMubmdNb2RlbCk7XG4gICAgICB0aGlzLmZvcm1WYWx1ZXNJbnB1dCA9ICduZ01vZGVsJztcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuZm9ybSkgJiYgaGFzVmFsdWUodGhpcy5mb3JtLnZhbHVlKSkge1xuICAgICAgdGhpcy5qc2YuSnNvbkZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLmZvcm1WYWx1ZXMgPSBjbG9uZURlZXAodGhpcy5mb3JtLnZhbHVlKTtcbiAgICAgIHRoaXMuZm9ybVZhbHVlc0lucHV0ID0gJ2Zvcm0udmFsdWUnO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodGhpcy5mb3JtKSAmJiBoYXNWYWx1ZSh0aGlzLmZvcm0uZGF0YSkpIHtcbiAgICAgIHRoaXMuanNmLmZvcm1WYWx1ZXMgPSBjbG9uZURlZXAodGhpcy5mb3JtLmRhdGEpO1xuICAgICAgdGhpcy5mb3JtVmFsdWVzSW5wdXQgPSAnZm9ybS5kYXRhJztcbiAgICB9IGVsc2UgaWYgKGhhc1ZhbHVlKHRoaXMuZm9ybURhdGEpKSB7XG4gICAgICB0aGlzLmpzZi5SZWFjdEpzb25TY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmZvcm1WYWx1ZXNJbnB1dCA9ICdmb3JtRGF0YSc7XG4gICAgfSBlbHNlIGlmIChoYXNPd24odGhpcy5mb3JtLCAnZm9ybURhdGEnKSAmJiBoYXNWYWx1ZSh0aGlzLmZvcm0uZm9ybURhdGEpKSB7XG4gICAgICB0aGlzLmpzZi5SZWFjdEpzb25TY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICB0aGlzLmpzZi5mb3JtVmFsdWVzID0gY2xvbmVEZWVwKHRoaXMuZm9ybS5mb3JtRGF0YSk7XG4gICAgICB0aGlzLmZvcm1WYWx1ZXNJbnB1dCA9ICdmb3JtLmZvcm1EYXRhJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mb3JtVmFsdWVzSW5wdXQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiAnaW5pdGlhbGl6ZUxheW91dCcgZnVuY3Rpb25cbiAgICpcbiAgICogSW5pdGlhbGl6ZSAnbGF5b3V0J1xuICAgKiBVc2UgZmlyc3QgYXZhaWxhYmxlIGFycmF5IGlucHV0OlxuICAgKiAxLiBsYXlvdXQgLSByZWNvbW1lbmRlZFxuICAgKiAyLiBmb3JtIC0gQW5ndWxhciBTY2hlbWEgRm9ybSBzdHlsZVxuICAgKiAzLiBmb3JtLmZvcm0gLSBKU09OIEZvcm0gc3R5bGVcbiAgICogNC4gZm9ybS5sYXlvdXQgLSBTaW5nbGUgaW5wdXQgc3R5bGVcbiAgICogNS4gKG5vbmUpIG5vIGxheW91dCAtIHNldCBkZWZhdWx0IGxheW91dCBpbnN0ZWFkXG4gICAqICAgIChmdWxsIGxheW91dCB3aWxsIGJlIGJ1aWx0IGxhdGVyIGZyb20gdGhlIHNjaGVtYSlcbiAgICpcbiAgICogQWxzbywgaWYgYWx0ZXJuYXRlIGxheW91dCBmb3JtYXRzIGFyZSBhdmFpbGFibGUsXG4gICAqIGltcG9ydCBmcm9tICdVSVNjaGVtYScgb3IgJ2N1c3RvbUZvcm1JdGVtcydcbiAgICogdXNlZCBmb3IgUmVhY3QgSlNPTiBTY2hlbWEgRm9ybSBhbmQgSlNPTiBGb3JtIEFQSSBjb21wYXRpYmlsaXR5XG4gICAqIFVzZSBmaXJzdCBhdmFpbGFibGUgaW5wdXQ6XG4gICAqIDEuIFVJU2NoZW1hIC0gUmVhY3QgSlNPTiBTY2hlbWEgRm9ybSBzdHlsZVxuICAgKiAyLiBmb3JtLlVJU2NoZW1hIC0gRm9yIHRlc3Rpbmcgc2luZ2xlIGlucHV0IFJlYWN0IEpTT04gU2NoZW1hIEZvcm1zXG4gICAqIDIuIGZvcm0uY3VzdG9tRm9ybUl0ZW1zIC0gSlNPTiBGb3JtIHN0eWxlXG4gICAqIDMuIChub25lKSBubyBpbnB1dCAtIGRvbid0IGltcG9ydFxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplTGF5b3V0KCkge1xuXG4gICAgLy8gUmVuYW1lIEpTT04gRm9ybS1zdHlsZSAnb3B0aW9ucycgbGlzdHMgdG9cbiAgICAvLyBBbmd1bGFyIFNjaGVtYSBGb3JtLXN0eWxlICd0aXRsZU1hcCcgbGlzdHMuXG4gICAgY29uc3QgZml4SnNvbkZvcm1PcHRpb25zID0gKGxheW91dDogYW55KTogYW55ID0+IHtcbiAgICAgIGlmIChpc09iamVjdChsYXlvdXQpIHx8IGlzQXJyYXkobGF5b3V0KSkge1xuICAgICAgICBmb3JFYWNoKGxheW91dCwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoaGFzT3duKHZhbHVlLCAnb3B0aW9ucycpICYmIGlzT2JqZWN0KHZhbHVlLm9wdGlvbnMpKSB7XG4gICAgICAgICAgICB2YWx1ZS50aXRsZU1hcCA9IHZhbHVlLm9wdGlvbnM7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWUub3B0aW9ucztcbiAgICAgICAgICB9XG4gICAgICAgIH0sICd0b3AtZG93bicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxheW91dDtcbiAgICB9O1xuXG4gICAgLy8gQ2hlY2sgZm9yIGxheW91dCBpbnB1dHMgYW5kLCBpZiBmb3VuZCwgaW5pdGlhbGl6ZSBmb3JtIGxheW91dFxuICAgIGlmIChpc0FycmF5KHRoaXMubGF5b3V0KSkge1xuICAgICAgdGhpcy5qc2YubGF5b3V0ID0gY2xvbmVEZWVwKHRoaXMubGF5b3V0KTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkodGhpcy5mb3JtKSkge1xuICAgICAgdGhpcy5qc2YuQW5ndWxhclNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuanNmLmxheW91dCA9IGNsb25lRGVlcCh0aGlzLmZvcm0pO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mb3JtICYmIGlzQXJyYXkodGhpcy5mb3JtLmZvcm0pKSB7XG4gICAgICB0aGlzLmpzZi5Kc29uRm9ybUNvbXBhdGliaWxpdHkgPSB0cnVlO1xuICAgICAgdGhpcy5qc2YubGF5b3V0ID0gZml4SnNvbkZvcm1PcHRpb25zKGNsb25lRGVlcCh0aGlzLmZvcm0uZm9ybSkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mb3JtICYmIGlzQXJyYXkodGhpcy5mb3JtLmxheW91dCkpIHtcbiAgICAgIHRoaXMuanNmLmxheW91dCA9IGNsb25lRGVlcCh0aGlzLmZvcm0ubGF5b3V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5qc2YubGF5b3V0ID0gWycqJ107XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGFsdGVybmF0ZSBsYXlvdXQgaW5wdXRzXG4gICAgbGV0IGFsdGVybmF0ZUxheW91dDogYW55ID0gbnVsbDtcbiAgICBpZiAoaXNPYmplY3QodGhpcy5VSVNjaGVtYSkpIHtcbiAgICAgIHRoaXMuanNmLlJlYWN0SnNvblNjaGVtYUZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIGFsdGVybmF0ZUxheW91dCA9IGNsb25lRGVlcCh0aGlzLlVJU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKGhhc093bih0aGlzLmZvcm0sICdVSVNjaGVtYScpKSB7XG4gICAgICB0aGlzLmpzZi5SZWFjdEpzb25TY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICBhbHRlcm5hdGVMYXlvdXQgPSBjbG9uZURlZXAodGhpcy5mb3JtLlVJU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKGhhc093bih0aGlzLmZvcm0sICd1aVNjaGVtYScpKSB7XG4gICAgICB0aGlzLmpzZi5SZWFjdEpzb25TY2hlbWFGb3JtQ29tcGF0aWJpbGl0eSA9IHRydWU7XG4gICAgICBhbHRlcm5hdGVMYXlvdXQgPSBjbG9uZURlZXAodGhpcy5mb3JtLnVpU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKGhhc093bih0aGlzLmZvcm0sICdjdXN0b21Gb3JtSXRlbXMnKSkge1xuICAgICAgdGhpcy5qc2YuSnNvbkZvcm1Db21wYXRpYmlsaXR5ID0gdHJ1ZTtcbiAgICAgIGFsdGVybmF0ZUxheW91dCA9IGZpeEpzb25Gb3JtT3B0aW9ucyhjbG9uZURlZXAodGhpcy5mb3JtLmN1c3RvbUZvcm1JdGVtcykpO1xuICAgIH1cblxuICAgIC8vIGlmIGFsdGVybmF0ZSBsYXlvdXQgZm91bmQsIGNvcHkgYWx0ZXJuYXRlIGxheW91dCBvcHRpb25zIGludG8gc2NoZW1hXG4gICAgaWYgKGFsdGVybmF0ZUxheW91dCkge1xuICAgICAgSnNvblBvaW50ZXIuZm9yRWFjaERlZXAoYWx0ZXJuYXRlTGF5b3V0LCAodmFsdWUsIHBvaW50ZXIpID0+IHtcbiAgICAgICAgY29uc3Qgc2NoZW1hUG9pbnRlciA9IHBvaW50ZXJcbiAgICAgICAgICAucmVwbGFjZSgvXFwvL2csICcvcHJvcGVydGllcy8nKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXC9wcm9wZXJ0aWVzXFwvaXRlbXNcXC9wcm9wZXJ0aWVzXFwvL2csICcvaXRlbXMvcHJvcGVydGllcy8nKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXC9wcm9wZXJ0aWVzXFwvdGl0bGVNYXBcXC9wcm9wZXJ0aWVzXFwvL2csICcvdGl0bGVNYXAvcHJvcGVydGllcy8nKTtcbiAgICAgICAgaWYgKGhhc1ZhbHVlKHZhbHVlKSAmJiBoYXNWYWx1ZShwb2ludGVyKSkge1xuICAgICAgICAgIGxldCBrZXkgPSBKc29uUG9pbnRlci50b0tleShwb2ludGVyKTtcbiAgICAgICAgICBjb25zdCBncm91cFBvaW50ZXIgPSAoSnNvblBvaW50ZXIucGFyc2Uoc2NoZW1hUG9pbnRlcikgfHwgW10pLnNsaWNlKDAsIC0yKTtcbiAgICAgICAgICBsZXQgaXRlbVBvaW50ZXI6IHN0cmluZyB8IHN0cmluZ1tdO1xuXG4gICAgICAgICAgLy8gSWYgJ3VpOm9yZGVyJyBvYmplY3QgZm91bmQsIGNvcHkgaW50byBvYmplY3Qgc2NoZW1hIHJvb3RcbiAgICAgICAgICBpZiAoa2V5LnRvTG93ZXJDYXNlKCkgPT09ICd1aTpvcmRlcicpIHtcbiAgICAgICAgICAgIGl0ZW1Qb2ludGVyID0gWy4uLmdyb3VwUG9pbnRlciwgJ3VpOm9yZGVyJ107XG5cbiAgICAgICAgICAvLyBDb3B5IG90aGVyIGFsdGVybmF0ZSBsYXlvdXQgb3B0aW9ucyB0byBzY2hlbWEgJ3gtc2NoZW1hLWZvcm0nLFxuICAgICAgICAgIC8vIChsaWtlIEFuZ3VsYXIgU2NoZW1hIEZvcm0gb3B0aW9ucykgYW5kIHJlbW92ZSBhbnkgJ3VpOicgcHJlZml4ZXNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGtleS5zbGljZSgwLCAzKS50b0xvd2VyQ2FzZSgpID09PSAndWk6JykgeyBrZXkgPSBrZXkuc2xpY2UoMyk7IH1cbiAgICAgICAgICAgIGl0ZW1Qb2ludGVyID0gWy4uLmdyb3VwUG9pbnRlciwgJ3gtc2NoZW1hLWZvcm0nLCBrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoSnNvblBvaW50ZXIuaGFzKHRoaXMuanNmLnNjaGVtYSwgZ3JvdXBQb2ludGVyKSAmJlxuICAgICAgICAgICAgIUpzb25Qb2ludGVyLmhhcyh0aGlzLmpzZi5zY2hlbWEsIGl0ZW1Qb2ludGVyKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgSnNvblBvaW50ZXIuc2V0KHRoaXMuanNmLnNjaGVtYSwgaXRlbVBvaW50ZXIsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiAnYWN0aXZhdGVGb3JtJyBmdW5jdGlvblxuICAgKlxuICAgKiAuLi5jb250aW51ZWQgZnJvbSAnaW5pdGlhbGl6ZVNjaGVtYScgZnVuY3Rpb24sIGFib3ZlXG4gICAqIElmICdzY2hlbWEnIGhhcyBub3QgYmVlbiBpbml0aWFsaXplZCAoaS5lLiBubyBzY2hlbWEgaW5wdXQgZm91bmQpXG4gICAqIDYuIElmIGxheW91dCBpbnB1dCAtIGJ1aWxkIHNjaGVtYSBmcm9tIGxheW91dCBpbnB1dFxuICAgKiA3LiBJZiBkYXRhIGlucHV0IC0gYnVpbGQgc2NoZW1hIGZyb20gZGF0YSBpbnB1dFxuICAgKlxuICAgKiBDcmVhdGUgZmluYWwgbGF5b3V0LFxuICAgKiBidWlsZCB0aGUgRm9ybUdyb3VwIHRlbXBsYXRlIGFuZCB0aGUgQW5ndWxhciBGb3JtR3JvdXAsXG4gICAqIHN1YnNjcmliZSB0byBjaGFuZ2VzLFxuICAgKiBhbmQgYWN0aXZhdGUgdGhlIGZvcm0uXG4gICAqL1xuICBwcml2YXRlIGFjdGl2YXRlRm9ybSgpIHtcblxuICAgIC8vIElmICdzY2hlbWEnIG5vdCBpbml0aWFsaXplZFxuICAgIGlmIChpc0VtcHR5KHRoaXMuanNmLnNjaGVtYSkpIHtcblxuICAgICAgLy8gVE9ETzogSWYgZnVsbCBsYXlvdXQgaW5wdXQgKHdpdGggbm8gJyonKSwgYnVpbGQgc2NoZW1hIGZyb20gbGF5b3V0XG4gICAgICAvLyBpZiAoIXRoaXMuanNmLmxheW91dC5pbmNsdWRlcygnKicpKSB7XG4gICAgICAvLyAgIHRoaXMuanNmLmJ1aWxkU2NoZW1hRnJvbUxheW91dCgpO1xuICAgICAgLy8gfSBlbHNlXG5cbiAgICAgIC8vIElmIGRhdGEgaW5wdXQsIGJ1aWxkIHNjaGVtYSBmcm9tIGRhdGFcbiAgICAgIGlmICghaXNFbXB0eSh0aGlzLmpzZi5mb3JtVmFsdWVzKSkge1xuICAgICAgICB0aGlzLmpzZi5idWlsZFNjaGVtYUZyb21EYXRhKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFpc0VtcHR5KHRoaXMuanNmLnNjaGVtYSkpIHtcblxuICAgICAgLy8gSWYgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWQsIGluaXRpYWxpemUgYWp2IGFuZCBjb21waWxlIHNjaGVtYVxuICAgICAgdGhpcy5qc2YuY29tcGlsZUFqdlNjaGVtYSgpO1xuXG4gICAgICAvLyBVcGRhdGUgYWxsIGxheW91dCBlbGVtZW50cywgYWRkIHZhbHVlcywgd2lkZ2V0cywgYW5kIHZhbGlkYXRvcnMsXG4gICAgICAvLyByZXBsYWNlIGFueSAnKicgd2l0aCBhIGxheW91dCBidWlsdCBmcm9tIGFsbCBzY2hlbWEgZWxlbWVudHMsXG4gICAgICAvLyBhbmQgdXBkYXRlIHRoZSBGb3JtR3JvdXAgdGVtcGxhdGUgd2l0aCBhbnkgbmV3IHZhbGlkYXRvcnNcbiAgICAgIHRoaXMuanNmLmJ1aWxkTGF5b3V0KHRoaXMud2lkZ2V0TGlicmFyeSk7XG5cbiAgICAgIC8vIEJ1aWxkIHRoZSBBbmd1bGFyIEZvcm1Hcm91cCB0ZW1wbGF0ZSBmcm9tIHRoZSBzY2hlbWFcbiAgICAgIHRoaXMuanNmLmJ1aWxkRm9ybUdyb3VwVGVtcGxhdGUodGhpcy5qc2YuZm9ybVZhbHVlcyk7XG5cbiAgICAgIC8vIEJ1aWxkIHRoZSByZWFsIEFuZ3VsYXIgRm9ybUdyb3VwIGZyb20gdGhlIEZvcm1Hcm91cCB0ZW1wbGF0ZVxuICAgICAgdGhpcy5qc2YuYnVpbGRGb3JtR3JvdXAoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5qc2YuZm9ybUdyb3VwKSB7XG5cbiAgICAgIC8vIFJlc2V0IGluaXRpYWwgZm9ybSB2YWx1ZXNcbiAgICAgIGlmICghaXNFbXB0eSh0aGlzLmpzZi5mb3JtVmFsdWVzKSAmJlxuICAgICAgICB0aGlzLmpzZi5mb3JtT3B0aW9ucy5zZXRTY2hlbWFEZWZhdWx0cyAhPT0gdHJ1ZSAmJlxuICAgICAgICB0aGlzLmpzZi5mb3JtT3B0aW9ucy5zZXRMYXlvdXREZWZhdWx0cyAhPT0gdHJ1ZVxuICAgICAgKSB7XG4gICAgICAgIHRoaXMuc2V0Rm9ybVZhbHVlcyh0aGlzLmpzZi5mb3JtVmFsdWVzKTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogRmlndXJlIG91dCBob3cgdG8gZGlzcGxheSBjYWxjdWxhdGVkIHZhbHVlcyB3aXRob3V0IGNoYW5naW5nIG9iamVjdCBkYXRhXG4gICAgICAvLyBTZWUgaHR0cDovL3VsaW9uLmdpdGh1Yi5pby9qc29uZm9ybS9wbGF5Z3JvdW5kLz9leGFtcGxlPXRlbXBsYXRpbmctdmFsdWVzXG4gICAgICAvLyBDYWxjdWxhdGUgcmVmZXJlbmNlcyB0byBvdGhlciBmaWVsZHNcbiAgICAgIC8vIGlmICghaXNFbXB0eSh0aGlzLmpzZi5mb3JtR3JvdXAudmFsdWUpKSB7XG4gICAgICAvLyAgIGZvckVhY2godGhpcy5qc2YuZm9ybUdyb3VwLnZhbHVlLCAodmFsdWUsIGtleSwgb2JqZWN0LCByb290T2JqZWN0KSA9PiB7XG4gICAgICAvLyAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vICAgICAgIG9iamVjdFtrZXldID0gdGhpcy5qc2YucGFyc2VUZXh0KHZhbHVlLCB2YWx1ZSwgcm9vdE9iamVjdCwga2V5KTtcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH0sICd0b3AtZG93bicpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBTdWJzY3JpYmUgdG8gZm9ybSBjaGFuZ2VzIHRvIG91dHB1dCBsaXZlIGRhdGEsIHZhbGlkYXRpb24sIGFuZCBlcnJvcnNcbiAgICAgIHRoaXMuanNmLmRhdGFDaGFuZ2VzLnN1YnNjcmliZShkYXRhID0+IHtcbiAgICAgICAgdGhpcy5vbkNoYW5nZXMuZW1pdCh0aGlzLm9iamVjdFdyYXAgPyBkYXRhWycxJ10gOiBkYXRhKTtcbiAgICAgICAgaWYgKHRoaXMuZm9ybVZhbHVlc0lucHV0ICYmIHRoaXMuZm9ybVZhbHVlc0lucHV0LmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICB0aGlzW2Ake3RoaXMuZm9ybVZhbHVlc0lucHV0fUNoYW5nZWBdLmVtaXQodGhpcy5vYmplY3RXcmFwID8gZGF0YVsnMSddIDogZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gb24gc3RhdHVzQ2hhbmdlcyB0byBzaG93IHVwZGF0ZWQgZXJyb3JzXG4gICAgICB0aGlzLmpzZi5mb3JtR3JvdXAuc3RhdHVzQ2hhbmdlcy5zdWJzY3JpYmUoKCkgPT4gdGhpcy5jaGFuZ2VEZXRlY3Rvci5tYXJrRm9yQ2hlY2soKSk7XG4gICAgICB0aGlzLmpzZi5pc1ZhbGlkQ2hhbmdlcy5zdWJzY3JpYmUoaXNWYWxpZCA9PiB0aGlzLmlzVmFsaWQuZW1pdChpc1ZhbGlkKSk7XG4gICAgICB0aGlzLmpzZi52YWxpZGF0aW9uRXJyb3JDaGFuZ2VzLnN1YnNjcmliZShlcnIgPT4gdGhpcy52YWxpZGF0aW9uRXJyb3JzLmVtaXQoZXJyKSk7XG5cbiAgICAgIC8vIE91dHB1dCBmaW5hbCBzY2hlbWEsIGZpbmFsIGxheW91dCwgYW5kIGluaXRpYWwgZGF0YVxuICAgICAgdGhpcy5mb3JtU2NoZW1hLmVtaXQodGhpcy5qc2Yuc2NoZW1hKTtcbiAgICAgIHRoaXMuZm9ybUxheW91dC5lbWl0KHRoaXMuanNmLmxheW91dCk7XG4gICAgICB0aGlzLm9uQ2hhbmdlcy5lbWl0KHRoaXMub2JqZWN0V3JhcCA/IHRoaXMuanNmLmRhdGFbJzEnXSA6IHRoaXMuanNmLmRhdGEpO1xuXG4gICAgICAvLyBJZiB2YWxpZGF0ZU9uUmVuZGVyLCBvdXRwdXQgaW5pdGlhbCB2YWxpZGF0aW9uIGFuZCBhbnkgZXJyb3JzXG4gICAgICBjb25zdCB2YWxpZGF0ZU9uUmVuZGVyID1cbiAgICAgICAgSnNvblBvaW50ZXIuZ2V0KHRoaXMuanNmLCAnL2Zvcm1PcHRpb25zL3ZhbGlkYXRlT25SZW5kZXInKTtcbiAgICAgIGlmICh2YWxpZGF0ZU9uUmVuZGVyKSB7IC8vIHZhbGlkYXRlT25SZW5kZXIgPT09ICdhdXRvJyB8fCB0cnVlXG4gICAgICAgIGNvbnN0IHRvdWNoQWxsID0gKGNvbnRyb2wpID0+IHtcbiAgICAgICAgICBpZiAodmFsaWRhdGVPblJlbmRlciA9PT0gdHJ1ZSB8fCBoYXNWYWx1ZShjb250cm9sLnZhbHVlKSkge1xuICAgICAgICAgICAgY29udHJvbC5tYXJrQXNUb3VjaGVkKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIE9iamVjdC5rZXlzKGNvbnRyb2wuY29udHJvbHMgfHwge30pXG4gICAgICAgICAgICAuZm9yRWFjaChrZXkgPT4gdG91Y2hBbGwoY29udHJvbC5jb250cm9sc1trZXldKSk7XG4gICAgICAgIH07XG4gICAgICAgIHRvdWNoQWxsKHRoaXMuanNmLmZvcm1Hcm91cCk7XG4gICAgICAgIHRoaXMuaXNWYWxpZC5lbWl0KHRoaXMuanNmLmlzVmFsaWQpO1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25FcnJvcnMuZW1pdCh0aGlzLmpzZi5hanZFcnJvcnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19