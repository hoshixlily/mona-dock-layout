import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { ContextMenuComponent, MenuItemComponent } from "@mirei/mona-ui";
import { Panel } from "../../data/Panel";
import { PanelViewMode } from "../../data/PanelViewMode";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";

@Component({
    selector: "mona-panel-context-menu",
    standalone: true,
    imports: [ContextMenuComponent, MenuItemComponent],
    templateUrl: "./panel-context-menu.component.html",
    styleUrl: "./panel-context-menu.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelContextMenuComponent {
    protected readonly PanelViewMode = PanelViewMode;
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
