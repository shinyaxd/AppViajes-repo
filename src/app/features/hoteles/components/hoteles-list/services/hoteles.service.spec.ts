import { TestBed } from '@angular/core/testing';

import { HotelService } from './hoteles.service';

describe('HotelesService', () => {
  let service: HotelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
