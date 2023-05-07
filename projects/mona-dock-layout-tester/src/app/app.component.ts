import { Component } from "@angular/core";
import {
    LayoutApi,
    LayoutPosition,
    LayoutReadyEvent,
    PanelCloseEvent,
    PanelOpenEvent,
    PanelPriority
} from "mona-dock-layout";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faArrowTurnDown, faFileExport } from "@fortawesome/free-solid-svg-icons";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"]
})
export class AppComponent {
    public readonly ArrowDownIcon: IconDefinition = faArrowTurnDown;
    public readonly ExportIcon: IconDefinition = faFileExport;
    public gridColumns: Array<{ field: string; title: string }> = [
        { field: "id", title: "ID" },
        { field: "name", title: "Name" },
        { field: "age", title: "Age" },
        { field: "city", title: "City" }
    ];
    public gridData: Array<unknown> = [
        { id: 1, name: "John", age: 30, city: "New York" },
        { id: 2, name: "Jane", age: 25, city: "Miami" },
        { id: 3, name: "Bob", age: 20, city: "London" },
        { id: 4, name: "Mary", age: 35, city: "Paris" },
        { id: 5, name: "Sam", age: 45, city: "Tokyo" },
        { id: 6, name: "Tom", age: 50, city: "Sydney" },
        { id: 7, name: "Jack", age: 55, city: "Melbourne" },
        { id: 8, name: "Peter", age: 60, city: "New York" },
        { id: 9, name: "Mike", age: 65, city: "Miami" },
        { id: 10, name: "John", age: 30, city: "London" }
    ];
    public layoutApi!: LayoutApi;
    public panelVisibility: boolean = false;
    public propertiesPanelVisible: boolean = true;

    public closePanel(panelId: string): void {
        this.layoutApi.closePanel(panelId);
    }

    public movePanel(panelId: string, position: LayoutPosition, priority: PanelPriority): void {
        this.layoutApi.movePanel(panelId, position, priority);
    }

    public onLayoutReady(event: LayoutReadyEvent): void {
        console.log("Layout ready: ", event);
        this.layoutApi = event.api;
        // window.setInterval(() => {
        //     this.propertiesPanelVisible = !this.propertiesPanelVisible;
        // }, 5000);
    }

    public onPanelClose(event: PanelCloseEvent): void {
        console.log("Panel closed: ", event);
    }

    public onPanelOpen(event: PanelOpenEvent): void {
        console.log("Panel opened: ", event);
    }

    public openPanel(panelId: string): void {
        this.layoutApi.openPanel(panelId);
    }

    public print(param: unknown): void {
        console.log(param);
    }

    public setPanelVisibility(panelId: string): void {
        this.layoutApi.setPanelVisible(panelId, this.panelVisibility);
        this.panelVisibility = !this.panelVisibility;
    }
}
