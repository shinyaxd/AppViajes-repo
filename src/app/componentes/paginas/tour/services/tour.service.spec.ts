import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TourService } from './tour.service';

describe('TourService', () => {
  let service: TourService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [TourService] });
    service = TestBed.inject(TourService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch tours', (done) => {
    service.getTours().subscribe(t => { expect(Array.isArray(t)).toBeTrue(); done(); });
    const req = httpMock.expectOne(r => r.url.includes('/api/tours'));
    req.flush({ data: [] });
  });
});
