interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold font-[family-name:var(--font-montserrat)] text-[var(--color-dark)] mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-base font-[family-name:var(--font-inter)] text-[var(--color-gray)]">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
