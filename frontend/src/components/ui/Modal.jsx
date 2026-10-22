import { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({ title, onClose, children, className = "", labelledBy }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal-card ui-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="ui-modal-header"><h2 id={labelledBy}>{title}</h2><button className="ui-modal-close" type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
        {children}
      </section>
    </div>
  );
};

export default Modal;
