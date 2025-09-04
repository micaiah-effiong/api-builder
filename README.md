# API Builder Monorepo

This repository provides simple framework for building Node.js APIs. It uses Turborepo for monorepo management.

## Features

- **Express Application Bootstrapping:**
- **Clustering:**
- **OpenAPI Documentation:**
- **Custom Middleware:**
- **Static File Serving:**
- **Security & Logging:**

## Monorepo Structure

This Turborepo includes:

- `@micaiah_effiong/api-builder`: API builder package

All packages/apps use [TypeScript](https://www.typescriptlang.org/).

## Scripts

### Build

```bash
turbo build
```

### Develop

```bash
turbo dev
```

## API Reference

See [`packages/core/README.md`](./packages/core/README.md) for full documentation on available classes and methods.

## Environment Variables

- `PORT`: Port for server (default: `3000`)

## Contributing

Contributions are welcome! Open issues or submit pull requests to improve functionality, fix bugs, or update documentation.

## License

MIT
