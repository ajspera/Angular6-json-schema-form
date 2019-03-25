// updated from AJV fast format regular expressions:
// https://github.com/epoberezkin/ajv/blob/master/lib/compile/formats.js
export const jsonSchemaFormatTests = {
    'date': /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
    'time': /^[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?(?:z|[+-]\d\d:\d\d)?$/i,
    // Modified to allow incomplete entries, such as
    // "2000-03-14T01:59:26.535" (needs "Z") or "2000-03-14T01:59" (needs ":00Z")
    'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s][0-2]\d:[0-5]\d(?::[0-5]\d)?(?:\.\d+)?(?:z|[+-]\d\d:\d\d)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
    'email': /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
    'hostname': /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    'ipv4': /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
    // tslint:disable-next-line:max-line-length
    'ipv6': /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    'uri': /^(?:[a-z][a-z0-9+-.]*)(?::|\/)\/?[^\s]*$/i,
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    'uri-reference': /^(?:(?:[a-z][a-z0-9+-.]*:)?\/\/)?[^\s]*$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    // tslint:disable-next-line:max-line-length
    'uri-template': /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    // tslint:disable-next-line:max-line-length
    // @todo Delete current URL in favour of the commented out URL rule when this ajv issue is fixed https://github.com/eslint/eslint/issues/7983.
    // tslint:disable-next-line:max-line-length
    // URL: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    // tslint:disable-next-line:max-line-length
    'url': /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-?)*(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-?)*(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i,
    // uuid: http://tools.ietf.org/html/rfc4122
    'uuid': /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // optimized https://gist.github.com/olmokramer/82ccce673f86db7cda5e
    // tslint:disable-next-line:max-line-length
    'color': /^\s*(#(?:[\da-f]{3}){1,2}|rgb\((?:\d{1,3},\s*){2}\d{1,3}\)|rgba\((?:\d{1,3},\s*){3}\d*\.?\d+\)|hsl\(\d{1,3}(?:,\s*\d{1,3}%){2}\)|hsla\(\d{1,3}(?:,\s*\d{1,3}%){2},\s*\d*\.?\d+\))\s*$/gi,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    'json-pointer': /^(?:\/(?:[^~/]|~0|~1)*)*$|^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    'relative-json-pointer': /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    'regex': function (str) {
        if (/[^\\]\\Z/.test(str)) {
            return false;
        }
        try {
            return true;
        }
        catch (e) {
            return false;
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0LXJlZ2V4LmNvbnN0YW50cy5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2FuZ3VsYXI2LWpzb24tc2NoZW1hLWZvcm0vIiwic291cmNlcyI6WyJsaWIvc2hhcmVkL2Zvcm1hdC1yZWdleC5jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsb0RBQW9EO0FBQ3BELHdFQUF3RTtBQUV4RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRztJQUVuQyxNQUFNLEVBQUUsNEJBQTRCO0lBRXBDLE1BQU0sRUFBRSwwREFBMEQ7SUFFbEUsZ0RBQWdEO0lBQ2hELDZFQUE2RTtJQUM3RSxXQUFXLEVBQUUsNEZBQTRGO0lBRXpHLHVDQUF1QztJQUN2QyxtSEFBbUg7SUFDbkgsOEZBQThGO0lBQzlGLE9BQU8sRUFBRSxrSEFBa0g7SUFFM0gsVUFBVSxFQUFFLG9GQUFvRjtJQUVoRyxtSEFBbUg7SUFDbkgsTUFBTSxFQUFFLDJFQUEyRTtJQUVuRiwwR0FBMEc7SUFDMUcsMkNBQTJDO0lBQzNDLE1BQU0sRUFBRSxvcENBQW9wQztJQUU1cEMsNEVBQTRFO0lBQzVFLEtBQUssRUFBRSwyQ0FBMkM7SUFFbEQsK0RBQStEO0lBQy9ELGVBQWUsRUFBRSwyQ0FBMkM7SUFFNUQsb0RBQW9EO0lBQ3BELDJDQUEyQztJQUMzQyxjQUFjLEVBQUUsbUxBQW1MO0lBRW5NLHlEQUF5RDtJQUN6RCwwREFBMEQ7SUFDMUQsMkNBQTJDO0lBQzNDLDhJQUE4STtJQUM5SSwyQ0FBMkM7SUFDM0MsaWdCQUFpZ0I7SUFDamdCLDJDQUEyQztJQUMzQyxLQUFLLEVBQUUsMnJEQUEyckQ7SUFFbHNELDJDQUEyQztJQUMzQyxNQUFNLEVBQUUsOERBQThEO0lBRXRFLG9FQUFvRTtJQUNwRSwyQ0FBMkM7SUFDM0MsT0FBTyxFQUFFLHlMQUF5TDtJQUVsTSxvREFBb0Q7SUFDcEQsY0FBYyxFQUFFLHdGQUF3RjtJQUV4Ryx1QkFBdUIsRUFBRSxrREFBa0Q7SUFFM0UsT0FBTyxFQUFFLFVBQVUsR0FBRztRQUNwQixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFBRSxPQUFPLEtBQUssQ0FBQztTQUFFO1FBQzNDLElBQUk7WUFDRixPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztDQUVGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB1cGRhdGVkIGZyb20gQUpWIGZhc3QgZm9ybWF0IHJlZ3VsYXIgZXhwcmVzc2lvbnM6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZXBvYmVyZXpraW4vYWp2L2Jsb2IvbWFzdGVyL2xpYi9jb21waWxlL2Zvcm1hdHMuanNcblxuZXhwb3J0IGNvbnN0IGpzb25TY2hlbWFGb3JtYXRUZXN0cyA9IHtcblxuICAnZGF0ZSc6IC9eXFxkXFxkXFxkXFxkLVswLTFdXFxkLVswLTNdXFxkJC8sXG5cbiAgJ3RpbWUnOiAvXlswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkKD86XFwuXFxkKyk/KD86enxbKy1dXFxkXFxkOlxcZFxcZCk/JC9pLFxuXG4gIC8vIE1vZGlmaWVkIHRvIGFsbG93IGluY29tcGxldGUgZW50cmllcywgc3VjaCBhc1xuICAvLyBcIjIwMDAtMDMtMTRUMDE6NTk6MjYuNTM1XCIgKG5lZWRzIFwiWlwiKSBvciBcIjIwMDAtMDMtMTRUMDE6NTlcIiAobmVlZHMgXCI6MDBaXCIpXG4gICdkYXRlLXRpbWUnOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZFt0XFxzXVswLTJdXFxkOlswLTVdXFxkKD86OlswLTVdXFxkKT8oPzpcXC5cXGQrKT8oPzp6fFsrLV1cXGRcXGQ6XFxkXFxkKT8kL2ksXG5cbiAgLy8gZW1haWwgKHNvdXJjZXMgZnJvbSBqc2VuIHZhbGlkYXRvcik6XG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjAxMzIzL3VzaW5nLWEtcmVndWxhci1leHByZXNzaW9uLXRvLXZhbGlkYXRlLWFuLWVtYWlsLWFkZHJlc3MjYW5zd2VyLTg4MjkzNjNcbiAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDUvZm9ybXMuaHRtbCN2YWxpZC1lLW1haWwtYWRkcmVzcyAoc2VhcmNoIGZvciAnd2lsbGZ1bCB2aW9sYXRpb24nKVxuICAnZW1haWwnOiAvXlthLXowLTkuISMkJSYnKisvPT9eX2B7fH1+LV0rQFthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPykqJC9pLFxuXG4gICdob3N0bmFtZSc6IC9eW2EtejAtOV0oPzpbYS16MC05LV17MCw2MX1bYS16MC05XSk/KD86XFwuW2EtejAtOV0oPzpbLTAtOWEtel17MCw2MX1bMC05YS16XSk/KSokL2ksXG5cbiAgLy8gb3B0aW1pemVkIGh0dHBzOi8vd3d3LnNhZmFyaWJvb2tzb25saW5lLmNvbS9saWJyYXJ5L3ZpZXcvcmVndWxhci1leHByZXNzaW9ucy1jb29rYm9vay85NzgwNTk2ODAyODM3L2NoMDdzMTYuaHRtbFxuICAnaXB2NCc6IC9eKD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pJC8sXG5cbiAgLy8gb3B0aW1pemVkIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTM0OTcvcmVndWxhci1leHByZXNzaW9uLXRoYXQtbWF0Y2hlcy12YWxpZC1pcHY2LWFkZHJlc3Nlc1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICdpcHY2JzogL15cXHMqKD86KD86KD86WzAtOWEtZl17MSw0fTopezd9KD86WzAtOWEtZl17MSw0fXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezZ9KD86OlswLTlhLWZdezEsNH18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSl8OikpfCg/Oig/OlswLTlhLWZdezEsNH06KXs1fSg/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDJ9KXw6KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSl8OikpfCg/Oig/OlswLTlhLWZdezEsNH06KXs0fSg/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDN9KXwoPzooPzo6WzAtOWEtZl17MSw0fSk/Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezN9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNH0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDJ9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezJ9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNX0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDN9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezF9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNn0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDR9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86Oig/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDd9KXwoPzooPzo6WzAtOWEtZl17MSw0fSl7MCw1fTooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KSl8OikpKSg/OiUuKyk/XFxzKiQvaSxcblxuICAvLyB1cmk6IGh0dHBzOi8vZ2l0aHViLmNvbS9tYWZpbnRvc2gvaXMtbXktanNvbi12YWxpZC9ibG9iL21hc3Rlci9mb3JtYXRzLmpzXG4gICd1cmknOiAvXig/OlthLXpdW2EtejAtOSstLl0qKSg/Ojp8XFwvKVxcLz9bXlxcc10qJC9pLFxuXG4gIC8vIHVyaSBmcmFnbWVudDogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjYXBwZW5kaXgtQVxuICAndXJpLXJlZmVyZW5jZSc6IC9eKD86KD86W2Etel1bYS16MC05Ky0uXSo6KT9cXC9cXC8pP1teXFxzXSokL2ksXG5cbiAgLy8gdXJpLXRlbXBsYXRlOiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjU3MFxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICd1cmktdGVtcGxhdGUnOiAvXig/Oig/OlteXFx4MDAtXFx4MjBcIic8PiVcXFxcXmB7fH1dfCVbMC05YS1mXXsyfSl8XFx7WysjLi87PyY9LCFAfF0/KD86W2EtejAtOV9dfCVbMC05YS1mXXsyfSkrKD86OlsxLTldWzAtOV17MCwzfXxcXCopPyg/OiwoPzpbYS16MC05X118JVswLTlhLWZdezJ9KSsoPzo6WzEtOV1bMC05XXswLDN9fFxcKik/KSpcXH0pKiQvaSxcblxuICAvLyBGb3IgdGhlIHNvdXJjZTogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vZHBlcmluaS83MjkyOTRcbiAgLy8gRm9yIHRlc3QgY2FzZXM6IGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9kZW1vL3VybC1yZWdleFxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gIC8vIEB0b2RvIERlbGV0ZSBjdXJyZW50IFVSTCBpbiBmYXZvdXIgb2YgdGhlIGNvbW1lbnRlZCBvdXQgVVJMIHJ1bGUgd2hlbiB0aGlzIGFqdiBpc3N1ZSBpcyBmaXhlZCBodHRwczovL2dpdGh1Yi5jb20vZXNsaW50L2VzbGludC9pc3N1ZXMvNzk4My5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAvLyBVUkw6IC9eKD86KD86aHR0cHM/fGZ0cCk6XFwvXFwvKSg/OlxcUysoPzo6XFxTKik/QCk/KD86KD8hMTAoPzpcXC5cXGR7MSwzfSl7M30pKD8hMTI3KD86XFwuXFxkezEsM30pezN9KSg/ITE2OVxcLjI1NCg/OlxcLlxcZHsxLDN9KXsyfSkoPyExOTJcXC4xNjgoPzpcXC5cXGR7MSwzfSl7Mn0pKD8hMTcyXFwuKD86MVs2LTldfDJcXGR8M1swLTFdKSg/OlxcLlxcZHsxLDN9KXsyfSkoPzpbMS05XVxcZD98MVxcZFxcZHwyWzAxXVxcZHwyMlswLTNdKSg/OlxcLig/OjE/XFxkezEsMn18MlswLTRdXFxkfDI1WzAtNV0pKXsyfSg/OlxcLig/OlsxLTldXFxkP3wxXFxkXFxkfDJbMC00XVxcZHwyNVswLTRdKSl8KD86KD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKy0/KSpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rKSg/OlxcLig/OlthLXpcXHV7MDBhMX0tXFx1e2ZmZmZ9MC05XSstPykqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykqKD86XFwuKD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn1dezIsfSkpKSg/OjpcXGR7Miw1fSk/KD86XFwvW15cXHNdKik/JC9pdSxcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAndXJsJzogL14oPzooPzpodHRwW3NcXHUwMTdGXT98ZnRwKTpcXC9cXC8pKD86KD86W1xcMC1cXHgwOFxceDBFLVxceDFGIS1cXHg5RlxceEExLVxcdTE2N0ZcXHUxNjgxLVxcdTFGRkZcXHUyMDBCLVxcdTIwMjdcXHUyMDJBLVxcdTIwMkVcXHUyMDMwLVxcdTIwNUVcXHUyMDYwLVxcdTJGRkZcXHUzMDAxLVxcdUQ3RkZcXHVFMDAwLVxcdUZFRkVcXHVGRjAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdW1xcdURDMDAtXFx1REZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKyg/OjooPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkqKT9AKT8oPzooPyExMCg/OlxcLlswLTldezEsM30pezN9KSg/ITEyNyg/OlxcLlswLTldezEsM30pezN9KSg/ITE2OVxcLjI1NCg/OlxcLlswLTldezEsM30pezJ9KSg/ITE5MlxcLjE2OCg/OlxcLlswLTldezEsM30pezJ9KSg/ITE3MlxcLig/OjFbNi05XXwyWzAtOV18M1swMV0pKD86XFwuWzAtOV17MSwzfSl7Mn0pKD86WzEtOV1bMC05XT98MVswLTldWzAtOV18MlswMV1bMC05XXwyMlswLTNdKSg/OlxcLig/OjE/WzAtOV17MSwyfXwyWzAtNF1bMC05XXwyNVswLTVdKSl7Mn0oPzpcXC4oPzpbMS05XVswLTldP3wxWzAtOV1bMC05XXwyWzAtNF1bMC05XXwyNVswLTRdKSl8KD86KD86KD86WzAtOUtTYS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKy0/KSooPzpbMC05S1NhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKSg/OlxcLig/Oig/OlswLTlLU2EtelxceEExLVxcdUQ3RkZcXHVFMDAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSstPykqKD86WzAtOUtTYS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKykqKD86XFwuKD86KD86W0tTYS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pezIsfSkpKSg/OjpbMC05XXsyLDV9KT8oPzpcXC8oPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkqKT8kL2ksXG5cbiAgLy8gdXVpZDogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNDEyMlxuICAndXVpZCc6IC9eKD86dXJuOnV1aWQ6KT9bMC05YS1mXXs4fS0oPzpbMC05YS1mXXs0fS0pezN9WzAtOWEtZl17MTJ9JC9pLFxuXG4gIC8vIG9wdGltaXplZCBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9vbG1va3JhbWVyLzgyY2NjZTY3M2Y4NmRiN2NkYTVlXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgJ2NvbG9yJzogL15cXHMqKCMoPzpbXFxkYS1mXXszfSl7MSwyfXxyZ2JcXCgoPzpcXGR7MSwzfSxcXHMqKXsyfVxcZHsxLDN9XFwpfHJnYmFcXCgoPzpcXGR7MSwzfSxcXHMqKXszfVxcZCpcXC4/XFxkK1xcKXxoc2xcXChcXGR7MSwzfSg/OixcXHMqXFxkezEsM30lKXsyfVxcKXxoc2xhXFwoXFxkezEsM30oPzosXFxzKlxcZHsxLDN9JSl7Mn0sXFxzKlxcZCpcXC4/XFxkK1xcKSlcXHMqJC9naSxcblxuICAvLyBKU09OLXBvaW50ZXI6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxXG4gICdqc29uLXBvaW50ZXInOiAvXig/OlxcLyg/Oltefi9dfH4wfH4xKSopKiR8XiMoPzpcXC8oPzpbYS16MC05X1xcLS4hJCYnKCkqKyw7Oj1AXXwlWzAtOWEtZl17Mn18fjB8fjEpKikqJC9pLFxuXG4gICdyZWxhdGl2ZS1qc29uLXBvaW50ZXInOiAvXig/OjB8WzEtOV1bMC05XSopKD86I3woPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSopJC8sXG5cbiAgJ3JlZ2V4JzogZnVuY3Rpb24gKHN0cikge1xuICAgIGlmICgvW15cXFxcXVxcXFxaLy50ZXN0KHN0cikpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxufTtcblxuZXhwb3J0IHR5cGUgSnNvblNjaGVtYUZvcm1hdE5hbWVzID1cbiAgJ2RhdGUnIHwgJ3RpbWUnIHwgJ2RhdGUtdGltZScgfCAnZW1haWwnIHwgJ2hvc3RuYW1lJyB8ICdpcHY0JyB8ICdpcHY2JyB8XG4gICd1cmknIHwgJ3VyaS1yZWZlcmVuY2UnIHwgJ3VyaS10ZW1wbGF0ZScgfCAndXJsJyB8ICd1dWlkJyB8ICdjb2xvcicgfFxuICAnanNvbi1wb2ludGVyJyB8ICdyZWxhdGl2ZS1qc29uLXBvaW50ZXInIHwgJ3JlZ2V4JztcbiJdfQ==