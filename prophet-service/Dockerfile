FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (including build tools for cmdstan)
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install cmdstan (required by Prophet) - this can take several minutes
RUN python3 -c "import cmdstanpy; cmdstanpy.install_cmdstan(version='2.34.1', verbose=False)" || \
    (echo "Failed to install cmdstan 2.34.1, trying latest..." && \
     python3 -c "import cmdstanpy; cmdstanpy.install_cmdstan(verbose=False)")

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]