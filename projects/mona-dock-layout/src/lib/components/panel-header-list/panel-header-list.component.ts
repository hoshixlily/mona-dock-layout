import { CdkDrag, CdkDragDrop, CdkDropList, DropListOrientation } from "@angular/cdk/drag-drop";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { ContextMenuComponent, MenuItemComponent, MenuItemTextTemplateDirective } from "@mirei/mona-ui";
import { Orientation } from "../../data/Orientation";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-panel-header-list",
    standalone: true,
    imports: [
        CdkDrag,
        CdkDropList,
        NgTemplateOutlet,
        ContextMenuComponent,
        MenuItemComponent,
        MenuItemTextTemplateDirective
    ],
    templateUrl: "./panel-header-list.component.html",
    styleUrl: "./panel-header-list.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelHeaderListComponent {
    protected readonly dropListOrientation = computed(() => {
        return this.orientation() as DropListOrientation;
    });
    protected readonly layoutService = inject(LayoutService);
    protected readonly panels = computed(() => {
        return this.layoutService
            .panels()
            .where(panel => panel.position() === this.position() && panel.priority() === this.priority())
            .toArray();
    });
    public readonly orientation = input.required<Orientation>();
    public readonly position = input.required<Position>();
    public readonly priority = input.required<Priority>();

    public movePanel(panel: Panel, position: Position, priority: Priority): void {
        this.layoutService.detachPanelContent(panel);
        this.layoutService.panelMove$.next({
            panel: panel,
            oldPosition: panel.position(),
            newPosition: position,
            oldPriority: panel.priority(),
            newPriority: priority,
            wasOpenBefore: panel.open()
        });
        this.layoutService.saveLayout();
    }

    public onPanelHeaderClicked(panel: Panel): void {
        if (panel.open()) {
            this.layoutService.panelClose$.next({ panel, viaUser: true });
        } else {
            this.layoutService.panelOpen$.next({ panel, viaUser: true });
        }
    }

    public onPanelHeadersReordered(event: CdkDragDrop<string>, position: Position, priority: Priority): void {
        this.layoutService.panels.update(list => {
            const [headerPanels, otherPanels] = list.partition(
                p => p.position() === position && p.priority() === priority
            );
            const panel = headerPanels.firstOrDefault(p => p.index() === event.previousIndex);
            if (panel) {
                const orderedPanels = headerPanels.toList();
                orderedPanels.removeAt(event.previousIndex);
                orderedPanels.addAt(panel, event.currentIndex);
                orderedPanels.forEach((p, i) => {
                    p.index.set(i);
                });
                return otherPanels.concat(orderedPanels).toImmutableList();
            }
            return list;
        });
        this.layoutService.saveLayout();
    }

    public setPanelPinned(panel: Panel, pinned: boolean): void {
        panel.pinned.set(pinned);
        this.layoutService.saveLayout();
    }

    public togglePanel(panel: Panel, open: boolean): void {
        if (open) {
            this.layoutService.panelOpen$.next({ panel, viaUser: true });
        } else {
            this.layoutService.panelClose$.next({ panel, viaUser: true });
        }
    }
}
