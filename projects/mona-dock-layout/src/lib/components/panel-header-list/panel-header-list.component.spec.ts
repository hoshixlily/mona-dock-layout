import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PanelHeaderListComponent } from "./panel-header-list.component";

describe("PanelHeaderListComponent", () => {
    let component: PanelHeaderListComponent;
    let fixture: ComponentFixture<PanelHeaderListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PanelHeaderListComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(PanelHeaderListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
