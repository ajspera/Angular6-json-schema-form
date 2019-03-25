import * as tslib_1 from "tslib";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JsonSchemaFormComponent } from './json-schema-form.component';
import { NgModule } from '@angular/core';
import { NoFrameworkModule } from './framework-library/no-framework/no-framework.module';
import { WidgetLibraryModule } from './widget-library/widget-library.module';
var JsonSchemaFormModule = /** @class */ (function () {
    function JsonSchemaFormModule() {
    }
    JsonSchemaFormModule = tslib_1.__decorate([
        NgModule({
            imports: [
                CommonModule, FormsModule, ReactiveFormsModule,
                WidgetLibraryModule, NoFrameworkModule
            ],
            declarations: [JsonSchemaFormComponent],
            exports: [JsonSchemaFormComponent, WidgetLibraryModule]
        })
    ], JsonSchemaFormModule);
    return JsonSchemaFormModule;
}());
export { JsonSchemaFormModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEtZm9ybS5tb2R1bGUuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9hbmd1bGFyNi1qc29uLXNjaGVtYS1mb3JtLyIsInNvdXJjZXMiOlsibGliL2pzb24tc2NoZW1hLWZvcm0ubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFhN0U7SUFBQTtJQUFtQyxDQUFDO0lBQXZCLG9CQUFvQjtRQVJoQyxRQUFRLENBQUM7WUFDUixPQUFPLEVBQUU7Z0JBQ1AsWUFBWSxFQUFFLFdBQVcsRUFBRSxtQkFBbUI7Z0JBQzlDLG1CQUFtQixFQUFFLGlCQUFpQjthQUN2QztZQUNELFlBQVksRUFBRSxDQUFDLHVCQUF1QixDQUFDO1lBQ3ZDLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixFQUFFLG1CQUFtQixDQUFDO1NBQ3hELENBQUM7T0FDVyxvQkFBb0IsQ0FBRztJQUFELDJCQUFDO0NBQUEsQUFBcEMsSUFBb0M7U0FBdkIsb0JBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tbW9uTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEZvcm1zTW9kdWxlLCBSZWFjdGl2ZUZvcm1zTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgSnNvblNjaGVtYUZvcm1Db21wb25lbnQgfSBmcm9tICcuL2pzb24tc2NoZW1hLWZvcm0uY29tcG9uZW50JztcbmltcG9ydCB7IE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOb0ZyYW1ld29ya01vZHVsZSB9IGZyb20gJy4vZnJhbWV3b3JrLWxpYnJhcnkvbm8tZnJhbWV3b3JrL25vLWZyYW1ld29yay5tb2R1bGUnO1xuaW1wb3J0IHsgV2lkZ2V0TGlicmFyeU1vZHVsZSB9IGZyb20gJy4vd2lkZ2V0LWxpYnJhcnkvd2lkZ2V0LWxpYnJhcnkubW9kdWxlJztcblxuXG5cblxuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogW1xuICAgIENvbW1vbk1vZHVsZSwgRm9ybXNNb2R1bGUsIFJlYWN0aXZlRm9ybXNNb2R1bGUsXG4gICAgV2lkZ2V0TGlicmFyeU1vZHVsZSwgTm9GcmFtZXdvcmtNb2R1bGVcbiAgXSxcbiAgZGVjbGFyYXRpb25zOiBbSnNvblNjaGVtYUZvcm1Db21wb25lbnRdLFxuICBleHBvcnRzOiBbSnNvblNjaGVtYUZvcm1Db21wb25lbnQsIFdpZGdldExpYnJhcnlNb2R1bGVdXG59KVxuZXhwb3J0IGNsYXNzIEpzb25TY2hlbWFGb3JtTW9kdWxlIHt9XG4iXX0=