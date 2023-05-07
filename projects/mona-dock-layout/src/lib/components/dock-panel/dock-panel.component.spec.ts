import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DockPanelComponent } from './dock-panel.component';

describe('DockPanelComponent', () => {
  let component: DockPanelComponent;
  let fixture: ComponentFixture<DockPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DockPanelComponent]
    });
    fixture = TestBed.createComponent(DockPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
