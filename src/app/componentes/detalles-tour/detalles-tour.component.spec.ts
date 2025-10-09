import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DetallesTourComponent } from './detalles-tour.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DetallesTourComponent', () => {
  let component: DetallesTourComponent;
  let fixture: ComponentFixture<DetallesTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallesTourComponent, HttpClientTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }]
    }).compileComponents();

    fixture = TestBed.createComponent(DetallesTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
