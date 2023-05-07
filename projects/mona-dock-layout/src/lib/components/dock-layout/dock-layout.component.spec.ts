import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DockLayoutComponent } from './dock-layout.component';

describe('DockLayoutComponent', () => {
  let component: DockLayoutComponent;
  let fixture: ComponentFixture<DockLayoutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DockLayoutComponent]
    });
    fixture = TestBed.createComponent(DockLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
