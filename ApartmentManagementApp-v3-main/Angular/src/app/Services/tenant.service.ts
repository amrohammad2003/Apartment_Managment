import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getTenantProfile(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tenants/${id}/profile`, { withCredentials: true });
  }

    updateTenantProfile(id: number, data: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.put(`${this.apiUrl}/tenants/${id}`, data, {
      headers: headers,
      withCredentials: true  // Important for CORS with credentials
    });
  }

  updateTenantPassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.apiUrl}/tenants/update-password`, data, { 
      headers,
      withCredentials: true 
    }).pipe(
      catchError((error: any) => {
        console.error('Password update error:', error);
        return throwError(() => error);
      })
    );
  }

  getTenantContracts(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tenants/${id}/contracts`, { withCredentials: true }).pipe(
      catchError((error: any) => {
        console.error('Contracts fetch error:', error);
        return throwError(() => error);
      })
    );
  }

  getTenantTransactions(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tenants/${id}/transactions`, { withCredentials: true }).pipe(
      catchError((error: any) => {
        console.error('Transactions fetch error:', error);
        return throwError(() => error);
      })
    );
  }
  

  getTenantMaintenanceRequests(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tenants/${id}/maintenance`, { withCredentials: true }).pipe(
      catchError((error: any) => {
        console.error('Maintenance requests fetch error:', error);
        return throwError(() => error);
      })
    );
  }
}