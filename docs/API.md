# Vexa Cell API Documentation

## Base URL : 


## Authentication
All protected endpoints require JWT token in Authorization header: 


## Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login user |
| GET | /auth/me | Get current user profile |

### Vouchers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /vouchers/categories | Get all categories |
| GET | /vouchers/providers | Get all providers |
| GET | /vouchers | Get voucher list (with filters) |
| GET | /vouchers/:code | Get voucher detail |
| POST | /vouchers/sync | Sync vouchers from Digiflazz (Admin) |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /transactions | Create new transaction |
| POST | /transactions/:id/payment | Generate QRIS payment |
| GET | /transactions/:id/status | Get transaction status |
| GET | /transactions | Get user transactions |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/dashboard | Get dashboard stats |
| GET | /admin/users | Get all users |
| DELETE | /admin/users/:id | Deactivate user |
| GET | /admin/transactions | Get all transactions |
| PATCH | /admin/transactions/:id/status | Update transaction status |
| POST | /admin/margins | Add price margin |
| POST | /admin/prices/recalculate | Recalculate all prices |

## Response Format
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}