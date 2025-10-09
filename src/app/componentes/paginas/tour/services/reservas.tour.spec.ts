import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReservasTourService } from './reservas.tour.service';

describe('ReservasTourService', () => {
  let service: ReservasTourService;

  beforeEach(() => {
    TestBed.configureTestingModule({ 
      imports: [HttpClientTestingModule],
      providers: [ReservasTourService]
    });
    service = TestBed.inject(ReservasTourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
