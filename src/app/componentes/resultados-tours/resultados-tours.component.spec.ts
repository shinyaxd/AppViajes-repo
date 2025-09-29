import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultadosTOURSComponent } from './resultados-tours.component';

describe('ResultadosTOURSComponent', () => {
  let component: ResultadosTOURSComponent;
  let fixture: ComponentFixture<ResultadosTOURSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultadosTOURSComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultadosTOURSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
