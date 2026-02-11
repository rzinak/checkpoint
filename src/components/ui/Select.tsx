import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
}

export function Select({ label, hint, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="custom-form-group">
      {label && (
        <label className="custom-form-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="custom-select-wrapper">
        <select
          className={`custom-select ${error ? 'has-error' : ''} ${className}`}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg 
          className="custom-select-arrow" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {hint && !error && <span className="custom-form-hint">{hint}</span>}
      {error && <span className="custom-form-error">{error}</span>}
    </div>
  );
}
