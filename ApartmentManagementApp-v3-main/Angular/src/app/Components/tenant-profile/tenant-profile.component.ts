import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../Services/tenant.service';
import { AuthService } from '../../Services/auth.service';

interface Tenant {
  id: number;
  full_name?: string;
  name?: string;
  email: string;
  phone_number: string;
  avatar?: string;
}

@Component({
  selector: 'app-tenant-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-profile.component.html',
  styleUrls: ['./tenant-profile.component.scss']
})
export class TenantProfileComponent implements OnInit {
  name = signal<string>('Loading...');
  email = signal<string>('N/A');
  phone = signal<string>('N/A');
  avatar = signal<string>('assets/default-avatar.png');
  job = signal<string>('Tenant');
  tenantId = signal<number | null>(null);

  // Editable fields
  nameValue: string = '';
  emailValue: string = '';
  phoneValue: string = '';

  // Edit state per field
  editing = {
    name: false,
    email: false,
    phone: false
  };

  // For cancel operation
  originalValues = {
    name: '',
    email: '',
    phone: ''
  };

  // Password section
  isPasswordEditing = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';

  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
      const user: Tenant = JSON.parse(userString);
      this.name.set(user.full_name || user.name || 'Tenant');
      this.email.set(user.email || 'N/A');
      this.phone.set(user.phone_number || 'N/A');
      if (user.avatar) this.avatar.set(user.avatar);
      this.tenantId.set(user.id);

      this.nameValue = this.name();
      this.emailValue = this.email();
      this.phoneValue = this.phone();
    }
  }

  // Password Edit Toggle
  togglePasswordEdit(): void {
    this.isPasswordEditing = !this.isPasswordEditing;
    this.passwordError = '';
    this.passwordSuccess = '';
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  updatePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Please fill in all fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New passwords do not match.';
      return;
    }

    this.tenantService.updateTenantPassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.passwordSuccess = 'Password updated successfully.';
        this.togglePasswordEdit();
      },
      error: () => {
        this.passwordError = 'Failed to update password. Please check current password.';
      }
    });
  }

  // Start editing a specific field
  startEditing(field: 'name' | 'email' | 'phone') {
    this.editing[field] = true;
    this.originalValues[field] = this[`${field}Value`];
  }

  // Cancel editing a specific field
  cancelEditing(field: 'name' | 'email' | 'phone') {
    this.editing[field] = false;
    this[`${field}Value`] = this.originalValues[field];
  }

  // Save updated individual field
  saveProfileField(field: 'name' | 'email' | 'phone') {
    const id = this.tenantId();
    if (!id) {
      console.error('No tenant ID available');
      return;
    }

    const payload: any = {};
    if (field === 'name') {
      if (this.nameValue.trim().length < 2) {
        alert('Full name must be at least 2 characters');
        return;
      }
      payload.full_name = this.nameValue.trim();
    } else if (field === 'email') {
      if (!this.emailValue.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }
      payload.email = this.emailValue.trim();
    } else if (field === 'phone') {
      if (this.phoneValue.trim().length < 5) {
        alert('Phone number must be at least 5 characters');
        return;
      }
      payload.phone_number = this.phoneValue.trim();
    }

    this.tenantService.updateTenantProfile(id, payload).subscribe({
      next: (response: any) => {
        if (field === 'name') {
          const updated = response.full_name || response.tenant?.full_name;
          this.name.set(updated);
        }
        if (field === 'email') {
          const updated = response.email || response.tenant?.email;
          this.email.set(updated);
        }
        if (field === 'phone') {
          const updated = response.phone_number || response.tenant?.phone_number;
          this.phone.set(updated);
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const updatedUser = { ...currentUser, ...payload };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        this.editing[field] = false;
      },
      error: (err) => {
        alert('Failed to update field');
        console.error(err);
      }
    });
  }
}
