import * as tslib_1 from "tslib";
import isEqual from 'lodash/isEqual';
import { _executeAsyncValidators, _executeValidators, _mergeErrors, _mergeObjects, getType, hasValue, isArray, isBoolean, isDefined, isEmpty, isNumber, isString, isType, toJavaScriptType, toObservable, xor } from './validator.functions';
import { forEachCopy } from './utility.functions';
import { forkJoin } from 'rxjs';
import { jsonSchemaFormatTests } from './format-regex.constants';
import { map } from 'rxjs/operators';
/**
 * 'JsonValidators' class
 *
 * Provides an extended set of validators to be used by form controls,
 * compatible with standard JSON Schema validation options.
 * http://json-schema.org/latest/json-schema-validation.html
 *
 * Note: This library is designed as a drop-in replacement for the Angular
 * Validators library, and except for one small breaking change to the 'pattern'
 * validator (described below) it can even be imported as a substitute, like so:
 *
 *   import { JsonValidators as Validators } from 'json-validators';
 *
 * and it should work with existing code as a complete replacement.
 *
 * The one exception is the 'pattern' validator, which has been changed to
 * matche partial values by default (the standard 'pattern' validator wrapped
 * all patterns in '^' and '$', forcing them to always match an entire value).
 * However, the old behavior can be restored by simply adding '^' and '$'
 * around your patterns, or by passing an optional second parameter of TRUE.
 * This change is to make the 'pattern' validator match the behavior of a
 * JSON Schema pattern, which allows partial matches, rather than the behavior
 * of an HTML input control pattern, which does not.
 *
 * This library replaces Angular's validators and combination functions
 * with the following validators and transformation functions:
 *
 * Validators:
 *   For all formControls:     required (*), type, enum, const
 *   For text formControls:    minLength (*), maxLength (*), pattern (*), format
 *   For numeric formControls: maximum, exclusiveMaximum,
 *                             minimum, exclusiveMinimum, multipleOf
 *   For formGroup objects:    minProperties, maxProperties, dependencies
 *   For formArray arrays:     minItems, maxItems, uniqueItems, contains
 *   Not used by JSON Schema:  min (*), max (*), requiredTrue (*), email (*)
 * (Validators originally included with Angular are maked with (*).)
 *
 * NOTE / TODO: The dependencies validator is not complete.
 * NOTE / TODO: The contains validator is not complete.
 *
 * Validators not used by JSON Schema (but included for compatibility)
 * and their JSON Schema equivalents:
 *
 *   Angular validator | JSON Schema equivalent
 *   ------------------|-----------------------
 *     min(number)     |   minimum(number)
 *     max(number)     |   maximum(number)
 *     requiredTrue()  |   const(true)
 *     email()         |   format('email')
 *
 * Validator transformation functions:
 *   composeAnyOf, composeOneOf, composeAllOf, composeNot
 * (Angular's original combination funciton, 'compose', is also included for
 * backward compatibility, though it is functionally equivalent to composeAllOf,
 * asside from its more generic error message.)
 *
 * All validators have also been extended to accept an optional second argument
 * which, if passed a TRUE value, causes the validator to perform the opposite
 * of its original finction. (This is used internally to enable 'not' and
 * 'composeOneOf' to function and return useful error messages.)
 *
 * The 'required' validator has also been overloaded so that if called with
 * a boolean parameter (or no parameters) it returns the original validator
 * function (rather than executing it). However, if it is called with an
 * AbstractControl parameter (as was previously required), it behaves
 * exactly as before.
 *
 * This enables all validators (including 'required') to be constructed in
 * exactly the same way, so they can be automatically applied using the
 * equivalent key names and values taken directly from a JSON Schema.
 *
 * This source code is partially derived from Angular,
 * which is Copyright (c) 2014-2017 Google, Inc.
 * Use of this source code is therefore governed by the same MIT-style license
 * that can be found in the LICENSE file at https://angular.io/license
 *
 * Original Angular Validators:
 * https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts
 */
