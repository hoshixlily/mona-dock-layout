import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { where } from "@mirei/ts-collections";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";
import { PanelComponent } from "../panel/panel.component";
import { NgStyle } from "@angular/common";

@Component({
    selector: "mona-panel-group",
    templateUrl: "./panel-group.component.html",
    styleUrls: ["./panel-group.component.scss"],
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: true,
    imports: [PanelComponent, NgStyle]
})
export class PanelGroupComponent {
    protected readonly groupPanels = computed(() => {
        const panels = this.layoutService.panels();
        const position = this.position();
        const priority = this.priority();
        return where(panels, p => p.position() === position && p.priority() === priority)
            .orderBy(p => p.index())
            .toArray();
    });
    protected readonly layoutService = inject(LayoutService);

    public position = input.required<Position>();
    public priority = input.required<Priority>();
}
