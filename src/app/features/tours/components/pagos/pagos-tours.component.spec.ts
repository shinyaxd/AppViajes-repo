import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagosToursComponent } from './pagos-tours.component';

describe('PagosToursComponent', () => {
  let component: PagosToursComponent;
  let fixture: ComponentFixture<PagosToursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagosToursComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagosToursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
