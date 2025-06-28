import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-contact-tenant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-tenant.component.html',
  styleUrls: ['./contact-tenant.component.css']
})
export class ContactTenantComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public router = inject(Router); // made public for HTML access
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  userId!: string;
  requestId!: string;
  message: string = '';
  sending = false;
  sendSuccess = false;
  error = '';

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('userId')!;
    this.requestId = this.route.snapshot.paramMap.get('requestId')!;

    const senderId = localStorage.getItem('user_id');
    if (!senderId) {
      this.router.navigate(['/login'], {
        queryParams: { redirectTo: `/contact-tenant/${this.userId}/${this.requestId}` }
      });
      return;
    }
  }
sendMessage() {
  if (!this.message.trim()) return;

  this.sending = true;

  const payload = {
    sender_id: Number(localStorage.getItem('user_id')),  // ✅ correct key
    receiver_id: Number(this.userId),                    // ✅ correct key
    content: this.message.trim(),                        // ✅ required
    message_type: 'General'                              // ✅ optional but recommended
    // ❌ No apartment_id
  };

  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  console.log("📤 Sending Payload:", payload);

  this.http.post('http://localhost:5000/messages', payload, { headers }).subscribe({
    next: () => {
      this.sendSuccess = true;
      this.message = '';
    },
    error: (err) => {
      console.error('❌ Send Message Error:', err);
      this.error = err.error?.error || 'Failed to send message.';
    },
    complete: () => {
      this.sending = false;
    }
  });
}

}
