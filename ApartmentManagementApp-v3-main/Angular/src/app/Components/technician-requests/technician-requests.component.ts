import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TechnicianService } from '../../Services/technician.service';
import { Router } from '@angular/router';
import { MaintenanceTopbarComponent } from '../TopBar/maintenance-topbar/maintenance-topbar.component';

@Component({
  selector: 'app-technician-requests',
  standalone: true,
  templateUrl: './technician-requests.component.html',
  styleUrls: ['./technician-requests.component.css'],
  imports: [CommonModule, HttpClientModule, FormsModule, MaintenanceTopbarComponent]
})
export class TechnicianRequestsComponent implements OnInit {
  private http = inject(HttpClient);
  private technicianService = inject(TechnicianService);
  private router = inject(Router);

  technicianId = 0;
  requests = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  today = new Date().toISOString().split('T')[0];
  editedRequestIds = new Set<number>();
  processingRequests = signal<number[]>([]);
  showImageModal = signal<boolean>(false);
  selectedImage = signal<string | null>(null);

  searchQuery = signal<string>('');
  statusFilter = signal<string>('All');
  statusOptions = ['All', 'Pending Confirmation', 'Approved', 'In Progress', 'Completed'];

  ngOnInit() {
    this.technicianService.currentTechnicianId$.subscribe(id => {
      if (id !== null) {
        this.technicianId = id;
        this.loadRequests();
      } else {
        this.loading.set(false);
        this.error.set('Technician ID not available.');
      }
    });
  }

  // Helper method to truncate text
  truncateText(text: string, limit = 100): string {
    if (!text) return '';
    return text.length <= limit ? text : text.substring(0, limit) + '...';
  }

  // Image handling methods
  getSanitizedImages(images: any): string[] {
    if (!images) return [];
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    return images.map((img: string) => {
      if (img.startsWith('http')) return img;
      const cleanImg = img.replace(/^\[?"|"\]?$/g, '');
      return `http://localhost:5000/static/${cleanImg.replace(/^\/?maintenance\//, '')}`;
    });
  }

  openImageModal(imageUrl: string): void {
    this.selectedImage.set(imageUrl);
    this.showImageModal.set(true);
  }

  closeImageModal(): void {
    this.showImageModal.set(false);
    this.selectedImage.set(null);
  }

  // Problem type icon mapping
  getProblemIcon(problemType?: string): string {
    if (!problemType) return 'fas fa-tools';
    const iconMap: Record<string, string> = {
      'plumbing': 'fas fa-faucet',
      'electrical': 'fas fa-bolt',
      'hvac': 'fas fa-fan',
      'appliance': 'fas fa-blender',
      'general': 'fas fa-tools'
    };
    return iconMap[problemType.toLowerCase()] || iconMap['general'];
  }

  // Filter utilities
  hasActiveFilters(): boolean {
    return this.searchQuery().length > 0 || this.statusFilter() !== 'All';
  }

  // Status class helper
  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'Pending': 'status-pending',
      'Pending Confirmation': 'status-pending-confirmation',
      'Approved': 'status-approved',
      'In Progress': 'status-in-progress',
      'Completed': 'status-completed',
      'Rejected': 'status-rejected'
    };
    return statusClasses[status] || 'status-default';
  }

  formatDateForInput(dateString: string | null): string {
    if (!dateString) return '';
    try {
      const dateObj = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00');
      return dateObj.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }

  contactUser(userId: number, requestId: number) {
    const role = localStorage.getItem('role');
    const base = role === 'Technician' ? 'technician-dashboard' :
                 role === 'Buyer/Tenant' ? 'tenant-dashboard' :
                 role === 'Owner' ? 'owner-dashboard' : '';

    this.router.navigate([`/${base}/messages`], {
      queryParams: { contactUserId: userId, requestId }
    });
  }

  onDateChange(request: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    request.scheduled_date = input.value ? new Date(input.value).toISOString() : null;
    this.onFieldChange(request.id);
  }

  loadRequests() {
    this.loading.set(true);
    this.technicianService.getTechnicianRequests(this.technicianId).subscribe({
      next: data => {
        const filteredRequests = data
          .filter(req => !['Rejected', 'Cancelled'].includes(req.status))
          .map(req => ({
            ...req,
            scheduled_date: req.scheduled_date ? req.scheduled_date.split('T')[0] : null,
            formattedCost: req.proposedCost ? `$${req.proposedCost.toFixed(2)}` : 'Not specified',
            formattedDuration: req.proposedDuration || 'Not specified',
            canUpdate: ['Approved', 'In Progress'].includes(req.status),
            canComplete: req.status === 'In Progress',
            truncatedDescription: this.truncateText(req.description, 100),
            sanitizedImages: this.getSanitizedImages(req.images)
          }));
        
        this.requests.set(filteredRequests);
        this.loading.set(false);
      },
      error: err => {
        console.error('Error loading requests', err);
        this.error.set('Failed to load requests. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  startProgress(requestId: number) {
    this.processingRequests.update(ids => [...ids, requestId]);
    
    this.http.patch(`http://localhost:5000/api/maintenance-requests/${requestId}`, {
      status: 'In Progress',
      start_date: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.loadRequests();
        this.processingRequests.update(ids => ids.filter(id => id !== requestId));
      },
      error: err => {
        console.error('Error starting work', err);
        this.error.set('Failed to update status. Please try again.');
        this.processingRequests.update(ids => ids.filter(id => id !== requestId));
      }
    });
  }

  markAsCompleted(requestId: number) {
    this.processingRequests.update(ids => [...ids, requestId]);
    
    this.http.patch(`http://localhost:5000/api/maintenance-requests/${requestId}`, {
      status: 'Completed',
      completed_date: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.loadRequests();
        this.processingRequests.update(ids => ids.filter(id => id !== requestId));
        alert('Request marked as completed successfully');
      },
      error: err => {
        console.error('Error completing request', err);
        this.error.set('Failed to complete request. Please try again.');
        this.processingRequests.update(ids => ids.filter(id => id !== requestId));
      }
    });
  }

  filteredRequests = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    
    return this.requests().filter(request => {
      const matchesSearch = 
        request.problem_type?.toLowerCase().includes(query) ||
        request.description?.toLowerCase().includes(query) ||
        request.apartmentNumber?.toString().includes(query);
      
      const matchesStatus = 
        status === 'All' || 
        request.status === status ||
        (status === 'Active' && ['Approved', 'In Progress'].includes(request.status));
      
      return matchesSearch && matchesStatus;
    });
  });

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value);
  }

  onFieldChange(requestId: number) {
    this.editedRequestIds.add(requestId);
  }

  updateRequest(request: any) {
    if (!this.editedRequestIds.has(request.id)) {
      alert('No changes detected');
      return;
    }

    this.processingRequests.update(ids => [...ids, request.id]);
    
    const updateData = {
      status: request.status,
      scheduled_date: request.scheduled_date,
      ...(request.status === 'In Progress' && { start_date: new Date().toISOString() })
    };

    this.http.patch(`http://localhost:5000/api/maintenance-requests/${request.id}`, updateData)
      .subscribe({
        next: () => {
          this.editedRequestIds.delete(request.id);
          this.loadRequests();
          this.processingRequests.update(ids => ids.filter(id => id !== request.id));
        },
        error: err => {
          console.error('Update failed', err);
          alert(`Update failed: ${err.error?.message || err.message}`);
          this.processingRequests.update(ids => ids.filter(id => id !== request.id));
        }
      });
  }

  isProcessing(requestId: number): boolean {
    return this.processingRequests().includes(requestId);
  }
}