import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelGroupComponent } from './panel-group.component';

describe('PanelGroupComponent', () => {
  let component: PanelGroupComponent;
  let fixture: ComponentFixture<PanelGroupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PanelGroupComponent]
    });
    fixture = TestBed.createComponent(PanelGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
