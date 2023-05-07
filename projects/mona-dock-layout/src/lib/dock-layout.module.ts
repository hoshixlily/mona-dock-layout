import { NgModule } from "@angular/core";
import { PanelTemplateReferenceDirective } from "./directives/panel-template-reference.directive";
import { PanelContentAnchorDirective } from "./directives/panel-content-anchor.directive";
import { PanelContentTemplateDirective } from "./directives/panel-content-template.directive";
import { LayoutContentTemplateDirective } from "./directives/layout-content-template.directive";
import { PanelTitleTemplateDirective } from "./directives/panel-title-template.directive";
import { PanelActionTemplateDirective } from "./directives/panel-action-template.directive";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PanelPositionSelectorPipe } from "./pipes/panel-position-selector.pipe";
import { PanelComponent } from "./components/panel/panel.component";
import { ContextMenuModule } from "@mirei/mona-ui";
import { PanelGroupComponent } from "./components/panel-group/panel-group.component";
import { DockPanelComponent } from "./components/dock-panel/dock-panel.component";
import { ContainerComponent } from "./components/container/container.component";
import { DockLayoutComponent } from "./components/dock-layout/dock-layout.component";

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
    imports: [CommonModule, DragDropModule, FontAwesomeModule, ContextMenuModule],
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
