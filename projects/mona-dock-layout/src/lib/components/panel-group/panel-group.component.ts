import { Component, computed, Input, Signal, signal, WritableSignal } from "@angular/core";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-panel-group",
    templateUrl: "./panel-group.component.html",
    styleUrls: ["./panel-group.component.scss"]
})
export class PanelGroupComponent {
    readonly #position: WritableSignal<Position> = signal("left");
    readonly #priority: WritableSignal<Priority> = signal("primary");
    protected readonly groupPanels: Signal<Panel[]> = computed(() => {
        const panels = this.layoutService.panels();
        const sortedPanels = [...panels].sort((p1, p2) => p1.index - p2.index);
        return sortedPanels.filter(panel => panel.position === this.#position() && panel.priority === this.#priority());
    });

    @Input()
    public set position(value: Position) {
        this.#position.set(value);
    }

    @Input()
    public set priority(value: Priority) {
        this.#priority.set(value);
    }

    public constructor(public readonly layoutService: LayoutService) {}
}
