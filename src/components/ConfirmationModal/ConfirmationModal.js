import React from 'react';
import './ConfirmationModal.css'; // We'll create this CSS file

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="confirmation-modal-backdrop">
            <div className="confirmation-modal-content">
                {title && <h2 className="confirmation-modal-title">{title}</h2>}
                <p className="confirmation-modal-message">{message}</p>
                <div className="confirmation-modal-actions">
                    <button onClick={onClose} className="button-secondary confirmation-cancel">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className="button-danger confirmation-confirm">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;