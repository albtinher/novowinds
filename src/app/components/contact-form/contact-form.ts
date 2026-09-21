import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactLead } from '../../models/contact-lead';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly courseName = input.required<string>();
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitRequested = output<ContactLead>();
  readonly cancelRequested = output<void>();

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    // Campo trampa: sin validadores, para que nunca bloquee el envio real.
    website: [''],
  });

  canSubmit(): boolean {
    return this.form.valid && !this.submitting();
  }

  onSubmit(): void {
    if (!this.form.valid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.submitRequested.emit({
      course: this.courseName(),
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim() || undefined,
      message: value.message.trim(),
      website: value.website,
    });
  }

  onCancel(): void {
    this.cancelRequested.emit();
  }
}
