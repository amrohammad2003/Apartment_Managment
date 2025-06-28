import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MaintenanceRequest } from '../models/maintenance-request.model';
import { Technician } from '../models/technician.model'; // Updated import

interface TechnicianStats {
  total: number;
  pending: number;
  completed: number;
}

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  avatar?: string;
  phone_number?: string;
  job?: string;
  facebook_link?: string;
}

@Injectable({ providedIn: 'root' })
export class TechnicianService {
  private apiUrl = 'http://localhost:5000/api';
  private currentTechnicianId = new BehaviorSubject<number | null>(null);
  currentTechnicianId$ = this.currentTechnicianId.asObservable();
constructor(private http: HttpClient, private router: Router) {
  const storedId = localStorage.getItem('technician_id');
  if (storedId) {
    this.currentTechnicianId.next(Number(storedId));
  }
}


  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      throw new Error('No authentication token found');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Maintenance Requests
  getTechnicianRequests(technicianId: number): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequest[]>(
      `${this.apiUrl}/technician/${technicianId}/requests`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
restoreTechnicianIdFromStorage() {
  const storedId = localStorage.getItem('technician_id');
  if (storedId) {
    this.setTechnicianId(Number(storedId));
  }
}

  getPendingRequests(technicianId: number): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequest[]>(
      `${this.apiUrl}/technician/${technicianId}/requests/pending`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  respondToRequest(requestId: number, response: 'Accepted' | 'Rejected'): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/maintenance-requests/${requestId}`,
      { status: response === 'Accepted' ? 'In Progress' : 'Rejected' },
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  submitProposal(requestId: number, data: { 
    proposed_cost: number;
    proposed_duration: string 
  }): Observable<MaintenanceRequest> {
    return this.http.put<MaintenanceRequest>(
      `${this.apiUrl}/maintenance-requests/${requestId}/propose`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Technician Profile
  getTechnicianProfile(id: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${this.apiUrl}/technicians/${id}/profile`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateTechnicianProfile(id: number, profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(
      `${this.apiUrl}/technicians/${id}/profile`,
      profile,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateTechnicianPassword(data: { 
    currentPassword: string; 
    newPassword: string 
  }): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/technicians/update-password`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Technician Stats
  getTechnicianStats(technicianId: number): Observable<TechnicianStats> {
    return this.http.get<TechnicianStats>(
      `${this.apiUrl}/technician/${technicianId}/stats`,
      { 
        headers: this.getAuthHeaders(),
        params: { exclude_rejected: 'true' }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Technician Management
  // Updated return type to Observable<Technician[]>
  getAllTechnicians(filters?: {
    name?: string;
    job?: string;
    status?: string;
  }): Observable<Technician[]> {
    let params = new HttpParams();
    if (filters?.name) params = params.set('name', filters.name);
    if (filters?.job) params = params.set('job', filters.job);
    if (filters?.status) params = params.set('status', filters.status);

    return this.http.get<Technician[]>(
      `${this.apiUrl}/technicians`,
      { 
        headers: this.getAuthHeaders(),
        params 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getAvailableTechnicians(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(
      `${this.apiUrl}/technicians`,
      { 
        headers: this.getAuthHeaders(),
        params: { status: 'available' }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Utility Methods
  setTechnicianId(id: number): void {
    this.currentTechnicianId.next(id);
    localStorage.setItem('technician_id', id.toString());
  }

  getCurrentTechnicianId(): number | null {
    const id = localStorage.getItem('technician_id');
    return id ? Number(id) : null;
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    if (error.status === 401) {
      errorMessage = 'Session expired. Please login again.';
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      this.router.navigate(['/login']);
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
