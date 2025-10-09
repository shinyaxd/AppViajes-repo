import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthTourService } from './auth.service';

describe('AuthTourService', () => {
  let service: AuthTourService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [AuthTourService] });
    service = TestBed.inject(AuthTourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
