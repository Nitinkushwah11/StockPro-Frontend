# StockPro Frontend

The StockPro Frontend is a modern React application for managing inventory, tracking stock movements, generating reports, and managing suppliers. It is designed to work seamlessly with the StockPro Microservices Backend.

## Compliance
This frontend project is **100% compliant** with the Inventory Management Case Study requirements:
1. **Accessibility**: Implementation of screen-reader friendly `aria-live` attributes and `react-focus-lock` for modal focus trapping.
2. **Performance**: Heavy UI components (charts and modals) are lazy-loaded using `React.lazy` and `Suspense` for code-splitting.
3. **Testing**: Basic unit testing suite using `vitest` and `@testing-library/react`.
4. **Documentation**: Architecture diagrams and comprehensive project structure documented in the `docs/` folder.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- StockPro Backend running locally

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

## Testing
Run the test suite with:
```bash
npm test
```

## Backend Startup Order

Start backend services in this order:

1. `eureka-server` on port `8761`
2. Core services such as `auth-service`, `product-service`, `warehouse-service`, `supplier-service`, `purchase-service`, `payment-service`, `movement-service`, `report-service`, and `alert-service`
3. `api-gateway` on port `8080`
4. Frontend with `npm run dev`

The frontend calls the backend through `http://localhost:8080`.

## Login and Role Access

After login, the frontend stores:

- `token`: JWT used by Axios requests
- `user`: user profile including `role`

The API Gateway validates the JWT and checks the role before forwarding requests to microservices. See `docs/role-access.md` for the complete role matrix.

## Common Troubleshooting

- `401 Unauthorized`: login again or check that the token exists in browser local storage.
- `403 Forbidden`: the user role is valid but does not have permission for that page or API.
- Failed data loading: confirm Eureka, the target microservice, and API Gateway are all running.
- CORS issue: use `http://localhost:5173`, `http://localhost:5174`, `http://127.0.0.1:5173`, or `http://127.0.0.1:5174`.

## Architecture
See the `docs/architecture.md` file for details on the frontend architecture and integration with backend microservices.
