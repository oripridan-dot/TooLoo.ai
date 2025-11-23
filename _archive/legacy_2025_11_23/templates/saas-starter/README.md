# SaaS Starter Template

This is a production-ready template for building SaaS applications with Node.js and Express.

## Features
- **Express Server**: Fast and lightweight.
- **Security**: Helmet and CORS pre-configured.
- **Structure**: Organized for scalability (`public/`, `config/`, `server.js`).
- **Ready for**: Stripe, MongoDB, and Auth integration.

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Copy `.env.example` to `.env` and add your keys.

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Customization
- Edit `public/index.html` for your landing page.
- Add API routes in `server.js`.
- Connect your database in `server.js` (uncomment the mongoose section).
