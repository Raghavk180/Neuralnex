import { useEffect, useRef } from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const v = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(v);
    }, 300);
    // Update input immediately for UI responsiveness via uncontrolled trick
    e.target._debounceVal = v;
  };

  return (
    <div className="search-input-wrap">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        defaultValue={value}
        onChange={handleChange}
      />
    </div>
  );
}
