'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-logo-section">
        <div className="logo-icon">⚡</div>
        <div className="logo-text-group">
          <h1 className="logo-title">ومضة</h1>
          <span className="logo-subtitle">مشاركة الملفات الفورية بالقاعات الدراسية</span>
        </div>
      </div>

      <nav className="header-nav">
        <div className="university-tag">
          <span>جامعة الملك سعود</span>
          <span>كلية علوم الحاسب والمعلومات</span>
        </div>
      </nav>
    </header>
  );
}
