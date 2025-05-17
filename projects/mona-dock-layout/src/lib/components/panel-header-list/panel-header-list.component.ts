import { CdkDrag, CdkDragDrop, CdkDropList, DropListOrientation, moveItemInArray } from "@angular/cdk/drag-drop";
import { NgStyle } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { Orientation } from "../../data/Orientation";
import { Panel } from "../../data/Panel";
import { MoveStage } from "../../data/PanelMoveEvent";
import { PanelViewMode } from "../../data/PanelViewMode";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { ContainsPipe } from "../../pipes/contains.pipe";
import { LayoutService } from "../../services/layout.service";
import { PanelContextMenuComponent } from "../panel-context-menu/panel-context-menu.component";

@Component({
    selector: "mona-panel-header-list",
    imports: [CdkDrag, CdkDropList, NgStyle, PanelContextMenuComponent, ContainsPipe],
    templateUrl: "./panel-header-list.component.html",
    styleUrl: "./panel-header-list.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelHeaderListComponent {
    protected readonly dropListOrientation = computed(() => {
        return this.orientation() as DropListOrientation;
    });
    protected readonly headerListStyles = computed<Partial<CSSStyleDeclaration>>(() => {
        const initialized = this.panelsInitialized();
        return {
            visibility: initialized ? undefined : "hidden"
        };
    });
    protected readonly layoutService = inject(LayoutService);
    protected readonly panels = computed(() => {
        return this.layoutService
            .panels()
            .where(panel => panel.position === this.position() && panel.priority === this.priority())
            .orderBy(panel => panel.index)
            .toImmutableList();
    });
    protected readonly panelsInitialized = toSignal(this.layoutService.layoutReady$.pipe(map(() => true)), {
        initialValue: false
    });
    protected readonly visiblePanelIdSet = computed(() => {
        return this.layoutService
            .panelVisibilityDict()
            .where(p => p.value)
            .select(p => p.key)
            .toImmutableSet();
    });
    public readonly orientation = input.required<Orientation>();
    public readonly position = input.required<Position>();
    public readonly priority = input.required<Priority>();

    public movePanel(panel: Panel, position: Position, priority: Priority): void {
        this.layoutService.panelMove$.next({
            panel: panel,
            oldPosition: panel.position,
            newPosition: position,
            oldPriority: panel.priority,
            newPriority: priority,
            stage: MoveStage.Close,
            wasOpenBefore: this.layoutService.isPanelOpen(panel.id)
        });
        this.layoutService.saveLayout();
    }

    public onPanelHeaderClicked(panel: Panel): void {
        const open = this.layoutService.isPanelOpen(panel.id);
        this.togglePanel(panel, !open);
    }

    public onPanelHeadersReordered(event: CdkDragDrop<string>, position: Position, priority: Priority): void {
        const headerPanels = this.layoutService
            .panels()
            .where(p => p.position === position && p.priority === priority)
            .orderBy(p => p.index)
            .toArray();
        moveItemInArray(headerPanels, event.previousIndex, event.currentIndex);
        headerPanels.forEach((p, px) => this.layoutService.updatePanel({ id: p.id, index: px }));
        this.layoutService.saveLayout();
    }

    public onViewModeChange(panel: Panel, viewMode: PanelViewMode): void {
        this.layoutService.setPanelViewMode(panel.id, viewMode);
        this.layoutService.saveLayout();
    }

    public togglePanel(panel: Panel, open: boolean): void {
        if (open) {
            this.layoutService.openPanel(panel.id);
        } else {
            this.layoutService.closePanel(panel.id);
        }
    }
}
