import { useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';

export default function Dropdown({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      userSelect: 'none'
    }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--background-color3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>{value?.label || placeholder}</span>
        <span style={{
          transform: `rotate(${isOpen ? '180deg' : '360deg'}) translateY(10%)`,
          transition: 'transform 0.3s ease'
        }}><IoChevronDown /></span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--background-color3)',
          borderRadius: '8px',
          marginTop: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: value?.value === option.value ? 
                  'var(--background-color2)' : 'transparent',
                ':hover': {
                  backgroundColor: 'var(--background-color2)'
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}