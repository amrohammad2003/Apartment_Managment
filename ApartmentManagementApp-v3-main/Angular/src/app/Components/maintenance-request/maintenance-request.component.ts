import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-maintenance-request',
  standalone: true,
  templateUrl: './maintenance-request.component.html',
  styleUrls: ['./maintenance-request.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class MaintenanceRequestComponent implements OnInit {
  maintenanceForm: FormGroup;
  selectedTechnician: any = null;
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  successMessage: string | null = null;
  isSubmitting: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.maintenanceForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
      photo: [null]
    });
  }

  ngOnInit(): void {
    const state = history.state;
    if (state?.technician) {
      this.selectedTechnician = state.technician;
    }
  }

  get f() {
    return this.maintenanceForm.controls;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.maintenanceForm.patchValue({ photo: this.selectedFile });

      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.photoPreview = null;
    this.maintenanceForm.patchValue({ photo: null });
  }
  showNotification() {
  const notification = document.querySelector('.notification');
  notification?.classList.add('show');
  
  setTimeout(() => {
    notification?.classList.remove('show');
  }, 5000);
}

 submitRequest(): void {
  if (this.maintenanceForm.invalid || this.isSubmitting) {
    return;
  }

  this.isSubmitting = true;

  // Ensure userId exists and is not null
  const userId = localStorage.getItem('user_id');
  if (!userId) {
    console.error('User ID not found in localStorage');
    this.isSubmitting = false;
    return;
  }

  const formData = new FormData();
  
  // Append all required fields - ensure no null values
  formData.append('description', this.maintenanceForm.value.description || '');
  formData.append('user_id', userId); // Now guaranteed to be string
  formData.append('status', 'Pending');
  
  // Handle optional technician_id safely
  if (this.selectedTechnician?.id) {
    formData.append('technician_id', this.selectedTechnician.id.toString());
  }

  // Handle file upload
  if (this.selectedFile) {
    formData.append('photo', this.selectedFile);
  }

  // Optional apartment_id if needed
  if (this.maintenanceForm.value.apartment_id) {
    formData.append('apartment_id', this.maintenanceForm.value.apartment_id.toString());
  }

  this.http.post('http://localhost:5000/api/maintenance-requests', formData).subscribe({
    next: () => {
      this.showNotification();
      this.isSubmitting = false;
      this.maintenanceForm.reset();
      this.selectedFile = null;
      this.photoPreview = null;
    },
    error: (err) => {
      console.error('Failed to submit request:', err);
      this.isSubmitting = false;
    }
  });
}
}