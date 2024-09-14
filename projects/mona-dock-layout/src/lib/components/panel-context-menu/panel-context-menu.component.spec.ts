import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelContextMenuComponent } from './panel-context-menu.component';

describe('PanelContextMenuComponent', () => {
  let component: PanelContextMenuComponent;
  let fixture: ComponentFixture<PanelContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelContextMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
