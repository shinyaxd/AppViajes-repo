import { TestBed } from '@angular/core/testing';
import { AuthInterceptorTour } from './auth.interceptor';

describe('AuthInterceptorTour', () => {
  let interceptor: AuthInterceptorTour;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AuthInterceptorTour] });
    interceptor = TestBed.inject(AuthInterceptorTour);
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});
