import { Component, Input } from "@angular/core";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-panel-group",
    templateUrl: "./panel-group.component.html",
    styleUrls: ["./panel-group.component.scss"]
})
export class PanelGroupComponent {
    @Input() public position: Position = "left";
    @Input() public priority: Priority = "primary";

    public constructor(public readonly layoutService: LayoutService) {}
}
