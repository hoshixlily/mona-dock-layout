import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { ContextMenuComponent, MenuItemComponent, MenuItemTextTemplateDirective } from "@mirei/mona-ui";
import { ContainerComponent } from "./components/container/container.component";
import { DockLayoutComponent } from "./components/dock-layout/dock-layout.component";
import { DockPanelComponent } from "./components/dock-panel/dock-panel.component";
import { PanelGroupComponent } from "./components/panel-group/panel-group.component";
import { PanelComponent } from "./components/panel/panel.component";
import { LayoutContentTemplateDirective } from "./directives/layout-content-template.directive";
import { PanelActionTemplateDirective } from "./directives/panel-action-template.directive";
import { PanelContentAnchorDirective } from "./directives/panel-content-anchor.directive";
import { PanelContentTemplateDirective } from "./directives/panel-content-template.directive";
import { PanelTemplateReferenceDirective } from "./directives/panel-template-reference.directive";
import { PanelTitleTemplateDirective } from "./directives/panel-title-template.directive";
import { PanelPositionSelectorPipe } from "./pipes/panel-position-selector.pipe";

@NgModule({
    declarations: [
        PanelTemplateReferenceDirective,
        PanelContentAnchorDirective,
        PanelContentTemplateDirective,
        LayoutContentTemplateDirective,
        PanelTitleTemplateDirective,
        PanelActionTemplateDirective,
        PanelPositionSelectorPipe,
        PanelComponent,
        PanelGroupComponent,
        DockPanelComponent,
        ContainerComponent,
        DockLayoutComponent
    ],
    imports: [
        CommonModule,
        DragDropModule,
        FontAwesomeModule,
        ContextMenuComponent,
        MenuItemComponent,
        MenuItemTextTemplateDirective
    ],
    exports: [
        DockLayoutComponent,
        DockPanelComponent,
        PanelContentTemplateDirective,
        LayoutContentTemplateDirective,
        PanelTitleTemplateDirective,
        PanelActionTemplateDirective
    ]
})
export class DockLayoutModule {}
