import '../styles/footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p>&copy; {new Date().getFullYear()} SICSS SENA</p>
                <p className="sena-text">Sistema Integrado de Control, Seguridad y Salidas</p>
            </div>
        </footer>
    );
};

export default Footer;
