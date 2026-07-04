import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p className="footer-ksu-info">جامعة الملك سعود | كلية علوم الحاسب والمعلومات</p>
        <p>جميع الحقوق محفوظة لمشروع ومضة &copy; {currentYear}</p>
      </div>
    </footer>
  );
}
