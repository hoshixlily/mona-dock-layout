import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { orderBy } from "@mirei/ts-collections";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-panel-group",
    templateUrl: "./panel-group.component.html",
    styleUrls: ["./panel-group.component.scss"],
    changeDetection: ChangeDetectionStrategy.Default
})
export class PanelGroupComponent {
    protected readonly groupPanels = computed(() => {
        const panels = this.layoutService.panels();
        const position = this.position();
        const priority = this.priority();
        return orderBy(panels, p => p.index())
            .where(p => p.position() === position && p.priority() === priority)
            .toImmutableSet();
    });
    protected readonly layoutService = inject(LayoutService);

    public position = input.required<Position>();
    public priority = input.required<Priority>();
}