var JsonValidators = /** @class */ (function () {
    function JsonValidators() {
    }
    JsonValidators.required = function (input) {
        if (input === undefined) {
            input = true;
        }
        switch (input) {
            case true: // Return required function (do not execute it yet)
                return function (control, invert) {
                    if (invert === void 0) { invert = false; }
                    if (invert) {
                        return null;
                    } // if not required, always return valid
                    return hasValue(control.value) ? null : { 'required': true };
                };
            case false: // Do nothing (if field is not required, it is always valid)
                return JsonValidators.nullValidator;
            default: // Execute required function
                return hasValue(input.value) ? null : { 'required': true };
        }
    };
    /**
     * 'type' validator
     *
     * Requires a control to only accept values of a specified type,
     * or one of an array of types.
     *
     * Note: SchemaPrimitiveType = 'string'|'number'|'integer'|'boolean'|'null'
     *
     * // {SchemaPrimitiveType|SchemaPrimitiveType[]} type - type(s) to accept
     * // {IValidatorFn}
     */
    JsonValidators.type = function (requiredType) {
        if (!hasValue(requiredType)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isValid = isArray(requiredType) ?
                requiredType.some(function (type) { return isType(currentValue, type); }) :
                isType(currentValue, requiredType);
            return xor(isValid, invert) ?
                null : { 'type': { requiredType: requiredType, currentValue: currentValue } };
        };
    };
    /**
     * 'enum' validator
     *
     * Requires a control to have a value from an enumerated list of values.
     *
     * Converts types as needed to allow string inputs to still correctly
     * match number, boolean, and null enum values.
     *
     * // {any[]} allowedValues - array of acceptable values
     * // {IValidatorFn}
     */
    JsonValidators.enum = function (allowedValues) {
        if (!isArray(allowedValues)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isEqualVal = function (enumValue, inputValue) {
                return enumValue === inputValue ||
                    (isNumber(enumValue) && +inputValue === +enumValue) ||
                    (isBoolean(enumValue, 'strict') &&
                        toJavaScriptType(inputValue, 'boolean') === enumValue) ||
                    (enumValue === null && !hasValue(inputValue)) ||
                    isEqual(enumValue, inputValue);
            };
            var isValid = isArray(currentValue) ?
                currentValue.every(function (inputValue) { return allowedValues.some(function (enumValue) {
                    return isEqualVal(enumValue, inputValue);
                }); }) :
                allowedValues.some(function (enumValue) { return isEqualVal(enumValue, currentValue); });
            return xor(isValid, invert) ?
                null : { 'enum': { allowedValues: allowedValues, currentValue: currentValue } };
        };
    };
    /**
     * 'const' validator
     *
     * Requires a control to have a specific value.
     *
     * Converts types as needed to allow string inputs to still correctly
     * match number, boolean, and null values.
     *
     * TODO: modify to work with objects
     *
     * // {any[]} requiredValue - required value
     * // {IValidatorFn}
     */
    JsonValidators.const = function (requiredValue) {
        if (!hasValue(requiredValue)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isEqualVal = function (constValue, inputValue) {
                return constValue === inputValue ||
                    isNumber(constValue) && +inputValue === +constValue ||
                    isBoolean(constValue, 'strict') &&
                        toJavaScriptType(inputValue, 'boolean') === constValue ||
                    constValue === null && !hasValue(inputValue);
            };
            var isValid = isEqualVal(requiredValue, currentValue);
            return xor(isValid, invert) ?
                null : { 'const': { requiredValue: requiredValue, currentValue: currentValue } };
        };
    };
    /**
     * 'minLength' validator
     *
     * Requires a control's text value to be greater than a specified length.
     *
     * // {number} minimumLength - minimum allowed string length
     * // {boolean = false} invert - instead return error object only if valid
     * // {IValidatorFn}
     */
    JsonValidators.minLength = function (minimumLength) {
        if (!hasValue(minimumLength)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentLength = isString(control.value) ? control.value.length : 0;
            var isValid = currentLength >= minimumLength;
            return xor(isValid, invert) ?
                null : { 'minLength': { minimumLength: minimumLength, currentLength: currentLength } };
        };
    };
    /**
     * 'maxLength' validator
     *
     * Requires a control's text value to be less than a specified length.
     *
     * // {number} maximumLength - maximum allowed string length
     * // {boolean = false} invert - instead return error object only if valid
     * // {IValidatorFn}
     */
    JsonValidators.maxLength = function (maximumLength) {
        if (!hasValue(maximumLength)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            var currentLength = isString(control.value) ? control.value.length : 0;
            var isValid = currentLength <= maximumLength;
            return xor(isValid, invert) ?
                null : { 'maxLength': { maximumLength: maximumLength, currentLength: currentLength } };
        };
    };
    /**
     * 'pattern' validator
     *
     * Note: NOT the same as Angular's default pattern validator.
     *
     * Requires a control's value to match a specified regular expression pattern.
     *
     * This validator changes the behavior of default pattern validator
     * by replacing RegExp(`^${pattern}$`) with RegExp(`${pattern}`),
     * which allows for partial matches.
     *
     * To return to the default funcitonality, and match the entire string,
     * pass TRUE as the optional second parameter.
     *
     * // {string} pattern - regular expression pattern
     * // {boolean = false} wholeString - match whole value string?
     * // {IValidatorFn}
     */
    JsonValidators.pattern = function (pattern, wholeString) {
        if (wholeString === void 0) { wholeString = false; }
        if (!hasValue(pattern)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var regex;
            var requiredPattern;
            if (typeof pattern === 'string') {
                requiredPattern = (wholeString) ? "^" + pattern + "$" : pattern;
                regex = new RegExp(requiredPattern);
            }
            else {
                requiredPattern = pattern.toString();
                regex = pattern;
            }
            var currentValue = control.value;
            var isValid = isString(currentValue) ? regex.test(currentValue) : false;
            return xor(isValid, invert) ?
                null : { 'pattern': { requiredPattern: requiredPattern, currentValue: currentValue } };
        };
    };
    /**
     * 'format' validator
     *
     * Requires a control to have a value of a certain format.
     *
     * This validator currently checks the following formsts:
     *   date, time, date-time, email, hostname, ipv4, ipv6,
     *   uri, uri-reference, uri-template, url, uuid, color,
     *   json-pointer, relative-json-pointer, regex
     *
     * Fast format regular expressions copied from AJV:
     * https://github.com/epoberezkin/ajv/blob/master/lib/compile/formats.js
     *
     * // {JsonSchemaFormatNames} requiredFormat - format to check
     * // {IValidatorFn}
     */
    JsonValidators.format = function (requiredFormat) {
        if (!hasValue(requiredFormat)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var isValid;
            var currentValue = control.value;
            if (isString(currentValue)) {
                var formatTest = jsonSchemaFormatTests[requiredFormat];
                if (typeof formatTest === 'object') {
                    isValid = formatTest.test(currentValue);
                }
                else if (typeof formatTest === 'function') {
                    isValid = formatTest(currentValue);
                }
                else {
                    console.error("format validator error: \"" + requiredFormat + "\" is not a recognized format.");
                    isValid = true;
                }
            }
            else {
                // Allow JavaScript Date objects
                isValid = ['date', 'time', 'date-time'].includes(requiredFormat) &&
                    Object.prototype.toString.call(currentValue) === '[object Date]';
            }
            return xor(isValid, invert) ?
                null : { 'format': { requiredFormat: requiredFormat, currentValue: currentValue } };
        };
    };
    /**
     * 'minimum' validator
     *
     * Requires a control's numeric value to be greater than or equal to
     * a minimum amount.
     *
     * Any non-numeric value is also valid (according to the HTML forms spec,
     * a non-numeric value doesn't have a minimum).
     * https://www.w3.org/TR/html5/forms.html#attr-input-max
     *
     * // {number} minimum - minimum allowed value
     * // {IValidatorFn}
     */
    JsonValidators.minimum = function (minimumValue) {
        if (!hasValue(minimumValue)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isValid = !isNumber(currentValue) || currentValue >= minimumValue;
            return xor(isValid, invert) ?
                null : { 'minimum': { minimumValue: minimumValue, currentValue: currentValue } };
        };
    };
    /**
     * 'exclusiveMinimum' validator
     *
     * Requires a control's numeric value to be less than a maximum amount.
     *
     * Any non-numeric value is also valid (according to the HTML forms spec,
     * a non-numeric value doesn't have a maximum).
     * https://www.w3.org/TR/html5/forms.html#attr-input-max
     *
     * // {number} exclusiveMinimumValue - maximum allowed value
     * // {IValidatorFn}
     */
    JsonValidators.exclusiveMinimum = function (exclusiveMinimumValue) {
        if (!hasValue(exclusiveMinimumValue)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isValid = !isNumber(currentValue) || +currentValue < exclusiveMinimumValue;
            return xor(isValid, invert) ?
                null : { 'exclusiveMinimum': { exclusiveMinimumValue: exclusiveMinimumValue, currentValue: currentValue } };
        };
    };
    /**
     * 'maximum' validator
     *
     * Requires a control's numeric value to be less than or equal to
     * a maximum amount.
     *
     * Any non-numeric value is also valid (according to the HTML forms spec,
     * a non-numeric value doesn't have a maximum).
     * https://www.w3.org/TR/html5/forms.html#attr-input-max
     *
     * // {number} maximumValue - maximum allowed value
     * // {IValidatorFn}
     */
    JsonValidators.maximum = function (maximumValue) {
        if (!hasValue(maximumValue)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isValid = !isNumber(currentValue) || +currentValue <= maximumValue;
            return xor(isValid, invert) ?
                null : { 'maximum': { maximumValue: maximumValue, currentValue: currentValue } };
        };
    };
    /**
     * 'exclusiveMaximum' validator
     *
     * Requires a control's numeric value to be less than a maximum amount.
     *
     * Any non-numeric value is also valid (according to the HTML forms spec,
     * a non-numeric value doesn't have a maximum).
     * https://www.w3.org/TR/html5/forms.html#attr-input-max
     *
     * // {number} exclusiveMaximumValue - maximum allowed value
     * // {IValidatorFn}
     */
    JsonValidators.exclusiveMaximum = function (exclusiveMaximumValue) {
        if (!hasValue(exclusiveMaximumValue)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isValid = !isNumber(currentValue) || +currentValue < exclusiveMaximumValue;
            return xor(isValid, invert) ?
                null : { 'exclusiveMaximum': { exclusiveMaximumValue: exclusiveMaximumValue, currentValue: currentValue } };
        };
    };
    /**
     * 'multipleOf' validator
     *
     * Requires a control to have a numeric value that is a multiple
     * of a specified number.
     *
     * // {number} multipleOfValue - number value must be a multiple of
     * // {IValidatorFn}
     */
    JsonValidators.multipleOf = function (multipleOfValue) {
        if (!hasValue(multipleOfValue)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentValue = control.value;
            var isValid = isNumber(currentValue) &&
                currentValue % multipleOfValue === 0;
            return xor(isValid, invert) ?
                null : { 'multipleOf': { multipleOfValue: multipleOfValue, currentValue: currentValue } };
        };
    };
    /**
     * 'minProperties' validator
     *
     * Requires a form group to have a minimum number of properties (i.e. have
     * values entered in a minimum number of controls within the group).
     *
     * // {number} minimumProperties - minimum number of properties allowed
     * // {IValidatorFn}
     */
    JsonValidators.minProperties = function (minimumProperties) {
        if (!hasValue(minimumProperties)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentProperties = Object.keys(control.value).length || 0;
            var isValid = currentProperties >= minimumProperties;
            return xor(isValid, invert) ?
                null : { 'minProperties': { minimumProperties: minimumProperties, currentProperties: currentProperties } };
        };
    };
    /**
     * 'maxProperties' validator
     *
     * Requires a form group to have a maximum number of properties (i.e. have
     * values entered in a maximum number of controls within the group).
     *
     * Note: Has no effect if the form group does not contain more than the
     * maximum number of controls.
     *
     * // {number} maximumProperties - maximum number of properties allowed
     * // {IValidatorFn}
     */
    JsonValidators.maxProperties = function (maximumProperties) {
        if (!hasValue(maximumProperties)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            var currentProperties = Object.keys(control.value).length || 0;
            var isValid = currentProperties <= maximumProperties;
            return xor(isValid, invert) ?
                null : { 'maxProperties': { maximumProperties: maximumProperties, currentProperties: currentProperties } };
        };
    };
    /**
     * 'dependencies' validator
     *
     * Requires the controls in a form group to meet additional validation
     * criteria, depending on the values of other controls in the group.
     *
     * Examples:
     * https://spacetelescope.github.io/understanding-json-schema/reference/object.html#dependencies
     *
     * // {any} dependencies - required dependencies
     * // {IValidatorFn}
     */
    JsonValidators.dependencies = function (dependencies) {
        if (getType(dependencies) !== 'object' || isEmpty(dependencies)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var allErrors = _mergeObjects(forEachCopy(dependencies, function (value, requiringField) {
                var e_1, _a, _b;
                if (!hasValue(control.value[requiringField])) {
                    return null;
                }
                var requiringFieldErrors = {};
                var requiredFields;
                var properties = {};
                if (getType(dependencies[requiringField]) === 'array') {
                    requiredFields = dependencies[requiringField];
                }
                else if (getType(dependencies[requiringField]) === 'object') {
                    requiredFields = dependencies[requiringField]['required'] || [];
                    properties = dependencies[requiringField]['properties'] || {};
                }
                try {
                    // Validate property dependencies
                    for (var requiredFields_1 = tslib_1.__values(requiredFields), requiredFields_1_1 = requiredFields_1.next(); !requiredFields_1_1.done; requiredFields_1_1 = requiredFields_1.next()) {
                        var requiredField = requiredFields_1_1.value;
                        if (xor(!hasValue(control.value[requiredField]), invert)) {
                            requiringFieldErrors[requiredField] = { 'required': true };
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (requiredFields_1_1 && !requiredFields_1_1.done && (_a = requiredFields_1.return)) _a.call(requiredFields_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                // Validate schema dependencies
                requiringFieldErrors = _mergeObjects(requiringFieldErrors, forEachCopy(properties, function (requirements, requiredField) {
                    var _a;
                    var requiredFieldErrors = _mergeObjects(forEachCopy(requirements, function (requirement, parameter) {
                        var validator = null;
                        if (requirement === 'maximum' || requirement === 'minimum') {
                            var exclusive = !!requirements['exclusiveM' + requirement.slice(1)];
                            validator = JsonValidators[requirement](parameter, exclusive);
                        }
                        else if (typeof JsonValidators[requirement] === 'function') {
                            validator = JsonValidators[requirement](parameter);
                        }
                        return !isDefined(validator) ?
                            null : validator(control.value[requiredField]);
                    }));
                    return isEmpty(requiredFieldErrors) ?
                        null : (_a = {}, _a[requiredField] = requiredFieldErrors, _a);
                }));
                return isEmpty(requiringFieldErrors) ?
                    null : (_b = {}, _b[requiringField] = requiringFieldErrors, _b);
            }));
            return isEmpty(allErrors) ? null : allErrors;
        };
    };
    /**
     * 'minItems' validator
     *
     * Requires a form array to have a minimum number of values.
     *
     * // {number} minimumItems - minimum number of items allowed
     * // {IValidatorFn}
     */
    JsonValidators.minItems = function (minimumItems) {
        if (!hasValue(minimumItems)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var currentItems = isArray(control.value) ? control.value.length : 0;
            var isValid = currentItems >= minimumItems;
            return xor(isValid, invert) ?
                null : { 'minItems': { minimumItems: minimumItems, currentItems: currentItems } };
        };
    };
    /**
     * 'maxItems' validator
     *
     * Requires a form array to have a maximum number of values.
     *
     * // {number} maximumItems - maximum number of items allowed
     * // {IValidatorFn}
     */
    JsonValidators.maxItems = function (maximumItems) {
        if (!hasValue(maximumItems)) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            var currentItems = isArray(control.value) ? control.value.length : 0;
            var isValid = currentItems <= maximumItems;
            return xor(isValid, invert) ?
                null : { 'maxItems': { maximumItems: maximumItems, currentItems: currentItems } };
        };
    };
    /**
     * 'uniqueItems' validator
     *
     * Requires values in a form array to be unique.
     *
     * // {boolean = true} unique? - true to validate, false to disable
     * // {IValidatorFn}
     */
    JsonValidators.uniqueItems = function (unique) {
        if (unique === void 0) { unique = true; }
        if (!unique) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var sorted = control.value.slice().sort();
            var duplicateItems = [];
            for (var i = 1; i < sorted.length; i++) {
                if (sorted[i - 1] === sorted[i] && duplicateItems.includes(sorted[i])) {
                    duplicateItems.push(sorted[i]);
                }
            }
            var isValid = !duplicateItems.length;
            return xor(isValid, invert) ?
                null : { 'uniqueItems': { duplicateItems: duplicateItems } };
        };
    };
    /**
     * 'contains' validator
     *
     * TODO: Complete this validator
     *
     * Requires values in a form array to be unique.
     *
     * // {boolean = true} unique? - true to validate, false to disable
     * // {IValidatorFn}
     */
    JsonValidators.contains = function (requiredItem) {
        if (requiredItem === void 0) { requiredItem = true; }
        if (!requiredItem) {
            return JsonValidators.nullValidator;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value) || !isArray(control.value)) {
                return null;
            }
            var currentItems = control.value;
            // const isValid = currentItems.some(item =>
            //
            // );
            var isValid = true;
            return xor(isValid, invert) ?
                null : { 'contains': { requiredItem: requiredItem, currentItems: currentItems } };
        };
    };
    /**
     * No-op validator. Included for backward compatibility.
     */
    JsonValidators.nullValidator = function (control) {
        return null;
    };
    /**
     * Validator transformation functions:
     * composeAnyOf, composeOneOf, composeAllOf, composeNot,
     * compose, composeAsync
     *
     * TODO: Add composeAnyOfAsync, composeOneOfAsync,
     *           composeAllOfAsync, composeNotAsync
     */
    /**
     * 'composeAnyOf' validator combination function
     *
     * Accepts an array of validators and returns a single validator that
     * evaluates to valid if any one or more of the submitted validators are
     * valid. If every validator is invalid, it returns combined errors from
     * all validators.
     *
     * // {IValidatorFn[]} validators - array of validators to combine
     * // {IValidatorFn} - single combined validator function
     */
    JsonValidators.composeAnyOf = function (validators) {
        if (!validators) {
            return null;
        }
        var presentValidators = validators.filter(isDefined);
        if (presentValidators.length === 0) {
            return null;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            var arrayOfErrors = _executeValidators(control, presentValidators, invert).filter(isDefined);
            var isValid = validators.length > arrayOfErrors.length;
            return xor(isValid, invert) ?
                null : _mergeObjects.apply(void 0, tslib_1.__spread(arrayOfErrors, [{ 'anyOf': !invert }]));
        };
    };
    /**
     * 'composeOneOf' validator combination function
     *
     * Accepts an array of validators and returns a single validator that
     * evaluates to valid only if exactly one of the submitted validators
     * is valid. Otherwise returns combined information from all validators,
     * both valid and invalid.
     *
     * // {IValidatorFn[]} validators - array of validators to combine
     * // {IValidatorFn} - single combined validator function
     */
    JsonValidators.composeOneOf = function (validators) {
        if (!validators) {
            return null;
        }
        var presentValidators = validators.filter(isDefined);
        if (presentValidators.length === 0) {
            return null;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            var arrayOfErrors = _executeValidators(control, presentValidators);
            var validControls = validators.length - arrayOfErrors.filter(isDefined).length;
            var isValid = validControls === 1;
            if (xor(isValid, invert)) {
                return null;
            }
            var arrayOfValids = _executeValidators(control, presentValidators, invert);
            return _mergeObjects.apply(void 0, tslib_1.__spread(arrayOfErrors, arrayOfValids, [{ 'oneOf': !invert }]));
        };
    };
    /**
     * 'composeAllOf' validator combination function
     *
     * Accepts an array of validators and returns a single validator that
     * evaluates to valid only if all the submitted validators are individually
     * valid. Otherwise it returns combined errors from all invalid validators.
     *
     * // {IValidatorFn[]} validators - array of validators to combine
     * // {IValidatorFn} - single combined validator function
     */
    JsonValidators.composeAllOf = function (validators) {
        if (!validators) {
            return null;
        }
        var presentValidators = validators.filter(isDefined);
        if (presentValidators.length === 0) {
            return null;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            var combinedErrors = _mergeErrors(_executeValidators(control, presentValidators, invert));
            var isValid = combinedErrors === null;
            return (xor(isValid, invert)) ?
                null : _mergeObjects(combinedErrors, { 'allOf': !invert });
        };
    };
    /**
     * 'composeNot' validator inversion function
     *
     * Accepts a single validator function and inverts its result.
     * Returns valid if the submitted validator is invalid, and
     * returns invalid if the submitted validator is valid.
     * (Note: this function can itself be inverted
     *   - e.g. composeNot(composeNot(validator)) -
     *   but this can be confusing and is therefore not recommended.)
     *
     * // {IValidatorFn[]} validators - validator(s) to invert
     * // {IValidatorFn} - new validator function that returns opposite result
     */
    JsonValidators.composeNot = function (validator) {
        if (!validator) {
            return null;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            if (isEmpty(control.value)) {
                return null;
            }
            var error = validator(control, !invert);
            var isValid = error === null;
            return (xor(isValid, invert)) ?
                null : _mergeObjects(error, { 'not': !invert });
        };
    };
    /**
     * 'compose' validator combination function
     *
     * // {IValidatorFn[]} validators - array of validators to combine
     * // {IValidatorFn} - single combined validator function
     */
    JsonValidators.compose = function (validators) {
        if (!validators) {
            return null;
        }
        var presentValidators = validators.filter(isDefined);
        if (presentValidators.length === 0) {
            return null;
        }
        return function (control, invert) {
            if (invert === void 0) { invert = false; }
            return _mergeErrors(_executeValidators(control, presentValidators, invert));
        };
    };
    /**
     * 'composeAsync' async validator combination function
     *
     * // {AsyncIValidatorFn[]} async validators - array of async validators
     * // {AsyncIValidatorFn} - single combined async validator function
     */
    JsonValidators.composeAsync = function (validators) {
        if (!validators) {
            return null;
        }
        var presentValidators = validators.filter(isDefined);
        if (presentValidators.length === 0) {
            return null;
        }
        return function (control) {
            var observables = _executeAsyncValidators(control, presentValidators).map(toObservable);
            return map.call(forkJoin(observables), _mergeErrors);
        };
    };
    // Additional angular validators (not used by Angualr JSON Schema Form)
    // From https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts
    /**
     * Validator that requires controls to have a value greater than a number.
     */
    JsonValidators.min = function (min) {
        if (!hasValue(min)) {
            return JsonValidators.nullValidator;
        }
        return function (control) {
            // don't validate empty values to allow optional controls
            if (isEmpty(control.value) || isEmpty(min)) {
                return null;
            }
            var value = parseFloat(control.value);
            var actual = control.value;
            // Controls with NaN values after parsing should be treated as not having a
            // minimum, per the HTML forms spec: https://www.w3.org/TR/html5/forms.html#attr-input-min
            return isNaN(value) || value >= min ? null : { 'min': { min: min, actual: actual } };
        };
    };
    /**
     * Validator that requires controls to have a value less than a number.
     */
    JsonValidators.max = function (max) {
        if (!hasValue(max)) {
            return JsonValidators.nullValidator;
        }
        return function (control) {
            // don't validate empty values to allow optional controls
            if (isEmpty(control.value) || isEmpty(max)) {
                return null;
            }
            var value = parseFloat(control.value);
            var actual = control.value;
            // Controls with NaN values after parsing should be treated as not having a
            // maximum, per the HTML forms spec: https://www.w3.org/TR/html5/forms.html#attr-input-max
            return isNaN(value) || value <= max ? null : { 'max': { max: max, actual: actual } };
        };
    };
    /**
     * Validator that requires control value to be true.
     */
    JsonValidators.requiredTrue = function (control) {
        if (!control) {
            return JsonValidators.nullValidator;
        }
        return control.value === true ? null : { 'required': true };
    };
    /**
     * Validator that performs email validation.
     */
    JsonValidators.email = function (control) {
        if (!control) {
            return JsonValidators.nullValidator;
        }
        var EMAIL_REGEXP = 
        // tslint:disable-next-line:max-line-length
        /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
        return EMAIL_REGEXP.test(control.value) ? null : { 'email': true };
    };
    return JsonValidators;
}());
export { JsonValidators };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi52YWxpZGF0b3JzLmpzIiwic291cmNlUm9vdCI6Im5nOi8vYW5ndWxhcjYtanNvbi1zY2hlbWEtZm9ybS8iLCJzb3VyY2VzIjpbImxpYi9zaGFyZWQvanNvbi52YWxpZGF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQztBQUNyQyxPQUFPLEVBQ0wsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixZQUFZLEVBQ1osYUFBYSxFQUViLE9BQU8sRUFDUCxRQUFRLEVBQ1IsT0FBTyxFQUNQLFNBQVMsRUFDVCxTQUFTLEVBQ1QsT0FBTyxFQUNQLFFBQVEsRUFDUixRQUFRLEVBQ1IsTUFBTSxFQUdOLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osR0FBRyxFQUNGLE1BQU0sdUJBQXVCLENBQUM7QUFFakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDaEMsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUlyQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBOEVHO0FBQ0g7SUFBQTtJQWd3QkEsQ0FBQztJQTF0QlEsdUJBQVEsR0FBZixVQUFnQixLQUErQjtRQUM3QyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7WUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDO1NBQUU7UUFDMUMsUUFBUSxLQUFLLEVBQUU7WUFDYixLQUFLLElBQUksRUFBRSxtREFBbUQ7Z0JBQzVELE9BQU8sVUFBQyxPQUF3QixFQUFFLE1BQWM7b0JBQWQsdUJBQUEsRUFBQSxjQUFjO29CQUM5QyxJQUFJLE1BQU0sRUFBRTt3QkFBRSxPQUFP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RTtRQUN0RCxJQUFNLFlBQVk7UUFDaEIsMkNBQTJDO1FBQzNDLDRMQUE0TCxDQUFDO1FBQy9MLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDckUsQ0FBQztJQUNILHFCQUFDO0FBQUQsQ0FBQyxBQWh3QkQsSUFnd0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlzRXF1YWwgZnJvbSAnbG9kYXNoL2lzRXF1YWwnO1xuaW1wb3J0IHtcbiAgX2V4ZWN1dGVBc3luY1ZhbGlkYXRvcnMsXG4gIF9leGVjdXRlVmFsaWRhdG9ycyxcbiAgX21lcmdlRXJyb3JzLFxuICBfbWVyZ2VPYmplY3RzLFxuICBBc3luY0lWYWxpZGF0b3JGbixcbiAgZ2V0VHlwZSxcbiAgaGFzVmFsdWUsXG4gIGlzQXJyYXksXG4gIGlzQm9vbGVhbixcbiAgaXNEZWZpbmVkLFxuICBpc0VtcHR5LFxuICBpc051bWJlcixcbiAgaXNTdHJpbmcsXG4gIGlzVHlwZSxcbiAgSVZhbGlkYXRvckZuLFxuICBTY2hlbWFQcmltaXRpdmVUeXBlLFxuICB0b0phdmFTY3JpcHRUeXBlLFxuICB0b09ic2VydmFibGUsXG4gIHhvclxuICB9IGZyb20gJy4vdmFsaWRhdG9yLmZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBBYnN0cmFjdENvbnRyb2wsIFZhbGlkYXRpb25FcnJvcnMsIFZhbGlkYXRvckZuIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgZm9yRWFjaENvcHkgfSBmcm9tICcuL3V0aWxpdHkuZnVuY3Rpb25zJztcbmltcG9ydCB7IGZvcmtKb2luIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBKc29uU2NoZW1hRm9ybWF0TmFtZXMsIGpzb25TY2hlbWFGb3JtYXRUZXN0cyB9IGZyb20gJy4vZm9ybWF0LXJlZ2V4LmNvbnN0YW50cyc7XG5pbXBvcnQgeyBtYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cblxuXG4vKipcbiAqICdKc29uVmFsaWRhdG9ycycgY2xhc3NcbiAqXG4gKiBQcm92aWRlcyBhbiBleHRlbmRlZCBzZXQgb2YgdmFsaWRhdG9ycyB0byBiZSB1c2VkIGJ5IGZvcm0gY29udHJvbHMsXG4gKiBjb21wYXRpYmxlIHdpdGggc3RhbmRhcmQgSlNPTiBTY2hlbWEgdmFsaWRhdGlvbiBvcHRpb25zLlxuICogaHR0cDovL2pzb24tc2NoZW1hLm9yZy9sYXRlc3QvanNvbi1zY2hlbWEtdmFsaWRhdGlvbi5odG1sXG4gKlxuICogTm90ZTogVGhpcyBsaWJyYXJ5IGlzIGRlc2lnbmVkIGFzIGEgZHJvcC1pbiByZXBsYWNlbWVudCBmb3IgdGhlIEFuZ3VsYXJcbiAqIFZhbGlkYXRvcnMgbGlicmFyeSwgYW5kIGV4Y2VwdCBmb3Igb25lIHNtYWxsIGJyZWFraW5nIGNoYW5nZSB0byB0aGUgJ3BhdHRlcm4nXG4gKiB2YWxpZGF0b3IgKGRlc2NyaWJlZCBiZWxvdykgaXQgY2FuIGV2ZW4gYmUgaW1wb3J0ZWQgYXMgYSBzdWJzdGl0dXRlLCBsaWtlIHNvOlxuICpcbiAqICAgaW1wb3J0IHsgSnNvblZhbGlkYXRvcnMgYXMgVmFsaWRhdG9ycyB9IGZyb20gJ2pzb24tdmFsaWRhdG9ycyc7XG4gKlxuICogYW5kIGl0IHNob3VsZCB3b3JrIHdpdGggZXhpc3RpbmcgY29kZSBhcyBhIGNvbXBsZXRlIHJlcGxhY2VtZW50LlxuICpcbiAqIFRoZSBvbmUgZXhjZXB0aW9uIGlzIHRoZSAncGF0dGVybicgdmFsaWRhdG9yLCB3aGljaCBoYXMgYmVlbiBjaGFuZ2VkIHRvXG4gKiBtYXRjaGUgcGFydGlhbCB2YWx1ZXMgYnkgZGVmYXVsdCAodGhlIHN0YW5kYXJkICdwYXR0ZXJuJyB2YWxpZGF0b3Igd3JhcHBlZFxuICogYWxsIHBhdHRlcm5zIGluICdeJyBhbmQgJyQnLCBmb3JjaW5nIHRoZW0gdG8gYWx3YXlzIG1hdGNoIGFuIGVudGlyZSB2YWx1ZSkuXG4gKiBIb3dldmVyLCB0aGUgb2xkIGJlaGF2aW9yIGNhbiBiZSByZXN0b3JlZCBieSBzaW1wbHkgYWRkaW5nICdeJyBhbmQgJyQnXG4gKiBhcm91bmQgeW91ciBwYXR0ZXJucywgb3IgYnkgcGFzc2luZyBhbiBvcHRpb25hbCBzZWNvbmQgcGFyYW1ldGVyIG9mIFRSVUUuXG4gKiBUaGlzIGNoYW5nZSBpcyB0byBtYWtlIHRoZSAncGF0dGVybicgdmFsaWRhdG9yIG1hdGNoIHRoZSBiZWhhdmlvciBvZiBhXG4gKiBKU09OIFNjaGVtYSBwYXR0ZXJuLCB3aGljaCBhbGxvd3MgcGFydGlhbCBtYXRjaGVzLCByYXRoZXIgdGhhbiB0aGUgYmVoYXZpb3JcbiAqIG9mIGFuIEhUTUwgaW5wdXQgY29udHJvbCBwYXR0ZXJuLCB3aGljaCBkb2VzIG5vdC5cbiAqXG4gKiBUaGlzIGxpYnJhcnkgcmVwbGFjZXMgQW5ndWxhcidzIHZhbGlkYXRvcnMgYW5kIGNvbWJpbmF0aW9uIGZ1bmN0aW9uc1xuICogd2l0aCB0aGUgZm9sbG93aW5nIHZhbGlkYXRvcnMgYW5kIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uczpcbiAqXG4gKiBWYWxpZGF0b3JzOlxuICogICBGb3IgYWxsIGZvcm1Db250cm9sczogICAgIHJlcXVpcmVkICgqKSwgdHlwZSwgZW51bSwgY29uc3RcbiAqICAgRm9yIHRleHQgZm9ybUNvbnRyb2xzOiAgICBtaW5MZW5ndGggKCopLCBtYXhMZW5ndGggKCopLCBwYXR0ZXJuICgqKSwgZm9ybWF0XG4gKiAgIEZvciBudW1lcmljIGZvcm1Db250cm9sczogbWF4aW11bSwgZXhjbHVzaXZlTWF4aW11bSxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtLCBleGNsdXNpdmVNaW5pbXVtLCBtdWx0aXBsZU9mXG4gKiAgIEZvciBmb3JtR3JvdXAgb2JqZWN0czogICAgbWluUHJvcGVydGllcywgbWF4UHJvcGVydGllcywgZGVwZW5kZW5jaWVzXG4gKiAgIEZvciBmb3JtQXJyYXkgYXJyYXlzOiAgICAgbWluSXRlbXMsIG1heEl0ZW1zLCB1bmlxdWVJdGVtcywgY29udGFpbnNcbiAqICAgTm90IHVzZWQgYnkgSlNPTiBTY2hlbWE6ICBtaW4gKCopLCBtYXggKCopLCByZXF1aXJlZFRydWUgKCopLCBlbWFpbCAoKilcbiAqIChWYWxpZGF0b3JzIG9yaWdpbmFsbHkgaW5jbHVkZWQgd2l0aCBBbmd1bGFyIGFyZSBtYWtlZCB3aXRoICgqKS4pXG4gKlxuICogTk9URSAvIFRPRE86IFRoZSBkZXBlbmRlbmNpZXMgdmFsaWRhdG9yIGlzIG5vdCBjb21wbGV0ZS5cbiAqIE5PVEUgLyBUT0RPOiBUaGUgY29udGFpbnMgdmFsaWRhdG9yIGlzIG5vdCBjb21wbGV0ZS5cbiAqXG4gKiBWYWxpZGF0b3JzIG5vdCB1c2VkIGJ5IEpTT04gU2NoZW1hIChidXQgaW5jbHVkZWQgZm9yIGNvbXBhdGliaWxpdHkpXG4gKiBhbmQgdGhlaXIgSlNPTiBTY2hlbWEgZXF1aXZhbGVudHM6XG4gKlxuICogICBBbmd1bGFyIHZhbGlkYXRvciB8IEpTT04gU2NoZW1hIGVxdWl2YWxlbnRcbiAqICAgLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAgICAgbWluKG51bWJlcikgICAgIHwgICBtaW5pbXVtKG51bWJlcilcbiAqICAgICBtYXgobnVtYmVyKSAgICAgfCAgIG1heGltdW0obnVtYmVyKVxuICogICAgIHJlcXVpcmVkVHJ1ZSgpICB8ICAgY29uc3QodHJ1ZSlcbiAqICAgICBlbWFpbCgpICAgICAgICAgfCAgIGZvcm1hdCgnZW1haWwnKVxuICpcbiAqIFZhbGlkYXRvciB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbnM6XG4gKiAgIGNvbXBvc2VBbnlPZiwgY29tcG9zZU9uZU9mLCBjb21wb3NlQWxsT2YsIGNvbXBvc2VOb3RcbiAqIChBbmd1bGFyJ3Mgb3JpZ2luYWwgY29tYmluYXRpb24gZnVuY2l0b24sICdjb21wb3NlJywgaXMgYWxzbyBpbmNsdWRlZCBmb3JcbiAqIGJhY2t3YXJkIGNvbXBhdGliaWxpdHksIHRob3VnaCBpdCBpcyBmdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBjb21wb3NlQWxsT2YsXG4gKiBhc3NpZGUgZnJvbSBpdHMgbW9yZSBnZW5lcmljIGVycm9yIG1lc3NhZ2UuKVxuICpcbiAqIEFsbCB2YWxpZGF0b3JzIGhhdmUgYWxzbyBiZWVuIGV4dGVuZGVkIHRvIGFjY2VwdCBhbiBvcHRpb25hbCBzZWNvbmQgYXJndW1lbnRcbiAqIHdoaWNoLCBpZiBwYXNzZWQgYSBUUlVFIHZhbHVlLCBjYXVzZXMgdGhlIHZhbGlkYXRvciB0byBwZXJmb3JtIHRoZSBvcHBvc2l0ZVxuICogb2YgaXRzIG9yaWdpbmFsIGZpbmN0aW9uLiAoVGhpcyBpcyB1c2VkIGludGVybmFsbHkgdG8gZW5hYmxlICdub3QnIGFuZFxuICogJ2NvbXBvc2VPbmVPZicgdG8gZnVuY3Rpb24gYW5kIHJldHVybiB1c2VmdWwgZXJyb3IgbWVzc2FnZXMuKVxuICpcbiAqIFRoZSAncmVxdWlyZWQnIHZhbGlkYXRvciBoYXMgYWxzbyBiZWVuIG92ZXJsb2FkZWQgc28gdGhhdCBpZiBjYWxsZWQgd2l0aFxuICogYSBib29sZWFuIHBhcmFtZXRlciAob3Igbm8gcGFyYW1ldGVycykgaXQgcmV0dXJucyB0aGUgb3JpZ2luYWwgdmFsaWRhdG9yXG4gKiBmdW5jdGlvbiAocmF0aGVyIHRoYW4gZXhlY3V0aW5nIGl0KS4gSG93ZXZlciwgaWYgaXQgaXMgY2FsbGVkIHdpdGggYW5cbiAqIEFic3RyYWN0Q29udHJvbCBwYXJhbWV0ZXIgKGFzIHdhcyBwcmV2aW91c2x5IHJlcXVpcmVkKSwgaXQgYmVoYXZlc1xuICogZXhhY3RseSBhcyBiZWZvcmUuXG4gKlxuICogVGhpcyBlbmFibGVzIGFsbCB2YWxpZGF0b3JzIChpbmNsdWRpbmcgJ3JlcXVpcmVkJykgdG8gYmUgY29uc3RydWN0ZWQgaW5cbiAqIGV4YWN0bHkgdGhlIHNhbWUgd2F5LCBzbyB0aGV5IGNhbiBiZSBhdXRvbWF0aWNhbGx5IGFwcGxpZWQgdXNpbmcgdGhlXG4gKiBlcXVpdmFsZW50IGtleSBuYW1lcyBhbmQgdmFsdWVzIHRha2VuIGRpcmVjdGx5IGZyb20gYSBKU09OIFNjaGVtYS5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIHBhcnRpYWxseSBkZXJpdmVkIGZyb20gQW5ndWxhcixcbiAqIHdoaWNoIGlzIENvcHlyaWdodCAoYykgMjAxNC0yMDE3IEdvb2dsZSwgSW5jLlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgdGhlcmVmb3JlIGdvdmVybmVkIGJ5IHRoZSBzYW1lIE1JVC1zdHlsZSBsaWNlbnNlXG4gKiB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKlxuICogT3JpZ2luYWwgQW5ndWxhciBWYWxpZGF0b3JzOlxuICogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9ibG9iL21hc3Rlci9wYWNrYWdlcy9mb3Jtcy9zcmMvdmFsaWRhdG9ycy50c1xuICovXG5leHBvcnQgY2xhc3MgSnNvblZhbGlkYXRvcnMge1xuXG4gIC8qKlxuICAgKiBWYWxpZGF0b3IgZnVuY3Rpb25zOlxuICAgKlxuICAgKiBGb3IgYWxsIGZvcm1Db250cm9sczogICAgIHJlcXVpcmVkLCB0eXBlLCBlbnVtLCBjb25zdFxuICAgKiBGb3IgdGV4dCBmb3JtQ29udHJvbHM6ICAgIG1pbkxlbmd0aCwgbWF4TGVuZ3RoLCBwYXR0ZXJuLCBmb3JtYXRcbiAgICogRm9yIG51bWVyaWMgZm9ybUNvbnRyb2xzOiBtYXhpbXVtLCBleGNsdXNpdmVNYXhpbXVtLFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW0sIGV4Y2x1c2l2ZU1pbmltdW0sIG11bHRpcGxlT2ZcbiAgICogRm9yIGZvcm1Hcm91cCBvYmplY3RzOiAgICBtaW5Qcm9wZXJ0aWVzLCBtYXhQcm9wZXJ0aWVzLCBkZXBlbmRlbmNpZXNcbiAgICogRm9yIGZvcm1BcnJheSBhcnJheXM6ICAgICBtaW5JdGVtcywgbWF4SXRlbXMsIHVuaXF1ZUl0ZW1zLCBjb250YWluc1xuICAgKlxuICAgKiBUT0RPOiBmaW5pc2ggZGVwZW5kZW5jaWVzIHZhbGlkYXRvclxuICAgKi9cblxuICAvKipcbiAgICogJ3JlcXVpcmVkJyB2YWxpZGF0b3JcbiAgICpcbiAgICogVGhpcyB2YWxpZGF0b3IgaXMgb3ZlcmxvYWRlZCwgY29tcGFyZWQgdG8gdGhlIGRlZmF1bHQgcmVxdWlyZWQgdmFsaWRhdG9yLlxuICAgKiBJZiBjYWxsZWQgd2l0aCBubyBwYXJhbWV0ZXJzLCBvciBUUlVFLCB0aGlzIHZhbGlkYXRvciByZXR1cm5zIHRoZVxuICAgKiAncmVxdWlyZWQnIHZhbGlkYXRvciBmdW5jdGlvbiAocmF0aGVyIHRoYW4gZXhlY3V0aW5nIGl0KS4gVGhpcyBtYXRjaGVzXG4gICAqIHRoZSBiZWhhdmlvciBvZiBhbGwgb3RoZXIgdmFsaWRhdG9ycyBpbiB0aGlzIGxpYnJhcnkuXG4gICAqXG4gICAqIElmIHRoaXMgdmFsaWRhdG9yIGlzIGNhbGxlZCB3aXRoIGFuIEFic3RyYWN0Q29udHJvbCBwYXJhbWV0ZXJcbiAgICogKGFzIHdhcyBwcmV2aW91c2x5IHJlcXVpcmVkKSBpdCBiZWhhdmVzIHRoZSBzYW1lIGFzIEFuZ3VsYXIncyBkZWZhdWx0XG4gICAqIHJlcXVpcmVkIHZhbGlkYXRvciwgYW5kIHJldHVybnMgYW4gZXJyb3IgaWYgdGhlIGNvbnRyb2wgaXMgZW1wdHkuXG4gICAqXG4gICAqIE9sZCBiZWhhdmlvcjogKGlmIGlucHV0IHR5cGUgPSBBYnN0cmFjdENvbnRyb2wpXG4gICAqIC8vIHtBYnN0cmFjdENvbnRyb2x9IGNvbnRyb2wgLSByZXF1aXJlZCBjb250cm9sXG4gICAqIC8vIHt7W2tleTogc3RyaW5nXTogYm9vbGVhbn19IC0gcmV0dXJucyBlcnJvciBtZXNzYWdlIGlmIG5vIGlucHV0XG4gICAqXG4gICAqIE5ldyBiZWhhdmlvcjogKGlmIG5vIGlucHV0LCBvciBpbnB1dCB0eXBlID0gYm9vbGVhbilcbiAgICogLy8ge2Jvb2xlYW4gPSB0cnVlfSByZXF1aXJlZD8gLSB0cnVlIHRvIHZhbGlkYXRlLCBmYWxzZSB0byBkaXNhYmxlXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59IC0gcmV0dXJucyB0aGUgJ3JlcXVpcmVkJyB2YWxpZGF0b3IgZnVuY3Rpb24gaXRzZWxmXG4gICAqL1xuICBzdGF0aWMgcmVxdWlyZWQoaW5wdXQ6IEFic3RyYWN0Q29udHJvbCk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbDtcbiAgc3RhdGljIHJlcXVpcmVkKGlucHV0PzogYm9vbGVhbik6IElWYWxpZGF0b3JGbjtcblxuICBzdGF0aWMgcmVxdWlyZWQoaW5wdXQ/OiBBYnN0cmFjdENvbnRyb2x8Ym9vbGVhbik6IFZhbGlkYXRpb25FcnJvcnN8bnVsbHxJVmFsaWRhdG9yRm4ge1xuICAgIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkKSB7IGlucHV0ID0gdHJ1ZTsgfVxuICAgIHN3aXRjaCAoaW5wdXQpIHtcbiAgICAgIGNhc2UgdHJ1ZTogLy8gUmV0dXJuIHJlcXVpcmVkIGZ1bmN0aW9uIChkbyBub3QgZXhlY3V0ZSBpdCB5ZXQpXG4gICAgICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICAgICAgaWYgKGludmVydCkgeyByZXR1cm4gbnVsbDsgfSAvLyBpZiBub3QgcmVxdWlyZWQsIGFsd2F5cyByZXR1cm4gdmFsaWRcbiAgICAgICAgICByZXR1cm4gaGFzVmFsdWUoY29udHJvbC52YWx1ZSkgPyBudWxsIDogeyAncmVxdWlyZWQnOiB0cnVlIH07XG4gICAgICAgIH07XG4gICAgICBjYXNlIGZhbHNlOiAvLyBEbyBub3RoaW5nIChpZiBmaWVsZCBpcyBub3QgcmVxdWlyZWQsIGl0IGlzIGFsd2F5cyB2YWxpZClcbiAgICAgICAgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7XG4gICAgICBkZWZhdWx0OiAvLyBFeGVjdXRlIHJlcXVpcmVkIGZ1bmN0aW9uXG4gICAgICAgIHJldHVybiBoYXNWYWx1ZSgoPEFic3RyYWN0Q29udHJvbD5pbnB1dCkudmFsdWUpID8gbnVsbCA6IHsgJ3JlcXVpcmVkJzogdHJ1ZSB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiAndHlwZScgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIGEgY29udHJvbCB0byBvbmx5IGFjY2VwdCB2YWx1ZXMgb2YgYSBzcGVjaWZpZWQgdHlwZSxcbiAgICogb3Igb25lIG9mIGFuIGFycmF5IG9mIHR5cGVzLlxuICAgKlxuICAgKiBOb3RlOiBTY2hlbWFQcmltaXRpdmVUeXBlID0gJ3N0cmluZyd8J251bWJlcid8J2ludGVnZXInfCdib29sZWFuJ3wnbnVsbCdcbiAgICpcbiAgICogLy8ge1NjaGVtYVByaW1pdGl2ZVR5cGV8U2NoZW1hUHJpbWl0aXZlVHlwZVtdfSB0eXBlIC0gdHlwZShzKSB0byBhY2NlcHRcbiAgICogLy8ge0lWYWxpZGF0b3JGbn1cbiAgICovXG4gIHN0YXRpYyB0eXBlKHJlcXVpcmVkVHlwZTogU2NoZW1hUHJpbWl0aXZlVHlwZXxTY2hlbWFQcmltaXRpdmVUeXBlW10pOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUocmVxdWlyZWRUeXBlKSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY29uc3QgY3VycmVudFZhbHVlOiBhbnkgPSBjb250cm9sLnZhbHVlO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGlzQXJyYXkocmVxdWlyZWRUeXBlKSA/XG4gICAgICAgICg8U2NoZW1hUHJpbWl0aXZlVHlwZVtdPnJlcXVpcmVkVHlwZSkuc29tZSh0eXBlID0+IGlzVHlwZShjdXJyZW50VmFsdWUsIHR5cGUpKSA6XG4gICAgICAgIGlzVHlwZShjdXJyZW50VmFsdWUsIDxTY2hlbWFQcmltaXRpdmVUeXBlPnJlcXVpcmVkVHlwZSk7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAndHlwZSc6IHsgcmVxdWlyZWRUeXBlLCBjdXJyZW50VmFsdWUgfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ2VudW0nIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wgdG8gaGF2ZSBhIHZhbHVlIGZyb20gYW4gZW51bWVyYXRlZCBsaXN0IG9mIHZhbHVlcy5cbiAgICpcbiAgICogQ29udmVydHMgdHlwZXMgYXMgbmVlZGVkIHRvIGFsbG93IHN0cmluZyBpbnB1dHMgdG8gc3RpbGwgY29ycmVjdGx5XG4gICAqIG1hdGNoIG51bWJlciwgYm9vbGVhbiwgYW5kIG51bGwgZW51bSB2YWx1ZXMuXG4gICAqXG4gICAqIC8vIHthbnlbXX0gYWxsb3dlZFZhbHVlcyAtIGFycmF5IG9mIGFjY2VwdGFibGUgdmFsdWVzXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgZW51bShhbGxvd2VkVmFsdWVzOiBhbnlbXSk6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFpc0FycmF5KGFsbG93ZWRWYWx1ZXMpKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+IHtcbiAgICAgIGlmIChpc0VtcHR5KGNvbnRyb2wudmFsdWUpKSB7IHJldHVybiBudWxsOyB9XG4gICAgICBjb25zdCBjdXJyZW50VmFsdWU6IGFueSA9IGNvbnRyb2wudmFsdWU7XG4gICAgICBjb25zdCBpc0VxdWFsVmFsID0gKGVudW1WYWx1ZSwgaW5wdXRWYWx1ZSkgPT5cbiAgICAgICAgZW51bVZhbHVlID09PSBpbnB1dFZhbHVlIHx8XG4gICAgICAgIChpc051bWJlcihlbnVtVmFsdWUpICYmICtpbnB1dFZhbHVlID09PSArZW51bVZhbHVlKSB8fFxuICAgICAgICAoaXNCb29sZWFuKGVudW1WYWx1ZSwgJ3N0cmljdCcpICYmXG4gICAgICAgICAgdG9KYXZhU2NyaXB0VHlwZShpbnB1dFZhbHVlLCAnYm9vbGVhbicpID09PSBlbnVtVmFsdWUpIHx8XG4gICAgICAgIChlbnVtVmFsdWUgPT09IG51bGwgJiYgIWhhc1ZhbHVlKGlucHV0VmFsdWUpKSB8fFxuICAgICAgICBpc0VxdWFsKGVudW1WYWx1ZSwgaW5wdXRWYWx1ZSk7XG4gICAgICBjb25zdCBpc1ZhbGlkID0gaXNBcnJheShjdXJyZW50VmFsdWUpID9cbiAgICAgICAgY3VycmVudFZhbHVlLmV2ZXJ5KGlucHV0VmFsdWUgPT4gYWxsb3dlZFZhbHVlcy5zb21lKGVudW1WYWx1ZSA9PlxuICAgICAgICAgIGlzRXF1YWxWYWwoZW51bVZhbHVlLCBpbnB1dFZhbHVlKVxuICAgICAgICApKSA6XG4gICAgICAgIGFsbG93ZWRWYWx1ZXMuc29tZShlbnVtVmFsdWUgPT4gaXNFcXVhbFZhbChlbnVtVmFsdWUsIGN1cnJlbnRWYWx1ZSkpO1xuICAgICAgcmV0dXJuIHhvcihpc1ZhbGlkLCBpbnZlcnQpID9cbiAgICAgICAgbnVsbCA6IHsgJ2VudW0nOiB7IGFsbG93ZWRWYWx1ZXMsIGN1cnJlbnRWYWx1ZSB9IH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnY29uc3QnIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wgdG8gaGF2ZSBhIHNwZWNpZmljIHZhbHVlLlxuICAgKlxuICAgKiBDb252ZXJ0cyB0eXBlcyBhcyBuZWVkZWQgdG8gYWxsb3cgc3RyaW5nIGlucHV0cyB0byBzdGlsbCBjb3JyZWN0bHlcbiAgICogbWF0Y2ggbnVtYmVyLCBib29sZWFuLCBhbmQgbnVsbCB2YWx1ZXMuXG4gICAqXG4gICAqIFRPRE86IG1vZGlmeSB0byB3b3JrIHdpdGggb2JqZWN0c1xuICAgKlxuICAgKiAvLyB7YW55W119IHJlcXVpcmVkVmFsdWUgLSByZXF1aXJlZCB2YWx1ZVxuICAgKiAvLyB7SVZhbGlkYXRvckZufVxuICAgKi9cbiAgc3RhdGljIGNvbnN0KHJlcXVpcmVkVmFsdWU6IGFueSk6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFoYXNWYWx1ZShyZXF1aXJlZFZhbHVlKSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY29uc3QgY3VycmVudFZhbHVlOiBhbnkgPSBjb250cm9sLnZhbHVlO1xuICAgICAgY29uc3QgaXNFcXVhbFZhbCA9IChjb25zdFZhbHVlLCBpbnB1dFZhbHVlKSA9PlxuICAgICAgICBjb25zdFZhbHVlID09PSBpbnB1dFZhbHVlIHx8XG4gICAgICAgIGlzTnVtYmVyKGNvbnN0VmFsdWUpICYmICtpbnB1dFZhbHVlID09PSArY29uc3RWYWx1ZSB8fFxuICAgICAgICBpc0Jvb2xlYW4oY29uc3RWYWx1ZSwgJ3N0cmljdCcpICYmXG4gICAgICAgICAgdG9KYXZhU2NyaXB0VHlwZShpbnB1dFZhbHVlLCAnYm9vbGVhbicpID09PSBjb25zdFZhbHVlIHx8XG4gICAgICAgIGNvbnN0VmFsdWUgPT09IG51bGwgJiYgIWhhc1ZhbHVlKGlucHV0VmFsdWUpO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGlzRXF1YWxWYWwocmVxdWlyZWRWYWx1ZSwgY3VycmVudFZhbHVlKTtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdjb25zdCc6IHsgcmVxdWlyZWRWYWx1ZSwgY3VycmVudFZhbHVlIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdtaW5MZW5ndGgnIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wncyB0ZXh0IHZhbHVlIHRvIGJlIGdyZWF0ZXIgdGhhbiBhIHNwZWNpZmllZCBsZW5ndGguXG4gICAqXG4gICAqIC8vIHtudW1iZXJ9IG1pbmltdW1MZW5ndGggLSBtaW5pbXVtIGFsbG93ZWQgc3RyaW5nIGxlbmd0aFxuICAgKiAvLyB7Ym9vbGVhbiA9IGZhbHNlfSBpbnZlcnQgLSBpbnN0ZWFkIHJldHVybiBlcnJvciBvYmplY3Qgb25seSBpZiB2YWxpZFxuICAgKiAvLyB7SVZhbGlkYXRvckZufVxuICAgKi9cbiAgc3RhdGljIG1pbkxlbmd0aChtaW5pbXVtTGVuZ3RoOiBudW1iZXIpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUobWluaW11bUxlbmd0aCkpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IGN1cnJlbnRMZW5ndGggPSBpc1N0cmluZyhjb250cm9sLnZhbHVlKSA/IGNvbnRyb2wudmFsdWUubGVuZ3RoIDogMDtcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSBjdXJyZW50TGVuZ3RoID49IG1pbmltdW1MZW5ndGg7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAnbWluTGVuZ3RoJzogeyBtaW5pbXVtTGVuZ3RoLCBjdXJyZW50TGVuZ3RoIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdtYXhMZW5ndGgnIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wncyB0ZXh0IHZhbHVlIHRvIGJlIGxlc3MgdGhhbiBhIHNwZWNpZmllZCBsZW5ndGguXG4gICAqXG4gICAqIC8vIHtudW1iZXJ9IG1heGltdW1MZW5ndGggLSBtYXhpbXVtIGFsbG93ZWQgc3RyaW5nIGxlbmd0aFxuICAgKiAvLyB7Ym9vbGVhbiA9IGZhbHNlfSBpbnZlcnQgLSBpbnN0ZWFkIHJldHVybiBlcnJvciBvYmplY3Qgb25seSBpZiB2YWxpZFxuICAgKiAvLyB7SVZhbGlkYXRvckZufVxuICAgKi9cbiAgc3RhdGljIG1heExlbmd0aChtYXhpbXVtTGVuZ3RoOiBudW1iZXIpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUobWF4aW11bUxlbmd0aCkpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgY29uc3QgY3VycmVudExlbmd0aCA9IGlzU3RyaW5nKGNvbnRyb2wudmFsdWUpID8gY29udHJvbC52YWx1ZS5sZW5ndGggOiAwO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGN1cnJlbnRMZW5ndGggPD0gbWF4aW11bUxlbmd0aDtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdtYXhMZW5ndGgnOiB7IG1heGltdW1MZW5ndGgsIGN1cnJlbnRMZW5ndGggfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ3BhdHRlcm4nIHZhbGlkYXRvclxuICAgKlxuICAgKiBOb3RlOiBOT1QgdGhlIHNhbWUgYXMgQW5ndWxhcidzIGRlZmF1bHQgcGF0dGVybiB2YWxpZGF0b3IuXG4gICAqXG4gICAqIFJlcXVpcmVzIGEgY29udHJvbCdzIHZhbHVlIHRvIG1hdGNoIGEgc3BlY2lmaWVkIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuLlxuICAgKlxuICAgKiBUaGlzIHZhbGlkYXRvciBjaGFuZ2VzIHRoZSBiZWhhdmlvciBvZiBkZWZhdWx0IHBhdHRlcm4gdmFsaWRhdG9yXG4gICAqIGJ5IHJlcGxhY2luZyBSZWdFeHAoYF4ke3BhdHRlcm59JGApIHdpdGggUmVnRXhwKGAke3BhdHRlcm59YCksXG4gICAqIHdoaWNoIGFsbG93cyBmb3IgcGFydGlhbCBtYXRjaGVzLlxuICAgKlxuICAgKiBUbyByZXR1cm4gdG8gdGhlIGRlZmF1bHQgZnVuY2l0b25hbGl0eSwgYW5kIG1hdGNoIHRoZSBlbnRpcmUgc3RyaW5nLFxuICAgKiBwYXNzIFRSVUUgYXMgdGhlIG9wdGlvbmFsIHNlY29uZCBwYXJhbWV0ZXIuXG4gICAqXG4gICAqIC8vIHtzdHJpbmd9IHBhdHRlcm4gLSByZWd1bGFyIGV4cHJlc3Npb24gcGF0dGVyblxuICAgKiAvLyB7Ym9vbGVhbiA9IGZhbHNlfSB3aG9sZVN0cmluZyAtIG1hdGNoIHdob2xlIHZhbHVlIHN0cmluZz9cbiAgICogLy8ge0lWYWxpZGF0b3JGbn1cbiAgICovXG4gIHN0YXRpYyBwYXR0ZXJuKHBhdHRlcm46IHN0cmluZ3xSZWdFeHAsIHdob2xlU3RyaW5nID0gZmFsc2UpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUocGF0dGVybikpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGxldCByZWdleDogUmVnRXhwO1xuICAgICAgbGV0IHJlcXVpcmVkUGF0dGVybjogc3RyaW5nO1xuICAgICAgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXF1aXJlZFBhdHRlcm4gPSAod2hvbGVTdHJpbmcpID8gYF4ke3BhdHRlcm59JGAgOiBwYXR0ZXJuO1xuICAgICAgICByZWdleCA9IG5ldyBSZWdFeHAocmVxdWlyZWRQYXR0ZXJuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcXVpcmVkUGF0dGVybiA9IHBhdHRlcm4udG9TdHJpbmcoKTtcbiAgICAgICAgcmVnZXggPSBwYXR0ZXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgY3VycmVudFZhbHVlOiBzdHJpbmcgPSBjb250cm9sLnZhbHVlO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGlzU3RyaW5nKGN1cnJlbnRWYWx1ZSkgPyByZWdleC50ZXN0KGN1cnJlbnRWYWx1ZSkgOiBmYWxzZTtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdwYXR0ZXJuJzogeyByZXF1aXJlZFBhdHRlcm4sIGN1cnJlbnRWYWx1ZSB9IH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnZm9ybWF0JyB2YWxpZGF0b3JcbiAgICpcbiAgICogUmVxdWlyZXMgYSBjb250cm9sIHRvIGhhdmUgYSB2YWx1ZSBvZiBhIGNlcnRhaW4gZm9ybWF0LlxuICAgKlxuICAgKiBUaGlzIHZhbGlkYXRvciBjdXJyZW50bHkgY2hlY2tzIHRoZSBmb2xsb3dpbmcgZm9ybXN0czpcbiAgICogICBkYXRlLCB0aW1lLCBkYXRlLXRpbWUsIGVtYWlsLCBob3N0bmFtZSwgaXB2NCwgaXB2NixcbiAgICogICB1cmksIHVyaS1yZWZlcmVuY2UsIHVyaS10ZW1wbGF0ZSwgdXJsLCB1dWlkLCBjb2xvcixcbiAgICogICBqc29uLXBvaW50ZXIsIHJlbGF0aXZlLWpzb24tcG9pbnRlciwgcmVnZXhcbiAgICpcbiAgICogRmFzdCBmb3JtYXQgcmVndWxhciBleHByZXNzaW9ucyBjb3BpZWQgZnJvbSBBSlY6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9lcG9iZXJlemtpbi9hanYvYmxvYi9tYXN0ZXIvbGliL2NvbXBpbGUvZm9ybWF0cy5qc1xuICAgKlxuICAgKiAvLyB7SnNvblNjaGVtYUZvcm1hdE5hbWVzfSByZXF1aXJlZEZvcm1hdCAtIGZvcm1hdCB0byBjaGVja1xuICAgKiAvLyB7SVZhbGlkYXRvckZufVxuICAgKi9cbiAgc3RhdGljIGZvcm1hdChyZXF1aXJlZEZvcm1hdDogSnNvblNjaGVtYUZvcm1hdE5hbWVzKTogSVZhbGlkYXRvckZuIHtcbiAgICBpZiAoIWhhc1ZhbHVlKHJlcXVpcmVkRm9ybWF0KSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgbGV0IGlzVmFsaWQ6IGJvb2xlYW47XG4gICAgICBjb25zdCBjdXJyZW50VmFsdWU6IHN0cmluZ3xEYXRlID0gY29udHJvbC52YWx1ZTtcbiAgICAgIGlmIChpc1N0cmluZyhjdXJyZW50VmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdFRlc3Q6IEZ1bmN0aW9ufFJlZ0V4cCA9IGpzb25TY2hlbWFGb3JtYXRUZXN0c1tyZXF1aXJlZEZvcm1hdF07XG4gICAgICAgIGlmICh0eXBlb2YgZm9ybWF0VGVzdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBpc1ZhbGlkID0gKDxSZWdFeHA+Zm9ybWF0VGVzdCkudGVzdCg8c3RyaW5nPmN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZvcm1hdFRlc3QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBpc1ZhbGlkID0gKDxGdW5jdGlvbj5mb3JtYXRUZXN0KSg8c3RyaW5nPmN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihgZm9ybWF0IHZhbGlkYXRvciBlcnJvcjogXCIke3JlcXVpcmVkRm9ybWF0fVwiIGlzIG5vdCBhIHJlY29nbml6ZWQgZm9ybWF0LmApO1xuICAgICAgICAgIGlzVmFsaWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBbGxvdyBKYXZhU2NyaXB0IERhdGUgb2JqZWN0c1xuICAgICAgICBpc1ZhbGlkID0gWydkYXRlJywgJ3RpbWUnLCAnZGF0ZS10aW1lJ10uaW5jbHVkZXMocmVxdWlyZWRGb3JtYXQpICYmXG4gICAgICAgICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGN1cnJlbnRWYWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdmb3JtYXQnOiB7IHJlcXVpcmVkRm9ybWF0LCBjdXJyZW50VmFsdWUgfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ21pbmltdW0nIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wncyBudW1lcmljIHZhbHVlIHRvIGJlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1xuICAgKiBhIG1pbmltdW0gYW1vdW50LlxuICAgKlxuICAgKiBBbnkgbm9uLW51bWVyaWMgdmFsdWUgaXMgYWxzbyB2YWxpZCAoYWNjb3JkaW5nIHRvIHRoZSBIVE1MIGZvcm1zIHNwZWMsXG4gICAqIGEgbm9uLW51bWVyaWMgdmFsdWUgZG9lc24ndCBoYXZlIGEgbWluaW11bSkuXG4gICAqIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9odG1sNS9mb3Jtcy5odG1sI2F0dHItaW5wdXQtbWF4XG4gICAqXG4gICAqIC8vIHtudW1iZXJ9IG1pbmltdW0gLSBtaW5pbXVtIGFsbG93ZWQgdmFsdWVcbiAgICogLy8ge0lWYWxpZGF0b3JGbn1cbiAgICovXG4gIHN0YXRpYyBtaW5pbXVtKG1pbmltdW1WYWx1ZTogbnVtYmVyKTogSVZhbGlkYXRvckZuIHtcbiAgICBpZiAoIWhhc1ZhbHVlKG1pbmltdW1WYWx1ZSkpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGNvbnRyb2wudmFsdWU7XG4gICAgICBjb25zdCBpc1ZhbGlkID0gIWlzTnVtYmVyKGN1cnJlbnRWYWx1ZSkgfHwgY3VycmVudFZhbHVlID49IG1pbmltdW1WYWx1ZTtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdtaW5pbXVtJzogeyBtaW5pbXVtVmFsdWUsIGN1cnJlbnRWYWx1ZSB9IH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnZXhjbHVzaXZlTWluaW11bScgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIGEgY29udHJvbCdzIG51bWVyaWMgdmFsdWUgdG8gYmUgbGVzcyB0aGFuIGEgbWF4aW11bSBhbW91bnQuXG4gICAqXG4gICAqIEFueSBub24tbnVtZXJpYyB2YWx1ZSBpcyBhbHNvIHZhbGlkIChhY2NvcmRpbmcgdG8gdGhlIEhUTUwgZm9ybXMgc3BlYyxcbiAgICogYSBub24tbnVtZXJpYyB2YWx1ZSBkb2Vzbid0IGhhdmUgYSBtYXhpbXVtKS5cbiAgICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L2Zvcm1zLmh0bWwjYXR0ci1pbnB1dC1tYXhcbiAgICpcbiAgICogLy8ge251bWJlcn0gZXhjbHVzaXZlTWluaW11bVZhbHVlIC0gbWF4aW11bSBhbGxvd2VkIHZhbHVlXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgZXhjbHVzaXZlTWluaW11bShleGNsdXNpdmVNaW5pbXVtVmFsdWU6IG51bWJlcik6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFoYXNWYWx1ZShleGNsdXNpdmVNaW5pbXVtVmFsdWUpKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+IHtcbiAgICAgIGlmIChpc0VtcHR5KGNvbnRyb2wudmFsdWUpKSB7IHJldHVybiBudWxsOyB9XG4gICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBjb250cm9sLnZhbHVlO1xuICAgICAgY29uc3QgaXNWYWxpZCA9ICFpc051bWJlcihjdXJyZW50VmFsdWUpIHx8ICtjdXJyZW50VmFsdWUgPCBleGNsdXNpdmVNaW5pbXVtVmFsdWU7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAnZXhjbHVzaXZlTWluaW11bSc6IHsgZXhjbHVzaXZlTWluaW11bVZhbHVlLCBjdXJyZW50VmFsdWUgfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ21heGltdW0nIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wncyBudW1lcmljIHZhbHVlIHRvIGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0b1xuICAgKiBhIG1heGltdW0gYW1vdW50LlxuICAgKlxuICAgKiBBbnkgbm9uLW51bWVyaWMgdmFsdWUgaXMgYWxzbyB2YWxpZCAoYWNjb3JkaW5nIHRvIHRoZSBIVE1MIGZvcm1zIHNwZWMsXG4gICAqIGEgbm9uLW51bWVyaWMgdmFsdWUgZG9lc24ndCBoYXZlIGEgbWF4aW11bSkuXG4gICAqIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9odG1sNS9mb3Jtcy5odG1sI2F0dHItaW5wdXQtbWF4XG4gICAqXG4gICAqIC8vIHtudW1iZXJ9IG1heGltdW1WYWx1ZSAtIG1heGltdW0gYWxsb3dlZCB2YWx1ZVxuICAgKiAvLyB7SVZhbGlkYXRvckZufVxuICAgKi9cbiAgc3RhdGljIG1heGltdW0obWF4aW11bVZhbHVlOiBudW1iZXIpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUobWF4aW11bVZhbHVlKSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY29udHJvbC52YWx1ZTtcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSAhaXNOdW1iZXIoY3VycmVudFZhbHVlKSB8fCArY3VycmVudFZhbHVlIDw9IG1heGltdW1WYWx1ZTtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdtYXhpbXVtJzogeyBtYXhpbXVtVmFsdWUsIGN1cnJlbnRWYWx1ZSB9IH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnZXhjbHVzaXZlTWF4aW11bScgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIGEgY29udHJvbCdzIG51bWVyaWMgdmFsdWUgdG8gYmUgbGVzcyB0aGFuIGEgbWF4aW11bSBhbW91bnQuXG4gICAqXG4gICAqIEFueSBub24tbnVtZXJpYyB2YWx1ZSBpcyBhbHNvIHZhbGlkIChhY2NvcmRpbmcgdG8gdGhlIEhUTUwgZm9ybXMgc3BlYyxcbiAgICogYSBub24tbnVtZXJpYyB2YWx1ZSBkb2Vzbid0IGhhdmUgYSBtYXhpbXVtKS5cbiAgICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L2Zvcm1zLmh0bWwjYXR0ci1pbnB1dC1tYXhcbiAgICpcbiAgICogLy8ge251bWJlcn0gZXhjbHVzaXZlTWF4aW11bVZhbHVlIC0gbWF4aW11bSBhbGxvd2VkIHZhbHVlXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgZXhjbHVzaXZlTWF4aW11bShleGNsdXNpdmVNYXhpbXVtVmFsdWU6IG51bWJlcik6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFoYXNWYWx1ZShleGNsdXNpdmVNYXhpbXVtVmFsdWUpKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+IHtcbiAgICAgIGlmIChpc0VtcHR5KGNvbnRyb2wudmFsdWUpKSB7IHJldHVybiBudWxsOyB9XG4gICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBjb250cm9sLnZhbHVlO1xuICAgICAgY29uc3QgaXNWYWxpZCA9ICFpc051bWJlcihjdXJyZW50VmFsdWUpIHx8ICtjdXJyZW50VmFsdWUgPCBleGNsdXNpdmVNYXhpbXVtVmFsdWU7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAnZXhjbHVzaXZlTWF4aW11bSc6IHsgZXhjbHVzaXZlTWF4aW11bVZhbHVlLCBjdXJyZW50VmFsdWUgfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ211bHRpcGxlT2YnIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGNvbnRyb2wgdG8gaGF2ZSBhIG51bWVyaWMgdmFsdWUgdGhhdCBpcyBhIG11bHRpcGxlXG4gICAqIG9mIGEgc3BlY2lmaWVkIG51bWJlci5cbiAgICpcbiAgICogLy8ge251bWJlcn0gbXVsdGlwbGVPZlZhbHVlIC0gbnVtYmVyIHZhbHVlIG11c3QgYmUgYSBtdWx0aXBsZSBvZlxuICAgKiAvLyB7SVZhbGlkYXRvckZufVxuICAgKi9cbiAgc3RhdGljIG11bHRpcGxlT2YobXVsdGlwbGVPZlZhbHVlOiBudW1iZXIpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUobXVsdGlwbGVPZlZhbHVlKSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY29udHJvbC52YWx1ZTtcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSBpc051bWJlcihjdXJyZW50VmFsdWUpICYmXG4gICAgICAgIGN1cnJlbnRWYWx1ZSAlIG11bHRpcGxlT2ZWYWx1ZSA9PT0gMDtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdtdWx0aXBsZU9mJzogeyBtdWx0aXBsZU9mVmFsdWUsIGN1cnJlbnRWYWx1ZSB9IH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnbWluUHJvcGVydGllcycgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIGEgZm9ybSBncm91cCB0byBoYXZlIGEgbWluaW11bSBudW1iZXIgb2YgcHJvcGVydGllcyAoaS5lLiBoYXZlXG4gICAqIHZhbHVlcyBlbnRlcmVkIGluIGEgbWluaW11bSBudW1iZXIgb2YgY29udHJvbHMgd2l0aGluIHRoZSBncm91cCkuXG4gICAqXG4gICAqIC8vIHtudW1iZXJ9IG1pbmltdW1Qcm9wZXJ0aWVzIC0gbWluaW11bSBudW1iZXIgb2YgcHJvcGVydGllcyBhbGxvd2VkXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgbWluUHJvcGVydGllcyhtaW5pbXVtUHJvcGVydGllczogbnVtYmVyKTogSVZhbGlkYXRvckZuIHtcbiAgICBpZiAoIWhhc1ZhbHVlKG1pbmltdW1Qcm9wZXJ0aWVzKSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY29uc3QgY3VycmVudFByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhjb250cm9sLnZhbHVlKS5sZW5ndGggfHwgMDtcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSBjdXJyZW50UHJvcGVydGllcyA+PSBtaW5pbXVtUHJvcGVydGllcztcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdtaW5Qcm9wZXJ0aWVzJzogeyBtaW5pbXVtUHJvcGVydGllcywgY3VycmVudFByb3BlcnRpZXMgfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ21heFByb3BlcnRpZXMnIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyBhIGZvcm0gZ3JvdXAgdG8gaGF2ZSBhIG1heGltdW0gbnVtYmVyIG9mIHByb3BlcnRpZXMgKGkuZS4gaGF2ZVxuICAgKiB2YWx1ZXMgZW50ZXJlZCBpbiBhIG1heGltdW0gbnVtYmVyIG9mIGNvbnRyb2xzIHdpdGhpbiB0aGUgZ3JvdXApLlxuICAgKlxuICAgKiBOb3RlOiBIYXMgbm8gZWZmZWN0IGlmIHRoZSBmb3JtIGdyb3VwIGRvZXMgbm90IGNvbnRhaW4gbW9yZSB0aGFuIHRoZVxuICAgKiBtYXhpbXVtIG51bWJlciBvZiBjb250cm9scy5cbiAgICpcbiAgICogLy8ge251bWJlcn0gbWF4aW11bVByb3BlcnRpZXMgLSBtYXhpbXVtIG51bWJlciBvZiBwcm9wZXJ0aWVzIGFsbG93ZWRcbiAgICogLy8ge0lWYWxpZGF0b3JGbn1cbiAgICovXG4gIHN0YXRpYyBtYXhQcm9wZXJ0aWVzKG1heGltdW1Qcm9wZXJ0aWVzOiBudW1iZXIpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUobWF4aW11bVByb3BlcnRpZXMpKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRQcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoY29udHJvbC52YWx1ZSkubGVuZ3RoIHx8IDA7XG4gICAgICBjb25zdCBpc1ZhbGlkID0gY3VycmVudFByb3BlcnRpZXMgPD0gbWF4aW11bVByb3BlcnRpZXM7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAnbWF4UHJvcGVydGllcyc6IHsgbWF4aW11bVByb3BlcnRpZXMsIGN1cnJlbnRQcm9wZXJ0aWVzIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdkZXBlbmRlbmNpZXMnIHZhbGlkYXRvclxuICAgKlxuICAgKiBSZXF1aXJlcyB0aGUgY29udHJvbHMgaW4gYSBmb3JtIGdyb3VwIHRvIG1lZXQgYWRkaXRpb25hbCB2YWxpZGF0aW9uXG4gICAqIGNyaXRlcmlhLCBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiBvdGhlciBjb250cm9scyBpbiB0aGUgZ3JvdXAuXG4gICAqXG4gICAqIEV4YW1wbGVzOlxuICAgKiBodHRwczovL3NwYWNldGVsZXNjb3BlLmdpdGh1Yi5pby91bmRlcnN0YW5kaW5nLWpzb24tc2NoZW1hL3JlZmVyZW5jZS9vYmplY3QuaHRtbCNkZXBlbmRlbmNpZXNcbiAgICpcbiAgICogLy8ge2FueX0gZGVwZW5kZW5jaWVzIC0gcmVxdWlyZWQgZGVwZW5kZW5jaWVzXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgZGVwZW5kZW5jaWVzKGRlcGVuZGVuY2llczogYW55KTogSVZhbGlkYXRvckZuIHtcbiAgICBpZiAoZ2V0VHlwZShkZXBlbmRlbmNpZXMpICE9PSAnb2JqZWN0JyB8fCBpc0VtcHR5KGRlcGVuZGVuY2llcykpIHtcbiAgICAgIHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yO1xuICAgIH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IGFsbEVycm9ycyA9IF9tZXJnZU9iamVjdHMoXG4gICAgICAgIGZvckVhY2hDb3B5KGRlcGVuZGVuY2llcywgKHZhbHVlLCByZXF1aXJpbmdGaWVsZCkgPT4ge1xuICAgICAgICAgIGlmICghaGFzVmFsdWUoY29udHJvbC52YWx1ZVtyZXF1aXJpbmdGaWVsZF0pKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgICAgbGV0IHJlcXVpcmluZ0ZpZWxkRXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JzID0geyB9O1xuICAgICAgICAgIGxldCByZXF1aXJlZEZpZWxkczogc3RyaW5nW107XG4gICAgICAgICAgbGV0IHByb3BlcnRpZXM6IFZhbGlkYXRpb25FcnJvcnMgPSB7IH07XG4gICAgICAgICAgaWYgKGdldFR5cGUoZGVwZW5kZW5jaWVzW3JlcXVpcmluZ0ZpZWxkXSkgPT09ICdhcnJheScpIHtcbiAgICAgICAgICAgIHJlcXVpcmVkRmllbGRzID0gZGVwZW5kZW5jaWVzW3JlcXVpcmluZ0ZpZWxkXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGdldFR5cGUoZGVwZW5kZW5jaWVzW3JlcXVpcmluZ0ZpZWxkXSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXF1aXJlZEZpZWxkcyA9IGRlcGVuZGVuY2llc1tyZXF1aXJpbmdGaWVsZF1bJ3JlcXVpcmVkJ10gfHwgW107XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gZGVwZW5kZW5jaWVzW3JlcXVpcmluZ0ZpZWxkXVsncHJvcGVydGllcyddIHx8IHsgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBWYWxpZGF0ZSBwcm9wZXJ0eSBkZXBlbmRlbmNpZXNcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlcXVpcmVkRmllbGQgb2YgcmVxdWlyZWRGaWVsZHMpIHtcbiAgICAgICAgICAgIGlmICh4b3IoIWhhc1ZhbHVlKGNvbnRyb2wudmFsdWVbcmVxdWlyZWRGaWVsZF0pLCBpbnZlcnQpKSB7XG4gICAgICAgICAgICAgIHJlcXVpcmluZ0ZpZWxkRXJyb3JzW3JlcXVpcmVkRmllbGRdID0geyAncmVxdWlyZWQnOiB0cnVlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVmFsaWRhdGUgc2NoZW1hIGRlcGVuZGVuY2llc1xuICAgICAgICAgIHJlcXVpcmluZ0ZpZWxkRXJyb3JzID0gX21lcmdlT2JqZWN0cyhyZXF1aXJpbmdGaWVsZEVycm9ycyxcbiAgICAgICAgICAgIGZvckVhY2hDb3B5KHByb3BlcnRpZXMsIChyZXF1aXJlbWVudHMsIHJlcXVpcmVkRmllbGQpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWRGaWVsZEVycm9ycyA9IF9tZXJnZU9iamVjdHMoXG4gICAgICAgICAgICAgICAgZm9yRWFjaENvcHkocmVxdWlyZW1lbnRzLCAocmVxdWlyZW1lbnQsIHBhcmFtZXRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbGlkYXRvcjogSVZhbGlkYXRvckZuID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIGlmIChyZXF1aXJlbWVudCA9PT0gJ21heGltdW0nIHx8IHJlcXVpcmVtZW50ID09PSAnbWluaW11bScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhjbHVzaXZlID0gISFyZXF1aXJlbWVudHNbJ2V4Y2x1c2l2ZU0nICsgcmVxdWlyZW1lbnQuc2xpY2UoMSldO1xuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3IgPSBKc29uVmFsaWRhdG9yc1tyZXF1aXJlbWVudF0ocGFyYW1ldGVyLCBleGNsdXNpdmUpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgSnNvblZhbGlkYXRvcnNbcmVxdWlyZW1lbnRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvciA9IEpzb25WYWxpZGF0b3JzW3JlcXVpcmVtZW50XShwYXJhbWV0ZXIpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuICFpc0RlZmluZWQodmFsaWRhdG9yKSA/XG4gICAgICAgICAgICAgICAgICAgIG51bGwgOiB2YWxpZGF0b3IoY29udHJvbC52YWx1ZVtyZXF1aXJlZEZpZWxkXSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGlzRW1wdHkocmVxdWlyZWRGaWVsZEVycm9ycykgP1xuICAgICAgICAgICAgICAgIG51bGwgOiB7IFtyZXF1aXJlZEZpZWxkXTogcmVxdWlyZWRGaWVsZEVycm9ycyB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBpc0VtcHR5KHJlcXVpcmluZ0ZpZWxkRXJyb3JzKSA/XG4gICAgICAgICAgICBudWxsIDogeyBbcmVxdWlyaW5nRmllbGRdOiByZXF1aXJpbmdGaWVsZEVycm9ycyB9O1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIHJldHVybiBpc0VtcHR5KGFsbEVycm9ycykgPyBudWxsIDogYWxsRXJyb3JzO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogJ21pbkl0ZW1zJyB2YWxpZGF0b3JcbiAgICpcbiAgICogUmVxdWlyZXMgYSBmb3JtIGFycmF5IHRvIGhhdmUgYSBtaW5pbXVtIG51bWJlciBvZiB2YWx1ZXMuXG4gICAqXG4gICAqIC8vIHtudW1iZXJ9IG1pbmltdW1JdGVtcyAtIG1pbmltdW0gbnVtYmVyIG9mIGl0ZW1zIGFsbG93ZWRcbiAgICogLy8ge0lWYWxpZGF0b3JGbn1cbiAgICovXG4gIHN0YXRpYyBtaW5JdGVtcyhtaW5pbXVtSXRlbXM6IG51bWJlcik6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFoYXNWYWx1ZShtaW5pbXVtSXRlbXMpKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+IHtcbiAgICAgIGlmIChpc0VtcHR5KGNvbnRyb2wudmFsdWUpKSB7IHJldHVybiBudWxsOyB9XG4gICAgICBjb25zdCBjdXJyZW50SXRlbXMgPSBpc0FycmF5KGNvbnRyb2wudmFsdWUpID8gY29udHJvbC52YWx1ZS5sZW5ndGggOiAwO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGN1cnJlbnRJdGVtcyA+PSBtaW5pbXVtSXRlbXM7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAnbWluSXRlbXMnOiB7IG1pbmltdW1JdGVtcywgY3VycmVudEl0ZW1zIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdtYXhJdGVtcycgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIGEgZm9ybSBhcnJheSB0byBoYXZlIGEgbWF4aW11bSBudW1iZXIgb2YgdmFsdWVzLlxuICAgKlxuICAgKiAvLyB7bnVtYmVyfSBtYXhpbXVtSXRlbXMgLSBtYXhpbXVtIG51bWJlciBvZiBpdGVtcyBhbGxvd2VkXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgbWF4SXRlbXMobWF4aW11bUl0ZW1zOiBudW1iZXIpOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghaGFzVmFsdWUobWF4aW11bUl0ZW1zKSkgeyByZXR1cm4gSnNvblZhbGlkYXRvcnMubnVsbFZhbGlkYXRvcjsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50SXRlbXMgPSBpc0FycmF5KGNvbnRyb2wudmFsdWUpID8gY29udHJvbC52YWx1ZS5sZW5ndGggOiAwO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGN1cnJlbnRJdGVtcyA8PSBtYXhpbXVtSXRlbXM7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAnbWF4SXRlbXMnOiB7IG1heGltdW1JdGVtcywgY3VycmVudEl0ZW1zIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICd1bmlxdWVJdGVtcycgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIHZhbHVlcyBpbiBhIGZvcm0gYXJyYXkgdG8gYmUgdW5pcXVlLlxuICAgKlxuICAgKiAvLyB7Ym9vbGVhbiA9IHRydWV9IHVuaXF1ZT8gLSB0cnVlIHRvIHZhbGlkYXRlLCBmYWxzZSB0byBkaXNhYmxlXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgdW5pcXVlSXRlbXModW5pcXVlID0gdHJ1ZSk6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCF1bmlxdWUpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IHNvcnRlZDogYW55W10gPSBjb250cm9sLnZhbHVlLnNsaWNlKCkuc29ydCgpO1xuICAgICAgY29uc3QgZHVwbGljYXRlSXRlbXMgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgc29ydGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChzb3J0ZWRbaSAtIDFdID09PSBzb3J0ZWRbaV0gJiYgZHVwbGljYXRlSXRlbXMuaW5jbHVkZXMoc29ydGVkW2ldKSkge1xuICAgICAgICAgIGR1cGxpY2F0ZUl0ZW1zLnB1c2goc29ydGVkW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgaXNWYWxpZCA9ICFkdXBsaWNhdGVJdGVtcy5sZW5ndGg7XG4gICAgICByZXR1cm4geG9yKGlzVmFsaWQsIGludmVydCkgP1xuICAgICAgICBudWxsIDogeyAndW5pcXVlSXRlbXMnOiB7IGR1cGxpY2F0ZUl0ZW1zIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdjb250YWlucycgdmFsaWRhdG9yXG4gICAqXG4gICAqIFRPRE86IENvbXBsZXRlIHRoaXMgdmFsaWRhdG9yXG4gICAqXG4gICAqIFJlcXVpcmVzIHZhbHVlcyBpbiBhIGZvcm0gYXJyYXkgdG8gYmUgdW5pcXVlLlxuICAgKlxuICAgKiAvLyB7Ym9vbGVhbiA9IHRydWV9IHVuaXF1ZT8gLSB0cnVlIHRvIHZhbGlkYXRlLCBmYWxzZSB0byBkaXNhYmxlXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59XG4gICAqL1xuICBzdGF0aWMgY29udGFpbnMocmVxdWlyZWRJdGVtID0gdHJ1ZSk6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFyZXF1aXJlZEl0ZW0pIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkgfHwgIWlzQXJyYXkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IGN1cnJlbnRJdGVtcyA9IGNvbnRyb2wudmFsdWU7XG4gICAgICAvLyBjb25zdCBpc1ZhbGlkID0gY3VycmVudEl0ZW1zLnNvbWUoaXRlbSA9PlxuICAgICAgLy9cbiAgICAgIC8vICk7XG4gICAgICBjb25zdCBpc1ZhbGlkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiB7ICdjb250YWlucyc6IHsgcmVxdWlyZWRJdGVtLCBjdXJyZW50SXRlbXMgfSB9O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTm8tb3AgdmFsaWRhdG9yLiBJbmNsdWRlZCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eS5cbiAgICovXG4gIHN0YXRpYyBudWxsVmFsaWRhdG9yKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVmFsaWRhdG9yIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uczpcbiAgICogY29tcG9zZUFueU9mLCBjb21wb3NlT25lT2YsIGNvbXBvc2VBbGxPZiwgY29tcG9zZU5vdCxcbiAgICogY29tcG9zZSwgY29tcG9zZUFzeW5jXG4gICAqXG4gICAqIFRPRE86IEFkZCBjb21wb3NlQW55T2ZBc3luYywgY29tcG9zZU9uZU9mQXN5bmMsXG4gICAqICAgICAgICAgICBjb21wb3NlQWxsT2ZBc3luYywgY29tcG9zZU5vdEFzeW5jXG4gICAqL1xuXG4gIC8qKlxuICAgKiAnY29tcG9zZUFueU9mJyB2YWxpZGF0b3IgY29tYmluYXRpb24gZnVuY3Rpb25cbiAgICpcbiAgICogQWNjZXB0cyBhbiBhcnJheSBvZiB2YWxpZGF0b3JzIGFuZCByZXR1cm5zIGEgc2luZ2xlIHZhbGlkYXRvciB0aGF0XG4gICAqIGV2YWx1YXRlcyB0byB2YWxpZCBpZiBhbnkgb25lIG9yIG1vcmUgb2YgdGhlIHN1Ym1pdHRlZCB2YWxpZGF0b3JzIGFyZVxuICAgKiB2YWxpZC4gSWYgZXZlcnkgdmFsaWRhdG9yIGlzIGludmFsaWQsIGl0IHJldHVybnMgY29tYmluZWQgZXJyb3JzIGZyb21cbiAgICogYWxsIHZhbGlkYXRvcnMuXG4gICAqXG4gICAqIC8vIHtJVmFsaWRhdG9yRm5bXX0gdmFsaWRhdG9ycyAtIGFycmF5IG9mIHZhbGlkYXRvcnMgdG8gY29tYmluZVxuICAgKiAvLyB7SVZhbGlkYXRvckZufSAtIHNpbmdsZSBjb21iaW5lZCB2YWxpZGF0b3IgZnVuY3Rpb25cbiAgICovXG4gIHN0YXRpYyBjb21wb3NlQW55T2YodmFsaWRhdG9yczogSVZhbGlkYXRvckZuW10pOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghdmFsaWRhdG9ycykgeyByZXR1cm4gbnVsbDsgfVxuICAgIGNvbnN0IHByZXNlbnRWYWxpZGF0b3JzID0gdmFsaWRhdG9ycy5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICBpZiAocHJlc2VudFZhbGlkYXRvcnMubGVuZ3RoID09PSAwKSB7IHJldHVybiBudWxsOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+IHtcbiAgICAgIGNvbnN0IGFycmF5T2ZFcnJvcnMgPVxuICAgICAgICBfZXhlY3V0ZVZhbGlkYXRvcnMoY29udHJvbCwgcHJlc2VudFZhbGlkYXRvcnMsIGludmVydCkuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgICBjb25zdCBpc1ZhbGlkID0gdmFsaWRhdG9ycy5sZW5ndGggPiBhcnJheU9mRXJyb3JzLmxlbmd0aDtcbiAgICAgIHJldHVybiB4b3IoaXNWYWxpZCwgaW52ZXJ0KSA/XG4gICAgICAgIG51bGwgOiBfbWVyZ2VPYmplY3RzKC4uLmFycmF5T2ZFcnJvcnMsIHsgJ2FueU9mJzogIWludmVydCB9KTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdjb21wb3NlT25lT2YnIHZhbGlkYXRvciBjb21iaW5hdGlvbiBmdW5jdGlvblxuICAgKlxuICAgKiBBY2NlcHRzIGFuIGFycmF5IG9mIHZhbGlkYXRvcnMgYW5kIHJldHVybnMgYSBzaW5nbGUgdmFsaWRhdG9yIHRoYXRcbiAgICogZXZhbHVhdGVzIHRvIHZhbGlkIG9ubHkgaWYgZXhhY3RseSBvbmUgb2YgdGhlIHN1Ym1pdHRlZCB2YWxpZGF0b3JzXG4gICAqIGlzIHZhbGlkLiBPdGhlcndpc2UgcmV0dXJucyBjb21iaW5lZCBpbmZvcm1hdGlvbiBmcm9tIGFsbCB2YWxpZGF0b3JzLFxuICAgKiBib3RoIHZhbGlkIGFuZCBpbnZhbGlkLlxuICAgKlxuICAgKiAvLyB7SVZhbGlkYXRvckZuW119IHZhbGlkYXRvcnMgLSBhcnJheSBvZiB2YWxpZGF0b3JzIHRvIGNvbWJpbmVcbiAgICogLy8ge0lWYWxpZGF0b3JGbn0gLSBzaW5nbGUgY29tYmluZWQgdmFsaWRhdG9yIGZ1bmN0aW9uXG4gICAqL1xuICBzdGF0aWMgY29tcG9zZU9uZU9mKHZhbGlkYXRvcnM6IElWYWxpZGF0b3JGbltdKTogSVZhbGlkYXRvckZuIHtcbiAgICBpZiAoIXZhbGlkYXRvcnMpIHsgcmV0dXJuIG51bGw7IH1cbiAgICBjb25zdCBwcmVzZW50VmFsaWRhdG9ycyA9IHZhbGlkYXRvcnMuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgaWYgKHByZXNlbnRWYWxpZGF0b3JzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gbnVsbDsgfVxuICAgIHJldHVybiAoY29udHJvbDogQWJzdHJhY3RDb250cm9sLCBpbnZlcnQgPSBmYWxzZSk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICBjb25zdCBhcnJheU9mRXJyb3JzID1cbiAgICAgICAgX2V4ZWN1dGVWYWxpZGF0b3JzKGNvbnRyb2wsIHByZXNlbnRWYWxpZGF0b3JzKTtcbiAgICAgIGNvbnN0IHZhbGlkQ29udHJvbHMgPVxuICAgICAgICB2YWxpZGF0b3JzLmxlbmd0aCAtIGFycmF5T2ZFcnJvcnMuZmlsdGVyKGlzRGVmaW5lZCkubGVuZ3RoO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IHZhbGlkQ29udHJvbHMgPT09IDE7XG4gICAgICBpZiAoeG9yKGlzVmFsaWQsIGludmVydCkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IGFycmF5T2ZWYWxpZHMgPVxuICAgICAgICBfZXhlY3V0ZVZhbGlkYXRvcnMoY29udHJvbCwgcHJlc2VudFZhbGlkYXRvcnMsIGludmVydCk7XG4gICAgICByZXR1cm4gX21lcmdlT2JqZWN0cyguLi5hcnJheU9mRXJyb3JzLCAuLi5hcnJheU9mVmFsaWRzLCB7ICdvbmVPZic6ICFpbnZlcnQgfSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnY29tcG9zZUFsbE9mJyB2YWxpZGF0b3IgY29tYmluYXRpb24gZnVuY3Rpb25cbiAgICpcbiAgICogQWNjZXB0cyBhbiBhcnJheSBvZiB2YWxpZGF0b3JzIGFuZCByZXR1cm5zIGEgc2luZ2xlIHZhbGlkYXRvciB0aGF0XG4gICAqIGV2YWx1YXRlcyB0byB2YWxpZCBvbmx5IGlmIGFsbCB0aGUgc3VibWl0dGVkIHZhbGlkYXRvcnMgYXJlIGluZGl2aWR1YWxseVxuICAgKiB2YWxpZC4gT3RoZXJ3aXNlIGl0IHJldHVybnMgY29tYmluZWQgZXJyb3JzIGZyb20gYWxsIGludmFsaWQgdmFsaWRhdG9ycy5cbiAgICpcbiAgICogLy8ge0lWYWxpZGF0b3JGbltdfSB2YWxpZGF0b3JzIC0gYXJyYXkgb2YgdmFsaWRhdG9ycyB0byBjb21iaW5lXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59IC0gc2luZ2xlIGNvbWJpbmVkIHZhbGlkYXRvciBmdW5jdGlvblxuICAgKi9cbiAgc3RhdGljIGNvbXBvc2VBbGxPZih2YWxpZGF0b3JzOiBJVmFsaWRhdG9yRm5bXSk6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCF2YWxpZGF0b3JzKSB7IHJldHVybiBudWxsOyB9XG4gICAgY29uc3QgcHJlc2VudFZhbGlkYXRvcnMgPSB2YWxpZGF0b3JzLmZpbHRlcihpc0RlZmluZWQpO1xuICAgIGlmIChwcmVzZW50VmFsaWRhdG9ycy5sZW5ndGggPT09IDApIHsgcmV0dXJuIG51bGw7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgY29uc3QgY29tYmluZWRFcnJvcnMgPSBfbWVyZ2VFcnJvcnMoXG4gICAgICAgIF9leGVjdXRlVmFsaWRhdG9ycyhjb250cm9sLCBwcmVzZW50VmFsaWRhdG9ycywgaW52ZXJ0KVxuICAgICAgKTtcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSBjb21iaW5lZEVycm9ycyA9PT0gbnVsbDtcbiAgICAgIHJldHVybiAoeG9yKGlzVmFsaWQsIGludmVydCkpID9cbiAgICAgICAgbnVsbCA6IF9tZXJnZU9iamVjdHMoY29tYmluZWRFcnJvcnMsIHsgJ2FsbE9mJzogIWludmVydCB9KTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdjb21wb3NlTm90JyB2YWxpZGF0b3IgaW52ZXJzaW9uIGZ1bmN0aW9uXG4gICAqXG4gICAqIEFjY2VwdHMgYSBzaW5nbGUgdmFsaWRhdG9yIGZ1bmN0aW9uIGFuZCBpbnZlcnRzIGl0cyByZXN1bHQuXG4gICAqIFJldHVybnMgdmFsaWQgaWYgdGhlIHN1Ym1pdHRlZCB2YWxpZGF0b3IgaXMgaW52YWxpZCwgYW5kXG4gICAqIHJldHVybnMgaW52YWxpZCBpZiB0aGUgc3VibWl0dGVkIHZhbGlkYXRvciBpcyB2YWxpZC5cbiAgICogKE5vdGU6IHRoaXMgZnVuY3Rpb24gY2FuIGl0c2VsZiBiZSBpbnZlcnRlZFxuICAgKiAgIC0gZS5nLiBjb21wb3NlTm90KGNvbXBvc2VOb3QodmFsaWRhdG9yKSkgLVxuICAgKiAgIGJ1dCB0aGlzIGNhbiBiZSBjb25mdXNpbmcgYW5kIGlzIHRoZXJlZm9yZSBub3QgcmVjb21tZW5kZWQuKVxuICAgKlxuICAgKiAvLyB7SVZhbGlkYXRvckZuW119IHZhbGlkYXRvcnMgLSB2YWxpZGF0b3IocykgdG8gaW52ZXJ0XG4gICAqIC8vIHtJVmFsaWRhdG9yRm59IC0gbmV3IHZhbGlkYXRvciBmdW5jdGlvbiB0aGF0IHJldHVybnMgb3Bwb3NpdGUgcmVzdWx0XG4gICAqL1xuICBzdGF0aWMgY29tcG9zZU5vdCh2YWxpZGF0b3I6IElWYWxpZGF0b3JGbik6IElWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCF2YWxpZGF0b3IpIHsgcmV0dXJuIG51bGw7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCwgaW52ZXJ0ID0gZmFsc2UpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoY29udHJvbC52YWx1ZSkpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IGVycm9yID0gdmFsaWRhdG9yKGNvbnRyb2wsICFpbnZlcnQpO1xuICAgICAgY29uc3QgaXNWYWxpZCA9IGVycm9yID09PSBudWxsO1xuICAgICAgcmV0dXJuICh4b3IoaXNWYWxpZCwgaW52ZXJ0KSkgP1xuICAgICAgICBudWxsIDogX21lcmdlT2JqZWN0cyhlcnJvciwgeyAnbm90JzogIWludmVydCB9KTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqICdjb21wb3NlJyB2YWxpZGF0b3IgY29tYmluYXRpb24gZnVuY3Rpb25cbiAgICpcbiAgICogLy8ge0lWYWxpZGF0b3JGbltdfSB2YWxpZGF0b3JzIC0gYXJyYXkgb2YgdmFsaWRhdG9ycyB0byBjb21iaW5lXG4gICAqIC8vIHtJVmFsaWRhdG9yRm59IC0gc2luZ2xlIGNvbWJpbmVkIHZhbGlkYXRvciBmdW5jdGlvblxuICAgKi9cbiAgc3RhdGljIGNvbXBvc2UodmFsaWRhdG9yczogSVZhbGlkYXRvckZuW10pOiBJVmFsaWRhdG9yRm4ge1xuICAgIGlmICghdmFsaWRhdG9ycykgeyByZXR1cm4gbnVsbDsgfVxuICAgIGNvbnN0IHByZXNlbnRWYWxpZGF0b3JzID0gdmFsaWRhdG9ycy5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICBpZiAocHJlc2VudFZhbGlkYXRvcnMubGVuZ3RoID09PSAwKSB7IHJldHVybiBudWxsOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wsIGludmVydCA9IGZhbHNlKTogVmFsaWRhdGlvbkVycm9yc3xudWxsID0+XG4gICAgICBfbWVyZ2VFcnJvcnMoX2V4ZWN1dGVWYWxpZGF0b3JzKGNvbnRyb2wsIHByZXNlbnRWYWxpZGF0b3JzLCBpbnZlcnQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAnY29tcG9zZUFzeW5jJyBhc3luYyB2YWxpZGF0b3IgY29tYmluYXRpb24gZnVuY3Rpb25cbiAgICpcbiAgICogLy8ge0FzeW5jSVZhbGlkYXRvckZuW119IGFzeW5jIHZhbGlkYXRvcnMgLSBhcnJheSBvZiBhc3luYyB2YWxpZGF0b3JzXG4gICAqIC8vIHtBc3luY0lWYWxpZGF0b3JGbn0gLSBzaW5nbGUgY29tYmluZWQgYXN5bmMgdmFsaWRhdG9yIGZ1bmN0aW9uXG4gICAqL1xuICBzdGF0aWMgY29tcG9zZUFzeW5jKHZhbGlkYXRvcnM6IEFzeW5jSVZhbGlkYXRvckZuW10pOiBBc3luY0lWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCF2YWxpZGF0b3JzKSB7IHJldHVybiBudWxsOyB9XG4gICAgY29uc3QgcHJlc2VudFZhbGlkYXRvcnMgPSB2YWxpZGF0b3JzLmZpbHRlcihpc0RlZmluZWQpO1xuICAgIGlmIChwcmVzZW50VmFsaWRhdG9ycy5sZW5ndGggPT09IDApIHsgcmV0dXJuIG51bGw7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCkgPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZXMgPVxuICAgICAgICBfZXhlY3V0ZUFzeW5jVmFsaWRhdG9ycyhjb250cm9sLCBwcmVzZW50VmFsaWRhdG9ycykubWFwKHRvT2JzZXJ2YWJsZSk7XG4gICAgICByZXR1cm4gbWFwLmNhbGwoZm9ya0pvaW4ob2JzZXJ2YWJsZXMpLCBfbWVyZ2VFcnJvcnMpO1xuICAgIH07XG4gIH1cblxuICAvLyBBZGRpdGlvbmFsIGFuZ3VsYXIgdmFsaWRhdG9ycyAobm90IHVzZWQgYnkgQW5ndWFsciBKU09OIFNjaGVtYSBGb3JtKVxuICAvLyBGcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi9tYXN0ZXIvcGFja2FnZXMvZm9ybXMvc3JjL3ZhbGlkYXRvcnMudHNcblxuICAvKipcbiAgICogVmFsaWRhdG9yIHRoYXQgcmVxdWlyZXMgY29udHJvbHMgdG8gaGF2ZSBhIHZhbHVlIGdyZWF0ZXIgdGhhbiBhIG51bWJlci5cbiAgICovXG4gIHN0YXRpYyBtaW4obWluOiBudW1iZXIpOiBWYWxpZGF0b3JGbiB7XG4gICAgaWYgKCFoYXNWYWx1ZShtaW4pKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgcmV0dXJuIChjb250cm9sOiBBYnN0cmFjdENvbnRyb2wpOiBWYWxpZGF0aW9uRXJyb3JzfG51bGwgPT4ge1xuICAgICAgLy8gZG9uJ3QgdmFsaWRhdGUgZW1wdHkgdmFsdWVzIHRvIGFsbG93IG9wdGlvbmFsIGNvbnRyb2xzXG4gICAgICBpZiAoaXNFbXB0eShjb250cm9sLnZhbHVlKSB8fCBpc0VtcHR5KG1pbikpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGNvbnN0IHZhbHVlID0gcGFyc2VGbG9hdChjb250cm9sLnZhbHVlKTtcbiAgICAgIGNvbnN0IGFjdHVhbCA9IGNvbnRyb2wudmFsdWU7XG4gICAgICAvLyBDb250cm9scyB3aXRoIE5hTiB2YWx1ZXMgYWZ0ZXIgcGFyc2luZyBzaG91bGQgYmUgdHJlYXRlZCBhcyBub3QgaGF2aW5nIGFcbiAgICAgIC8vIG1pbmltdW0sIHBlciB0aGUgSFRNTCBmb3JtcyBzcGVjOiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvZm9ybXMuaHRtbCNhdHRyLWlucHV0LW1pblxuICAgICAgcmV0dXJuIGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA+PSBtaW4gPyBudWxsIDogeyAnbWluJzogeyBtaW4sIGFjdHVhbCB9IH07XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0b3IgdGhhdCByZXF1aXJlcyBjb250cm9scyB0byBoYXZlIGEgdmFsdWUgbGVzcyB0aGFuIGEgbnVtYmVyLlxuICAgKi9cbiAgc3RhdGljIG1heChtYXg6IG51bWJlcik6IFZhbGlkYXRvckZuIHtcbiAgICBpZiAoIWhhc1ZhbHVlKG1heCkpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCA9PiB7XG4gICAgICAvLyBkb24ndCB2YWxpZGF0ZSBlbXB0eSB2YWx1ZXMgdG8gYWxsb3cgb3B0aW9uYWwgY29udHJvbHNcbiAgICAgIGlmIChpc0VtcHR5KGNvbnRyb2wudmFsdWUpIHx8IGlzRW1wdHkobWF4KSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZUZsb2F0KGNvbnRyb2wudmFsdWUpO1xuICAgICAgY29uc3QgYWN0dWFsID0gY29udHJvbC52YWx1ZTtcbiAgICAgIC8vIENvbnRyb2xzIHdpdGggTmFOIHZhbHVlcyBhZnRlciBwYXJzaW5nIHNob3VsZCBiZSB0cmVhdGVkIGFzIG5vdCBoYXZpbmcgYVxuICAgICAgLy8gbWF4aW11bSwgcGVyIHRoZSBIVE1MIGZvcm1zIHNwZWM6IGh0dHBzOi8vd3d3LnczLm9yZy9UUi9odG1sNS9mb3Jtcy5odG1sI2F0dHItaW5wdXQtbWF4XG4gICAgICByZXR1cm4gaXNOYU4odmFsdWUpIHx8IHZhbHVlIDw9IG1heCA/IG51bGwgOiB7ICdtYXgnOiB7IG1heCwgYWN0dWFsIH0gfTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRvciB0aGF0IHJlcXVpcmVzIGNvbnRyb2wgdmFsdWUgdG8gYmUgdHJ1ZS5cbiAgICovXG4gIHN0YXRpYyByZXF1aXJlZFRydWUoY29udHJvbDogQWJzdHJhY3RDb250cm9sKTogVmFsaWRhdGlvbkVycm9yc3xudWxsIHtcbiAgICBpZiAoIWNvbnRyb2wpIHsgcmV0dXJuIEpzb25WYWxpZGF0b3JzLm51bGxWYWxpZGF0b3I7IH1cbiAgICByZXR1cm4gY29udHJvbC52YWx1ZSA9PT0gdHJ1ZSA/IG51bGwgOiB7ICdyZXF1aXJlZCc6IHRydWUgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0b3IgdGhhdCBwZXJmb3JtcyBlbWFpbCB2YWxpZGF0aW9uLlxuICAgKi9cbiAgc3RhdGljIGVtYWlsKGNvbnRyb2w6IEFic3RyYWN0Q29udHJvbCk6IFZhbGlkYXRpb25FcnJvcnN8bnVsbCB7XG4gICAgaWYgKCFjb250cm9sKSB7IHJldHVybiBKc29uVmFsaWRhdG9ycy5udWxsVmFsaWRhdG9yOyB9XG4gICAgY29uc3QgRU1BSUxfUkVHRVhQID1cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgIC9eKD89LnsxLDI1NH0kKSg/PS57MSw2NH1AKVstISMkJSYnKisvMC05PT9BLVpeX2BhLXp7fH1+XSsoXFwuWy0hIyQlJicqKy8wLTk9P0EtWl5fYGEtent8fX5dKykqQFtBLVphLXowLTldKFtBLVphLXowLTktXXswLDYxfVtBLVphLXowLTldKT8oXFwuW0EtWmEtejAtOV0oW0EtWmEtejAtOS1dezAsNjF9W0EtWmEtejAtOV0pPykqJC87XG4gICAgcmV0dXJuIEVNQUlMX1JFR0VYUC50ZXN0KGNvbnRyb2wudmFsdWUpID8gbnVsbCA6IHsgJ2VtYWlsJzogdHJ1ZSB9O1xuICB9XG59XG4iXX0=