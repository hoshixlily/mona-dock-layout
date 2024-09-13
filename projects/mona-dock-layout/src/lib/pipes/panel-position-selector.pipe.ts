import { Pipe, PipeTransform } from "@angular/core";
import { orderBy } from "@mirei/ts-collections";
import { Panel } from "../data/Panel";
import { Position } from "../data/Position";
import { Priority } from "../data/Priority";

@Pipe({
    name: "panelPositionSelector"
})
export class PanelPositionSelectorPipe implements PipeTransform {
    public transform(value: Iterable<Panel>, ...args: [Position, Priority]): Panel[] {
        return orderBy(value, panel => panel.index)
            .where(panel => panel.position === args[0] && panel.priority === args[1])
            .toArray();
    }
}
