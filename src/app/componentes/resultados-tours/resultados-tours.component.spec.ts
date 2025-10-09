import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ResultadosTOURSComponent } from './resultados-tours.component';

describe('ResultadosTOURSComponent', () => {
  let component: ResultadosTOURSComponent;
  let fixture: ComponentFixture<ResultadosTOURSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultadosTOURSComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
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
