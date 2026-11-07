import { useState } from 'react';

export function ChipInput({ label, values, onChange, suggestions = [], placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t && !values.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...values, t]);
    setText('');
  };
  const remaining = suggestions.filter((s) => !values.includes(s));
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chips">
        {values.map((v) => (
          <button key={v} className="chip on" onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}>{v} ✕</button>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); add(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? 'Type and press Add'} />
        <button className="btn small" type="submit">Add</button>
      </form>
      {remaining.length > 0 && (
        <div className="chips">
          {remaining.map((s) => <button key={s} className="chip" onClick={() => add(s)}>+ {s}</button>)}
        </div>
      )}
    </div>
  );
}
