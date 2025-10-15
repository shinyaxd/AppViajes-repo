import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultadosHOTELESComponent } from './resultados-hoteles.component';

describe('ResultadosHOTELESComponent', () => {
  let component: ResultadosHOTELESComponent;
  let fixture: ComponentFixture<ResultadosHOTELESComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultadosHOTELESComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultadosHOTELESComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
