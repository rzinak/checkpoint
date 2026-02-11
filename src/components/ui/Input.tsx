import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className = '', ...props }: InputProps) {
  return (
    <div className="custom-form-group">
      {label && (
        <label className="custom-form-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <input
        className={`custom-input ${error ? 'has-error' : ''} ${className}`}
        {...props}
      />
      {hint && !error && <span className="custom-form-hint">{hint}</span>}
      {error && <span className="custom-form-error">{error}</span>}
    </div>
  );
}
