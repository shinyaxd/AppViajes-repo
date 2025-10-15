import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagosHotelesComponent } from './pagos-hoteles.component';

describe('PagosHotelesComponent', () => {
  let component: PagosHotelesComponent;
  let fixture: ComponentFixture<PagosHotelesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagosHotelesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagosHotelesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
