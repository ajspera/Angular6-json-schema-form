import cloneDeep from 'lodash/cloneDeep';
import filter from 'lodash/filter';
import map from 'lodash/map';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { forEach, hasOwn } from './utility.functions';
import { getControlValidators, removeRecursiveReferences } from './json-schema.functions';
import { hasValue, inArray, isArray, isDate, isDefined, isEmpty, isObject, isPrimitive, toJavaScriptType, toSchemaType } from './validator.functions';
import { JsonPointer } from './jsonpointer.functions';
import { JsonValidators } from './json.validators';
/**
 * FormGroup function library:
 *
 * buildFormGroupTemplate:  Builds a FormGroupTemplate from schema
 *
 * buildFormGroup:          Builds an Angular FormGroup from a FormGroupTemplate
 *
 * mergeValues:
 *
 * setRequiredFields:
 *
 * formatFormData:
 *
 * getControl:
 *
 * ---- TODO: ----
 * TODO: add buildFormGroupTemplateFromLayout function
 * buildFormGroupTemplateFromLayout: Builds a FormGroupTemplate from a form layout
 */
/**
 * 'buildFormGroupTemplate' function
 *
 * Builds a template for an Angular FormGroup from a JSON Schema.
 *
 * TODO: add support for pattern properties
 * https://spacetelescope.github.io/understanding-json-schema/reference/object.html
 *
 * //  {any} jsf -
 * //  {any = null} nodeValue -
 * //  {boolean = true} mapArrays -
 * //  {string = ''} schemaPointer -
 * //  {string = ''} dataPointer -
 * //  {any = ''} templatePointer -
 * // {any} -
 */
export function buildFormGroupTemplate(jsf, nodeValue = null, setValues = true, schemaPointer = '', dataPointer = '', templatePointer = '') {
    const schema = JsonPointer.get(jsf.schema, schemaPointer);
    if (setValues) {
        if (!isDefined(nodeValue) && (jsf.formOptions.setSchemaDefaults === true ||
            (jsf.formOptions.setSchemaDefaults === 'auto' && isEmpty(jsf.formValues)))) {
            nodeValue = JsonPointer.get(jsf.schema, schemaPointer + '/default');
        }
    }
    else {
        nodeValue = null;
    }
    // TODO: If nodeValue still not set, check layout for default value
    const schemaType = JsonPointer.get(schema, '/type');
    const controlType = (hasOwn(schema, 'properties') || hasOwn(schema, 'additionalProperties')) &&
        schemaType === 'object' ? 'FormGroup' :
        (hasOwn(schema, 'items') || hasOwn(schema, 'additionalItems')) &&
            schemaType === 'array' ? 'FormArray' :
            !schemaType && hasOwn(schema, '$ref') ? '$ref' : 'FormControl';
    const shortDataPointer = removeRecursiveReferences(dataPointer, jsf.dataRecursiveRefMap, jsf.arrayMap);
    if (!jsf.dataMap.has(shortDataPointer)) {
        jsf.dataMap.set(shortDataPointer, new Map());
    }
    const nodeOptions = jsf.dataMap.get(shortDataPointer);
    if (!nodeOptions.has('schemaType')) {
        nodeOptions.set('schemaPointer', schemaPointer);
        nodeOptions.set('schemaType', schema.type);
        if (schema.format) {
            nodeOptions.set('schemaFormat', schema.format);
            if (!schema.type) {
                nodeOptions.set('schemaType', 'string');
            }
        }
        if (controlType) {
            nodeOptions.set('templatePointer', templatePointer);
            nodeOptions.set('templateType', controlType);
        }
    }
    let controls;
    const validators = getControlValidators(schema);
    switch (controlType) {
        case 'FormGroup':
            controls = {};
            if (hasOwn(schema, 'ui:order') || hasOwn(schema, 'properties')) {
                const propertyKeys = schema['ui:order'] || Object.keys(schema.properties);
                if (propertyKeys.includes('*') && !hasOwn(schema.properties, '*')) {
                    const unnamedKeys = Object.keys(schema.properties)
                        .filter(key => !propertyKeys.includes(key));
                    for (let i = propertyKeys.length - 1; i >= 0; i--) {
                        if (propertyKeys[i] === '*') {
                            propertyKeys.splice(i, 1, ...unnamedKeys);
                        }
                    }
                }
                propertyKeys
                    .filter(key => hasOwn(schema.properties, key) ||
                    hasOwn(schema, 'additionalProperties'))
                    .forEach(key => controls[key] = buildFormGroupTemplate(jsf, JsonPointer.get(nodeValue, [key]), setValues, schemaPointer + (hasOwn(schema.properties, key) ?
                    '/properties/' + key : '/additionalProperties'), dataPointer + '/' + key, templatePointer + '/controls/' + key));
                jsf.formOptions.fieldsRequired = setRequiredFields(schema, controls);
            }
            return { controlType, controls, validators };
        case 'FormArray':
            controls = [];
            const minItems = Math.max(schema.minItems || 0, nodeOptions.get('minItems') || 0);
            const maxItems = Math.min(schema.maxItems || 1000, nodeOptions.get('maxItems') || 1000);
            let additionalItemsPointer = null;
            if (isArray(schema.items)) { // 'items' is an array = tuple items
                const tupleItems = nodeOptions.get('tupleItems') ||
                    (isArray(schema.items) ? Math.min(schema.items.length, maxItems) : 0);
                for (let i = 0; i < tupleItems; i++) {
                    if (i < minItems) {
                        controls.push(buildFormGroupTemplate(jsf, isArray(nodeValue) ? nodeValue[i] : nodeValue, setValues, schemaPointer + '/items/' + i, dataPointer + '/' + i, templatePointer + '/controls/' + i));
                    }
                    else {
                        const schemaRefPointer = removeRecursiveReferences(schemaPointer + '/items/' + i, jsf.schemaRecursiveRefMap);
                        const itemRefPointer = removeRecursiveReferences(shortDataPointer + '/' + i, jsf.dataRecursiveRefMap, jsf.arrayMap);
                        const itemRecursive = itemRefPointer !== shortDataPointer + '/' + i;
                        if (!hasOwn(jsf.templateRefLibrary, itemRefPointer)) {
                            jsf.templateRefLibrary[itemRefPointer] = null;
                            jsf.templateRefLibrary[itemRefPointer] = buildFormGroupTemplate(jsf, null, setValues, schemaRefPointer, itemRefPointer, templatePointer + '/controls/' + i);
                        }
                        controls.push(isArray(nodeValue) ?
                            buildFormGroupTemplate(jsf, nodeValue[i], setValues, schemaPointer + '/items/' + i, dataPointer + '/' + i, templatePointer + '/controls/' + i) :
                            itemRecursive ?
                                null : cloneDeep(jsf.templateRefLibrary[itemRefPointer]));
                    }
                }
                // If 'additionalItems' is an object = additional list items (after tuple items)
                if (schema.items.length < maxItems && isObject(schema.additionalItems)) {
                    additionalItemsPointer = schemaPointer + '/additionalItems';
                }
                // If 'items' is an object = list items only (no tuple items)
            }
            else {
                additionalItemsPointer = schemaPointer + '/items';
            }
            if (additionalItemsPointer) {
                const schemaRefPointer = removeRecursiveReferences(additionalItemsPointer, jsf.schemaRecursiveRefMap);
                const itemRefPointer = removeRecursiveReferences(shortDataPointer + '/-', jsf.dataRecursiveRefMap, jsf.arrayMap);
                const itemRecursive = itemRefPointer !== shortDataPointer + '/-';
                if (!hasOwn(jsf.templateRefLibrary, itemRefPointer)) {
                    jsf.templateRefLibrary[itemRefPointer] = null;
                    jsf.templateRefLibrary[itemRefPointer] = buildFormGroupTemplate(jsf, null, setValues, schemaRefPointer, itemRefPointer, templatePointer + '/controls/-');
                }
                // const itemOptions = jsf.dataMap.get(itemRefPointer) || new Map();
                const itemOptions = nodeOptions;
                if (!itemRecursive || hasOwn(validators, 'required')) {
                    const arrayLength = Math.min(Math.max(itemRecursive ? 0 :
                        (itemOptions.get('tupleItems') + itemOptions.get('listItems')) || 0, isArray(nodeValue) ? nodeValue.length : 0), maxItems);
                    for (let i = controls.length; i < arrayLength; i++) {
                        controls.push(isArray(nodeValue) ?
                            buildFormGroupTemplate(jsf, nodeValue[i], setValues, schemaRefPointer, dataPointer + '/-', templatePointer + '/controls/-') :
                            itemRecursive ?
                                null : cloneDeep(jsf.templateRefLibrary[itemRefPointer]));
                    }
                }
            }
            return { controlType, controls, validators };
        case '$ref':
            const schemaRef = JsonPointer.compile(schema.$ref);
            const dataRef = JsonPointer.toDataPointer(schemaRef, schema);
            const refPointer = removeRecursiveReferences(dataRef, jsf.dataRecursiveRefMap, jsf.arrayMap);
            if (refPointer && !hasOwn(jsf.templateRefLibrary, refPointer)) {
                // Set to null first to prevent recursive reference from causing endless loop
                jsf.templateRefLibrary[refPointer] = null;
                const newTemplate = buildFormGroupTemplate(jsf, setValues, setValues, schemaRef);
                if (newTemplate) {
                    jsf.templateRefLibrary[refPointer] = newTemplate;
                }
                else {
                    delete jsf.templateRefLibrary[refPointer];
                }
            }
            return null;
        case 'FormControl':
            const value = {
                value: setValues && isPrimitive(nodeValue) ? nodeValue : null,
                disabled: nodeOptions.get('disabled') || false
            };
            return { controlType, value, validators };
        default:
            return null;
    }
}
/**
 * 'buildFormGroup' function
 *
 * // {any} template -
 * // {AbstractControl}
*/
export function buildFormGroup(template) {
    const validatorFns = [];
    let validatorFn = null;
    if (hasOwn(template, 'validators')) {
        forEach(template.validators, (parameters, validator) => {
            if (typeof JsonValidators[validator] === 'function') {
                validatorFns.push(JsonValidators[validator].apply(null, parameters));
            }
        });
        if (validatorFns.length &&
            inArray(template.controlType, ['FormGroup', 'FormArray'])) {
            validatorFn = validatorFns.length > 1 ?
                JsonValidators.compose(validatorFns) : validatorFns[0];
        }
    }
    if (hasOwn(template, 'controlType')) {
        switch (template.controlType) {
            case 'FormGroup':
                const groupControls = {};
                forEach(template.controls, (controls, key) => {
                    const newControl = buildFormGroup(controls);
                    if (newControl) {
                        groupControls[key] = newControl;
                    }
                });
                return new FormGroup(groupControls, validatorFn);
            case 'FormArray':
                return new FormArray(filter(map(template.controls, controls => buildFormGroup(controls))), validatorFn);
            case 'FormControl':
                return new FormControl(template.value, validatorFns);
        }
    }
    return null;
}
/**
 * 'mergeValues' function
 *
 * //  {any[]} ...valuesToMerge - Multiple values to merge
 * // {any} - Merged values
 */
