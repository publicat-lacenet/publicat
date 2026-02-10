'use client';

interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AdminTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function AdminTabs({ tabs, activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="border-b border-[var(--color-border)] mb-8">
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3
              font-[family-name:var(--font-montserrat)] font-medium text-base
              border-b-[3px] transition-all duration-200
              ${activeTab === tab.id
                ? 'text-[var(--color-dark)] border-[var(--color-accent)]'
                : 'text-[var(--color-gray)] border-transparent hover:text-[var(--color-secondary)]'
              }
            `}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
