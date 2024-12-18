import { CdkDrag, CdkDragDrop, CdkDropList, DropListOrientation, moveItemInArray } from "@angular/cdk/drag-drop";
import { NgStyle, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ContextMenuComponent, MenuItemComponent, MenuItemTextTemplateDirective } from "@mirei/mona-ui";
import { map } from "rxjs";
import { Orientation } from "../../data/Orientation";
import { Panel } from "../../data/Panel";
import { PanelViewMode } from "../../data/PanelViewMode";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";
import { PanelContextMenuComponent } from "../panel-context-menu/panel-context-menu.component";
import { ContainsPipe } from "../../pipes/contains.pipe";

@Component({
    selector: "mona-panel-header-list",
    imports: [
        CdkDrag,
        CdkDropList,
        NgTemplateOutlet,
        ContextMenuComponent,
        MenuItemComponent,
        MenuItemTextTemplateDirective,
        NgStyle,
        PanelContextMenuComponent,
        ContainsPipe
    ],
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
            .where(panel => panel.position() === this.position() && panel.priority() === this.priority())
            .orderBy(panel => panel.index())
            .toImmutableList();
    });
    protected readonly panelsInitialized = toSignal(this.layoutService.layoutReady$.pipe(map(() => true)), {
        initialValue: false
    });
    public readonly orientation = input.required<Orientation>();
    public readonly position = input.required<Position>();
    public readonly priority = input.required<Priority>();

    public movePanel(panel: Panel, position: Position, priority: Priority): void {
        this.layoutService.panelMove$.next({
            panel: panel,
            oldPosition: panel.position(),
            newPosition: position,
            oldPriority: panel.priority(),
            newPriority: priority,
            wasOpenBefore: this.layoutService.isPanelOpen(panel)
        });
        this.layoutService.saveLayout();
    }

    public onPanelHeaderClicked(panel: Panel): void {
        const open = this.layoutService.isPanelOpen(panel);
        if (open) {
            this.layoutService.panelCloseStart$.next({ panel, viaUser: true });
        } else {
            this.layoutService.panelOpenStart$.next({ panel, viaUser: true });
        }
    }

    public onPanelHeadersReordered(event: CdkDragDrop<string>, position: Position, priority: Priority): void {
        this.layoutService.panels.update(list => {
            const [headerPanels, otherPanels] = list.partition(
                p => p.position() === position && p.priority() === priority
            );
            const panel = headerPanels.firstOrDefault(p => p.index() === event.previousIndex);
            if (panel) {
                const orderedPanels = headerPanels.orderBy(p => p.index()).toArray();
                moveItemInArray(orderedPanels, event.previousIndex, event.currentIndex);
                orderedPanels.forEach((p, px) => p.index.set(px));
                return otherPanels.concat(orderedPanels).toImmutableList();
            }
            return list;
        });
        this.layoutService.saveLayout();
    }

    public onViewModeChange(panel: Panel, viewMode: PanelViewMode): void {
        panel.viewMode.set(viewMode);
        this.layoutService.saveLayout();
    }

    public togglePanel(panel: Panel, open: boolean): void {
        if (open) {
            this.layoutService.panelOpenStart$.next({ panel, viaUser: true });
        } else {
            this.layoutService.panelCloseStart$.next({ panel, viaUser: true });
        }
    }
}