export function mergeValues(...valuesToMerge) {
    let mergedValues = null;
    for (const currentValue of valuesToMerge) {
        if (!isEmpty(currentValue)) {
            if (typeof currentValue === 'object' &&
                (isEmpty(mergedValues) || typeof mergedValues !== 'object')) {
                if (isArray(currentValue)) {
                    mergedValues = [...currentValue];
                }
                else if (isObject(currentValue)) {
                    mergedValues = Object.assign({}, currentValue);
                }
            }
            else if (typeof currentValue !== 'object') {
                mergedValues = currentValue;
            }
            else if (isObject(mergedValues) && isObject(currentValue)) {
                Object.assign(mergedValues, currentValue);
            }
            else if (isObject(mergedValues) && isArray(currentValue)) {
                const newValues = [];
                for (const value of currentValue) {
                    newValues.push(mergeValues(mergedValues, value));
                }
                mergedValues = newValues;
            }
            else if (isArray(mergedValues) && isObject(currentValue)) {
                const newValues = [];
                for (const value of mergedValues) {
                    newValues.push(mergeValues(value, currentValue));
                }
                mergedValues = newValues;
            }
            else if (isArray(mergedValues) && isArray(currentValue)) {
                const newValues = [];
                for (let i = 0; i < Math.max(mergedValues.length, currentValue.length); i++) {
                    if (i < mergedValues.length && i < currentValue.length) {
                        newValues.push(mergeValues(mergedValues[i], currentValue[i]));
                    }
                    else if (i < mergedValues.length) {
                        newValues.push(mergedValues[i]);
                    }
                    else if (i < currentValue.length) {
                        newValues.push(currentValue[i]);
                    }
                }
                mergedValues = newValues;
            }
        }
    }
    return mergedValues;
}
/**
 * 'setRequiredFields' function
 *
 * // {schema} schema - JSON Schema
 * // {object} formControlTemplate - Form Control Template object
 * // {boolean} - true if any fields have been set to required, false if not
 */
export function setRequiredFields(schema, formControlTemplate) {
    let fieldsRequired = false;
    if (hasOwn(schema, 'required') && !isEmpty(schema.required)) {
        fieldsRequired = true;
        let requiredArray = isArray(schema.required) ? schema.required : [schema.required];
        requiredArray = forEach(requiredArray, key => JsonPointer.set(formControlTemplate, '/' + key + '/validators/required', []));
    }
    return fieldsRequired;
    // TODO: Add support for patternProperties
    // https://spacetelescope.github.io/understanding-json-schema/reference/object.html#pattern-properties
}
/**
 * 'formatFormData' function
 *
 * // {any} formData - Angular FormGroup data object
 * // {Map<string, any>} dataMap -
 * // {Map<string, string>} recursiveRefMap -
 * // {Map<string, number>} arrayMap -
 * // {boolean = false} fixErrors - if TRUE, tries to fix data
 * // {any} - formatted data object
 */
export function formatFormData(formData, dataMap, recursiveRefMap, arrayMap, returnEmptyFields = false, fixErrors = false) {
    if (formData === null || typeof formData !== 'object') {
        return formData;
    }
    const formattedData = isArray(formData) ? [] : {};
    JsonPointer.forEachDeep(formData, (value, dataPointer) => {
        // If returnEmptyFields === true,
        // add empty arrays and objects to all allowed keys
        if (returnEmptyFields && isArray(value)) {
            JsonPointer.set(formattedData, dataPointer, []);
        }
        else if (returnEmptyFields && isObject(value) && !isDate(value)) {
            JsonPointer.set(formattedData, dataPointer, {});
        }
        else {
            const genericPointer = JsonPointer.has(dataMap, [dataPointer, 'schemaType']) ? dataPointer :
                removeRecursiveReferences(dataPointer, recursiveRefMap, arrayMap);
            if (JsonPointer.has(dataMap, [genericPointer, 'schemaType'])) {
                const schemaType = dataMap.get(genericPointer).get('schemaType');
                if (schemaType === 'null') {
                    JsonPointer.set(formattedData, dataPointer, null);
                }
                else if ((hasValue(value) || returnEmptyFields) &&
                    inArray(schemaType, ['string', 'integer', 'number', 'boolean'])) {
                    const newValue = (fixErrors || (value === null && returnEmptyFields)) ?
                        toSchemaType(value, schemaType) : toJavaScriptType(value, schemaType);
                    if (isDefined(newValue) || returnEmptyFields) {
                        JsonPointer.set(formattedData, dataPointer, newValue);
                    }
                    // If returnEmptyFields === false,
                    // only add empty arrays and objects to required keys
                }
                else if (schemaType === 'object' && !returnEmptyFields) {
                    (dataMap.get(genericPointer).get('required') || []).forEach(key => {
                        const keySchemaType = dataMap.get(`${genericPointer}/${key}`).get('schemaType');
                        if (keySchemaType === 'array') {
                            JsonPointer.set(formattedData, `${dataPointer}/${key}`, []);
                        }
                        else if (keySchemaType === 'object') {
                            JsonPointer.set(formattedData, `${dataPointer}/${key}`, {});
                        }
                    });
                }
                // Finish incomplete 'date-time' entries
                if (dataMap.get(genericPointer).get('schemaFormat') === 'date-time') {
                    // "2000-03-14T01:59:26.535" -> "2000-03-14T01:59:26.535Z" (add "Z")
                    if (/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?$/i.test(value)) {
                        JsonPointer.set(formattedData, dataPointer, `${value}Z`);
                        // "2000-03-14T01:59" -> "2000-03-14T01:59:00Z" (add ":00Z")
                    }
                    else if (/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s][0-2]\d:[0-5]\d$/i.test(value)) {
                        JsonPointer.set(formattedData, dataPointer, `${value}:00Z`);
                        // "2000-03-14" -> "2000-03-14T00:00:00Z" (add "T00:00:00Z")
                    }
                    else if (fixErrors && /^\d\d\d\d-[0-1]\d-[0-3]\d$/i.test(value)) {
                        JsonPointer.set(formattedData, dataPointer, `${value}:00:00:00Z`);
                    }
                }
            }
            else if (typeof value !== 'object' || isDate(value) ||
                (value === null && returnEmptyFields)) {
                console.error('formatFormData error: ' +
                    `Schema type not found for form value at ${genericPointer}`);
                console.error('dataMap', dataMap);
                console.error('recursiveRefMap', recursiveRefMap);
                console.error('genericPointer', genericPointer);
            }
        }
    });
    return formattedData;
}
/**
 * 'getControl' function
 *
 * Uses a JSON Pointer for a data object to retrieve a control from
 * an Angular formGroup or formGroup template. (Note: though a formGroup
 * template is much simpler, its basic structure is idential to a formGroup).
 *
 * If the optional third parameter 'returnGroup' is set to TRUE, the group
 * containing the control is returned, rather than the control itself.
 *
 * // {FormGroup} formGroup - Angular FormGroup to get value from
 * // {Pointer} dataPointer - JSON Pointer (string or array)
 * // {boolean = false} returnGroup - If true, return group containing control
 * // {group} - Located value (or null, if no control found)
 */
