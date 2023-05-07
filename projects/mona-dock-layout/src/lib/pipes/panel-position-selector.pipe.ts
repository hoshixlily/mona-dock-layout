import { Pipe, PipeTransform } from "@angular/core";
import { Panel } from "../data/Panel";
import { Position } from "../data/Position";
import { Priority } from "../data/Priority";

@Pipe({
    name: "panelPositionSelector"
})
export class PanelPositionSelectorPipe implements PipeTransform {
    public transform(value: Panel[], ...args: [Position, Priority]): Panel[] {
        value.sort((p1, p2) => p1.index - p2.index);
        return value.filter(panel => panel.position === args[0] && panel.priority === args[1]);
    }
}
