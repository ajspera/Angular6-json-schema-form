import * as tslib_1 from "tslib";
import cloneDeep from 'lodash/cloneDeep';
export function convertSchemaToDraft6(schema, options) {
    if (options === void 0) { options = {}; }
    var e_1, _a;
    var draft = options.draft || null;
    var changed = options.changed || false;
    if (typeof schema !== 'object') {
        return schema;
    }
    if (typeof schema.map === 'function') {
        return tslib_1.__spread(schema.map(function (subSchema) { return convertSchemaToDraft6(subSchema, { changed: changed, draft: draft }); }));
    }
    var newSchema = tslib_1.__assign({}, schema);
    var simpleTypes = ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'];
    if (typeof newSchema.$schema === 'string' &&
        /http\:\/\/json\-schema\.org\/draft\-0\d\/schema\#/.test(newSchema.$schema)) {
        draft = newSchema.$schema[30];
    }
    // Convert v1-v2 'contentEncoding' to 'media.binaryEncoding'
    // Note: This is only used in JSON hyper-schema (not regular JSON schema)
    if (newSchema.contentEncoding) {
        newSchema.media = { binaryEncoding: newSchema.contentEncoding };
        delete newSchema.contentEncoding;
        changed = true;
    }
    // Convert v1-v3 'extends' to 'allOf'
    if (typeof newSchema.extends === 'object') {
        newSchema.allOf = typeof newSchema.extends.map === 'function' ?
            newSchema.extends.map(function (subSchema) { return convertSchemaToDraft6(subSchema, { changed: changed, draft: draft }); }) :
            [convertSchemaToDraft6(newSchema.extends, { changed: changed, draft: draft })];
        delete newSchema.extends;
        changed = true;
    }
    // Convert v1-v3 'disallow' to 'not'
    if (newSchema.disallow) {
        if (typeof newSchema.disallow === 'string') {
            newSchema.not = { type: newSchema.disallow };
        }
        else if (typeof newSchema.disallow.map === 'function') {
            newSchema.not = {
                anyOf: newSchema.disallow
                    .map(function (type) { return typeof type === 'object' ? type : { type: type }; })
            };
        }
        delete newSchema.disallow;
        changed = true;
    }
    // Convert v3 string 'dependencies' properties to arrays
    if (typeof newSchema.dependencies === 'object' &&
        Object.keys(newSchema.dependencies)
            .some(function (key) { return typeof newSchema.dependencies[key] === 'string'; })) {
        newSchema.dependencies = tslib_1.__assign({}, newSchema.dependencies);
        Object.keys(newSchema.dependencies)
            .filter(function (key) { return typeof newSchema.dependencies[key] === 'string'; })
            .forEach(function (key) { return newSchema.dependencies[key] = [newSchema.dependencies[key]]; });
        changed = true;
    }
    // Convert v1 'maxDecimal' to 'multipleOf'
    if (typeof newSchema.maxDecimal === 'number') {
        newSchema.multipleOf = 1 / Math.pow(10, newSchema.maxDecimal);
        delete newSchema.divisibleBy;
        changed = true;
        if (!draft || draft === 2) {
            draft = 1;
        }
    }
    // Convert v2-v3 'divisibleBy' to 'multipleOf'
    if (typeof newSchema.divisibleBy === 'number') {
        newSchema.multipleOf = newSchema.divisibleBy;
        delete newSchema.divisibleBy;
        changed = true;
    }
    // Convert v1-v2 boolean 'minimumCanEqual' to 'exclusiveMinimum'
    if (typeof newSchema.minimum === 'number' && newSchema.minimumCanEqual === false) {
        newSchema.exclusiveMinimum = newSchema.minimum;
        delete newSchema.minimum;
        changed = true;
        if (!draft) {
            draft = 2;
        }
    }
    else if (typeof newSchema.minimumCanEqual === 'boolean') {
        delete newSchema.minimumCanEqual;
        changed = true;
        if (!draft) {
            draft = 2;
        }
    }
    // Convert v3-v4 boolean 'exclusiveMinimum' to numeric
    if (typeof newSchema.minimum === 'number' && newSchema.exclusiveMinimum === true) {
        newSchema.exclusiveMinimum = newSchema.minimum;
        delete newSchema.minimum;
        changed = true;
    }
    else if (typeof newSchema.exclusiveMinimum === 'boolean') {
        delete newSchema.exclusiveMinimum;
        changed = true;
    }
    // Convert v1-v2 boolean 'maximumCanEqual' to 'exclusiveMaximum'
    if (typeof newSchema.maximum === 'number' && newSchema.maximumCanEqual === false) {
        newSchema.exclusiveMaximum = newSchema.maximum;
        delete newSchema.maximum;
        changed = true;
        if (!draft) {
            draft = 2;
        }
    }
    else if (typeof newSchema.maximumCanEqual === 'boolean') {
        delete newSchema.maximumCanEqual;
        changed = true;
        if (!draft) {
            draft = 2;
        }
    }
    // Convert v3-v4 boolean 'exclusiveMaximum' to numeric
    if (typeof newSchema.maximum === 'number' && newSchema.exclusiveMaximum === true) {
        newSchema.exclusiveMaximum = newSchema.maximum;
        delete newSchema.maximum;
        changed = true;
    }
    else if (typeof newSchema.exclusiveMaximum === 'boolean') {
        delete newSchema.exclusiveMaximum;
        changed = true;
    }
    // Search object 'properties' for 'optional', 'required', and 'requires' items,
    // and convert them into object 'required' arrays and 'dependencies' objects
    if (typeof newSchema.properties === 'object') {
        var properties_1 = tslib_1.__assign({}, newSchema.properties);
        var requiredKeys_1 = Array.isArray(newSchema.required) ?
            new Set(newSchema.required) : new Set();
        // Convert v1-v2 boolean 'optional' properties to 'required' array
        if (draft === 1 || draft === 2 ||
            Object.keys(properties_1).some(function (key) { return properties_1[key].optional === true; })) {
            Object.keys(properties_1)
                .filter(function (key) { return properties_1[key].optional !== true; })
                .forEach(function (key) { return requiredKeys_1.add(key); });
            changed = true;
            if (!draft) {
                draft = 2;
            }
        }
        // Convert v3 boolean 'required' properties to 'required' array
        if (Object.keys(properties_1).some(function (key) { return properties_1[key].required === true; })) {
            Object.keys(properties_1)
                .filter(function (key) { return properties_1[key].required === true; })
                .forEach(function (key) { return requiredKeys_1.add(key); });
            changed = true;
        }
        if (requiredKeys_1.size) {
            newSchema.required = Array.from(requiredKeys_1);
        }
        // Convert v1-v2 array or string 'requires' properties to 'dependencies' object
        if (Object.keys(properties_1).some(function (key) { return properties_1[key].requires; })) {
            var dependencies_1 = typeof newSchema.dependencies === 'object' ? tslib_1.__assign({}, newSchema.dependencies) : {};
            Object.keys(properties_1)
                .filter(function (key) { return properties_1[key].requires; })
                .forEach(function (key) { return dependencies_1[key] =
                typeof properties_1[key].requires === 'string' ?
                    [properties_1[key].requires] : properties_1[key].requires; });
            newSchema.dependencies = dependencies_1;
            changed = true;
            if (!draft) {
                draft = 2;
            }
        }
        newSchema.properties = properties_1;
    }
    // Revove v1-v2 boolean 'optional' key
    if (typeof newSchema.optional === 'boolean') {
        delete newSchema.optional;
        changed = true;
        if (!draft) {
            draft = 2;
        }
    }
    // Revove v1-v2 'requires' key
    if (newSchema.requires) {
        delete newSchema.requires;
    }
    // Revove v3 boolean 'required' key
    if (typeof newSchema.required === 'boolean') {
        delete newSchema.required;
    }
    // Convert id to $id
    if (typeof newSchema.id === 'string' && !newSchema.$id) {
        if (newSchema.id.slice(-1) === '#') {
            newSchema.id = newSchema.id.slice(0, -1);
        }
        newSchema.$id = newSchema.id + '-CONVERTED-TO-DRAFT-06#';
        delete newSchema.id;
        changed = true;
    }
    // Check if v1-v3 'any' or object types will be converted
    if (newSchema.type && (typeof newSchema.type.every === 'function' ?
        !newSchema.type.every(function (type) { return simpleTypes.includes(type); }) :
        !simpleTypes.includes(newSchema.type))) {
        changed = true;
    }
    // If schema changed, update or remove $schema identifier
    if (typeof newSchema.$schema === 'string' &&
        /http\:\/\/json\-schema\.org\/draft\-0[1-4]\/schema\#/.test(newSchema.$schema)) {
        newSchema.$schema = 'http://json-schema.org/draft-06/schema#';
        changed = true;
    }
    else if (changed && typeof newSchema.$schema === 'string') {
        var addToDescription = 'Converted to draft 6 from ' + newSchema.$schema;
        if (typeof newSchema.description === 'string' && newSchema.description.length) {
            newSchema.description += '\n' + addToDescription;
        }
        else {
            newSchema.description = addToDescription;
        }
        delete newSchema.$schema;
    }
    // Convert v1-v3 'any' and object types
    if (newSchema.type && (typeof newSchema.type.every === 'function' ?
        !newSchema.type.every(function (type) { return simpleTypes.includes(type); }) :
        !simpleTypes.includes(newSchema.type))) {
        if (newSchema.type.length === 1) {
            newSchema.type = newSchema.type[0];
        }
        if (typeof newSchema.type === 'string') {
            // Convert string 'any' type to array of all standard types
            if (newSchema.type === 'any') {
                newSchema.type = simpleTypes;
                // Delete non-standard string type
            }
            else {
                delete newSchema.type;
            }
        }
        else if (typeof newSchema.type === 'object') {
            if (typeof newSchema.type.every === 'function') {
                // If array of strings, only allow standard types
                if (newSchema.type.every(function (type) { return typeof type === 'string'; })) {
                    newSchema.type = newSchema.type.some(function (type) { return type === 'any'; }) ?
                        newSchema.type = simpleTypes :
                        newSchema.type.filter(function (type) { return simpleTypes.includes(type); });
                    // If type is an array with objects, convert the current schema to an 'anyOf' array
                }
                else if (newSchema.type.length > 1) {
                    var arrayKeys = ['additionalItems', 'items', 'maxItems', 'minItems', 'uniqueItems', 'contains'];
                    var numberKeys = ['multipleOf', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum'];
                    var objectKeys = ['maxProperties', 'minProperties', 'required', 'additionalProperties',
                        'properties', 'patternProperties', 'dependencies', 'propertyNames'];
                    var stringKeys = ['maxLength', 'minLength', 'pattern', 'format'];
                    var filterKeys_1 = {
                        'array': tslib_1.__spread(numberKeys, objectKeys, stringKeys),
                        'integer': tslib_1.__spread(arrayKeys, objectKeys, stringKeys),
                        'number': tslib_1.__spread(arrayKeys, objectKeys, stringKeys),
                        'object': tslib_1.__spread(arrayKeys, numberKeys, stringKeys),
                        'string': tslib_1.__spread(arrayKeys, numberKeys, objectKeys),
                        'all': tslib_1.__spread(arrayKeys, numberKeys, objectKeys, stringKeys),
                    };
                    var anyOf = [];
                    var _loop_1 = function (type) {
                        var newType = typeof type === 'string' ? { type: type } : tslib_1.__assign({}, type);
                        Object.keys(newSchema)
                            .filter(function (key) { return !newType.hasOwnProperty(key) &&
                            !tslib_1.__spread((filterKeys_1[newType.type] || filterKeys_1.all), ['type', 'default']).includes(key); })
                            .forEach(function (key) { return newType[key] = newSchema[key]; });
                        anyOf.push(newType);
                    };
                    try {
                        for (var _b = tslib_1.__values(newSchema.type), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var type = _c.value;
                            _loop_1(type);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    newSchema = newSchema.hasOwnProperty('default') ?
                        { anyOf: anyOf, default: newSchema.default } : { anyOf: anyOf };
                    // If type is an object, merge it with the current schema
                }
                else {
                    var typeSchema = newSchema.type;
                    delete newSchema.type;
                    Object.assign(newSchema, typeSchema);
                }
            }
        }
        else {
            delete newSchema.type;
        }
    }
    // Convert sub schemas
    Object.keys(newSchema)
        .filter(function (key) { return typeof newSchema[key] === 'object'; })
        .forEach(function (key) {
        if (['definitions', 'dependencies', 'properties', 'patternProperties']
            .includes(key) && typeof newSchema[key].map !== 'function') {
            var newKey_1 = {};
            Object.keys(newSchema[key]).forEach(function (subKey) { return newKey_1[subKey] =
                convertSchemaToDraft6(newSchema[key][subKey], { changed: changed, draft: draft }); });
            newSchema[key] = newKey_1;
        }
        else if (['items', 'additionalItems', 'additionalProperties',
            'allOf', 'anyOf', 'oneOf', 'not'].includes(key)) {
            newSchema[key] = convertSchemaToDraft6(newSchema[key], { changed: changed, draft: draft });
        }
        else {
            newSchema[key] = cloneDeep(newSchema[key]);
        }
    });
    return newSchema;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydC1zY2hlbWEtdG8tZHJhZnQ2LmZ1bmN0aW9uLmpzIiwic291cmNlUm9vdCI6Im5nOi8vYW5ndWxhcjYtanNvbi1zY2hlbWEtZm9ybS8iLCJzb3VyY2VzIjpbImxpYi9zaGFyZWQvY29udmVydC1zY2hlbWEtdG8tZHJhZnQ2LmZ1bmN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLFNBQVMsTUFBTSxrQkFBa0IsQ0FBQztBQW1CekMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxPQUEwQjtJQUExQix3QkFBQSxFQUFBLFlBQTBCOztJQUN0RSxJQUFJLEtBQUssR0FBVyxPQUFPLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQztJQUMxQyxJQUFJLE9BQU8sR0FBWSxPQUFPLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQztJQUVoRCxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtRQUFFLE9BQU8sTUFBTSxDQUFDO0tBQUU7SUFDbEQsSUFBSSxPQUFPLE1BQU0sQ0FBQyxHQUFHLEtBQUssVUFBVSxFQUFFO1FBQ3BDLHdCQUFXLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLFNBQUEsRUFBRSxLQUFLLE9BQUEsRUFBRSxDQUFDLEVBQXBELENBQW9ELENBQUMsRUFBRTtLQUMzRjtJQUNELElBQUksU0FBUyx3QkFBUSxNQUFNLENBQUUsQ0FBQztJQUM5QixJQUFNLFdBQVcsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRTFGLElBQUksT0FBTyxTQUFTLENBQUMsT0FBTyxLQUFLLFFBQVE7UUFDdkMsbURBQW1ELENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFDM0U7UUFDQSxLQUFLLEdBQUcsU0FBUyxDQUFD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RyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLFNBQUEsRUFBRSxLQUFLLE9BQUEsRUFBRSxDQUFDLENBQUM7U0FDNUU7YUFBTTtZQUNMLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDNUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVMLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2xvbmVEZWVwIGZyb20gJ2xvZGFzaC9jbG9uZURlZXAnO1xuXG4vKipcbiAqICdjb252ZXJ0U2NoZW1hVG9EcmFmdDYnIGZ1bmN0aW9uXG4gKlxuICogQ29udmVydHMgYSBKU09OIFNjaGVtYSBmcm9tIGRyYWZ0IDEgdGhyb3VnaCA0IGZvcm1hdCB0byBkcmFmdCA2IGZvcm1hdFxuICpcbiAqIEluc3BpcmVkIGJ5IG9uIGdlcmFpbnRsdWZmJ3MgSlNPTiBTY2hlbWEgMyB0byA0IGNvbXBhdGliaWxpdHkgZnVuY3Rpb246XG4gKiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9nZXJhaW50bHVmZi9qc29uLXNjaGVtYS1jb21wYXRpYmlsaXR5XG4gKiBBbHNvIHVzZXMgc3VnZ2VzdGlvbnMgZnJvbSBBSlYncyBKU09OIFNjaGVtYSA0IHRvIDYgbWlncmF0aW9uIGd1aWRlOlxuICogICBodHRwczovL2dpdGh1Yi5jb20vZXBvYmVyZXpraW4vYWp2L3JlbGVhc2VzL3RhZy81LjAuMFxuICogQW5kIGFkZGl0aW9uYWwgZGV0YWlscyBmcm9tIHRoZSBvZmZpY2lhbCBKU09OIFNjaGVtYSBkb2N1bWVudGF0aW9uOlxuICogICBodHRwOi8vanNvbi1zY2hlbWEub3JnXG4gKlxuICogLy8gIHsgb2JqZWN0IH0gb3JpZ2luYWxTY2hlbWEgLSBKU09OIHNjaGVtYSAoZHJhZnQgMSwgMiwgMywgNCwgb3IgNilcbiAqIC8vICB7IE9wdGlvbk9iamVjdCA9IHt9IH0gb3B0aW9ucyAtIG9wdGlvbnM6IHBhcmVudCBzY2hlbWEgY2hhbmdlZD8sIHNjaGVtYSBkcmFmdCBudW1iZXI/XG4gKiAvLyB7IG9iamVjdCB9IC0gSlNPTiBzY2hlbWEgKGRyYWZ0IDYpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uT2JqZWN0IHsgY2hhbmdlZD86IGJvb2xlYW47IGRyYWZ0PzogbnVtYmVyOyB9XG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNjaGVtYVRvRHJhZnQ2KHNjaGVtYSwgb3B0aW9uczogT3B0aW9uT2JqZWN0ID0ge30pIHtcbiAgbGV0IGRyYWZ0OiBudW1iZXIgPSBvcHRpb25zLmRyYWZ0IHx8IG51bGw7XG4gIGxldCBjaGFuZ2VkOiBib29sZWFuID0gb3B0aW9ucy5jaGFuZ2VkIHx8IGZhbHNlO1xuXG4gIGlmICh0eXBlb2Ygc2NoZW1hICE9PSAnb2JqZWN0JykgeyByZXR1cm4gc2NoZW1hOyB9XG4gIGlmICh0eXBlb2Ygc2NoZW1hLm1hcCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBbLi4uc2NoZW1hLm1hcChzdWJTY2hlbWEgPT4gY29udmVydFNjaGVtYVRvRHJhZnQ2KHN1YlNjaGVtYSwgeyBjaGFuZ2VkLCBkcmFmdCB9KSldO1xuICB9XG4gIGxldCBuZXdTY2hlbWEgPSB7IC4uLnNjaGVtYSB9O1xuICBjb25zdCBzaW1wbGVUeXBlcyA9IFsnYXJyYXknLCAnYm9vbGVhbicsICdpbnRlZ2VyJywgJ251bGwnLCAnbnVtYmVyJywgJ29iamVjdCcsICdzdHJpbmcnXTtcblxuICBpZiAodHlwZW9mIG5ld1NjaGVtYS4kc2NoZW1hID09PSAnc3RyaW5nJyAmJlxuICAgIC9odHRwXFw6XFwvXFwvanNvblxcLXNjaGVtYVxcLm9yZ1xcL2RyYWZ0XFwtMFxcZFxcL3NjaGVtYVxcIy8udGVzdChuZXdTY2hlbWEuJHNjaGVtYSlcbiAgKSB7XG4gICAgZHJhZnQgPSBuZXdTY2hlbWEuJHNjaGVtYVszMF07XG4gIH1cblxuICAvLyBDb252ZXJ0IHYxLXYyICdjb250ZW50RW5jb2RpbmcnIHRvICdtZWRpYS5iaW5hcnlFbmNvZGluZydcbiAgLy8gTm90ZTogVGhpcyBpcyBvbmx5IHVzZWQgaW4gSlNPTiBoeXBlci1zY2hlbWEgKG5vdCByZWd1bGFyIEpTT04gc2NoZW1hKVxuICBpZiAobmV3U2NoZW1hLmNvbnRlbnRFbmNvZGluZykge1xuICAgIG5ld1NjaGVtYS5tZWRpYSA9IHsgYmluYXJ5RW5jb2Rpbmc6IG5ld1NjaGVtYS5jb250ZW50RW5jb2RpbmcgfTtcbiAgICBkZWxldGUgbmV3U2NoZW1hLmNvbnRlbnRFbmNvZGluZztcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgdjEtdjMgJ2V4dGVuZHMnIHRvICdhbGxPZidcbiAgaWYgKHR5cGVvZiBuZXdTY2hlbWEuZXh0ZW5kcyA9PT0gJ29iamVjdCcpIHtcbiAgICBuZXdTY2hlbWEuYWxsT2YgPSB0eXBlb2YgbmV3U2NoZW1hLmV4dGVuZHMubWFwID09PSAnZnVuY3Rpb24nID9cbiAgICAgIG5ld1NjaGVtYS5leHRlbmRzLm1hcChzdWJTY2hlbWEgPT4gY29udmVydFNjaGVtYVRvRHJhZnQ2KHN1YlNjaGVtYSwgeyBjaGFuZ2VkLCBkcmFmdCB9KSkgOlxuICAgICAgW2NvbnZlcnRTY2hlbWFUb0RyYWZ0NihuZXdTY2hlbWEuZXh0ZW5kcywgeyBjaGFuZ2VkLCBkcmFmdCB9KV07XG4gICAgZGVsZXRlIG5ld1NjaGVtYS5leHRlbmRzO1xuICAgIGNoYW5nZWQgPSB0cnVlO1xuICB9XG5cbiAgLy8gQ29udmVydCB2MS12MyAnZGlzYWxsb3cnIHRvICdub3QnXG4gIGlmIChuZXdTY2hlbWEuZGlzYWxsb3cpIHtcbiAgICBpZiAodHlwZW9mIG5ld1NjaGVtYS5kaXNhbGxvdyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG5ld1NjaGVtYS5ub3QgPSB7IHR5cGU6IG5ld1NjaGVtYS5kaXNhbGxvdyB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld1NjaGVtYS5kaXNhbGxvdy5tYXAgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG5ld1NjaGVtYS5ub3QgPSB7XG4gICAgICAgIGFueU9mOiBuZXdTY2hlbWEuZGlzYWxsb3dcbiAgICAgICAgICAubWFwKHR5cGUgPT4gdHlwZW9mIHR5cGUgPT09ICdvYmplY3QnID8gdHlwZSA6IHsgdHlwZSB9KVxuICAgICAgfTtcbiAgICB9XG4gICAgZGVsZXRlIG5ld1NjaGVtYS5kaXNhbGxvdztcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgdjMgc3RyaW5nICdkZXBlbmRlbmNpZXMnIHByb3BlcnRpZXMgdG8gYXJyYXlzXG4gIGlmICh0eXBlb2YgbmV3U2NoZW1hLmRlcGVuZGVuY2llcyA9PT0gJ29iamVjdCcgJiZcbiAgICBPYmplY3Qua2V5cyhuZXdTY2hlbWEuZGVwZW5kZW5jaWVzKVxuICAgICAgLnNvbWUoa2V5ID0+IHR5cGVvZiBuZXdTY2hlbWEuZGVwZW5kZW5jaWVzW2tleV0gPT09ICdzdHJpbmcnKVxuICApIHtcbiAgICBuZXdTY2hlbWEuZGVwZW5kZW5jaWVzID0geyAuLi5uZXdTY2hlbWEuZGVwZW5kZW5jaWVzIH07XG4gICAgT2JqZWN0LmtleXMobmV3U2NoZW1hLmRlcGVuZGVuY2llcylcbiAgICAgIC5maWx0ZXIoa2V5ID0+IHR5cGVvZiBuZXdTY2hlbWEuZGVwZW5kZW5jaWVzW2tleV0gPT09ICdzdHJpbmcnKVxuICAgICAgLmZvckVhY2goa2V5ID0+IG5ld1NjaGVtYS5kZXBlbmRlbmNpZXNba2V5XSA9IFtuZXdTY2hlbWEuZGVwZW5kZW5jaWVzW2tleV1dKTtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgdjEgJ21heERlY2ltYWwnIHRvICdtdWx0aXBsZU9mJ1xuICBpZiAodHlwZW9mIG5ld1NjaGVtYS5tYXhEZWNpbWFsID09PSAnbnVtYmVyJykge1xuICAgIG5ld1NjaGVtYS5tdWx0aXBsZU9mID0gMSAvIE1hdGgucG93KDEwLCBuZXdTY2hlbWEubWF4RGVjaW1hbCk7XG4gICAgZGVsZXRlIG5ld1NjaGVtYS5kaXZpc2libGVCeTtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICBpZiAoIWRyYWZ0IHx8IGRyYWZ0ID09PSAyKSB7IGRyYWZ0ID0gMTsgfVxuICB9XG5cbiAgLy8gQ29udmVydCB2Mi12MyAnZGl2aXNpYmxlQnknIHRvICdtdWx0aXBsZU9mJ1xuICBpZiAodHlwZW9mIG5ld1NjaGVtYS5kaXZpc2libGVCeSA9PT0gJ251bWJlcicpIHtcbiAgICBuZXdTY2hlbWEubXVsdGlwbGVPZiA9IG5ld1NjaGVtYS5kaXZpc2libGVCeTtcbiAgICBkZWxldGUgbmV3U2NoZW1hLmRpdmlzaWJsZUJ5O1xuICAgIGNoYW5nZWQgPSB0cnVlO1xuICB9XG5cbiAgLy8gQ29udmVydCB2MS12MiBib29sZWFuICdtaW5pbXVtQ2FuRXF1YWwnIHRvICdleGNsdXNpdmVNaW5pbXVtJ1xuICBpZiAodHlwZW9mIG5ld1NjaGVtYS5taW5pbXVtID09PSAnbnVtYmVyJyAmJiBuZXdTY2hlbWEubWluaW11bUNhbkVxdWFsID09PSBmYWxzZSkge1xuICAgIG5ld1NjaGVtYS5leGNsdXNpdmVNaW5pbXVtID0gbmV3U2NoZW1hLm1pbmltdW07XG4gICAgZGVsZXRlIG5ld1NjaGVtYS5taW5pbXVtO1xuICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIGlmICghZHJhZnQpIHsgZHJhZnQgPSAyOyB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIG5ld1NjaGVtYS5taW5pbXVtQ2FuRXF1YWwgPT09ICdib29sZWFuJykge1xuICAgIGRlbGV0ZSBuZXdTY2hlbWEubWluaW11bUNhbkVxdWFsO1xuICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgIGlmICghZHJhZnQpIHsgZHJhZnQgPSAyOyB9XG4gIH1cblxuICAvLyBDb252ZXJ0IHYzLXY0IGJvb2xlYW4gJ2V4Y2x1c2l2ZU1pbmltdW0nIHRvIG51bWVyaWNcbiAgaWYgKHR5cGVvZiBuZXdTY2hlbWEubWluaW11bSA9PT0gJ251bWJlcicgJiYgbmV3U2NoZW1hLmV4Y2x1c2l2ZU1pbmltdW0gPT09IHRydWUpIHtcbiAgICBuZXdTY2hlbWEuZXhjbHVzaXZlTWluaW11bSA9IG5ld1NjaGVtYS5taW5pbXVtO1xuICAgIGRlbGV0ZSBuZXdTY2hlbWEubWluaW11bTtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbmV3U2NoZW1hLmV4Y2x1c2l2ZU1pbmltdW0gPT09ICdib29sZWFuJykge1xuICAgIGRlbGV0ZSBuZXdTY2hlbWEuZXhjbHVzaXZlTWluaW11bTtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgdjEtdjIgYm9vbGVhbiAnbWF4aW11bUNhbkVxdWFsJyB0byAnZXhjbHVzaXZlTWF4aW11bSdcbiAgaWYgKHR5cGVvZiBuZXdTY2hlbWEubWF4aW11bSA9PT0gJ251bWJlcicgJiYgbmV3U2NoZW1hLm1heGltdW1DYW5FcXVhbCA9PT0gZmFsc2UpIHtcbiAgICBuZXdTY2hlbWEuZXhjbHVzaXZlTWF4aW11bSA9IG5ld1NjaGVtYS5tYXhpbXVtO1xuICAgIGRlbGV0ZSBuZXdTY2hlbWEubWF4aW11bTtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICBpZiAoIWRyYWZ0KSB7IGRyYWZ0ID0gMjsgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdTY2hlbWEubWF4aW11bUNhbkVxdWFsID09PSAnYm9vbGVhbicpIHtcbiAgICBkZWxldGUgbmV3U2NoZW1hLm1heGltdW1DYW5FcXVhbDtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICBpZiAoIWRyYWZ0KSB7IGRyYWZ0ID0gMjsgfVxuICB9XG5cbiAgLy8gQ29udmVydCB2My12NCBib29sZWFuICdleGNsdXNpdmVNYXhpbXVtJyB0byBudW1lcmljXG4gIGlmICh0eXBlb2YgbmV3U2NoZW1hLm1heGltdW0gPT09ICdudW1iZXInICYmIG5ld1NjaGVtYS5leGNsdXNpdmVNYXhpbXVtID09PSB0cnVlKSB7XG4gICAgbmV3U2NoZW1hLmV4Y2x1c2l2ZU1heGltdW0gPSBuZXdTY2hlbWEubWF4aW11bTtcbiAgICBkZWxldGUgbmV3U2NoZW1hLm1heGltdW07XG4gICAgY2hhbmdlZCA9IHRydWU7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG5ld1NjaGVtYS5leGNsdXNpdmVNYXhpbXVtID09PSAnYm9vbGVhbicpIHtcbiAgICBkZWxldGUgbmV3U2NoZW1hLmV4Y2x1c2l2ZU1heGltdW07XG4gICAgY2hhbmdlZCA9IHRydWU7XG4gIH1cblxuICAvLyBTZWFyY2ggb2JqZWN0ICdwcm9wZXJ0aWVzJyBmb3IgJ29wdGlvbmFsJywgJ3JlcXVpcmVkJywgYW5kICdyZXF1aXJlcycgaXRlbXMsXG4gIC8vIGFuZCBjb252ZXJ0IHRoZW0gaW50byBvYmplY3QgJ3JlcXVpcmVkJyBhcnJheXMgYW5kICdkZXBlbmRlbmNpZXMnIG9iamVjdHNcbiAgaWYgKHR5cGVvZiBuZXdTY2hlbWEucHJvcGVydGllcyA9PT0gJ29iamVjdCcpIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzID0geyAuLi5uZXdTY2hlbWEucHJvcGVydGllcyB9O1xuICAgIGNvbnN0IHJlcXVpcmVkS2V5cyA9IEFycmF5LmlzQXJyYXkobmV3U2NoZW1hLnJlcXVpcmVkKSA/XG4gICAgICBuZXcgU2V0KG5ld1NjaGVtYS5yZXF1aXJlZCkgOiBuZXcgU2V0KCk7XG5cbiAgICAvLyBDb252ZXJ0IHYxLXYyIGJvb2xlYW4gJ29wdGlvbmFsJyBwcm9wZXJ0aWVzIHRvICdyZXF1aXJlZCcgYXJyYXlcbiAgICBpZiAoZHJhZnQgPT09IDEgfHwgZHJhZnQgPT09IDIgfHxcbiAgICAgIE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLnNvbWUoa2V5ID0+IHByb3BlcnRpZXNba2V5XS5vcHRpb25hbCA9PT0gdHJ1ZSlcbiAgICApIHtcbiAgICAgIE9iamVjdC5rZXlzKHByb3BlcnRpZXMpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+IHByb3BlcnRpZXNba2V5XS5vcHRpb25hbCAhPT0gdHJ1ZSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHJlcXVpcmVkS2V5cy5hZGQoa2V5KSk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIGlmICghZHJhZnQpIHsgZHJhZnQgPSAyOyB9XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCB2MyBib29sZWFuICdyZXF1aXJlZCcgcHJvcGVydGllcyB0byAncmVxdWlyZWQnIGFycmF5XG4gICAgaWYgKE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLnNvbWUoa2V5ID0+IHByb3BlcnRpZXNba2V5XS5yZXF1aXJlZCA9PT0gdHJ1ZSkpIHtcbiAgICAgIE9iamVjdC5rZXlzKHByb3BlcnRpZXMpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+IHByb3BlcnRpZXNba2V5XS5yZXF1aXJlZCA9PT0gdHJ1ZSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHJlcXVpcmVkS2V5cy5hZGQoa2V5KSk7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWlyZWRLZXlzLnNpemUpIHsgbmV3U2NoZW1hLnJlcXVpcmVkID0gQXJyYXkuZnJvbShyZXF1aXJlZEtleXMpOyB9XG5cbiAgICAvLyBDb252ZXJ0IHYxLXYyIGFycmF5IG9yIHN0cmluZyAncmVxdWlyZXMnIHByb3BlcnRpZXMgdG8gJ2RlcGVuZGVuY2llcycgb2JqZWN0XG4gICAgaWYgKE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLnNvbWUoa2V5ID0+IHByb3BlcnRpZXNba2V5XS5yZXF1aXJlcykpIHtcbiAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IHR5cGVvZiBuZXdTY2hlbWEuZGVwZW5kZW5jaWVzID09PSAnb2JqZWN0JyA/XG4gICAgICAgIHsgLi4ubmV3U2NoZW1hLmRlcGVuZGVuY2llcyB9IDoge307XG4gICAgICBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKVxuICAgICAgICAuZmlsdGVyKGtleSA9PiBwcm9wZXJ0aWVzW2tleV0ucmVxdWlyZXMpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiBkZXBlbmRlbmNpZXNba2V5XSA9XG4gICAgICAgICAgdHlwZW9mIHByb3BlcnRpZXNba2V5XS5yZXF1aXJlcyA9PT0gJ3N0cmluZycgP1xuICAgICAgICAgICAgW3Byb3BlcnRpZXNba2V5XS5yZXF1aXJlc10gOiBwcm9wZXJ0aWVzW2tleV0ucmVxdWlyZXNcbiAgICAgICAgKTtcbiAgICAgIG5ld1NjaGVtYS5kZXBlbmRlbmNpZXMgPSBkZXBlbmRlbmNpZXM7XG4gICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIGlmICghZHJhZnQpIHsgZHJhZnQgPSAyOyB9XG4gICAgfVxuXG4gICAgbmV3U2NoZW1hLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzO1xuICB9XG5cbiAgLy8gUmV2b3ZlIHYxLXYyIGJvb2xlYW4gJ29wdGlvbmFsJyBrZXlcbiAgaWYgKHR5cGVvZiBuZXdTY2hlbWEub3B0aW9uYWwgPT09ICdib29sZWFuJykge1xuICAgIGRlbGV0ZSBuZXdTY2hlbWEub3B0aW9uYWw7XG4gICAgY2hhbmdlZCA9IHRydWU7XG4gICAgaWYgKCFkcmFmdCkgeyBkcmFmdCA9IDI7IH1cbiAgfVxuXG4gIC8vIFJldm92ZSB2MS12MiAncmVxdWlyZXMnIGtleVxuICBpZiAobmV3U2NoZW1hLnJlcXVpcmVzKSB7XG4gICAgZGVsZXRlIG5ld1NjaGVtYS5yZXF1aXJlcztcbiAgfVxuXG4gIC8vIFJldm92ZSB2MyBib29sZWFuICdyZXF1aXJlZCcga2V5XG4gIGlmICh0eXBlb2YgbmV3U2NoZW1hLnJlcXVpcmVkID09PSAnYm9vbGVhbicpIHtcbiAgICBkZWxldGUgbmV3U2NoZW1hLnJlcXVpcmVkO1xuICB9XG5cbiAgLy8gQ29udmVydCBpZCB0byAkaWRcbiAgaWYgKHR5cGVvZiBuZXdTY2hlbWEuaWQgPT09ICdzdHJpbmcnICYmICFuZXdTY2hlbWEuJGlkKSB7XG4gICAgaWYgKG5ld1NjaGVtYS5pZC5zbGljZSgtMSkgPT09ICcjJykge1xuICAgICAgbmV3U2NoZW1hLmlkID0gbmV3U2NoZW1hLmlkLnNsaWNlKDAsIC0xKTtcbiAgICB9XG4gICAgbmV3U2NoZW1hLiRpZCA9IG5ld1NjaGVtYS5pZCArICctQ09OVkVSVEVELVRPLURSQUZULTA2Iyc7XG4gICAgZGVsZXRlIG5ld1NjaGVtYS5pZDtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHYxLXYzICdhbnknIG9yIG9iamVjdCB0eXBlcyB3aWxsIGJlIGNvbnZlcnRlZFxuICBpZiAobmV3U2NoZW1hLnR5cGUgJiYgKHR5cGVvZiBuZXdTY2hlbWEudHlwZS5ldmVyeSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgIW5ld1NjaGVtYS50eXBlLmV2ZXJ5KHR5cGUgPT4gc2ltcGxlVHlwZXMuaW5jbHVkZXModHlwZSkpIDpcbiAgICAhc2ltcGxlVHlwZXMuaW5jbHVkZXMobmV3U2NoZW1hLnR5cGUpXG4gICkpIHtcbiAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIElmIHNjaGVtYSBjaGFuZ2VkLCB1cGRhdGUgb3IgcmVtb3ZlICRzY2hlbWEgaWRlbnRpZmllclxuICBpZiAodHlwZW9mIG5ld1NjaGVtYS4kc2NoZW1hID09PSAnc3RyaW5nJyAmJlxuICAgIC9odHRwXFw6XFwvXFwvanNvblxcLXNjaGVtYVxcLm9yZ1xcL2RyYWZ0XFwtMFsxLTRdXFwvc2NoZW1hXFwjLy50ZXN0KG5ld1NjaGVtYS4kc2NoZW1hKVxuICApIHtcbiAgICBuZXdTY2hlbWEuJHNjaGVtYSA9ICdodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA2L3NjaGVtYSMnO1xuICAgIGNoYW5nZWQgPSB0cnVlO1xuICB9IGVsc2UgaWYgKGNoYW5nZWQgJiYgdHlwZW9mIG5ld1NjaGVtYS4kc2NoZW1hID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IGFkZFRvRGVzY3JpcHRpb24gPSAnQ29udmVydGVkIHRvIGRyYWZ0IDYgZnJvbSAnICsgbmV3U2NoZW1hLiRzY2hlbWE7XG4gICAgaWYgKHR5cGVvZiBuZXdTY2hlbWEuZGVzY3JpcHRpb24gPT09ICdzdHJpbmcnICYmIG5ld1NjaGVtYS5kZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgIG5ld1NjaGVtYS5kZXNjcmlwdGlvbiArPSAnXFxuJyArIGFkZFRvRGVzY3JpcHRpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld1NjaGVtYS5kZXNjcmlwdGlvbiA9IGFkZFRvRGVzY3JpcHRpb247XG4gICAgfVxuICAgIGRlbGV0ZSBuZXdTY2hlbWEuJHNjaGVtYTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgdjEtdjMgJ2FueScgYW5kIG9iamVjdCB0eXBlc1xuICBpZiAobmV3U2NoZW1hLnR5cGUgJiYgKHR5cGVvZiBuZXdTY2hlbWEudHlwZS5ldmVyeSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgIW5ld1NjaGVtYS50eXBlLmV2ZXJ5KHR5cGUgPT4gc2ltcGxlVHlwZXMuaW5jbHVkZXModHlwZSkpIDpcbiAgICAhc2ltcGxlVHlwZXMuaW5jbHVkZXMobmV3U2NoZW1hLnR5cGUpXG4gICkpIHtcbiAgICBpZiAobmV3U2NoZW1hLnR5cGUubGVuZ3RoID09PSAxKSB7IG5ld1NjaGVtYS50eXBlID0gbmV3U2NoZW1hLnR5cGVbMF07IH1cbiAgICBpZiAodHlwZW9mIG5ld1NjaGVtYS50eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gQ29udmVydCBzdHJpbmcgJ2FueScgdHlwZSB0byBhcnJheSBvZiBhbGwgc3RhbmRhcmQgdHlwZXNcbiAgICAgIGlmIChuZXdTY2hlbWEudHlwZSA9PT0gJ2FueScpIHtcbiAgICAgICAgbmV3U2NoZW1hLnR5cGUgPSBzaW1wbGVUeXBlcztcbiAgICAgICAgLy8gRGVsZXRlIG5vbi1zdGFuZGFyZCBzdHJpbmcgdHlwZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIG5ld1NjaGVtYS50eXBlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld1NjaGVtYS50eXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHR5cGVvZiBuZXdTY2hlbWEudHlwZS5ldmVyeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBJZiBhcnJheSBvZiBzdHJpbmdzLCBvbmx5IGFsbG93IHN0YW5kYXJkIHR5cGVzXG4gICAgICAgIGlmIChuZXdTY2hlbWEudHlwZS5ldmVyeSh0eXBlID0+IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgICBuZXdTY2hlbWEudHlwZSA9IG5ld1NjaGVtYS50eXBlLnNvbWUodHlwZSA9PiB0eXBlID09PSAnYW55JykgP1xuICAgICAgICAgICAgbmV3U2NoZW1hLnR5cGUgPSBzaW1wbGVUeXBlcyA6XG4gICAgICAgICAgICBuZXdTY2hlbWEudHlwZS5maWx0ZXIodHlwZSA9PiBzaW1wbGVUeXBlcy5pbmNsdWRlcyh0eXBlKSk7XG4gICAgICAgICAgLy8gSWYgdHlwZSBpcyBhbiBhcnJheSB3aXRoIG9iamVjdHMsIGNvbnZlcnQgdGhlIGN1cnJlbnQgc2NoZW1hIHRvIGFuICdhbnlPZicgYXJyYXlcbiAgICAgICAgfSBlbHNlIGlmIChuZXdTY2hlbWEudHlwZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgY29uc3QgYXJyYXlLZXlzID0gWydhZGRpdGlvbmFsSXRlbXMnLCAnaXRlbXMnLCAnbWF4SXRlbXMnLCAnbWluSXRlbXMnLCAndW5pcXVlSXRlbXMnLCAnY29udGFpbnMnXTtcbiAgICAgICAgICBjb25zdCBudW1iZXJLZXlzID0gWydtdWx0aXBsZU9mJywgJ21heGltdW0nLCAnZXhjbHVzaXZlTWF4aW11bScsICdtaW5pbXVtJywgJ2V4Y2x1c2l2ZU1pbmltdW0nXTtcbiAgICAgICAgICBjb25zdCBvYmplY3RLZXlzID0gWydtYXhQcm9wZXJ0aWVzJywgJ21pblByb3BlcnRpZXMnLCAncmVxdWlyZWQnLCAnYWRkaXRpb25hbFByb3BlcnRpZXMnLFxuICAgICAgICAgICAgJ3Byb3BlcnRpZXMnLCAncGF0dGVyblByb3BlcnRpZXMnLCAnZGVwZW5kZW5jaWVzJywgJ3Byb3BlcnR5TmFtZXMnXTtcbiAgICAgICAgICBjb25zdCBzdHJpbmdLZXlzID0gWydtYXhMZW5ndGgnLCAnbWluTGVuZ3RoJywgJ3BhdHRlcm4nLCAnZm9ybWF0J107XG4gICAgICAgICAgY29uc3QgZmlsdGVyS2V5cyA9IHtcbiAgICAgICAgICAgICdhcnJheSc6IFsuLi5udW1iZXJLZXlzLCAuLi5vYmplY3RLZXlzLCAuLi5zdHJpbmdLZXlzXSxcbiAgICAgICAgICAgICdpbnRlZ2VyJzogWy4uLmFycmF5S2V5cywgLi4ub2JqZWN0S2V5cywgLi4uc3RyaW5nS2V5c10sXG4gICAgICAgICAgICAnbnVtYmVyJzogWy4uLmFycmF5S2V5cywgLi4ub2JqZWN0S2V5cywgLi4uc3RyaW5nS2V5c10sXG4gICAgICAgICAgICAnb2JqZWN0JzogWy4uLmFycmF5S2V5cywgLi4ubnVtYmVyS2V5cywgLi4uc3RyaW5nS2V5c10sXG4gICAgICAgICAgICAnc3RyaW5nJzogWy4uLmFycmF5S2V5cywgLi4ubnVtYmVyS2V5cywgLi4ub2JqZWN0S2V5c10sXG4gICAgICAgICAgICAnYWxsJzogWy4uLmFycmF5S2V5cywgLi4ubnVtYmVyS2V5cywgLi4ub2JqZWN0S2V5cywgLi4uc3RyaW5nS2V5c10sXG4gICAgICAgICAgfTtcbiAgICAgICAgICBjb25zdCBhbnlPZiA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgdHlwZSBvZiBuZXdTY2hlbWEudHlwZSkge1xuICAgICAgICAgICAgY29uc3QgbmV3VHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHsgdHlwZSB9IDogeyAuLi50eXBlIH07XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhuZXdTY2hlbWEpXG4gICAgICAgICAgICAgIC5maWx0ZXIoa2V5ID0+ICFuZXdUeXBlLmhhc093blByb3BlcnR5KGtleSkgJiZcbiAgICAgICAgICAgICAgICAhWy4uLihmaWx0ZXJLZXlzW25ld1R5cGUudHlwZV0gfHwgZmlsdGVyS2V5cy5hbGwpLCAndHlwZScsICdkZWZhdWx0J11cbiAgICAgICAgICAgICAgICAgIC5pbmNsdWRlcyhrZXkpXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgLmZvckVhY2goa2V5ID0+IG5ld1R5cGVba2V5XSA9IG5ld1NjaGVtYVtrZXldKTtcbiAgICAgICAgICAgIGFueU9mLnB1c2gobmV3VHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld1NjaGVtYSA9IG5ld1NjaGVtYS5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdCcpID9cbiAgICAgICAgICAgIHsgYW55T2YsIGRlZmF1bHQ6IG5ld1NjaGVtYS5kZWZhdWx0IH0gOiB7IGFueU9mIH07XG4gICAgICAgICAgLy8gSWYgdHlwZSBpcyBhbiBvYmplY3QsIG1lcmdlIGl0IHdpdGggdGhlIGN1cnJlbnQgc2NoZW1hXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgdHlwZVNjaGVtYSA9IG5ld1NjaGVtYS50eXBlO1xuICAgICAgICAgIGRlbGV0ZSBuZXdTY2hlbWEudHlwZTtcbiAgICAgICAgICBPYmplY3QuYXNzaWduKG5ld1NjaGVtYSwgdHlwZVNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIG5ld1NjaGVtYS50eXBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIENvbnZlcnQgc3ViIHNjaGVtYXNcbiAgT2JqZWN0LmtleXMobmV3U2NoZW1hKVxuICAgIC5maWx0ZXIoa2V5ID0+IHR5cGVvZiBuZXdTY2hlbWFba2V5XSA9PT0gJ29iamVjdCcpXG4gICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmIChcbiAgICAgICAgWydkZWZpbml0aW9ucycsICdkZXBlbmRlbmNpZXMnLCAncHJvcGVydGllcycsICdwYXR0ZXJuUHJvcGVydGllcyddXG4gICAgICAgICAgLmluY2x1ZGVzKGtleSkgJiYgdHlwZW9mIG5ld1NjaGVtYVtrZXldLm1hcCAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IG5ld0tleSA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhuZXdTY2hlbWFba2V5XSkuZm9yRWFjaChzdWJLZXkgPT4gbmV3S2V5W3N1YktleV0gPVxuICAgICAgICAgIGNvbnZlcnRTY2hlbWFUb0RyYWZ0NihuZXdTY2hlbWFba2V5XVtzdWJLZXldLCB7IGNoYW5nZWQsIGRyYWZ0IH0pXG4gICAgICAgICk7XG4gICAgICAgIG5ld1NjaGVtYVtrZXldID0gbmV3S2V5O1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgWydpdGVtcycsICdhZGRpdGlvbmFsSXRlbXMnLCAnYWRkaXRpb25hbFByb3BlcnRpZXMnLFxuICAgICAgICAgICdhbGxPZicsICdhbnlPZicsICdvbmVPZicsICdub3QnXS5pbmNsdWRlcyhrZXkpXG4gICAgICApIHtcbiAgICAgICAgbmV3U2NoZW1hW2tleV0gPSBjb252ZXJ0U2NoZW1hVG9EcmFmdDYobmV3U2NoZW1hW2tleV0sIHsgY2hhbmdlZCwgZHJhZnQgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdTY2hlbWFba2V5XSA9IGNsb25lRGVlcChuZXdTY2hlbWFba2V5XSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgcmV0dXJuIG5ld1NjaGVtYTtcbn1cbiJdfQ==