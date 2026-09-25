import { ChevronDown, Plus, type LucideIcon } from 'lucide-react';
import { EquipmentRow } from './EquipmentRow';
import type { EquipmentField } from './EquipmentRow';

interface EquipmentSectionProps<T extends { id: string; brand: string; model: string }> {
  title: string;
  icon: LucideIcon;
  items: T[];
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  renderItem: (item: T, index: number) => {
    fields: EquipmentField[];
    extraField?: EquipmentField;
    onChange: (fieldIndex: number, value: string) => void;
    onChangeExtra?: (value: string) => void;
    onSave: () => Promise<void>;
    onDelete: () => Promise<void>;
    brandOptions?: readonly string[];
    modelOptionsFor?: (brand: string) => readonly string[];
    onEnsureBrand?: (brand: string) => Promise<void>;
    onEnsureModel?: (brand: string, model: string) => Promise<void>;
  };
  emptyLabel: string;
}

export function EquipmentSection<T extends { id: string; brand: string; model: string }>({
  title,
  icon: Icon,
  items,
  expanded,
  onToggle,
  onAdd,
  renderItem,
  emptyLabel,
}: EquipmentSectionProps<T>) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-900 transition-colors"
        >
          <Icon size={18} />
          {title} ({items.length})
          <ChevronDown
            size={18}
            className={`transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </button>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Aggiungi
        </button>
      </div>
      {expanded && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <Icon className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-slate-500 text-sm">{emptyLabel}</p>
            </div>
          ) : (
            items.map((item, index) => {
              const props = renderItem(item, index);
              return (
                <EquipmentRow
                  key={item.id || `new-${index}`}
                  index={index}
                  fields={props.fields}
                  extraField={props.extraField}
                  onChange={props.onChange}
                  onChangeExtra={props.onChangeExtra}
                  onSave={props.onSave}
                  onDelete={props.onDelete}
                  brandOptions={props.brandOptions}
                  modelOptionsFor={props.modelOptionsFor}
                  onEnsureBrand={props.onEnsureBrand}
                  onEnsureModel={props.onEnsureModel}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
