import * as tslib_1 from "tslib";
var WidgetLibraryModule_1;
import { BASIC_WIDGETS } from './index';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JsonSchemaFormService } from '../json-schema-form.service';
import { NgModule } from '@angular/core';
import { OrderableDirective } from './orderable.directive';
let WidgetLibraryModule = WidgetLibraryModule_1 = class WidgetLibraryModule {
    static forRoot() {
        return {
            ngModule: WidgetLibraryModule_1,
            providers: [JsonSchemaFormService]
        };
    }
};
WidgetLibraryModule = WidgetLibraryModule_1 = tslib_1.__decorate([
    NgModule({
        imports: [CommonModule, FormsModule, ReactiveFormsModule],
        declarations: [...BASIC_WIDGETS, OrderableDirective],
        exports: [...BASIC_WIDGETS, OrderableDirective],
        entryComponents: [...BASIC_WIDGETS],
        providers: [JsonSchemaFormService]
    })
], WidgetLibraryModule);
export { WidgetLibraryModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0LWxpYnJhcnkubW9kdWxlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vYW5ndWxhcjYtanNvbi1zY2hlbWEtZm9ybS8iLCJzb3VyY2VzIjpbImxpYi93aWRnZXQtbGlicmFyeS93aWRnZXQtbGlicmFyeS5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDcEUsT0FBTyxFQUF1QixRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFTM0QsSUFBYSxtQkFBbUIsMkJBQWhDLE1BQWEsbUJBQW1CO0lBQzlCLE1BQU0sQ0FBQyxPQUFPO1FBQ1osT0FBTztZQUNMLFFBQVEsRUFBRSxxQkFBbUI7WUFDN0IsU0FBUyxFQUFFLENBQUUscUJBQXFCLENBQUU7U0FDckMsQ0FBQztJQUNKLENBQUM7Q0FDRixDQUFBO0FBUFksbUJBQW1CO0lBUC9CLFFBQVEsQ0FBQztRQUNSLE9BQU8sRUFBVSxDQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsbUJBQW1CLENBQUU7UUFDbkUsWUFBWSxFQUFLLENBQUUsR0FBRyxhQUFhLEVBQUUsa0JBQWtCLENBQUU7UUFDekQsT0FBTyxFQUFVLENBQUUsR0FBRyxhQUFhLEVBQUUsa0JBQWtCLENBQUU7UUFDekQsZUFBZSxFQUFFLENBQUUsR0FBRyxhQUFhLENBQUU7UUFDckMsU0FBUyxFQUFRLENBQUUscUJBQXFCLENBQUU7S0FDM0MsQ0FBQztHQUNXLG1CQUFtQixDQU8vQjtTQVBZLG1CQUFtQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJBU0lDX1dJREdFVFMgfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7IENvbW1vbk1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBGb3Jtc01vZHVsZSwgUmVhY3RpdmVGb3Jtc01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcbmltcG9ydCB7IEpzb25TY2hlbWFGb3JtU2VydmljZSB9IGZyb20gJy4uL2pzb24tc2NoZW1hLWZvcm0uc2VydmljZSc7XG5pbXBvcnQgeyBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgT3JkZXJhYmxlRGlyZWN0aXZlIH0gZnJvbSAnLi9vcmRlcmFibGUuZGlyZWN0aXZlJztcblxuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogICAgICAgICBbIENvbW1vbk1vZHVsZSwgRm9ybXNNb2R1bGUsIFJlYWN0aXZlRm9ybXNNb2R1bGUgXSxcbiAgZGVjbGFyYXRpb25zOiAgICBbIC4uLkJBU0lDX1dJREdFVFMsIE9yZGVyYWJsZURpcmVjdGl2ZSBdLFxuICBleHBvcnRzOiAgICAgICAgIFsgLi4uQkFTSUNfV0lER0VUUywgT3JkZXJhYmxlRGlyZWN0aXZlIF0sXG4gIGVudHJ5Q29tcG9uZW50czogWyAuLi5CQVNJQ19XSURHRVRTIF0sXG4gIHByb3ZpZGVyczogICAgICAgWyBKc29uU2NoZW1hRm9ybVNlcnZpY2UgXVxufSlcbmV4cG9ydCBjbGFzcyBXaWRnZXRMaWJyYXJ5TW9kdWxlIHtcbiAgc3RhdGljIGZvclJvb3QoKTogTW9kdWxlV2l0aFByb3ZpZGVycyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBXaWRnZXRMaWJyYXJ5TW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbIEpzb25TY2hlbWFGb3JtU2VydmljZSBdXG4gICAgfTtcbiAgfVxufVxuIl19