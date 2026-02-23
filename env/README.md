# Environment Configuration Files

This directory contains environment variable templates for different deployment scenarios.

## Main Files

### `../env.example` (Main Template)
- **Purpose**: Base template for all environments
- **Usage**: Copy to `.env` and customize
- **Contains**: All configuration options with placeholders

### `../env.production` (Production Reference)
- **Purpose**: Production configuration reference
- **Usage**: Reference for production deployment values
- **Note**: Contains example values - DO NOT use directly in production

### `staging.env.sample` (Staging Template)
- **Purpose**: Staging environment template
- **Usage**: Copy to `env/staging.env` and fill in values
- **Contains**: Staging-specific configuration

## Deprecated Files

The following files are deprecated:
- `../env.rc.sample` - Use `staging.env.sample` instead

## Quick Start

```bash
# Development
cp env.example .env
# Edit .env with your values

# Staging
cp env/staging.env.sample env/staging.env
# Edit env/staging.env with your values

# Production
# Use env.production as reference, but create .env manually
# DO NOT commit production .env files
```

## Important Notes

- Never commit `.env` files to version control
- Always use strong, unique secrets in production
- Review all environment variables before deployment
- Use different secrets for each environment

