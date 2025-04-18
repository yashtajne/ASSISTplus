import { useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaArrowUp, FaPaperclip, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import "../assets/Colors.css";

export default function ActionBar({ onSend }) {

    const [message, setMessage] = useState('');
    const [isExpanded, setExpanded] = useState(false);
    const textareaRef = useRef(null);

    const handleSendMessage = () => {
        onSend(message);
        setMessage('');
        setExpanded(false);
    }

    const handleVoiceMessage = () => {
        console.log('Voice message recording started');
    };

    useEffect(() => {
        if (isExpanded) {
            textareaRef.current.style.height = `${textareaRef.current.offsetHeight + 200}px`;
        } else {
            textareaRef.current.style.height = '50px';
        }
    }, [isExpanded]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape' && isExpanded) {
                setExpanded(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isExpanded]);

    return (
        <div style={{
            position: 'absolute',
            bottom: '6%',
            left: '50%',
            transform: 'translateX(-50%)', 
            width: '80%',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '5px',
            borderRadius: '20px',
            backgroundColor: 'var(--background-color2)',
            filter: 'drop-shadow(0 8px 12px rgba(0, 0, 0, 1))'
        }}>
            <textarea
                placeholder='Say something...'
                ref={textareaRef}
                value={message}
                onInput={(e) => {
                    if (textareaRef.current.scrollHeight > textareaRef.current.offsetHeight) {
                        setExpanded(true);
                    }
                    setMessage(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                style={{
                    maxHeight: 'none',
                    overflow: 'hidden',
                    resize: 'none',
                    fontSize: '1rem',
                    outline: 'none',
                    border: 'none',
                    borderTopLeftRadius: '19px',
                    borderTopRightRadius: '19px',
                    background: 'linear-gradient(to bottom, var(--background-color3), rgba(0, 0, 0, 0))',
                    padding: '6px 12px',
                    transition: 'height 0.3s ease'
                }}
            />
            <div style={{
                display: 'flex',
                gap: '5px'
            }}>
                <button style={{
                    outline: 'none',
                    border: 'none',
                    background: 'none',
                    padding: '8px 16px',
                }} onClick={() => setExpanded(!isExpanded)}>
                    {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
                </button>
                <button style={{
                    outline: 'none',
                    padding: '8px 12px',
                    borderRadius: '24px',
                    marginLeft: 'auto',
                    border: 'none',
                }} onClick={() => handleSendMessage()}>
                    <FaArrowUp />
                </button>
                <button style={{
                    outline: 'none',
                    padding: '8px 12px',
                    borderRadius: '24px',
                    border: 'none',
                }}>
                    <FaMicrophone />
                </button>
                <button style={{
                    outline: 'none',
                    padding: '8px 12px',
                    borderRadius: '24px',
                    border: 'none',
                }} onClick={() => handleVoiceMessage()}>
                    <FaPaperclip />
                </button>
            </div>
        </div>
    );
}
