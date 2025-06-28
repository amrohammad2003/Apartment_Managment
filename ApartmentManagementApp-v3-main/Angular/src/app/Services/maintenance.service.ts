import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MaintenanceRequest } from '../models/maintenance-request.model';
import { Observable, catchError, throwError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private apiBaseUrl = 'http://localhost:5000/api'; // Changed to match your Flask server port

  constructor(private http: HttpClient) {}

  // Get all maintenance requests
  getMaintenanceRequests(userId?: number): Observable<MaintenanceRequest[]> {
    const url = userId 
      ? `${this.apiBaseUrl}/maintenance-requests?user_id=${userId}`
      : `${this.apiBaseUrl}/maintenance-requests`;
    
    return this.http.get<MaintenanceRequest[]>(url).pipe(
      catchError(err => {
        console.error('Error fetching maintenance requests:', err);
        return of([]);
      })
    );
  }

  // Get requests by technician ID
  getRequestsByTechnician(id: number): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequest[]>(
      `${this.apiBaseUrl}/technician/${id}/requests`
    ).pipe(
      catchError(err => {
        console.error('API Error:', err);
        return of([]);
      })
    );
  }

  // Get request details by ID
  getRequestById(requestId: number): Observable<MaintenanceRequest | null> {
    return this.http.get<MaintenanceRequest>(
      `${this.apiBaseUrl}/maintenance-requests/${requestId}`
    ).pipe(
      catchError(err => {
        console.error('Error fetching request details:', err);
        return of(null);
      })
    );
  }

  // Create new maintenance request
  createRequest(requestData: FormData): Observable<MaintenanceRequest> {
    return this.http.post<MaintenanceRequest>(
      `${this.apiBaseUrl}/maintenance-requests`,
      requestData
    );
  }

  // Update request status
  updateRequestStatus(id: number, status: string): Observable<MaintenanceRequest> {
    return this.http.patch<MaintenanceRequest>(
      `${this.apiBaseUrl}/maintenance-requests/${id}/status`,
      { status }
    );
  }

  // Submit technician proposal
  submitProposal(requestId: number, proposalData: { 
    proposedCost: number, 
    proposedDuration: string 
  }): Observable<MaintenanceRequest> {
    return this.http.put<MaintenanceRequest>(
      `${this.apiBaseUrl}/maintenance-requests/${requestId}/propose`,
      proposalData
    );
  }

  // Confirm proposal (new method)
  confirmProposal(requestId: number, scheduledDate?: string): Observable<MaintenanceRequest> {
    const payload = {
      cost_confirmed: true,
      status: 'Approved',
      scheduled_date: scheduledDate || new Date().toISOString()
    };

    return this.http.put<MaintenanceRequest>(
      `${this.apiBaseUrl}/maintenance-requests/${requestId}/confirm`,
      payload
    ).pipe(
      catchError(err => {
        console.error('Failed to confirm proposal:', err);
        return throwError(() => new Error('Failed to confirm proposal'));
      })
    );
  }

  // Reject proposal
  rejectProposal(requestId: number, reason: string): Observable<MaintenanceRequest> {
    return this.http.put<MaintenanceRequest>(
      `${this.apiBaseUrl}/maintenance-requests/${requestId}/reject`,
      { 
        cost_confirmed: false,
        status: 'Pending',
        response: reason 
      }
    );
  }
}