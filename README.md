## 📖 README.md - Dokumentasi Lengkap
```markdown
# 🔋 Vexa Cell

Website pembelian voucher otomatis dengan API Digiflazz & Pembayaran QRIS Pakasir.

## ✨ Fitur

- 🛒 Pembelian voucher otomatis (Pulsa, Data, PLN, E-Wallet, Game)
- 💳 Pembayaran QRIS via Pakasir
- 🔄 Webhook otomatis untuk update status
- 🧾 Struk transaksi otomatis
- 👤 User & Admin panel terpisah
- 📊 Dashboard analytics
- 🔐 JWT Authentication
- 📱 Responsive design (Mobile-first)
- ⚡ Animasi smooth & UX premium

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Digiflazz account
- Pakasir account

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/vexa-cell.git
cd vexa-cell

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# - Supabase URL & Key
# - Digiflazz username & API key
# - Pakasir API key & Merchant ID

# Setup database (run in Supabase SQL Editor)
# Copy content from database/schema.sql

# Start development server
npm run dev

# Access application
# Frontend: http://localhost:3000
# Admin: http://localhost:3000/admin/kepolu.html