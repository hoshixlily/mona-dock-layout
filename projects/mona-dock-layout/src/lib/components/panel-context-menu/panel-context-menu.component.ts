import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { ContextMenuComponent, MenuItemComponent } from "@mirei/mona-ui";
import { Panel } from "../../data/Panel";
import { PanelViewMode } from "../../data/PanelViewMode";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";
import { ContainsPipe } from "../../pipes/contains.pipe";

@Component({
    selector: "mona-panel-context-menu",
    imports: [ContextMenuComponent, MenuItemComponent, ContainsPipe],
    templateUrl: "./panel-context-menu.component.html",
    styleUrl: "./panel-context-menu.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelContextMenuComponent {
    protected readonly PanelViewMode = PanelViewMode;
    protected readonly layoutService = inject(LayoutService);
    protected readonly viewMode = computed(() => {
        const panel = this.panel();
        return this.layoutService.getPanelViewMode(panel.id);
    });
    public readonly move = output<[Position, Priority]>();
    public readonly moveMenuVisible = input(true);
    public readonly panel = input.required<Panel>();
    public readonly target = input.required<HTMLElement>();
    public readonly trigger = input.required<"click" | "contextmenu">();
    public readonly toggle = output<boolean>();
    public readonly viewModeChange = output<PanelViewMode>();

    public onPanelMove(position: Position, priority: Priority): void {
        this.move.emit([position, priority]);
    }

    public onPanelToggle(value: boolean): void {
        this.toggle.emit(value);
    }

    public onViewModeChange(viewMode: PanelViewMode): void {
        this.viewModeChange.emit(viewMode);
    }
}
