import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cột 1: Liên hệ */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary mb-4 font-heading">Liên hệ</h3>
            <div className="space-y-3">
              <p className="font-semibold text-gray-800">NỀN TẢNG HỌC TẬP SMART LEARN</p>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:support.smart.learn@gmail.com" className="hover:text-primary transition-colors">
                  support.smart.learn@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Cột 2: Chính sách */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary mb-4 font-heading">Chính Sách</h3>
            <ul className="space-y-3">
              <li>
                <a href="/p/payment-methods" className="text-muted-foreground hover:text-primary text-sm transition-colors block">
                  Hình thức thanh toán
                </a>
              </li>
              <li>
                <a href="/p/privacy-policy" className="text-muted-foreground hover:text-primary text-sm transition-colors block">
                  Chính sách bảo mật
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 3: Về Smart learn */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary mb-4 font-heading">Về Smart learn</h3>
            <ul className="space-y-3">
              <li>
                <a href="/p/about-us" className="text-muted-foreground hover:text-primary text-sm transition-colors block">
                  Giới thiệu về chúng tôi
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors block">
                  Liên hệ với chúng tôi
                </Link>
              </li>
              <li>
                <a href="/p/faq" className="text-muted-foreground hover:text-primary text-sm transition-colors block">
                  Các câu hỏi thường gặp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Smart Learn. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
