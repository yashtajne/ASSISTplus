import React from 'react';
import '../assets/Colors.css';
import '../index.css';

export default function PricingPage() {
    const cardStyle = {
        padding: '30px',
        backgroundColor: 'var(--background-color3)',
        border: '4px solid var(--background-color2)',
        borderRadius: '24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease',
        cursor: 'pointer',
        minWidth: '250px',
    }

    const titleStyle = {
        fontSize: '28px',
        marginBottom: '10px',
        color: 'var(--text-primary)',
    }

    const descriptionStyle = {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        marginBottom: '20px',
        opacity: 0.8,
    }

    const listStyle = {
        fontSize: '16px',
        paddingLeft: '10px',
        listStyle: 'none',
        margin: '20px 0',
    }

    const listItemStyle = {
        padding: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    }

    const buttonStyle = {
        padding: '12px 24px',
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        },
        outline: 'none',
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--background-color1)',
        }}>
            <div style={{
                height: '70%',
                width: '65%',
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                padding: '20px',
            }}>
                <div style={{...cardStyle, marginTop: "60px"}}>
                    <h2 style={titleStyle}>Free</h2>
                    <p style={descriptionStyle}>Perfect for getting started with our API</p>
                    <ul style={listStyle}>
                        <li style={listItemStyle}>
                            ✓ 5 Requests per minute
                        </li>
                        <li style={listItemStyle}>
                            ✓ 400 Requests per Day
                        </li>
                        <li style={listItemStyle}>
                            ✓ Basic Support
                        </li>
                    </ul>
                </div>

                <div style={{...cardStyle, transform: 'scale(1.05)', border: '4px solid var(--background-color2)'}}>
                    <h2 style={titleStyle}>Basic</h2>
                    <p style={descriptionStyle}>Ideal for developers and small teams</p>
                    <ul style={listStyle}>
                        <li style={listItemStyle}>
                            ✓ Unlimited Requests per minute
                        </li>
                        <li style={listItemStyle}>
                            ✓ 1500 Requests per Day
                        </li>
                        <li style={listItemStyle}>
                            ✓ Priority Support
                        </li>
                    </ul>
                    <div style={{
                        marginTop: 'auto',
                        marginBottom: '15px',
                        fontWeight: '600'
                    }}>
                        <span style={{
                            fontSize: '24px',
                            fontWeight: 'bolder'
                        }}>24$ </span>
                        per month
                    </div>
                    <button style={buttonStyle}>
                        Start with Basic
                    </button>
                </div>

                <div style={{...cardStyle, marginTop: "50px"}}>
                    <h2 style={titleStyle}>Premium</h2>
                    <p style={descriptionStyle}>For businesses with high-volume needs</p>
                    <ul style={listStyle}>
                        <li style={listItemStyle}>
                            ✓ Unlimited Requests / minute
                        </li>
                        <li style={listItemStyle}>
                            ✓ 5000 Requests per Day
                        </li>
                        <li style={listItemStyle}>
                            ✓ 24/7 Premium Support
                        </li>
                    </ul>
                    <div style={{
                        marginTop: 'auto',
                        marginBottom: '15px',
                        fontWeight: '600'
                    }}>
                        <span style={{
                            fontSize: '24px',
                            fontWeight: 'bolder'
                        }}>50$ </span>
                        per month
                    </div>
                    <button style={buttonStyle}>
                        Get Premium
                    </button>
                </div>
            </div>
        </div>
    );
}