export function getControl(formGroup, dataPointer, returnGroup = false) {
    if (!isObject(formGroup) || !JsonPointer.isJsonPointer(dataPointer)) {
        if (!JsonPointer.isJsonPointer(dataPointer)) {
            // If dataPointer input is not a valid JSON pointer, check to
            // see if it is instead a valid object path, using dot notaion
            if (typeof dataPointer === 'string') {
                const formControl = formGroup.get(dataPointer);
                if (formControl) {
                    return formControl;
                }
            }
            console.error(`getControl error: Invalid JSON Pointer: ${dataPointer}`);
        }
        if (!isObject(formGroup)) {
            console.error(`getControl error: Invalid formGroup: ${formGroup}`);
        }
        return null;
    }
    let dataPointerArray = JsonPointer.parse(dataPointer);
    if (returnGroup) {
        dataPointerArray = dataPointerArray.slice(0, -1);
    }
    // If formGroup input is a real formGroup (not a formGroup template)
    // try using formGroup.get() to return the control
    if (typeof formGroup.get === 'function' &&
        dataPointerArray.every(key => key.indexOf('.') === -1)) {
        const formControl = formGroup.get(dataPointerArray.join('.'));
        if (formControl) {
            return formControl;
        }
    }
    // If formGroup input is a formGroup template,
    // or formGroup.get() failed to return the control,
    // search the formGroup object for dataPointer's control
    let subGroup = formGroup;
    for (const key of dataPointerArray) {
        if (hasOwn(subGroup, 'controls')) {
            subGroup = subGroup.controls;
        }
        if (isArray(subGroup) && (key === '-')) {
            subGroup = subGroup[subGroup.length - 1];
        }
        else if (hasOwn(subGroup, key)) {
            subGroup = subGroup[key];
        }
        else {
            console.error(`getControl error: Unable to find "${key}" item in FormGroup.`);
            console.error(dataPointer);
            console.error(formGroup);
            return;
        }
    }
    return subGroup;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybS1ncm91cC5mdW5jdGlvbnMuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9hbmd1bGFyNi1qc29uLXNjaGVtYS1mb3JtLyIsInNvdXJjZXMiOlsibGliL3NoYXJlZC9mb3JtLWdyb3VwLmZ1bmN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFNBQVMsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLE1BQU0sTUFBTSxlQUFlLENBQUM7QUFDbkMsT0FBTyxHQUFHLE1BQU0sWUFBWSxDQUFDO0FBQzdCLE9BQU8sRUFFTCxTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFFUixNQUFNLGdCQUFnQixDQUFDO0FBQzFCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDMUYsT0FBTyxFQUNMLFFBQVEsRUFDUixPQUFPLEVBQ1AsT0FBTyxFQUNQLE1BQU0sRUFDTixTQUFTLEVBQ1QsT0FBTyxFQUNQLFFBQVEsRUFDUixXQUFXLEVBRVgsZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWCxNQUFNLHVCQUF1QixDQUFDO0FBQ2pDLE9BQU8sRUFBRSxXQUFXLEVBQVcsTUFBTSx5QkFBeUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFJbkQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUVIOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sVUFBVSxzQkFBc0IsQ0FDcEMsR0FBUSxFQUFFLFlBQWlCLElBQUksRUFBRSxTQUFTLEdBQUcsSUFBSSxFQUNqRCxhQUFhLEdBQUcsRUFBRSxFQUFFLFdBQVcsR0FBRyxFQUFFLEVBQUUsZUFBZSxHQUFHLEVBQUU7SUFFMUQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGFB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TyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzlFLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN6QixPQUFPO1NBQ1I7S0FDRjtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2xvbmVEZWVwIGZyb20gJ2xvZGFzaC9jbG9uZURlZXAnO1xuaW1wb3J0IGZpbHRlciBmcm9tICdsb2Rhc2gvZmlsdGVyJztcbmltcG9ydCBtYXAgZnJvbSAnbG9kYXNoL21hcCc7XG5pbXBvcnQge1xuICBBYnN0cmFjdENvbnRyb2wsXG4gIEZvcm1BcnJheSxcbiAgRm9ybUNvbnRyb2wsXG4gIEZvcm1Hcm91cCxcbiAgVmFsaWRhdG9yRm5cbiAgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBmb3JFYWNoLCBoYXNPd24gfSBmcm9tICcuL3V0aWxpdHkuZnVuY3Rpb25zJztcbmltcG9ydCB7IGdldENvbnRyb2xWYWxpZGF0b3JzLCByZW1vdmVSZWN1cnNpdmVSZWZlcmVuY2VzIH0gZnJvbSAnLi9qc29uLXNjaGVtYS5mdW5jdGlvbnMnO1xuaW1wb3J0IHtcbiAgaGFzVmFsdWUsXG4gIGluQXJyYXksXG4gIGlzQXJyYXksXG4gIGlzRGF0ZSxcbiAgaXNEZWZpbmVkLFxuICBpc0VtcHR5LFxuICBpc09iamVjdCxcbiAgaXNQcmltaXRpdmUsXG4gIFNjaGVtYVByaW1pdGl2ZVR5cGUsXG4gIHRvSmF2YVNjcmlwdFR5cGUsXG4gIHRvU2NoZW1hVHlwZVxuICB9IGZyb20gJy4vdmFsaWRhdG9yLmZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBKc29uUG9pbnRlciwgUG9pbnRlciB9IGZyb20gJy4vanNvbnBvaW50ZXIuZnVuY3Rpb25zJztcbmltcG9ydCB7IEpzb25WYWxpZGF0b3JzIH0gZnJvbSAnLi9qc29uLnZhbGlkYXRvcnMnO1xuXG5cblxuLyoqXG4gKiBGb3JtR3JvdXAgZnVuY3Rpb24gbGlicmFyeTpcbiAqXG4gKiBidWlsZEZvcm1Hcm91cFRlbXBsYXRlOiAgQnVpbGRzIGEgRm9ybUdyb3VwVGVtcGxhdGUgZnJvbSBzY2hlbWFcbiAqXG4gKiBidWlsZEZvcm1Hcm91cDogICAgICAgICAgQnVpbGRzIGFuIEFuZ3VsYXIgRm9ybUdyb3VwIGZyb20gYSBGb3JtR3JvdXBUZW1wbGF0ZVxuICpcbiAqIG1lcmdlVmFsdWVzOlxuICpcbiAqIHNldFJlcXVpcmVkRmllbGRzOlxuICpcbiAqIGZvcm1hdEZvcm1EYXRhOlxuICpcbiAqIGdldENvbnRyb2w6XG4gKlxuICogLS0tLSBUT0RPOiAtLS0tXG4gKiBUT0RPOiBhZGQgYnVpbGRGb3JtR3JvdXBUZW1wbGF0ZUZyb21MYXlvdXQgZnVuY3Rpb25cbiAqIGJ1aWxkRm9ybUdyb3VwVGVtcGxhdGVGcm9tTGF5b3V0OiBCdWlsZHMgYSBGb3JtR3JvdXBUZW1wbGF0ZSBmcm9tIGEgZm9ybSBsYXlvdXRcbiAqL1xuXG4vKipcbiAqICdidWlsZEZvcm1Hcm91cFRlbXBsYXRlJyBmdW5jdGlvblxuICpcbiAqIEJ1aWxkcyBhIHRlbXBsYXRlIGZvciBhbiBBbmd1bGFyIEZvcm1Hcm91cCBmcm9tIGEgSlNPTiBTY2hlbWEuXG4gKlxuICogVE9ETzogYWRkIHN1cHBvcnQgZm9yIHBhdHRlcm4gcHJvcGVydGllc1xuICogaHR0cHM6Ly9zcGFjZXRlbGVzY29wZS5naXRodWIuaW8vdW5kZXJzdGFuZGluZy1qc29uLXNjaGVtYS9yZWZlcmVuY2Uvb2JqZWN0Lmh0bWxcbiAqXG4gKiAvLyAge2FueX0ganNmIC1cbiAqIC8vICB7YW55ID0gbnVsbH0gbm9kZVZhbHVlIC1cbiAqIC8vICB7Ym9vbGVhbiA9IHRydWV9IG1hcEFycmF5cyAtXG4gKiAvLyAge3N0cmluZyA9ICcnfSBzY2hlbWFQb2ludGVyIC1cbiAqIC8vICB7c3RyaW5nID0gJyd9IGRhdGFQb2ludGVyIC1cbiAqIC8vICB7YW55ID0gJyd9IHRlbXBsYXRlUG9pbnRlciAtXG4gKiAvLyB7YW55fSAtXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEZvcm1Hcm91cFRlbXBsYXRlKFxuICBqc2Y6IGFueSwgbm9kZVZhbHVlOiBhbnkgPSBudWxsLCBzZXRWYWx1ZXMgPSB0cnVlLFxuICBzY2hlbWFQb2ludGVyID0gJycsIGRhdGFQb2ludGVyID0gJycsIHRlbXBsYXRlUG9pbnRlciA9ICcnXG4pIHtcbiAgY29uc3Qgc2NoZW1hID0gSnNvblBvaW50ZXIuZ2V0KGpzZi5zY2hlbWEsIHNjaGVtYVBvaW50ZXIpO1xuICBpZiAoc2V0VmFsdWVzKSB7XG4gICAgaWYgKCFpc0RlZmluZWQobm9kZVZhbHVlKSAmJiAoXG4gICAgICBqc2YuZm9ybU9wdGlvbnMuc2V0U2NoZW1hRGVmYXVsdHMgPT09IHRydWUgfHxcbiAgICAgIChqc2YuZm9ybU9wdGlvbnMuc2V0U2NoZW1hRGVmYXVsdHMgPT09ICdhdXRvJyAmJiBpc0VtcHR5KGpzZi5mb3JtVmFsdWVzKSlcbiAgICApKSB7XG4gICAgICBub2RlVmFsdWUgPSBKc29uUG9pbnRlci5nZXQoanNmLnNjaGVtYSwgc2NoZW1hUG9pbnRlciArICcvZGVmYXVsdCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBub2RlVmFsdWUgPSBudWxsO1xuICB9XG4gIC8vIFRPRE86IElmIG5vZGVWYWx1ZSBzdGlsbCBub3Qgc2V0LCBjaGVjayBsYXlvdXQgZm9yIGRlZmF1bHQgdmFsdWVcbiAgY29uc3Qgc2NoZW1hVHlwZTogc3RyaW5nIHwgc3RyaW5nW10gPSBKc29uUG9pbnRlci5nZXQoc2NoZW1hLCAnL3R5cGUnKTtcbiAgY29uc3QgY29udHJvbFR5cGUgPVxuICAgIChoYXNPd24oc2NoZW1hLCAncHJvcGVydGllcycpIHx8IGhhc093bihzY2hlbWEsICdhZGRpdGlvbmFsUHJvcGVydGllcycpKSAmJlxuICAgICAgc2NoZW1hVHlwZSA9PT0gJ29iamVjdCcgPyAnRm9ybUdyb3VwJyA6XG4gICAgICAoaGFzT3duKHNjaGVtYSwgJ2l0ZW1zJykgfHwgaGFzT3duKHNjaGVtYSwgJ2FkZGl0aW9uYWxJdGVtcycpKSAmJlxuICAgICAgICBzY2hlbWFUeXBlID09PSAnYXJyYXknID8gJ0Zvcm1BcnJheScgOlxuICAgICAgICAhc2NoZW1hVHlwZSAmJiBoYXNPd24oc2NoZW1hLCAnJHJlZicpID8gJyRyZWYnIDogJ0Zvcm1Db250cm9sJztcbiAgY29uc3Qgc2hvcnREYXRhUG9pbnRlciA9XG4gICAgcmVtb3ZlUmVjdXJzaXZlUmVmZXJlbmNlcyhkYXRhUG9pbnRlciwganNmLmRhdGFSZWN1cnNpdmVSZWZNYXAsIGpzZi5hcnJheU1hcCk7XG4gIGlmICghanNmLmRhdGFNYXAuaGFzKHNob3J0RGF0YVBvaW50ZXIpKSB7XG4gICAganNmLmRhdGFNYXAuc2V0KHNob3J0RGF0YVBvaW50ZXIsIG5ldyBNYXAoKSk7XG4gIH1cbiAgY29uc3Qgbm9kZU9wdGlvbnMgPSBqc2YuZGF0YU1hcC5nZXQoc2hvcnREYXRhUG9pbnRlcik7XG4gIGlmICghbm9kZU9wdGlvbnMuaGFzKCdzY2hlbWFUeXBlJykpIHtcbiAgICBub2RlT3B0aW9ucy5zZXQoJ3NjaGVtYVBvaW50ZXInLCBzY2hlbWFQb2ludGVyKTtcbiAgICBub2RlT3B0aW9ucy5zZXQoJ3NjaGVtYVR5cGUnLCBzY2hlbWEudHlwZSk7XG4gICAgaWYgKHNjaGVtYS5mb3JtYXQpIHtcbiAgICAgIG5vZGVPcHRpb25zLnNldCgnc2NoZW1hRm9ybWF0Jywgc2NoZW1hLmZvcm1hdCk7XG4gICAgICBpZiAoIXNjaGVtYS50eXBlKSB7IG5vZGVPcHRpb25zLnNldCgnc2NoZW1hVHlwZScsICdzdHJpbmcnKTsgfVxuICAgIH1cbiAgICBpZiAoY29udHJvbFR5cGUpIHtcbiAgICAgIG5vZGVPcHRpb25zLnNldCgndGVtcGxhdGVQb2ludGVyJywgdGVtcGxhdGVQb2ludGVyKTtcbiAgICAgIG5vZGVPcHRpb25zLnNldCgndGVtcGxhdGVUeXBlJywgY29udHJvbFR5cGUpO1xuICAgIH1cbiAgfVxuICBsZXQgY29udHJvbHM6IGFueTtcbiAgY29uc3QgdmFsaWRhdG9ycyA9IGdldENvbnRyb2xWYWxpZGF0b3JzKHNjaGVtYSk7XG4gIHN3aXRjaCAoY29udHJvbFR5cGUpIHtcblxuICAgIGNhc2UgJ0Zvcm1Hcm91cCc6XG4gICAgICBjb250cm9scyA9IHt9O1xuICAgICAgaWYgKGhhc093bihzY2hlbWEsICd1aTpvcmRlcicpIHx8IGhhc093bihzY2hlbWEsICdwcm9wZXJ0aWVzJykpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydHlLZXlzID0gc2NoZW1hWyd1aTpvcmRlciddIHx8IE9iamVjdC5rZXlzKHNjaGVtYS5wcm9wZXJ0aWVzKTtcbiAgICAgICAgaWYgKHByb3BlcnR5S2V5cy5pbmNsdWRlcygnKicpICYmICFoYXNPd24oc2NoZW1hLnByb3BlcnRpZXMsICcqJykpIHtcbiAgICAgICAgICBjb25zdCB1bm5hbWVkS2V5cyA9IE9iamVjdC5rZXlzKHNjaGVtYS5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgLmZpbHRlcihrZXkgPT4gIXByb3BlcnR5S2V5cy5pbmNsdWRlcyhrZXkpKTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gcHJvcGVydHlLZXlzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydHlLZXlzW2ldID09PSAnKicpIHtcbiAgICAgICAgICAgICAgcHJvcGVydHlLZXlzLnNwbGljZShpLCAxLCAuLi51bm5hbWVkS2V5cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHByb3BlcnR5S2V5c1xuICAgICAgICAgIC5maWx0ZXIoa2V5ID0+IGhhc093bihzY2hlbWEucHJvcGVydGllcywga2V5KSB8fFxuICAgICAgICAgICAgaGFzT3duKHNjaGVtYSwgJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJylcbiAgICAgICAgICApXG4gICAgICAgICAgLmZvckVhY2goa2V5ID0+IGNvbnRyb2xzW2tleV0gPSBidWlsZEZvcm1Hcm91cFRlbXBsYXRlKFxuICAgICAgICAgICAganNmLCBKc29uUG9pbnRlci5nZXQobm9kZVZhbHVlLCBbPHN0cmluZz5rZXldKSwgc2V0VmFsdWVzLFxuICAgICAgICAgICAgc2NoZW1hUG9pbnRlciArIChoYXNPd24oc2NoZW1hLnByb3BlcnRpZXMsIGtleSkgP1xuICAgICAgICAgICAgICAnL3Byb3BlcnRpZXMvJyArIGtleSA6ICcvYWRkaXRpb25hbFByb3BlcnRpZXMnXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgZGF0YVBvaW50ZXIgKyAnLycgKyBrZXksXG4gICAgICAgICAgICB0ZW1wbGF0ZVBvaW50ZXIgKyAnL2NvbnRyb2xzLycgKyBrZXlcbiAgICAgICAgICApKTtcbiAgICAgICAganNmLmZvcm1PcHRpb25zLmZpZWxkc1JlcXVpcmVkID0gc2V0UmVxdWlyZWRGaWVsZHMoc2NoZW1hLCBjb250cm9scyk7XG4gICAgICB9XG4gICAgICByZXR1cm4geyBjb250cm9sVHlwZSwgY29udHJvbHMsIHZhbGlkYXRvcnMgfTtcblxuICAgIGNhc2UgJ0Zvcm1BcnJheSc6XG4gICAgICBjb250cm9scyA9IFtdO1xuICAgICAgY29uc3QgbWluSXRlbXMgPVxuICAgICAgICBNYXRoLm1heChzY2hlbWEubWluSXRlbXMgfHwgMCwgbm9kZU9wdGlvbnMuZ2V0KCdtaW5JdGVtcycpIHx8IDApO1xuICAgICAgY29uc3QgbWF4SXRlbXMgPVxuICAgICAgICBNYXRoLm1pbihzY2hlbWEubWF4SXRlbXMgfHwgMTAwMCwgbm9kZU9wdGlvbnMuZ2V0KCdtYXhJdGVtcycpIHx8IDEwMDApO1xuICAgICAgbGV0IGFkZGl0aW9uYWxJdGVtc1BvaW50ZXI6IHN0cmluZyA9IG51bGw7XG4gICAgICBpZiAoaXNBcnJheShzY2hlbWEuaXRlbXMpKSB7IC8vICdpdGVtcycgaXMgYW4gYXJyYXkgPSB0dXBsZSBpdGVtc1xuICAgICAgICBjb25zdCB0dXBsZUl0ZW1zID0gbm9kZU9wdGlvbnMuZ2V0KCd0dXBsZUl0ZW1zJykgfHxcbiAgICAgICAgICAoaXNBcnJheShzY2hlbWEuaXRlbXMpID8gTWF0aC5taW4oc2NoZW1hLml0ZW1zLmxlbmd0aCwgbWF4SXRlbXMpIDogMCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHVwbGVJdGVtczsgaSsrKSB7XG4gICAgICAgICAgaWYgKGkgPCBtaW5JdGVtcykge1xuICAgICAgICAgICAgY29udHJvbHMucHVzaChidWlsZEZvcm1Hcm91cFRlbXBsYXRlKFxuICAgICAgICAgICAgICBqc2YsIGlzQXJyYXkobm9kZVZhbHVlKSA/IG5vZGVWYWx1ZVtpXSA6IG5vZGVWYWx1ZSwgc2V0VmFsdWVzLFxuICAgICAgICAgICAgICBzY2hlbWFQb2ludGVyICsgJy9pdGVtcy8nICsgaSxcbiAgICAgICAgICAgICAgZGF0YVBvaW50ZXIgKyAnLycgKyBpLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVBvaW50ZXIgKyAnL2NvbnRyb2xzLycgKyBpXG4gICAgICAgICAgICApKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgc2NoZW1hUmVmUG9pbnRlciA9IHJlbW92ZVJlY3Vyc2l2ZVJlZmVyZW5jZXMoXG4gICAgICAgICAgICAgIHNjaGVtYVBvaW50ZXIgKyAnL2l0ZW1zLycgKyBpLCBqc2Yuc2NoZW1hUmVjdXJzaXZlUmVmTWFwXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3QgaXRlbVJlZlBvaW50ZXIgPSByZW1vdmVSZWN1cnNpdmVSZWZlcmVuY2VzKFxuICAgICAgICAgICAgICBzaG9ydERhdGFQb2ludGVyICsgJy8nICsgaSwganNmLmRhdGFSZWN1cnNpdmVSZWZNYXAsIGpzZi5hcnJheU1hcFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1SZWN1cnNpdmUgPSBpdGVtUmVmUG9pbnRlciAhPT0gc2hvcnREYXRhUG9pbnRlciArICcvJyArIGk7XG4gICAgICAgICAgICBpZiAoIWhhc093bihqc2YudGVtcGxhdGVSZWZMaWJyYXJ5LCBpdGVtUmVmUG9pbnRlcikpIHtcbiAgICAgICAgICAgICAganNmLnRlbXBsYXRlUmVmTGlicmFyeVtpdGVtUmVmUG9pbnRlcl0gPSBudWxsO1xuICAgICAgICAgICAgICBqc2YudGVtcGxhdGVSZWZMaWJyYXJ5W2l0ZW1SZWZQb2ludGVyXSA9IGJ1aWxkRm9ybUdyb3VwVGVtcGxhdGUoXG4gICAgICAgICAgICAgICAganNmLCBudWxsLCBzZXRWYWx1ZXMsXG4gICAgICAgICAgICAgICAgc2NoZW1hUmVmUG9pbnRlcixcbiAgICAgICAgICAgICAgICBpdGVtUmVmUG9pbnRlcixcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVBvaW50ZXIgKyAnL2NvbnRyb2xzLycgKyBpXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250cm9scy5wdXNoKFxuICAgICAgICAgICAgICBpc0FycmF5KG5vZGVWYWx1ZSkgP1xuICAgICAgICAgICAgICAgIGJ1aWxkRm9ybUdyb3VwVGVtcGxhdGUoXG4gICAgICAgICAgICAgICAgICBqc2YsIG5vZGVWYWx1ZVtpXSwgc2V0VmFsdWVzLFxuICAgICAgICAgICAgICAgICAgc2NoZW1hUG9pbnRlciArICcvaXRlbXMvJyArIGksXG4gICAgICAgICAgICAgICAgICBkYXRhUG9pbnRlciArICcvJyArIGksXG4gICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVBvaW50ZXIgKyAnL2NvbnRyb2xzLycgKyBpXG4gICAgICAgICAgICAgICAgKSA6XG4gICAgICAgICAgICAgICAgaXRlbVJlY3Vyc2l2ZSA/XG4gICAgICAgICAgICAgICAgICBudWxsIDogY2xvbmVEZWVwKGpzZi50ZW1wbGF0ZVJlZkxpYnJhcnlbaXRlbVJlZlBvaW50ZXJdKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiAnYWRkaXRpb25hbEl0ZW1zJyBpcyBhbiBvYmplY3QgPSBhZGRpdGlvbmFsIGxpc3QgaXRlbXMgKGFmdGVyIHR1cGxlIGl0ZW1zKVxuICAgICAgICBpZiAoc2NoZW1hLml0ZW1zLmxlbmd0aCA8IG1heEl0ZW1zICYmIGlzT2JqZWN0KHNjaGVtYS5hZGRpdGlvbmFsSXRlbXMpKSB7XG4gICAgICAgICAgYWRkaXRpb25hbEl0ZW1zUG9pbnRlciA9IHNjaGVtYVBvaW50ZXIgKyAnL2FkZGl0aW9uYWxJdGVtcyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiAnaXRlbXMnIGlzIGFuIG9iamVjdCA9IGxpc3QgaXRlbXMgb25seSAobm8gdHVwbGUgaXRlbXMpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGRpdGlvbmFsSXRlbXNQb2ludGVyID0gc2NoZW1hUG9pbnRlciArICcvaXRlbXMnO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWRkaXRpb25hbEl0ZW1zUG9pbnRlcikge1xuICAgICAgICBjb25zdCBzY2hlbWFSZWZQb2ludGVyID0gcmVtb3ZlUmVjdXJzaXZlUmVmZXJlbmNlcyhcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXNQb2ludGVyLCBqc2Yuc2NoZW1hUmVjdXJzaXZlUmVmTWFwXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGl0ZW1SZWZQb2ludGVyID0gcmVtb3ZlUmVjdXJzaXZlUmVmZXJlbmNlcyhcbiAgICAgICAgICBzaG9ydERhdGFQb2ludGVyICsgJy8tJywganNmLmRhdGFSZWN1cnNpdmVSZWZNYXAsIGpzZi5hcnJheU1hcFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBpdGVtUmVjdXJzaXZlID0gaXRlbVJlZlBvaW50ZXIgIT09IHNob3J0RGF0YVBvaW50ZXIgKyAnLy0nO1xuICAgICAgICBpZiAoIWhhc093bihqc2YudGVtcGxhdGVSZWZMaWJyYXJ5LCBpdGVtUmVmUG9pbnRlcikpIHtcbiAgICAgICAgICBqc2YudGVtcGxhdGVSZWZMaWJyYXJ5W2l0ZW1SZWZQb2ludGVyXSA9IG51bGw7XG4gICAgICAgICAganNmLnRlbXBsYXRlUmVmTGlicmFyeVtpdGVtUmVmUG9pbnRlcl0gPSBidWlsZEZvcm1Hcm91cFRlbXBsYXRlKFxuICAgICAgICAgICAganNmLCBudWxsLCBzZXRWYWx1ZXMsXG4gICAgICAgICAgICBzY2hlbWFSZWZQb2ludGVyLFxuICAgICAgICAgICAgaXRlbVJlZlBvaW50ZXIsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBvaW50ZXIgKyAnL2NvbnRyb2xzLy0nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zdCBpdGVtT3B0aW9ucyA9IGpzZi5kYXRhTWFwLmdldChpdGVtUmVmUG9pbnRlcikgfHwgbmV3IE1hcCgpO1xuICAgICAgICBjb25zdCBpdGVtT3B0aW9ucyA9IG5vZGVPcHRpb25zO1xuICAgICAgICBpZiAoIWl0ZW1SZWN1cnNpdmUgfHwgaGFzT3duKHZhbGlkYXRvcnMsICdyZXF1aXJlZCcpKSB7XG4gICAgICAgICAgY29uc3QgYXJyYXlMZW5ndGggPSBNYXRoLm1pbihNYXRoLm1heChcbiAgICAgICAgICAgIGl0ZW1SZWN1cnNpdmUgPyAwIDpcbiAgICAgICAgICAgICAgKGl0ZW1PcHRpb25zLmdldCgndHVwbGVJdGVtcycpICsgaXRlbU9wdGlvbnMuZ2V0KCdsaXN0SXRlbXMnKSkgfHwgMCxcbiAgICAgICAgICAgIGlzQXJyYXkobm9kZVZhbHVlKSA/IG5vZGVWYWx1ZS5sZW5ndGggOiAwXG4gICAgICAgICAgKSwgbWF4SXRlbXMpO1xuICAgICAgICAgIGZvciAobGV0IGkgPSBjb250cm9scy5sZW5ndGg7IGkgPCBhcnJheUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb250cm9scy5wdXNoKFxuICAgICAgICAgICAgICBpc0FycmF5KG5vZGVWYWx1ZSkgP1xuICAgICAgICAgICAgICAgIGJ1aWxkRm9ybUdyb3VwVGVtcGxhdGUoXG4gICAgICAgICAgICAgICAgICBqc2YsIG5vZGVWYWx1ZVtpXSwgc2V0VmFsdWVzLFxuICAgICAgICAgICAgICAgICAgc2NoZW1hUmVmUG9pbnRlcixcbiAgICAgICAgICAgICAgICAgIGRhdGFQb2ludGVyICsgJy8tJyxcbiAgICAgICAgICAgICAgICAgIHRlbXBsYXRlUG9pbnRlciArICcvY29udHJvbHMvLSdcbiAgICAgICAgICAgICAgICApIDpcbiAgICAgICAgICAgICAgICBpdGVtUmVjdXJzaXZlID9cbiAgICAgICAgICAgICAgICAgIG51bGwgOiBjbG9uZURlZXAoanNmLnRlbXBsYXRlUmVmTGlicmFyeVtpdGVtUmVmUG9pbnRlcl0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgY29udHJvbFR5cGUsIGNvbnRyb2xzLCB2YWxpZGF0b3JzIH07XG5cbiAgICBjYXNlICckcmVmJzpcbiAgICAgIGNvbnN0IHNjaGVtYVJlZiA9IEpzb25Qb2ludGVyLmNvbXBpbGUoc2NoZW1hLiRyZWYpO1xuICAgICAgY29uc3QgZGF0YVJlZiA9IEpzb25Qb2ludGVyLnRvRGF0YVBvaW50ZXIoc2NoZW1hUmVmLCBzY2hlbWEpO1xuICAgICAgY29uc3QgcmVmUG9pbnRlciA9IHJlbW92ZVJlY3Vyc2l2ZVJlZmVyZW5jZXMoXG4gICAgICAgIGRhdGFSZWYsIGpzZi5kYXRhUmVjdXJzaXZlUmVmTWFwLCBqc2YuYXJyYXlNYXBcbiAgICAgICk7XG4gICAgICBpZiAocmVmUG9pbnRlciAmJiAhaGFzT3duKGpzZi50ZW1wbGF0ZVJlZkxpYnJhcnksIHJlZlBvaW50ZXIpKSB7XG4gICAgICAgIC8vIFNldCB0byBudWxsIGZpcnN0IHRvIHByZXZlbnQgcmVjdXJzaXZlIHJlZmVyZW5jZSBmcm9tIGNhdXNpbmcgZW5kbGVzcyBsb29wXG4gICAgICAgIGpzZi50ZW1wbGF0ZVJlZkxpYnJhcnlbcmVmUG9pbnRlcl0gPSBudWxsO1xuICAgICAgICBjb25zdCBuZXdUZW1wbGF0ZSA9IGJ1aWxkRm9ybUdyb3VwVGVtcGxhdGUoanNmLCBzZXRWYWx1ZXMsIHNldFZhbHVlcywgc2NoZW1hUmVmKTtcbiAgICAgICAgaWYgKG5ld1RlbXBsYXRlKSB7XG4gICAgICAgICAganNmLnRlbXBsYXRlUmVmTGlicmFyeVtyZWZQb2ludGVyXSA9IG5ld1RlbXBsYXRlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBqc2YudGVtcGxhdGVSZWZMaWJyYXJ5W3JlZlBvaW50ZXJdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGNhc2UgJ0Zvcm1Db250cm9sJzpcbiAgICAgIGNvbnN0IHZhbHVlID0ge1xuICAgICAgICB2YWx1ZTogc2V0VmFsdWVzICYmIGlzUHJpbWl0aXZlKG5vZGVWYWx1ZSkgPyBub2RlVmFsdWUgOiBudWxsLFxuICAgICAgICBkaXNhYmxlZDogbm9kZU9wdGlvbnMuZ2V0KCdkaXNhYmxlZCcpIHx8IGZhbHNlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHsgY29udHJvbFR5cGUsIHZhbHVlLCB2YWxpZGF0b3JzIH07XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiAnYnVpbGRGb3JtR3JvdXAnIGZ1bmN0aW9uXG4gKlxuICogLy8ge2FueX0gdGVtcGxhdGUgLVxuICogLy8ge0Fic3RyYWN0Q29udHJvbH1cbiovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRGb3JtR3JvdXAodGVtcGxhdGU6IGFueSk6IEFic3RyYWN0Q29udHJvbCB7XG4gIGNvbnN0IHZhbGlkYXRvckZuczogVmFsaWRhdG9yRm5bXSA9IFtdO1xuICBsZXQgdmFsaWRhdG9yRm46IFZhbGlkYXRvckZuID0gbnVsbDtcbiAgaWYgKGhhc093bih0ZW1wbGF0ZSwgJ3ZhbGlkYXRvcnMnKSkge1xuICAgIGZvckVhY2godGVtcGxhdGUudmFsaWRhdG9ycywgKHBhcmFtZXRlcnMsIHZhbGlkYXRvcikgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBKc29uVmFsaWRhdG9yc1t2YWxpZGF0b3JdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhbGlkYXRvckZucy5wdXNoKEpzb25WYWxpZGF0b3JzW3ZhbGlkYXRvcl0uYXBwbHkobnVsbCwgcGFyYW1ldGVycykpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh2YWxpZGF0b3JGbnMubGVuZ3RoICYmXG4gICAgICBpbkFycmF5KHRlbXBsYXRlLmNvbnRyb2xUeXBlLCBbJ0Zvcm1Hcm91cCcsICdGb3JtQXJyYXknXSlcbiAgICApIHtcbiAgICAgIHZhbGlkYXRvckZuID0gdmFsaWRhdG9yRm5zLmxlbmd0aCA+IDEgP1xuICAgICAgICBKc29uVmFsaWRhdG9ycy5jb21wb3NlKHZhbGlkYXRvckZucykgOiB2YWxpZGF0b3JGbnNbMF07XG4gICAgfVxuICB9XG4gIGlmIChoYXNPd24odGVtcGxhdGUsICdjb250cm9sVHlwZScpKSB7XG4gICAgc3dpdGNoICh0ZW1wbGF0ZS5jb250cm9sVHlwZSkge1xuICAgICAgY2FzZSAnRm9ybUdyb3VwJzpcbiAgICAgICAgY29uc3QgZ3JvdXBDb250cm9sczogeyBba2V5OiBzdHJpbmddOiBBYnN0cmFjdENvbnRyb2wgfSA9IHt9O1xuICAgICAgICBmb3JFYWNoKHRlbXBsYXRlLmNvbnRyb2xzLCAoY29udHJvbHMsIGtleSkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5ld0NvbnRyb2w6IEFic3RyYWN0Q29udHJvbCA9IGJ1aWxkRm9ybUdyb3VwKGNvbnRyb2xzKTtcbiAgICAgICAgICBpZiAobmV3Q29udHJvbCkgeyBncm91cENvbnRyb2xzW2tleV0gPSBuZXdDb250cm9sOyB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3IEZvcm1Hcm91cChncm91cENvbnRyb2xzLCB2YWxpZGF0b3JGbik7XG4gICAgICBjYXNlICdGb3JtQXJyYXknOlxuICAgICAgICByZXR1cm4gbmV3IEZvcm1BcnJheShmaWx0ZXIobWFwKHRlbXBsYXRlLmNvbnRyb2xzLFxuICAgICAgICAgIGNvbnRyb2xzID0+IGJ1aWxkRm9ybUdyb3VwKGNvbnRyb2xzKVxuICAgICAgICApKSwgdmFsaWRhdG9yRm4pO1xuICAgICAgY2FzZSAnRm9ybUNvbnRyb2wnOlxuICAgICAgICByZXR1cm4gbmV3IEZvcm1Db250cm9sKHRlbXBsYXRlLnZhbHVlLCB2YWxpZGF0b3JGbnMpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiAnbWVyZ2VWYWx1ZXMnIGZ1bmN0aW9uXG4gKlxuICogLy8gIHthbnlbXX0gLi4udmFsdWVzVG9NZXJnZSAtIE11bHRpcGxlIHZhbHVlcyB0byBtZXJnZVxuICogLy8ge2FueX0gLSBNZXJnZWQgdmFsdWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVZhbHVlcyguLi52YWx1ZXNUb01lcmdlKSB7XG4gIGxldCBtZXJnZWRWYWx1ZXM6IGFueSA9IG51bGw7XG4gIGZvciAoY29uc3QgY3VycmVudFZhbHVlIG9mIHZhbHVlc1RvTWVyZ2UpIHtcbiAgICBpZiAoIWlzRW1wdHkoY3VycmVudFZhbHVlKSkge1xuICAgICAgaWYgKHR5cGVvZiBjdXJyZW50VmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICAgIChpc0VtcHR5KG1lcmdlZFZhbHVlcykgfHwgdHlwZW9mIG1lcmdlZFZhbHVlcyAhPT0gJ29iamVjdCcpXG4gICAgICApIHtcbiAgICAgICAgaWYgKGlzQXJyYXkoY3VycmVudFZhbHVlKSkge1xuICAgICAgICAgIG1lcmdlZFZhbHVlcyA9IFsuLi5jdXJyZW50VmFsdWVdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGN1cnJlbnRWYWx1ZSkpIHtcbiAgICAgICAgICBtZXJnZWRWYWx1ZXMgPSB7IC4uLmN1cnJlbnRWYWx1ZSB9O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyZW50VmFsdWUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1lcmdlZFZhbHVlcyA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QobWVyZ2VkVmFsdWVzKSAmJiBpc09iamVjdChjdXJyZW50VmFsdWUpKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24obWVyZ2VkVmFsdWVzLCBjdXJyZW50VmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChpc09iamVjdChtZXJnZWRWYWx1ZXMpICYmIGlzQXJyYXkoY3VycmVudFZhbHVlKSkge1xuICAgICAgICBjb25zdCBuZXdWYWx1ZXMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiBjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICBuZXdWYWx1ZXMucHVzaChtZXJnZVZhbHVlcyhtZXJnZWRWYWx1ZXMsIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWVyZ2VkVmFsdWVzID0gbmV3VmFsdWVzO1xuICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG1lcmdlZFZhbHVlcykgJiYgaXNPYmplY3QoY3VycmVudFZhbHVlKSkge1xuICAgICAgICBjb25zdCBuZXdWYWx1ZXMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiBtZXJnZWRWYWx1ZXMpIHtcbiAgICAgICAgICBuZXdWYWx1ZXMucHVzaChtZXJnZVZhbHVlcyh2YWx1ZSwgY3VycmVudFZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWVyZ2VkVmFsdWVzID0gbmV3VmFsdWVzO1xuICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG1lcmdlZFZhbHVlcykgJiYgaXNBcnJheShjdXJyZW50VmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWF4KG1lcmdlZFZhbHVlcy5sZW5ndGgsIGN1cnJlbnRWYWx1ZS5sZW5ndGgpOyBpKyspIHtcbiAgICAgICAgICBpZiAoaSA8IG1lcmdlZFZhbHVlcy5sZW5ndGggJiYgaSA8IGN1cnJlbnRWYWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5ld1ZhbHVlcy5wdXNoKG1lcmdlVmFsdWVzKG1lcmdlZFZhbHVlc1tpXSwgY3VycmVudFZhbHVlW2ldKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpIDwgbWVyZ2VkVmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgbmV3VmFsdWVzLnB1c2gobWVyZ2VkVmFsdWVzW2ldKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGkgPCBjdXJyZW50VmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdWYWx1ZXMucHVzaChjdXJyZW50VmFsdWVbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtZXJnZWRWYWx1ZXMgPSBuZXdWYWx1ZXM7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtZXJnZWRWYWx1ZXM7XG59XG5cbi8qKlxuICogJ3NldFJlcXVpcmVkRmllbGRzJyBmdW5jdGlvblxuICpcbiAqIC8vIHtzY2hlbWF9IHNjaGVtYSAtIEpTT04gU2NoZW1hXG4gKiAvLyB7b2JqZWN0fSBmb3JtQ29udHJvbFRlbXBsYXRlIC0gRm9ybSBDb250cm9sIFRlbXBsYXRlIG9iamVjdFxuICogLy8ge2Jvb2xlYW59IC0gdHJ1ZSBpZiBhbnkgZmllbGRzIGhhdmUgYmVlbiBzZXQgdG8gcmVxdWlyZWQsIGZhbHNlIGlmIG5vdFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0UmVxdWlyZWRGaWVsZHMoc2NoZW1hOiBhbnksIGZvcm1Db250cm9sVGVtcGxhdGU6IGFueSk6IGJvb2xlYW4ge1xuICBsZXQgZmllbGRzUmVxdWlyZWQgPSBmYWxzZTtcbiAgaWYgKGhhc093bihzY2hlbWEsICdyZXF1aXJlZCcpICYmICFpc0VtcHR5KHNjaGVtYS5yZXF1aXJlZCkpIHtcbiAgICBmaWVsZHNSZXF1aXJlZCA9IHRydWU7XG4gICAgbGV0IHJlcXVpcmVkQXJyYXkgPSBpc0FycmF5KHNjaGVtYS5yZXF1aXJlZCkgPyBzY2hlbWEucmVxdWlyZWQgOiBbc2NoZW1hLnJlcXVpcmVkXTtcbiAgICByZXF1aXJlZEFycmF5ID0gZm9yRWFjaChyZXF1aXJlZEFycmF5LFxuICAgICAga2V5ID0+IEpzb25Qb2ludGVyLnNldChmb3JtQ29udHJvbFRlbXBsYXRlLCAnLycgKyBrZXkgKyAnL3ZhbGlkYXRvcnMvcmVxdWlyZWQnLCBbXSlcbiAgICApO1xuICB9XG4gIHJldHVybiBmaWVsZHNSZXF1aXJlZDtcblxuICAvLyBUT0RPOiBBZGQgc3VwcG9ydCBmb3IgcGF0dGVyblByb3BlcnRpZXNcbiAgLy8gaHR0cHM6Ly9zcGFjZXRlbGVzY29wZS5naXRodWIuaW8vdW5kZXJzdGFuZGluZy1qc29uLXNjaGVtYS9yZWZlcmVuY2Uvb2JqZWN0Lmh0bWwjcGF0dGVybi1wcm9wZXJ0aWVzXG59XG5cbi8qKlxuICogJ2Zvcm1hdEZvcm1EYXRhJyBmdW5jdGlvblxuICpcbiAqIC8vIHthbnl9IGZvcm1EYXRhIC0gQW5ndWxhciBGb3JtR3JvdXAgZGF0YSBvYmplY3RcbiAqIC8vIHtNYXA8c3RyaW5nLCBhbnk+fSBkYXRhTWFwIC1cbiAqIC8vIHtNYXA8c3RyaW5nLCBzdHJpbmc+fSByZWN1cnNpdmVSZWZNYXAgLVxuICogLy8ge01hcDxzdHJpbmcsIG51bWJlcj59IGFycmF5TWFwIC1cbiAqIC8vIHtib29sZWFuID0gZmFsc2V9IGZpeEVycm9ycyAtIGlmIFRSVUUsIHRyaWVzIHRvIGZpeCBkYXRhXG4gKiAvLyB7YW55fSAtIGZvcm1hdHRlZCBkYXRhIG9iamVjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Rm9ybURhdGEoXG4gIGZvcm1EYXRhOiBhbnksIGRhdGFNYXA6IE1hcDxzdHJpbmcsIGFueT4sXG4gIHJlY3Vyc2l2ZVJlZk1hcDogTWFwPHN0cmluZywgc3RyaW5nPiwgYXJyYXlNYXA6IE1hcDxzdHJpbmcsIG51bWJlcj4sXG4gIHJldHVybkVtcHR5RmllbGRzID0gZmFsc2UsIGZpeEVycm9ycyA9IGZhbHNlXG4pOiBhbnkge1xuICBpZiAoZm9ybURhdGEgPT09IG51bGwgfHwgdHlwZW9mIGZvcm1EYXRhICE9PSAnb2JqZWN0JykgeyByZXR1cm4gZm9ybURhdGE7IH1cbiAgY29uc3QgZm9ybWF0dGVkRGF0YSA9IGlzQXJyYXkoZm9ybURhdGEpID8gW10gOiB7fTtcbiAgSnNvblBvaW50ZXIuZm9yRWFjaERlZXAoZm9ybURhdGEsICh2YWx1ZSwgZGF0YVBvaW50ZXIpID0+IHtcblxuICAgIC8vIElmIHJldHVybkVtcHR5RmllbGRzID09PSB0cnVlLFxuICAgIC8vIGFkZCBlbXB0eSBhcnJheXMgYW5kIG9iamVjdHMgdG8gYWxsIGFsbG93ZWQga2V5c1xuICAgIGlmIChyZXR1cm5FbXB0eUZpZWxkcyAmJiBpc0FycmF5KHZhbHVlKSkge1xuICAgICAgSnNvblBvaW50ZXIuc2V0KGZvcm1hdHRlZERhdGEsIGRhdGFQb2ludGVyLCBbXSk7XG4gICAgfSBlbHNlIGlmIChyZXR1cm5FbXB0eUZpZWxkcyAmJiBpc09iamVjdCh2YWx1ZSkgJiYgIWlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIEpzb25Qb2ludGVyLnNldChmb3JtYXR0ZWREYXRhLCBkYXRhUG9pbnRlciwge30pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBnZW5lcmljUG9pbnRlciA9XG4gICAgICAgIEpzb25Qb2ludGVyLmhhcyhkYXRhTWFwLCBbZGF0YVBvaW50ZXIsICdzY2hlbWFUeXBlJ10pID8gZGF0YVBvaW50ZXIgOlxuICAgICAgICAgIHJlbW92ZVJlY3Vyc2l2ZVJlZmVyZW5jZXMoZGF0YVBvaW50ZXIsIHJlY3Vyc2l2ZVJlZk1hcCwgYXJyYXlNYXApO1xuICAgICAgaWYgKEpzb25Qb2ludGVyLmhhcyhkYXRhTWFwLCBbZ2VuZXJpY1BvaW50ZXIsICdzY2hlbWFUeXBlJ10pKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYVR5cGU6IFNjaGVtYVByaW1pdGl2ZVR5cGUgfCBTY2hlbWFQcmltaXRpdmVUeXBlW10gPVxuICAgICAgICAgIGRhdGFNYXAuZ2V0KGdlbmVyaWNQb2ludGVyKS5nZXQoJ3NjaGVtYVR5cGUnKTtcbiAgICAgICAgaWYgKHNjaGVtYVR5cGUgPT09ICdudWxsJykge1xuICAgICAgICAgIEpzb25Qb2ludGVyLnNldChmb3JtYXR0ZWREYXRhLCBkYXRhUG9pbnRlciwgbnVsbCk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGhhc1ZhbHVlKHZhbHVlKSB8fCByZXR1cm5FbXB0eUZpZWxkcykgJiZcbiAgICAgICAgICBpbkFycmF5KHNjaGVtYVR5cGUsIFsnc3RyaW5nJywgJ2ludGVnZXInLCAnbnVtYmVyJywgJ2Jvb2xlYW4nXSlcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAoZml4RXJyb3JzIHx8ICh2YWx1ZSA9PT0gbnVsbCAmJiByZXR1cm5FbXB0eUZpZWxkcykpID9cbiAgICAgICAgICAgIHRvU2NoZW1hVHlwZSh2YWx1ZSwgc2NoZW1hVHlwZSkgOiB0b0phdmFTY3JpcHRUeXBlKHZhbHVlLCBzY2hlbWFUeXBlKTtcbiAgICAgICAgICBpZiAoaXNEZWZpbmVkKG5ld1ZhbHVlKSB8fCByZXR1cm5FbXB0eUZpZWxkcykge1xuICAgICAgICAgICAgSnNvblBvaW50ZXIuc2V0KGZvcm1hdHRlZERhdGEsIGRhdGFQb2ludGVyLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgcmV0dXJuRW1wdHlGaWVsZHMgPT09IGZhbHNlLFxuICAgICAgICAgIC8vIG9ubHkgYWRkIGVtcHR5IGFycmF5cyBhbmQgb2JqZWN0cyB0byByZXF1aXJlZCBrZXlzXG4gICAgICAgIH0gZWxzZSBpZiAoc2NoZW1hVHlwZSA9PT0gJ29iamVjdCcgJiYgIXJldHVybkVtcHR5RmllbGRzKSB7XG4gICAgICAgICAgKGRhdGFNYXAuZ2V0KGdlbmVyaWNQb2ludGVyKS5nZXQoJ3JlcXVpcmVkJykgfHwgW10pLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleVNjaGVtYVR5cGUgPVxuICAgICAgICAgICAgICBkYXRhTWFwLmdldChgJHtnZW5lcmljUG9pbnRlcn0vJHtrZXl9YCkuZ2V0KCdzY2hlbWFUeXBlJyk7XG4gICAgICAgICAgICBpZiAoa2V5U2NoZW1hVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgICAgICAgICBKc29uUG9pbnRlci5zZXQoZm9ybWF0dGVkRGF0YSwgYCR7ZGF0YVBvaW50ZXJ9LyR7a2V5fWAsIFtdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5U2NoZW1hVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgSnNvblBvaW50ZXIuc2V0KGZvcm1hdHRlZERhdGEsIGAke2RhdGFQb2ludGVyfS8ke2tleX1gLCB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5pc2ggaW5jb21wbGV0ZSAnZGF0ZS10aW1lJyBlbnRyaWVzXG4gICAgICAgIGlmIChkYXRhTWFwLmdldChnZW5lcmljUG9pbnRlcikuZ2V0KCdzY2hlbWFGb3JtYXQnKSA9PT0gJ2RhdGUtdGltZScpIHtcbiAgICAgICAgICAvLyBcIjIwMDAtMDMtMTRUMDE6NTk6MjYuNTM1XCIgLT4gXCIyMDAwLTAzLTE0VDAxOjU5OjI2LjUzNVpcIiAoYWRkIFwiWlwiKVxuICAgICAgICAgIGlmICgvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZFt0XFxzXVswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkKD86XFwuXFxkKyk/JC9pLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgICBKc29uUG9pbnRlci5zZXQoZm9ybWF0dGVkRGF0YSwgZGF0YVBvaW50ZXIsIGAke3ZhbHVlfVpgKTtcbiAgICAgICAgICAgIC8vIFwiMjAwMC0wMy0xNFQwMTo1OVwiIC0+IFwiMjAwMC0wMy0xNFQwMTo1OTowMFpcIiAoYWRkIFwiOjAwWlwiKVxuICAgICAgICAgIH0gZWxzZSBpZiAoL15cXGRcXGRcXGRcXGQtWzAtMV1cXGQtWzAtM11cXGRbdFxcc11bMC0yXVxcZDpbMC01XVxcZCQvaS50ZXN0KHZhbHVlKSkge1xuICAgICAgICAgICAgSnNvblBvaW50ZXIuc2V0KGZvcm1hdHRlZERhdGEsIGRhdGFQb2ludGVyLCBgJHt2YWx1ZX06MDBaYCk7XG4gICAgICAgICAgICAvLyBcIjIwMDAtMDMtMTRcIiAtPiBcIjIwMDAtMDMtMTRUMDA6MDA6MDBaXCIgKGFkZCBcIlQwMDowMDowMFpcIilcbiAgICAgICAgICB9IGVsc2UgaWYgKGZpeEVycm9ycyAmJiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZCQvaS50ZXN0KHZhbHVlKSkge1xuICAgICAgICAgICAgSnNvblBvaW50ZXIuc2V0KGZvcm1hdHRlZERhdGEsIGRhdGFQb2ludGVyLCBgJHt2YWx1ZX06MDA6MDA6MDBaYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcgfHwgaXNEYXRlKHZhbHVlKSB8fFxuICAgICAgICAodmFsdWUgPT09IG51bGwgJiYgcmV0dXJuRW1wdHlGaWVsZHMpXG4gICAgICApIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignZm9ybWF0Rm9ybURhdGEgZXJyb3I6ICcgK1xuICAgICAgICAgIGBTY2hlbWEgdHlwZSBub3QgZm91bmQgZm9yIGZvcm0gdmFsdWUgYXQgJHtnZW5lcmljUG9pbnRlcn1gKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignZGF0YU1hcCcsIGRhdGFNYXApO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdyZWN1cnNpdmVSZWZNYXAnLCByZWN1cnNpdmVSZWZNYXApO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdnZW5lcmljUG9pbnRlcicsIGdlbmVyaWNQb2ludGVyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZm9ybWF0dGVkRGF0YTtcbn1cblxuLyoqXG4gKiAnZ2V0Q29udHJvbCcgZnVuY3Rpb25cbiAqXG4gKiBVc2VzIGEgSlNPTiBQb2ludGVyIGZvciBhIGRhdGEgb2JqZWN0IHRvIHJldHJpZXZlIGEgY29udHJvbCBmcm9tXG4gKiBhbiBBbmd1bGFyIGZvcm1Hcm91cCBvciBmb3JtR3JvdXAgdGVtcGxhdGUuIChOb3RlOiB0aG91Z2ggYSBmb3JtR3JvdXBcbiAqIHRlbXBsYXRlIGlzIG11Y2ggc2ltcGxlciwgaXRzIGJhc2ljIHN0cnVjdHVyZSBpcyBpZGVudGlhbCB0byBhIGZvcm1Hcm91cCkuXG4gKlxuICogSWYgdGhlIG9wdGlvbmFsIHRoaXJkIHBhcmFtZXRlciAncmV0dXJuR3JvdXAnIGlzIHNldCB0byBUUlVFLCB0aGUgZ3JvdXBcbiAqIGNvbnRhaW5pbmcgdGhlIGNvbnRyb2wgaXMgcmV0dXJuZWQsIHJhdGhlciB0aGFuIHRoZSBjb250cm9sIGl0c2VsZi5cbiAqXG4gKiAvLyB7Rm9ybUdyb3VwfSBmb3JtR3JvdXAgLSBBbmd1bGFyIEZvcm1Hcm91cCB0byBnZXQgdmFsdWUgZnJvbVxuICogLy8ge1BvaW50ZXJ9IGRhdGFQb2ludGVyIC0gSlNPTiBQb2ludGVyIChzdHJpbmcgb3IgYXJyYXkpXG4gKiAvLyB7Ym9vbGVhbiA9IGZhbHNlfSByZXR1cm5Hcm91cCAtIElmIHRydWUsIHJldHVybiBncm91cCBjb250YWluaW5nIGNvbnRyb2xcbiAqIC8vIHtncm91cH0gLSBMb2NhdGVkIHZhbHVlIChvciBudWxsLCBpZiBubyBjb250cm9sIGZvdW5kKVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udHJvbChcbiAgZm9ybUdyb3VwOiBhbnksIGRhdGFQb2ludGVyOiBQb2ludGVyLCByZXR1cm5Hcm91cCA9IGZhbHNlXG4pOiBhbnkge1xuICBpZiAoIWlzT2JqZWN0KGZvcm1Hcm91cCkgfHwgIUpzb25Qb2ludGVyLmlzSnNvblBvaW50ZXIoZGF0YVBvaW50ZXIpKSB7XG4gICAgaWYgKCFKc29uUG9pbnRlci5pc0pzb25Qb2ludGVyKGRhdGFQb2ludGVyKSkge1xuICAgICAgLy8gSWYgZGF0YVBvaW50ZXIgaW5wdXQgaXMgbm90IGEgdmFsaWQgSlNPTiBwb2ludGVyLCBjaGVjayB0b1xuICAgICAgLy8gc2VlIGlmIGl0IGlzIGluc3RlYWQgYSB2YWxpZCBvYmplY3QgcGF0aCwgdXNpbmcgZG90IG5vdGFpb25cbiAgICAgIGlmICh0eXBlb2YgZGF0YVBvaW50ZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnN0IGZvcm1Db250cm9sID0gZm9ybUdyb3VwLmdldChkYXRhUG9pbnRlcik7XG4gICAgICAgIGlmIChmb3JtQ29udHJvbCkgeyByZXR1cm4gZm9ybUNvbnRyb2w7IH1cbiAgICAgIH1cbiAgICAgIGNvbnNvbGUuZXJyb3IoYGdldENvbnRyb2wgZXJyb3I6IEludmFsaWQgSlNPTiBQb2ludGVyOiAke2RhdGFQb2ludGVyfWApO1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KGZvcm1Hcm91cCkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYGdldENvbnRyb2wgZXJyb3I6IEludmFsaWQgZm9ybUdyb3VwOiAke2Zvcm1Hcm91cH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgbGV0IGRhdGFQb2ludGVyQXJyYXkgPSBKc29uUG9pbnRlci5wYXJzZShkYXRhUG9pbnRlcik7XG4gIGlmIChyZXR1cm5Hcm91cCkgeyBkYXRhUG9pbnRlckFycmF5ID0gZGF0YVBvaW50ZXJBcnJheS5zbGljZSgwLCAtMSk7IH1cblxuICAvLyBJZiBmb3JtR3JvdXAgaW5wdXQgaXMgYSByZWFsIGZvcm1Hcm91cCAobm90IGEgZm9ybUdyb3VwIHRlbXBsYXRlKVxuICAvLyB0cnkgdXNpbmcgZm9ybUdyb3VwLmdldCgpIHRvIHJldHVybiB0aGUgY29udHJvbFxuICBpZiAodHlwZW9mIGZvcm1Hcm91cC5nZXQgPT09ICdmdW5jdGlvbicgJiZcbiAgICBkYXRhUG9pbnRlckFycmF5LmV2ZXJ5KGtleSA9PiBrZXkuaW5kZXhPZignLicpID09PSAtMSlcbiAgKSB7XG4gICAgY29uc3QgZm9ybUNvbnRyb2wgPSBmb3JtR3JvdXAuZ2V0KGRhdGFQb2ludGVyQXJyYXkuam9pbignLicpKTtcbiAgICBpZiAoZm9ybUNvbnRyb2wpIHsgcmV0dXJuIGZvcm1Db250cm9sOyB9XG4gIH1cblxuICAvLyBJZiBmb3JtR3JvdXAgaW5wdXQgaXMgYSBmb3JtR3JvdXAgdGVtcGxhdGUsXG4gIC8vIG9yIGZvcm1Hcm91cC5nZXQoKSBmYWlsZWQgdG8gcmV0dXJuIHRoZSBjb250cm9sLFxuICAvLyBzZWFyY2ggdGhlIGZvcm1Hcm91cCBvYmplY3QgZm9yIGRhdGFQb2ludGVyJ3MgY29udHJvbFxuICBsZXQgc3ViR3JvdXAgPSBmb3JtR3JvdXA7XG4gIGZvciAoY29uc3Qga2V5IG9mIGRhdGFQb2ludGVyQXJyYXkpIHtcbiAgICBpZiAoaGFzT3duKHN1Ykdyb3VwLCAnY29udHJvbHMnKSkgeyBzdWJHcm91cCA9IHN1Ykdyb3VwLmNvbnRyb2xzOyB9XG4gICAgaWYgKGlzQXJyYXkoc3ViR3JvdXApICYmIChrZXkgPT09ICctJykpIHtcbiAgICAgIHN1Ykdyb3VwID0gc3ViR3JvdXBbc3ViR3JvdXAubGVuZ3RoIC0gMV07XG4gICAgfSBlbHNlIGlmIChoYXNPd24oc3ViR3JvdXAsIGtleSkpIHtcbiAgICAgIHN1Ykdyb3VwID0gc3ViR3JvdXBba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihgZ2V0Q29udHJvbCBlcnJvcjogVW5hYmxlIHRvIGZpbmQgXCIke2tleX1cIiBpdGVtIGluIEZvcm1Hcm91cC5gKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZGF0YVBvaW50ZXIpO1xuICAgICAgY29uc29sZS5lcnJvcihmb3JtR3JvdXApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3ViR3JvdXA7XG59XG4iXX0=