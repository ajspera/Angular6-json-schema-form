import * as tslib_1 from "tslib";
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Framework } from '../framework';
import { FrameworkLibraryService } from '../framework-library.service';
import { JsonSchemaFormModule } from '../../json-schema-form.module';
import { JsonSchemaFormService } from '../../json-schema-form.service';
import { MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatCheckboxModule, MatChipsModule, MatDatepickerModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatRadioModule, MatSelectModule, MatSliderModule, MatSlideToggleModule, MatStepperModule, MatTabsModule, MatTooltipModule } from '@angular/material';
import { MATERIAL_FRAMEWORK_COMPONENTS } from './index';
import { MaterialDesignFramework } from './material-design.framework';
import { NgModule } from '@angular/core';
import { WidgetLibraryModule } from '../../widget-library/widget-library.module';
import { WidgetLibraryService } from '../../widget-library/widget-library.service';
/**
 * unused @angular/material modules:
 * MatDialogModule, MatGridListModule, MatListModule, MatMenuModule,
 * MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule,
 * MatSidenavModule, MatSnackBarModule, MatSortModule, MatTableModule,
 * MatToolbarModule,
 */
export const ANGULAR_MATERIAL_MODULES = [
    MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule,
    MatCheckboxModule, MatChipsModule, MatDatepickerModule, MatExpansionModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule,
    MatRadioModule, MatSelectModule, MatSliderModule, MatSlideToggleModule,
    MatStepperModule, MatTabsModule, MatTooltipModule,
];
let MaterialDesignFrameworkModule = class MaterialDesignFrameworkModule {
};
MaterialDesignFrameworkModule = tslib_1.__decorate([
    NgModule({
        imports: [
            CommonModule, FormsModule, ReactiveFormsModule, FlexLayoutModule,
            ...ANGULAR_MATERIAL_MODULES, WidgetLibraryModule, JsonSchemaFormModule
        ],
        declarations: [...MATERIAL_FRAMEWORK_COMPONENTS],
        exports: [JsonSchemaFormModule, ...MATERIAL_FRAMEWORK_COMPONENTS],
        providers: [JsonSchemaFormService, FrameworkLibraryService, WidgetLibraryService,
            { provide: Framework, useClass: MaterialDesignFramework, multi: true }
        ],
        entryComponents: [...MATERIAL_FRAMEWORK_COMPONENTS]
    })
], MaterialDesignFrameworkModule);
export { MaterialDesignFrameworkModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0ZXJpYWwtZGVzaWduLWZyYW1ld29yay5tb2R1bGUuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9hbmd1bGFyNi1qc29uLXNjaGVtYS1mb3JtLyIsInNvdXJjZXMiOlsibGliL2ZyYW1ld29yay1saWJyYXJ5L21hdGVyaWFsLWRlc2lnbi1mcmFtZXdvcmsvbWF0ZXJpYWwtZGVzaWduLWZyYW1ld29yay5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN6QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RSxPQUFPLEVBQ0wscUJBQXFCLEVBQ3JCLGVBQWUsRUFDZixxQkFBcUIsRUFDckIsYUFBYSxFQUNiLGlCQUFpQixFQUNqQixjQUFjLEVBQ2QsbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsYUFBYSxFQUNiLGNBQWMsRUFDZCxtQkFBbUIsRUFDbkIsY0FBYyxFQUNkLGVBQWUsRUFDZixlQUFlLEVBQ2Ysb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2YsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRjs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRztJQUN0QyxxQkFBcUIsRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsYUFBYTtJQUM1RSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCO0lBQzFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsbUJBQW1CO0lBQ3RFLGNBQWMsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLG9CQUFvQjtJQUN0RSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZ0JBQWdCO0NBQ2xELENBQUM7QUFjRixJQUFhLDZCQUE2QixHQUExQyxNQUFhLDZCQUE2QjtDQUFJLENBQUE7QUFBakMsNkJBQTZCO0lBWnpDLFFBQVEsQ0FBQztRQUNSLE9BQU8sRUFBRTtZQUNQLFlBQVksRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCO1lBQ2hFLEdBQUcsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CO1NBQ3ZFO1FBQ0QsWUFBWSxFQUFFLENBQUMsR0FBRyw2QkFBNkIsQ0FBQztRQUNoRCxPQUFPLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLDZCQUE2QixDQUFDO1FBQ2pFLFNBQVMsRUFBRSxDQUFDLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLG9CQUFvQjtZQUM5RSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7U0FDdkU7UUFDRCxlQUFlLEVBQUUsQ0FBQyxHQUFHLDZCQUE2QixDQUFDO0tBQ3BELENBQUM7R0FDVyw2QkFBNkIsQ0FBSTtTQUFqQyw2QkFBNkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRmxleExheW91dE1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2ZsZXgtbGF5b3V0JztcbmltcG9ydCB7IEZvcm1zTW9kdWxlLCBSZWFjdGl2ZUZvcm1zTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgRnJhbWV3b3JrIH0gZnJvbSAnLi4vZnJhbWV3b3JrJztcbmltcG9ydCB7IEZyYW1ld29ya0xpYnJhcnlTZXJ2aWNlIH0gZnJvbSAnLi4vZnJhbWV3b3JrLWxpYnJhcnkuc2VydmljZSc7XG5pbXBvcnQgeyBKc29uU2NoZW1hRm9ybU1vZHVsZSB9IGZyb20gJy4uLy4uL2pzb24tc2NoZW1hLWZvcm0ubW9kdWxlJztcbmltcG9ydCB7IEpzb25TY2hlbWFGb3JtU2VydmljZSB9IGZyb20gJy4uLy4uL2pzb24tc2NoZW1hLWZvcm0uc2VydmljZSc7XG5pbXBvcnQge1xuICBNYXRBdXRvY29tcGxldGVNb2R1bGUsXG4gIE1hdEJ1dHRvbk1vZHVsZSxcbiAgTWF0QnV0dG9uVG9nZ2xlTW9kdWxlLFxuICBNYXRDYXJkTW9kdWxlLFxuICBNYXRDaGVja2JveE1vZHVsZSxcbiAgTWF0Q2hpcHNNb2R1bGUsXG4gIE1hdERhdGVwaWNrZXJNb2R1bGUsXG4gIE1hdEV4cGFuc2lvbk1vZHVsZSxcbiAgTWF0Rm9ybUZpZWxkTW9kdWxlLFxuICBNYXRJY29uTW9kdWxlLFxuICBNYXRJbnB1dE1vZHVsZSxcbiAgTWF0TmF0aXZlRGF0ZU1vZHVsZSxcbiAgTWF0UmFkaW9Nb2R1bGUsXG4gIE1hdFNlbGVjdE1vZHVsZSxcbiAgTWF0U2xpZGVyTW9kdWxlLFxuICBNYXRTbGlkZVRvZ2dsZU1vZHVsZSxcbiAgTWF0U3RlcHBlck1vZHVsZSxcbiAgTWF0VGFic01vZHVsZSxcbiAgTWF0VG9vbHRpcE1vZHVsZVxuICB9IGZyb20gJ0Bhbmd1bGFyL21hdGVyaWFsJztcbmltcG9ydCB7IE1BVEVSSUFMX0ZSQU1FV09SS19DT01QT05FTlRTIH0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgeyBNYXRlcmlhbERlc2lnbkZyYW1ld29yayB9IGZyb20gJy4vbWF0ZXJpYWwtZGVzaWduLmZyYW1ld29yayc7XG5pbXBvcnQgeyBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgV2lkZ2V0TGlicmFyeU1vZHVsZSB9IGZyb20gJy4uLy4uL3dpZGdldC1saWJyYXJ5L3dpZGdldC1saWJyYXJ5Lm1vZHVsZSc7XG5pbXBvcnQgeyBXaWRnZXRMaWJyYXJ5U2VydmljZSB9IGZyb20gJy4uLy4uL3dpZGdldC1saWJyYXJ5L3dpZGdldC1saWJyYXJ5LnNlcnZpY2UnO1xuLyoqXG4gKiB1bnVzZWQgQGFuZ3VsYXIvbWF0ZXJpYWwgbW9kdWxlczpcbiAqIE1hdERpYWxvZ01vZHVsZSwgTWF0R3JpZExpc3RNb2R1bGUsIE1hdExpc3RNb2R1bGUsIE1hdE1lbnVNb2R1bGUsXG4gKiBNYXRQYWdpbmF0b3JNb2R1bGUsIE1hdFByb2dyZXNzQmFyTW9kdWxlLCBNYXRQcm9ncmVzc1NwaW5uZXJNb2R1bGUsXG4gKiBNYXRTaWRlbmF2TW9kdWxlLCBNYXRTbmFja0Jhck1vZHVsZSwgTWF0U29ydE1vZHVsZSwgTWF0VGFibGVNb2R1bGUsXG4gKiBNYXRUb29sYmFyTW9kdWxlLFxuICovXG5leHBvcnQgY29uc3QgQU5HVUxBUl9NQVRFUklBTF9NT0RVTEVTID0gW1xuICBNYXRBdXRvY29tcGxldGVNb2R1bGUsIE1hdEJ1dHRvbk1vZHVsZSwgTWF0QnV0dG9uVG9nZ2xlTW9kdWxlLCBNYXRDYXJkTW9kdWxlLFxuICBNYXRDaGVja2JveE1vZHVsZSwgTWF0Q2hpcHNNb2R1bGUsIE1hdERhdGVwaWNrZXJNb2R1bGUsIE1hdEV4cGFuc2lvbk1vZHVsZSxcbiAgTWF0Rm9ybUZpZWxkTW9kdWxlLCBNYXRJY29uTW9kdWxlLCBNYXRJbnB1dE1vZHVsZSwgTWF0TmF0aXZlRGF0ZU1vZHVsZSxcbiAgTWF0UmFkaW9Nb2R1bGUsIE1hdFNlbGVjdE1vZHVsZSwgTWF0U2xpZGVyTW9kdWxlLCBNYXRTbGlkZVRvZ2dsZU1vZHVsZSxcbiAgTWF0U3RlcHBlck1vZHVsZSwgTWF0VGFic01vZHVsZSwgTWF0VG9vbHRpcE1vZHVsZSxcbl07XG5cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFtcbiAgICBDb21tb25Nb2R1bGUsIEZvcm1zTW9kdWxlLCBSZWFjdGl2ZUZvcm1zTW9kdWxlLCBGbGV4TGF5b3V0TW9kdWxlLFxuICAgIC4uLkFOR1VMQVJfTUFURVJJQUxfTU9EVUxFUywgV2lkZ2V0TGlicmFyeU1vZHVsZSwgSnNvblNjaGVtYUZvcm1Nb2R1bGVcbiAgXSxcbiAgZGVjbGFyYXRpb25zOiBbLi4uTUFURVJJQUxfRlJBTUVXT1JLX0NPTVBPTkVOVFNdLFxuICBleHBvcnRzOiBbSnNvblNjaGVtYUZvcm1Nb2R1bGUsIC4uLk1BVEVSSUFMX0ZSQU1FV09SS19DT01QT05FTlRTXSxcbiAgcHJvdmlkZXJzOiBbSnNvblNjaGVtYUZvcm1TZXJ2aWNlLCBGcmFtZXdvcmtMaWJyYXJ5U2VydmljZSwgV2lkZ2V0TGlicmFyeVNlcnZpY2UsXG4gICAgeyBwcm92aWRlOiBGcmFtZXdvcmssIHVzZUNsYXNzOiBNYXRlcmlhbERlc2lnbkZyYW1ld29yaywgbXVsdGk6IHRydWUgfVxuICBdLFxuICBlbnRyeUNvbXBvbmVudHM6IFsuLi5NQVRFUklBTF9GUkFNRVdPUktfQ09NUE9ORU5UU11cbn0pXG5leHBvcnQgY2xhc3MgTWF0ZXJpYWxEZXNpZ25GcmFtZXdvcmtNb2R1bGUgeyB9XG4iXX0=