import { useState } from 'react';
import { Dialog, Button, Input, Textarea } from '../../../../sail';

export default function EditFieldDialog({ open, title, fields, onSave, onCancel }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const getValue = (field) => (field.key in values ? values[field.key] : field.value ?? '');

  const validate = () => {
    const nextErrors = {};
    for (const field of fields) {
      const value = getValue(field);
      if (field.type === 'number' || field.type === 'percentage') {
        const num = Number(value);
        if (value === '' || Number.isNaN(num)) {
          nextErrors[field.key] = 'Enter a number.';
        } else if (num < 0) {
          nextErrors[field.key] = 'Enter a value of 0 or more.';
        } else if (field.type === 'percentage' && num > 100) {
          nextErrors[field.key] = 'Enter a percentage between 0 and 100.';
        }
      }
      if (field.required && !String(value).trim()) {
        nextErrors[field.key] = 'This field is required.';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const result = {};
    for (const field of fields) {
      const raw = getValue(field);
      result[field.key] = field.type === 'number' || field.type === 'percentage' ? Number(raw) : raw;
    }
    onSave(result);
    setValues({});
    setErrors({});
  };

  const handleCancel = () => {
    setValues({});
    setErrors({});
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      title={title}
      overlayClassName="z-[101]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            {field.type === 'textarea' ? (
              <Textarea
                label={field.label}
                value={getValue(field)}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                rows={3}
                error={Boolean(errors[field.key])}
                errorMessage={errors[field.key]}
              />
            ) : (
              <Input
                label={field.label}
                type={field.type === 'number' || field.type === 'percentage' ? 'number' : 'text'}
                suffix={field.type === 'percentage' ? '%' : field.suffix}
                value={getValue(field)}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                error={Boolean(errors[field.key])}
                errorMessage={errors[field.key]}
              />
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
