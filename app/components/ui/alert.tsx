import * as React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export function Alert({ className = '', variant = 'default', ...props }: AlertProps) {
  const variants = {
    default: 'bg-blue-50 text-blue-900 border-blue-200',
    destructive: 'bg-red-50 text-red-900 border-red-200'
  };

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({ className = '', ...props }: AlertTitleProps) {
  return <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`} {...props} />;
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className = '', ...props }: AlertDescriptionProps) {
  return <div className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />;
}
